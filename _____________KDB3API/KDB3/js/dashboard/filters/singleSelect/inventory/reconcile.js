define([
  "../effects/enumerateFilterInstances.js",
  "../effects/reconcileFilterInstanceState.js",
  "../effects/waitForFilterInventory.js",
  "../actions/notifyInventoryReconciledOwners.js",
  "../config.js",
  "../runtime.js"
], function (
  _enumerateFilterInstances,
  _reconcileState,
  _waitForFilterInventory,
  _notifyInventoryReconciledOwners,
  _config,
  _singleSelectRuntime
) {
  "use strict";

  var codes = _config.errorCodes;

  function beginRun(_KDB, _runtime, _payload) {
    _singleSelectRuntime.ensureSingleSelectRuntime(_KDB);
    _runtime.reconcileRunId = Number(_runtime.reconcileRunId || 0);
    var prior = _runtime.abortControllers.reconcile;
    if (prior && typeof prior.abort === "function") { prior.abort(); }
    _runtime.reconcileRunId += 1;
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    if (controller) { _runtime.abortControllers.reconcile = controller; }
    return {
      runId: _runtime.reconcileRunId,
      callerRunId: _payload && _payload.runId,
      signal: controller ? controller.signal : null
    };
  }

  function isCurrent(_runtime, _run) {
    return _runtime.reconcileRunId === _run.runId && !(_run.signal && _run.signal.aborted);
  }

  function staleResult(_KDB) {
    var inventory = _KDB.state.filters.singleSelect.inventory || {};
    return {
      ok: false,
      degraded: true,
      generation: Number(inventory.generation || 0),
      discovered: [],
      updated: [],
      removed: [],
      diagnostics: [{ code: codes.RECONCILE_FAILED, message: "reconcile superseded by a newer run" }]
    };
  }

  function failureResult(_KDB, _error) {
    var root = _KDB.state.filters.singleSelect;
    var code = _error && _error.code === codes.RECONCILE_TIMEOUT
      ? codes.RECONCILE_TIMEOUT : codes.RECONCILE_FAILED;
    root.inventory = Object.assign({}, root.inventory || {}, { freshness: "stale", errorCode: code });
    root.lastDiagnostics = [{ code: code, message: String(_error && _error.message ? _error.message : _error) }];
    return {
      ok: false,
      degraded: true,
      generation: Number(root.inventory.generation || 0),
      discovered: [],
      updated: [],
      removed: [],
      diagnostics: root.lastDiagnostics.slice()
    };
  }

  function checkRetainedApiMapping(_id, _priorInstancesById, _reconciled, _diagnostics) {
    var prior = _priorInstancesById[_id];
    var next = _reconciled.instancesById[_id];
    var itemId;
    var itemName;
    if (!prior || prior.status !== "active" || prior.hostStatus !== "present") { return; }
    if (!next || next.status !== "active" || next.hostStatus !== "present") { return; }
    itemId = next.itemId == null ? "" : String(next.itemId).trim();
    itemName = next.itemName == null ? "" : String(next.itemName).trim();
    if (itemId || itemName) { return; }
    _diagnostics.push({
      code: codes.RECONCILE_FAILED,
      filterInstanceId: _id,
      scopeId: next.scopeId || null,
      message: "retained active instance lost runtime filter API mapping"
    });
  }

  function verifyRetainedApiMappings(_priorInstancesById, _reconciled, _diagnostics) {
    Object.keys(_priorInstancesById || {}).forEach(function (_id) {
      checkRetainedApiMapping(_id, _priorInstancesById, _reconciled, _diagnostics);
    });
  }

  function clearRun(_runtime, _run, _promise) {
    if (_runtime.pendingPromises.reconcile && _runtime.pendingPromises.reconcile.promise === _promise) {
      delete _runtime.pendingPromises.reconcile;
    }
    if (_runtime.reconcileRunId === _run.runId) { delete _runtime.abortControllers.reconcile; }
  }

  // Closed reconcile-reason enum (singleSelect-filterInstanceIdentity-
  // contractdelta.md §6). historyReplay is allowed with fail-safe flags; unknown
  // or missing reasons fail closed and are never mapped to filtersReady.
  function resolveInventoryReason(_payload) {
    var payload = _payload || {};
    var reason = payload.reason == null ? "" : String(payload.reason);
    if (reason === "mount" || reason === "filtersReady" || reason === "tabMutation" ||
      reason === "parameterRestore" || reason === "historyReplay") {
      return { ok: true, reason: reason };
    }
    return { ok: false, reason: reason };
  }

  function buildReasonInvalidResult(_KDB, _reason) {
    var root = _KDB && _KDB.state && _KDB.state.filters
      ? _KDB.state.filters.singleSelect : null;
    var generation = root && root.inventory && isFinite(Number(root.inventory.generation))
      ? Number(root.inventory.generation) : 0;
    return {
      ok: false,
      degraded: true,
      generation: generation,
      discovered: [],
      updated: [],
      removed: [],
      diagnostics: [{
        code: codes.RECONCILE_REASON_INVALID,
        message: "singleSelect reconcile reason is invalid",
        reason: _reason
      }]
    };
  }

  function buildReconcileOutcome(_root, _reconciled, _diagnostics) {
    return {
      ok: _diagnostics.every(function (_item) {
        return _item.code !== codes.IDENTITY_COLLISION &&
          _item.code !== codes.RECONCILE_FAILED &&
          _item.code !== codes.RECONCILE_TIMEOUT;
      }),
      degraded: _diagnostics.length > 0,
      generation: _root.inventory.generation,
      discovered: _reconciled.discovered,
      updated: _reconciled.updated,
      removed: _reconciled.removed,
      diagnostics: _diagnostics
    };
  }

  async function runReconcile(_KDB, _runtime, _payload, _run) {
    try {
      var resolvedReason = resolveInventoryReason(_payload).reason;
      var inventory = await _waitForFilterInventory(
        _KDB,
        _enumerateFilterInstances,
        _payload && _payload.timeoutMs,
        _run.signal
      );
      if (!isCurrent(_runtime, _run)) { return staleResult(_KDB); }
      var root = _KDB.state.filters.singleSelect;
      var priorInstancesById = root.instancesById || {};
      var diagnostics = inventory.diagnostics.slice();
      var reconciled = _reconcileState(
        priorInstancesById,
        inventory.candidates,
        diagnostics,
        inventory.rawFallbackCounts,
        inventory.uniquenessUnproven === true
      );
      verifyRetainedApiMappings(priorInstancesById, reconciled, diagnostics);
      if (!isCurrent(_runtime, _run)) { return staleResult(_KDB); }
      _singleSelectRuntime.inFlight.adopt(_runtime, reconciled.instancesById);
      root.instancesById = reconciled.instancesById;
      var inventoryIncomplete = inventory.uniquenessUnproven === true;
      root.inventory = {
        generation: Number((root.inventory && root.inventory.generation) || 0) + 1,
        freshness: inventoryIncomplete ? "stale" : "fresh",
        reconcileInFlight: true,
        reconciledAt: Date.now(),
        errorCode: inventoryIncomplete ? codes.HOST_VALUE_READ_FAILED : null
      };
      root.lastDiagnostics = diagnostics.slice(0, _config.DIAGNOSTICS_LIMIT);
      var result = buildReconcileOutcome(root, reconciled, diagnostics);
      // historyReplay/parameterRestore: suppress cross-owner inventory notify
      // (singleSelect delta §6.2); fail-safe flags never grant startup/policy.
      if (result.ok === true &&
        root.inventory.freshness === "fresh" &&
        resolvedReason !== "parameterRestore" &&
        resolvedReason !== "historyReplay") {
        var ownerNotifyResult = await _notifyInventoryReconciledOwners(_KDB, _runtime, {
          inventoryGeneration: result.generation,
          source: "singleSelect",
          reason: resolvedReason,
          timestamp: Date.now(),
          signal: _run.signal,
          isCurrent: function () {
            return isCurrent(_runtime, _run);
          }
        });
        if (!isCurrent(_runtime, _run)) {
          return staleResult(_KDB);
        }
        if (ownerNotifyResult && Array.isArray(ownerNotifyResult.diagnostics) &&
          ownerNotifyResult.diagnostics.length > 0) {
          result.diagnostics = result.diagnostics.concat(ownerNotifyResult.diagnostics);
          result.degraded = true;
          root.lastDiagnostics = result.diagnostics.slice(0, _config.DIAGNOSTICS_LIMIT);
        }
      }
      return result;
    } catch (error) {
      if (!isCurrent(_runtime, _run)) { return staleResult(_KDB); }
      console.error("[singleSelect.runReconcile] failed", error);
      return failureResult(_KDB, error);
    }
  }

  function reconcileFilterInstances(_KDB, _runtime, _payload) {
    try {
      var reason = resolveInventoryReason(_payload || {});
      if (!reason.ok) {
        return Promise.resolve(buildReasonInvalidResult(_KDB, reason.reason));
      }
      var run = beginRun(_KDB, _runtime, _payload || {});
      var root = _KDB.state.filters.singleSelect;
      root.inventory = Object.assign({}, root.inventory || {}, {
        freshness: "stale",
        reconcileInFlight: true
      });
      var promise = runReconcile(_KDB, _runtime, _payload || {}, run);
      _runtime.pendingPromises.reconcile = {
        runId: run.runId,
        callerRunId: run.callerRunId,
        promise: promise
      };
      return promise.finally(function () {
        var pendingPromises = _runtime.pendingPromises;
        var wasCurrent = pendingPromises.reconcile &&
          pendingPromises.reconcile.promise === promise;
        clearRun(_runtime, run, promise);
        if (wasCurrent) {
          root.inventory = Object.assign({}, root.inventory || {}, { reconcileInFlight: false });
        }
      });
    } catch (error) {
      console.error("[singleSelect.reconcileFilterInstances] failed", error);
      return Promise.resolve(failureResult(_KDB, error));
    }
  }

  return {
    reconcileFilterInstances: reconcileFilterInstances
  };
});
