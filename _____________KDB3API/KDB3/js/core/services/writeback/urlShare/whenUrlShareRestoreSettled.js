define([
  "./readUrlParameterId.js",
  "../set/state/ensureWritebackRuntime.js",
  "./mapUrlShareSelectResult.js",
  "./recoverUrlSharePending.js",
  "./presentPendingUrlShareMessage.js",
  "../bridge/ensureNewDashboardOption.js",
  "./waitForSingleSelectInventoryQuiet.js"
], function (
  _readUrlParameterId,
  _ensureWritebackRuntime,
  _mapUrlShareSelectResult,
  _recoverUrlSharePending,
  _presentPendingUrlShareMessage,
  _ensureNewDashboardOption,
  _waitForSingleSelectInventoryQuiet
) {
  "use strict";

  function isUrlShareDestroyed(_KDB, _runtime) {
    var controller;
    if (_KDB && _KDB._isDisposed === true) return true;
    controller = _runtime && _runtime.abortControllers && _runtime.abortControllers.urlShareStartup;
    return !!(controller && controller.signal && controller.signal.aborted);
  }

  function clearPending(_runtime) {
    _runtime.pendingUrlShareMessage = null;
    _runtime.pendingRestoreFailure = false;
    _runtime.pendingRestoreInfo = null;
  }

  async function runUrlShareStartup(_KDB) {
    var runtime = _ensureWritebackRuntime(_KDB);
    var controller = new AbortController();
    var parameterId;
    var selectResult;
    var mapped;
    var bridge;
    var quietResult;
    runtime.abortControllers.urlShareStartup = controller;
    try {
      if (isUrlShareDestroyed(_KDB, runtime)) {
        clearPending(runtime);
        return { kind: "failed", parameterId: null };
      }
      parameterId = _readUrlParameterId();
      if (isUrlShareDestroyed(_KDB, runtime)) {
        clearPending(runtime);
        return { kind: "failed", parameterId: parameterId };
      }
      if (parameterId == null) {
        return { kind: "absent", parameterId: null };
      }
      quietResult = await _waitForSingleSelectInventoryQuiet(_KDB, controller.signal);
      if (!quietResult || quietResult.quiet !== true) {
        if ((quietResult && quietResult.aborted === true) || isUrlShareDestroyed(_KDB, runtime)) {
          clearPending(runtime);
        } else {
          console.warn("[writebackSet.whenUrlShareRestoreSettled] single-select inventory quiet wait failed", parameterId);
        }
        return { kind: "failed", parameterId: parameterId };
      }
      bridge = _KDB.services && _KDB.services.writebackBridge;
      selectResult = await bridge.selectParameterSetById(parameterId, { signal: controller.signal });
      mapped = _mapUrlShareSelectResult(selectResult, parameterId, isUrlShareDestroyed(_KDB, runtime));
      if (mapped.shouldRecover) {
        return await _recoverUrlSharePending(_KDB, runtime, mapped);
      }
      if (mapped.kind === "failed" && isUrlShareDestroyed(_KDB, runtime)) {
        clearPending(runtime);
      }
      return mapped;
    } catch (error) {
      console.error("[writebackSet.whenUrlShareRestoreSettled] failed", error);
      if (isUrlShareDestroyed(_KDB, runtime)) clearPending(runtime);
      return { kind: "failed", parameterId: parameterId || null };
    } finally {
      runtime.urlShareBootOverlayActive = false;
      try {
        if (typeof runtime.ownedBridgeSet === "function") {
          _ensureNewDashboardOption(_KDB, runtime.ownedBridgeSet);
        }
      } catch (error) {
        console.error("[writebackSet.whenUrlShareRestoreSettled] failed", error);
      }
      _presentPendingUrlShareMessage(_KDB);
    }
  }

  function whenUrlShareRestoreSettled(_KDB) {
    var runtime;
    try {
      runtime = _ensureWritebackRuntime(_KDB);
      if (_KDB && _KDB._isDisposed === true) {
        return Promise.resolve({ kind: "failed", parameterId: null });
      }
      if (runtime.urlShareStartupPromise) return runtime.urlShareStartupPromise;
      runtime.urlShareBootOverlayActive = true;
      runtime.urlShareStartupPromise = runUrlShareStartup(_KDB);
      return runtime.urlShareStartupPromise;
    } catch (error) {
      console.error("[writebackSet.whenUrlShareRestoreSettled] failed", error);
      return Promise.resolve({ kind: "failed", parameterId: null });
    }
  }

  return whenUrlShareRestoreSettled;
});
