define(["../../../../utils/kit/runtime.js"], function (_kitRuntime) {
  "use strict";

  var DEFAULTS = Object.freeze({
    parameterSetRestoreActive: false,
    parameterSetRestoreActiveCount: 0,
    parameterSetRestoreRunId: 0,
    pendingRunId: null,
    skipDiscardConfirmOnce: false,
    lastConfirmedParameterSetId: null,
    discardConfirmInFlight: false,
    pendingUrlShareMessage: null,
    pendingRestoreFailure: false,
    pendingRestoreInfo: null,
    urlShareRestoreWaiter: null,
    urlShareStartupPromise: null,
    urlShareBootOverlayActive: false,
    persistRestoreGeneration: 0,
    getPersistLoadingHandle: null
  });

  // Flags are written by other modules (and by widgetBase through `+= 1`); a wrong type is repaired on read
  // so every consumer can rely on booleans and numbers.
  function coerceFlags(runtime) {
    runtime.parameterSetRestoreActive = runtime.parameterSetRestoreActive === true;
    runtime.parameterSetRestoreActiveCount = typeof runtime.parameterSetRestoreActiveCount === "number"
      ? runtime.parameterSetRestoreActiveCount : 0;
    runtime.parameterSetRestoreRunId = typeof runtime.parameterSetRestoreRunId === "number"
      ? runtime.parameterSetRestoreRunId : 0;
    if (runtime.pendingRunId == null) runtime.pendingRunId = null;
    runtime.skipDiscardConfirmOnce = runtime.skipDiscardConfirmOnce === true;
    runtime.discardConfirmInFlight = runtime.discardConfirmInFlight === true;
    runtime.pendingRestoreFailure = runtime.pendingRestoreFailure === true;
    runtime.urlShareBootOverlayActive = runtime.urlShareBootOverlayActive === true;
    return runtime;
  }

  // Single accessor for `_KDB.runtime.writeback`: always the same object, every flag and all 7 buckets present.
  function ensureWritebackRuntime(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    if (!_KDB.runtime.writeback || typeof _KDB.runtime.writeback !== "object") {
      _KDB.runtime.writeback = {};
    }
    return coerceFlags(_kitRuntime.ensureRuntime(_KDB, "writeback", DEFAULTS));
  }

  return ensureWritebackRuntime;
});
