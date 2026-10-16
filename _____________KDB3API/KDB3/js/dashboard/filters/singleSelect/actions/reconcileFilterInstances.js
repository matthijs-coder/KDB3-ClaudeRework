define([
  "../effects/enumerateFilterInstances.js",
  "../effects/reconcileFilterInstanceState.js",
  "../config/errorCodes.js",
  "../effects/waitForFilterInventory.js",
  "./reconcileRunSupport.js",
  "./notifyInventoryReconciledOwners.js",
  "../effects/singleSelectInFlight.js"
], function (
  _enumerateFilterInstances,
  _reconcileState,
  _codes,
  _waitForFilterInventory,
  _runSupport,
  _notifyInventoryReconciledOwners,
  _inFlight
) {
  "use strict";

  function buildReconcileOutcome(_root, _reconciled, _diagnostics) {
    return {
      ok: _diagnostics.every(function (_item) {
        return _item.code !== _codes.IDENTITY_COLLISION &&
          _item.code !== _codes.RECONCILE_FAILED &&
          _item.code !== _codes.RECONCILE_TIMEOUT;
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
      var resolvedReason = _runSupport.resolveInventoryReason(_payload).reason;
      var inventory = await _waitForFilterInventory(
        _KDB,
        _enumerateFilterInstances,
        _payload && _payload.timeoutMs,
        _run.signal
      );
      if (!_runSupport.isCurrent(_runtime, _run)) { return _runSupport.staleResult(_KDB); }
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
      _runSupport.verifyRetainedApiMappings(priorInstancesById, reconciled, diagnostics);
      if (!_runSupport.isCurrent(_runtime, _run)) { return _runSupport.staleResult(_KDB); }
      _inFlight.adopt(_runtime, reconciled.instancesById);
      root.instancesById = reconciled.instancesById;
      var inventoryIncomplete = inventory.uniquenessUnproven === true;
      root.inventory = {
        generation: Number((root.inventory && root.inventory.generation) || 0) + 1,
        freshness: inventoryIncomplete ? "stale" : "fresh",
        reconcileInFlight: true,
        reconciledAt: Date.now(),
        errorCode: inventoryIncomplete ? _codes.HOST_VALUE_READ_FAILED : null
      };
      root.lastDiagnostics = diagnostics.slice(0, 50);
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
            return _runSupport.isCurrent(_runtime, _run);
          }
        });
        if (!_runSupport.isCurrent(_runtime, _run)) {
          return _runSupport.staleResult(_KDB);
        }
        if (ownerNotifyResult && Array.isArray(ownerNotifyResult.diagnostics) &&
          ownerNotifyResult.diagnostics.length > 0) {
          result.diagnostics = result.diagnostics.concat(ownerNotifyResult.diagnostics);
          result.degraded = true;
          root.lastDiagnostics = result.diagnostics.slice(0, 50);
        }
      }
      return result;
    } catch (error) {
      if (!_runSupport.isCurrent(_runtime, _run)) { return _runSupport.staleResult(_KDB); }
      console.error("[singleSelect.runReconcile] failed", error);
      return _runSupport.failureResult(_KDB, error);
    }
  }

  function reconcileFilterInstances(_KDB, _runtime, _payload) {
    try {
      var reason = _runSupport.resolveInventoryReason(_payload || {});
      if (!reason.ok) {
        return Promise.resolve(_runSupport.buildReasonInvalidResult(_KDB, reason.reason));
      }
      var run = _runSupport.beginRun(_runtime, _payload || {});
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
        _runSupport.clearRun(_runtime, run, promise);
        if (wasCurrent) {
          root.inventory = Object.assign({}, root.inventory || {}, { reconcileInFlight: false });
        }
      });
    } catch (error) {
      console.error("[singleSelect.reconcileFilterInstances] failed", error);
      return Promise.resolve(_runSupport.failureResult(_KDB, error));
    }
  }

  return reconcileFilterInstances;
});
