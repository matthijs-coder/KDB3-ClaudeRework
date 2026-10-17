define([
  "./config/restoreConstants.js",
  "../../../core/config/writebackErrorCodes.js",
  "./state/createRunContext.js",
  "./effects/executeRestoreRun.js",
  "../urlShare/skipDefaultRestoreForUrlParameterId.js",
  "./effects/waitForRootLifecycleReady.js",
  "../urlShare/whenUrlShareRestoreSettled.js",
  "../urlShare/presentPendingUrlShareMessage.js",
  "./state/buildRestoreResult.js",
  "./state/ensureWritebackRuntime.js",
  "../../../core/utils/kit/runtime.js",
  "../../../core/utils/kit/errors.js"
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
  _ensureWritebackRuntime,
  _runtimeKit,
  _errorsKit
) {
  "use strict";

  // The writeback runtime buckets are shared with writebackGet, which KDB
  // destroys after this service; its pending promises must survive here.
  function clearWritebackRuntime(_runtime) {
    const pendingPromises = _runtime.pendingPromises;
    const errors = _runtimeKit.disposeRuntimeBuckets(_runtime);
    if (pendingPromises && typeof pendingPromises === "object") {
      _runtime.pendingPromises = pendingPromises;
    }
    if (errors.length > 0) {
      console.warn("[writebackSet.destroy] runtime cleanup errors", errors);
    }
    _runtime.parameterSetRestoreActive = false;
    _runtime.parameterSetRestoreActiveCount = 0;
    _runtime.pendingRunId = null;
    _runtime.pendingUrlShareMessage = null;
    _runtime.pendingRestoreFailure = false;
    _runtime.pendingRestoreInfo = null;
    _runtime.urlShareBootOverlayActive = false;
    _runtime.urlShareRestoreWaiter = null;
    _runtime.urlShareStartupPromise = null;
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
    const _guard = _errorsKit.createDisposedGuard("writebackSet");
    let _activeRun = null;
    let _activeSettled = null;

    async function restore(v3, status, options) {
      if (_guard.isDisposed()) {
        throw _errorCodes.createWritebackError(
          _errorCodes.codes.WRITEBACK_RESTORE_CANCELLED, "set", "writebackSet service is disposed"
        );
      }
      const rawStatus = _constants.normalizeStatus(status);
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
        await _activeSettled;
      }
      const run = _createRunContext(_KDB, rawStatus, statusKind, options);
      let resolveSettled;
      _activeRun = run;
      _activeSettled = new Promise(function (resolve) { resolveSettled = resolve; });
      try {
        if (statusKind === "default") {
          const ready = await _waitForRootLifecycleReady(_KDB, run);
          if (!ready.proceed) return _buildRestoreResult.buildRestoreResult(run, "cancelled");
        }
        return await _executeRestoreRun(_KDB, run, v3);
      } finally {
        if (_activeRun === run) {
          _activeRun = null;
          _activeSettled = null;
        }
        resolveSettled();
      }
    }

    // Other owners that replay content outside a restore run (the duplicate-tab fill) draw from the same counter, so
    // every owner's parameterSetRunId guard stays monotone with real restore runs. Safe after destroy: a counter bump.
    function allocateRestoreRunId() {
      const runtime = _ensureWritebackRuntime(_KDB);
      runtime.parameterSetRestoreRunId += 1;
      return runtime.parameterSetRestoreRunId;
    }

    function destroy() {
      _guard.dispose();
      if (_activeRun) _activeRun.cancelRequested = true;
      clearWritebackRuntime(_ensureWritebackRuntime(_KDB));
    }

    function whenUrlShareRestoreSettled() {
      if (_guard.isDisposed()) return Promise.resolve({ kind: "failed", parameterId: null });
      return _whenUrlShareRestoreSettled(_KDB);
    }

    function presentPendingUrlShareMessage() {
      if (_guard.isDisposed()) return undefined;
      return _presentPendingUrlShareMessage(_KDB);
    }

    return {
      restore: restore,
      allocateRestoreRunId: allocateRestoreRunId,
      destroy: destroy,
      whenUrlShareRestoreSettled: whenUrlShareRestoreSettled,
      presentPendingUrlShareMessage: presentPendingUrlShareMessage
    };
  }

  return createWritebackSetService;
});
