define(["../config.js"], function (_config) {
  "use strict";

  function ensureRuntime(_runtime) {
    _runtime.pendingPromises = _runtime.pendingPromises || {};
    _runtime.abortControllers = _runtime.abortControllers || {};
    _runtime.reconcileRunId = Number(_runtime.reconcileRunId || 0);
  }

  function beginRun(_runtime, _payload) {
    ensureRuntime(_runtime);
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
      diagnostics: [{ code: _config.errorCodes.RECONCILE_FAILED, message: "reconcile superseded by a newer run" }]
    };
  }

  function failureResult(_KDB, _error) {
    var root = _KDB.state.filters.singleSelect;
    var code = _error && _error.code === _config.errorCodes.RECONCILE_TIMEOUT
      ? _config.errorCodes.RECONCILE_TIMEOUT : _config.errorCodes.RECONCILE_FAILED;
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
      code: _config.errorCodes.RECONCILE_FAILED,
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
        code: _config.errorCodes.RECONCILE_REASON_INVALID,
        message: "singleSelect reconcile reason is invalid",
        reason: _reason
      }]
    };
  }

  return {
    ensureRuntime: ensureRuntime,
    beginRun: beginRun,
    isCurrent: isCurrent,
    staleResult: staleResult,
    failureResult: failureResult,
    verifyRetainedApiMappings: verifyRetainedApiMappings,
    clearRun: clearRun,
    resolveInventoryReason: resolveInventoryReason,
    buildReasonInvalidResult: buildReasonInvalidResult
  };
});
