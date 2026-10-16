define([], function () {
  "use strict";

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
        var abortError = new Error("owner await aborted");
        abortError.code = "ABORTED";
        settle(_reject, abortError);
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
        var timeoutError = new Error(_ownerName + " owner ack timeout");
        timeoutError.code = "TIMEOUT";
        settle(_reject, timeoutError);
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

  return {
    derivePolicyFlags: derivePolicyFlags,
    wasOwnerAcknowledged: wasOwnerAcknowledged,
    markOwnerAcknowledged: markOwnerAcknowledged,
    buildOwnerDiagnostic: buildOwnerDiagnostic,
    awaitOwnerAck: awaitOwnerAck,
    isSuccessfulAck: isSuccessfulAck,
    describeAckFailure: describeAckFailure
  };
});
