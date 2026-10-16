define([
  "./config/restoreConstants.js",
  "../schema/errorCodes.js",
  "./state/createRunContext.js",
  "./effects/executeRestoreRun.js",
  "../urlShare/skipDefaultRestoreForUrlParameterId.js",
  "./effects/waitForRootLifecycleReady.js",
  "../urlShare/whenUrlShareRestoreSettled.js",
  "../urlShare/presentPendingUrlShareMessage.js",
  "./state/buildRestoreResult.js",
  "./state/ensureWritebackRuntime.js"
], function (
  _constants,
  _errorCodes,
  _createRunContext,
  _executeRestoreRun,
  _skipDefaultRestoreForUrlParameterId,
  _waitForRootLifecycleReady,
  _whenUrlShareRestoreSettled,
  _presentPendingUrlShareMessage,
  _buildRestoreResult,
  _ensureWritebackRuntime
) {
  "use strict";

  function clearWritebackRuntime(_runtime) {
    var key, bucket;
    if (!_runtime) return;
    bucket = _runtime.abortControllers;
    if (bucket && typeof bucket === "object") {
      for (key in bucket) {
        if (Object.prototype.hasOwnProperty.call(bucket, key) && bucket[key] && typeof bucket[key].abort === "function") {
          try { bucket[key].abort(); } catch (_error) { /* destroy abort is best-effort */ }
        }
      }
    }
    bucket = _runtime.timers;
    if (bucket && typeof bucket === "object") {
      for (key in bucket) {
        if (Object.prototype.hasOwnProperty.call(bucket, key)) clearTimeout(bucket[key]);
      }
    }
    _runtime.abortControllers = {};
    _runtime.timers = {};
    _runtime.pendingUrlShareMessage = null;
    _runtime.pendingRestoreFailure = false;
    _runtime.pendingRestoreInfo = null;
    _runtime.urlShareBootOverlayActive = false;
    _runtime.urlShareRestoreWaiter = null;
  }

  function throwDefaultOverlap(_activeRun, _rawStatus) {
    throw _errorCodes.createWritebackError(
      _errorCodes.codes.WRITEBACK_RESTORE_CANCELLED, "set",
      "second default restore rejected while another restore is in flight",
      { activeRunId: _activeRun.runId, status: _rawStatus }
    );
  }

  function createWritebackSetService(deps) {
    const _KDB = deps._KDB;
    let _isDisposed = false;
    let _activeRun = null;

    async function restore(v3, status, options) {
      if (_isDisposed) {
        throw _errorCodes.createWritebackError(
          _errorCodes.codes.WRITEBACK_RESTORE_CANCELLED, "set", "writebackSet service is disposed"
        );
      }
      const rawStatus = status === undefined || status === null ? "notDefaultParamSet" : String(status);
      const statusKind = _constants.STATUS_TABLE[rawStatus];
      if (!statusKind) {
        throw _errorCodes.createWritebackError(
          _errorCodes.codes.WRITEBACK_UNSUPPORTED_STATUS, "set",
          rawStatus === "sichtChange"
            ? "status \"sichtChange\" is reserved and unsupported in tranche 1"
            : "unsupported writeback restore status",
          { status: rawStatus }
        );
      }
      if (statusKind === "default") {
        const skip = _skipDefaultRestoreForUrlParameterId(_KDB, {
          rawStatus: rawStatus, statusKind: statusKind, options: options, activeRun: !!_activeRun
        });
        if (skip.kind === "throwOverlap") throwDefaultOverlap(_activeRun, rawStatus);
        if (skip.kind === "skipped") return skip.restoreResult;
      }
      if (_activeRun) {
        if (statusKind === "default") throwDefaultOverlap(_activeRun, rawStatus);
        _activeRun.cancelRequested = true;
        try { await _activeRun.settled; } catch (_error) { /* previous run settles itself */ }
      }
      const run = _createRunContext(_KDB, rawStatus, statusKind, options);
      let resolveSettled;
      _activeRun = {
        runId: run.runId,
        get cancelRequested() { return run.cancelRequested; },
        set cancelRequested(value) { run.cancelRequested = value === true; },
        settled: new Promise(function (resolve) { resolveSettled = resolve; })
      };
      try {
        if (statusKind === "default") {
          const ready = await _waitForRootLifecycleReady(_KDB, run);
          if (!ready.proceed) return _buildRestoreResult.buildRestoreResult(run, "cancelled");
        }
        return await _executeRestoreRun(_KDB, run, v3);
      } finally {
        if (_activeRun && _activeRun.runId === run.runId) _activeRun = null;
        resolveSettled();
      }
    }

    function destroy() {
      _isDisposed = true;
      clearWritebackRuntime(_ensureWritebackRuntime(_KDB));
      if (_activeRun) _activeRun.cancelRequested = true;
    }

    function whenUrlShareRestoreSettled() {
      try {
        if (_isDisposed) return Promise.resolve({ kind: "failed", parameterId: null });
        return _whenUrlShareRestoreSettled(_KDB);
      } catch (error) {
        console.error("[writebackSet.whenUrlShareRestoreSettled] failed", error);
        return Promise.resolve({ kind: "failed", parameterId: null });
      }
    }

    function presentPendingUrlShareMessage() {
      try {
        if (_isDisposed) return undefined;
        return _presentPendingUrlShareMessage(_KDB);
      } catch (error) {
        console.error("[writebackSet.presentPendingUrlShareMessage] failed", error);
      }
    }

    return {
      restore: restore,
      destroy: destroy,
      whenUrlShareRestoreSettled: whenUrlShareRestoreSettled,
      presentPendingUrlShareMessage: presentPendingUrlShareMessage
    };
  }

  return createWritebackSetService;
});
