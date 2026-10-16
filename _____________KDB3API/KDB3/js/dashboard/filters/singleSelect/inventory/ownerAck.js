define([
  "../config.js",
  "../../../../core/utils/kit/errors.js"
], function (_config, _kitErrors) {
  "use strict";

  var codes = _config.errorCodes;
  var OWNER_TIMEOUT_MS = 2500;
  var OWNER_GENERATION_WINDOW = 8;
  var OWNER_NAMES = ["sicht", "specialSingleSelect"];

  function derivePolicyFlags(_reason) {
    if (_reason === "mount" || _reason === "filtersReady") {
      return { allowStartupDefault: true, allowSpecialPolicy: true };
    }
    if (_reason === "tabMutation") {
      return { allowStartupDefault: false, allowSpecialPolicy: true };
    }
    // historyReplay / parameterRestore / unknown: fail-safe, never grant startup or policy.
    return { allowStartupDefault: false, allowSpecialPolicy: false };
  }

  function ensureOwnerTracking(_runtime) {
    _runtime.inventoryOwnerNotifications = _runtime.inventoryOwnerNotifications || {};
    OWNER_NAMES.forEach(function (_owner) {
      if (!_runtime.inventoryOwnerNotifications[_owner]) {
        _runtime.inventoryOwnerNotifications[_owner] = {};
      }
    });
    return _runtime.inventoryOwnerNotifications;
  }

  function wasOwnerAcknowledged(_runtime, _ownerName, _generation) {
    var tracking = ensureOwnerTracking(_runtime);
    var entry = tracking[_ownerName] && tracking[_ownerName][String(_generation)];
    return !!(entry && entry.acknowledged === true && entry.ok === true);
  }

  function pruneOwnerGenerations(_ownerEntries) {
    var generations = Object.keys(_ownerEntries || {})
      .map(function (_key) {
        return { key: _key, generation: Number(_key) };
      })
      .filter(function (_entry) {
        return isFinite(_entry.generation);
      })
      .sort(function (_left, _right) {
        return _right.generation - _left.generation;
      });
    generations.slice(OWNER_GENERATION_WINDOW).forEach(function (_entry) {
      delete _ownerEntries[_entry.key];
    });
  }

  function markOwnerAcknowledged(_runtime, _ownerName, _generation, _ack) {
    var ownerEntries = ensureOwnerTracking(_runtime)[_ownerName];
    ownerEntries[String(_generation)] = {
      acknowledged: true,
      ok: true,
      timestamp: Date.now(),
      ack: _ack && typeof _ack === "object" ? Object.assign({}, _ack) : _ack
    };
    pruneOwnerGenerations(ownerEntries);
  }

  function buildOwnerDiagnostic(_code, _owner, _generation, _message, _details) {
    return {
      code: _code,
      inventoryGeneration: _generation,
      owner: _owner,
      message: _message,
      details: _details || null
    };
  }

  function awaitOwnerAck(_promise, _ownerName, _signal) {
    return new Promise(function (_resolve, _reject) {
      var settled = false;
      var timeoutId;
      function onAbort() {
        settle(_reject, _kitErrors.codedError("ABORTED", "owner await aborted"));
      }
      function settle(_fn, _value) {
        if (settled) { return; }
        settled = true;
        clearTimeout(timeoutId);
        if (_signal && typeof _signal.removeEventListener === "function") {
          _signal.removeEventListener("abort", onAbort);
        }
        _fn(_value);
      }
      timeoutId = setTimeout(function () {
        settle(_reject, _kitErrors.codedError("TIMEOUT", _ownerName + " owner ack timeout"));
      }, OWNER_TIMEOUT_MS);
      if (_signal && _signal.aborted) {
        onAbort();
        return;
      }
      if (_signal && typeof _signal.addEventListener === "function") {
        _signal.addEventListener("abort", onAbort);
      }
      Promise.resolve(_promise).then(function (_value) {
        settle(_resolve, _value);
      }, function (_error) {
        settle(_reject, _error);
      });
    });
  }

  function isSuccessfulAck(_ack) {
    if (_ack === true) { return true; }
    if (!_ack || typeof _ack !== "object") { return false; }
    if (_ack.ok !== true || _ack.acknowledged === false) { return false; }
    return _ack.degraded !== true && _ack.disposed !== true;
  }

  function describeAckFailure(_ack) {
    if (_ack === false || _ack == null) {
      return { kind: "rejected", message: "owner returned empty/false ack" };
    }
    var diagnostics = Array.isArray(_ack.diagnostics) ? _ack.diagnostics : [];
    var hasDisposedDiagnostic = diagnostics.some(function (_entry) {
      return _entry && _entry.code === "SICHT_DISPOSED";
    });
    if (_ack.disposed === true) {
      return { kind: "disposed", message: _ack.message || "owner is disposed" };
    }
    if (hasDisposedDiagnostic) {
      return { kind: "disposed", message: _ack.message || "owner reported disposed diagnostics" };
    }
    if (_ack.degraded === true) {
      return { kind: "degraded", message: _ack.message || "owner reported degraded ack" };
    }
    return {
      kind: "rejected",
      message: _ack.message || _ack.errorMessage || "owner rejected inventory reconcile"
    };
  }

  function readOwnerActionType(_ownerName) {
    return _ownerName === "sicht"
      ? "sicht/singleSelectInventoryReconciled"
      : "specialSingleSelect/singleSelectInventoryReconciled";
  }

  function buildOwnerAckError(_ownerName, _payload, _kind, _details) {
    var code = _kind === "apiMissing"
      ? codes.INVENTORY_OWNER_API_MISSING
      : (_kind === "disposed"
        ? codes.INVENTORY_OWNER_DISPOSED
        : (_kind === "dispatchFailed"
          ? codes.INVENTORY_OWNER_DISPATCH_FAILED
          : codes.INVENTORY_OWNER_REJECTED));
    var message = _kind === "apiMissing"
      ? _ownerName + " inventory reconcile API unavailable"
      : (_kind === "dispatchFailed"
        ? _ownerName + " inventory reconcile dispatch " + _details.reason + ": " + _details.message
        : _ownerName + " returned " + _details.reason + " ack for inventory generation " +
          _payload.inventoryGeneration);
    return {
      ok: false,
      acknowledged: false,
      diagnostic: buildOwnerDiagnostic(code, _ownerName, _payload.inventoryGeneration, message, _details || null)
    };
  }

  async function dispatchOwner(_KDB, _ownerName, _payload, _signal) {
    var api = _KDB && _KDB.api ? _KDB.api[_ownerName] : null;
    if (!api || typeof api.dispatch !== "function") {
      return buildOwnerAckError(_ownerName, _payload, "apiMissing", null);
    }
    try {
      var ack = await awaitOwnerAck(api.dispatch({
        type: readOwnerActionType(_ownerName),
        payload: Object.assign({}, _payload)
      }), _ownerName, _signal);
      if (isSuccessfulAck(ack)) {
        return { ok: true, acknowledged: true, ack: ack };
      }
      var rejected = describeAckFailure(ack);
      return buildOwnerAckError(
        _ownerName,
        _payload,
        rejected.kind === "disposed" ? "disposed" : "rejected",
        { ack: ack, reason: rejected.kind, detail: rejected.message }
      );
    } catch (error) {
      var reason = error && error.code === "TIMEOUT"
        ? "timeout"
        : (error && error.code === "ABORTED" ? "aborted" : "failed");
      return buildOwnerAckError(_ownerName, _payload, "dispatchFailed", {
        reason: reason,
        timeout: reason === "timeout",
        aborted: reason === "aborted",
        message: String(error && error.message ? error.message : error)
      });
    }
  }

  async function notifyOwnerOnce(_KDB, _runtime, _ownerName, _payload, _signal) {
    if (wasOwnerAcknowledged(_runtime, _ownerName, _payload.inventoryGeneration)) {
      return null;
    }
    return {
      owner: _ownerName,
      result: await dispatchOwner(_KDB, _ownerName, _payload, _signal)
    };
  }

  async function notifyInventoryReconciledOwners(_KDB, _runtime, _details) {
    try {
      var details = _details || {};
      var generation = Number(details.inventoryGeneration);
      var reason = details.reason || "unspecified";
      var source = details.source || "singleSelect";
      var timestamp = details.timestamp != null ? Number(details.timestamp) : Date.now();
      var isCurrent = typeof details.isCurrent === "function" ? details.isCurrent : null;
      var signal = details.signal || null;
      var flags = derivePolicyFlags(reason);
      if (!isFinite(generation)) {
        return {
          notified: false,
          diagnostics: [buildOwnerDiagnostic(
            codes.RECONCILE_FAILED,
            "singleSelect",
            details.inventoryGeneration,
            "inventory owner notify skipped because generation is invalid"
          )]
        };
      }
      if (reason === "parameterRestore" || reason === "historyReplay") {
        return { notified: false, diagnostics: [] };
      }
      if (isCurrent && !isCurrent()) {
        return { notified: false, diagnostics: [] };
      }
      var payload = {
        inventoryGeneration: generation,
        source: source,
        reason: reason,
        timestamp: timestamp,
        allowStartupDefault: flags.allowStartupDefault,
        allowSpecialPolicy: flags.allowSpecialPolicy
      };
      var ownerResults = [];
      var sichtResult = await notifyOwnerOnce(_KDB, _runtime, "sicht", payload, signal);
      if (sichtResult) {
        ownerResults.push(sichtResult);
      }
      var specialResult = await notifyOwnerOnce(_KDB, _runtime, "specialSingleSelect", payload, signal);
      if (specialResult) {
        ownerResults.push(specialResult);
      }
      if (isCurrent && !isCurrent()) {
        return { notified: false, diagnostics: [] };
      }
      ownerResults.forEach(function (_entry) {
        if (_entry.result && _entry.result.ok === true &&
          _entry.result.acknowledged === true) {
          markOwnerAcknowledged(_runtime, _entry.owner, generation, _entry.result.ack);
        }
      });
      return {
        notified: ownerResults.length > 0,
        diagnostics: ownerResults
          .map(function (_entry) { return _entry.result; })
          .filter(function (_item) { return !_item.ok && _item.diagnostic; })
          .map(function (_item) { return _item.diagnostic; })
      };
    } catch (error) {
      return {
        notified: false,
        diagnostics: [buildOwnerDiagnostic(
          codes.INVENTORY_OWNER_DISPATCH_FAILED,
          "singleSelect",
          _details && _details.inventoryGeneration,
          "inventory owner notify failed: " + String(error && error.message ? error.message : error)
        )]
      };
    }
  }

  return {
    notifyInventoryReconciledOwners: notifyInventoryReconciledOwners
  };
});
