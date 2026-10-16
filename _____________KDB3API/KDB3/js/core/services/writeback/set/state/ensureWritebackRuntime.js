define([], function () {
  "use strict";

  // Runtime restore flags per contracts/writeback.md §6; single canonical
  // accessor so every set/ module reads and writes the same bucket.
  function seedWritebackRuntimeKeys(runtime) {
    if (runtime.parameterSetRestoreActive === undefined) runtime.parameterSetRestoreActive = false;
    if (runtime.parameterSetRestoreActiveCount === undefined) runtime.parameterSetRestoreActiveCount = 0;
    if (runtime.parameterSetRestoreRunId === undefined) runtime.parameterSetRestoreRunId = 0;
    if (runtime.pendingRunId === undefined) runtime.pendingRunId = null;
    if (runtime.skipDiscardConfirmOnce === undefined) runtime.skipDiscardConfirmOnce = false;
    if (runtime.lastConfirmedParameterSetId === undefined) runtime.lastConfirmedParameterSetId = null;
    if (runtime.discardConfirmInFlight === undefined) runtime.discardConfirmInFlight = false;
    if (runtime.pendingUrlShareMessage === undefined) runtime.pendingUrlShareMessage = null;
    if (runtime.pendingRestoreFailure === undefined) runtime.pendingRestoreFailure = false;
    if (runtime.pendingRestoreInfo === undefined) runtime.pendingRestoreInfo = null;
    if (runtime.urlShareRestoreWaiter === undefined) runtime.urlShareRestoreWaiter = null;
    if (runtime.urlShareStartupPromise === undefined) runtime.urlShareStartupPromise = null;
    if (runtime.urlShareBootOverlayActive === undefined) runtime.urlShareBootOverlayActive = false;
    if (!runtime.abortControllers || typeof runtime.abortControllers !== "object") runtime.abortControllers = {};
    if (!runtime.timers || typeof runtime.timers !== "object") runtime.timers = {};
    return runtime;
  }

  function ensureWritebackRuntime(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    if (!_KDB.runtime.writeback || typeof _KDB.runtime.writeback !== "object") {
      _KDB.runtime.writeback = {};
    }
    return seedWritebackRuntimeKeys(_KDB.runtime.writeback);
  }

  return ensureWritebackRuntime;
});
