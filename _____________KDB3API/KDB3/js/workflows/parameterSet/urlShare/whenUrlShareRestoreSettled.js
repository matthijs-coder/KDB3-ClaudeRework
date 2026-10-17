define([
  "./readUrlParameterId.js",
  "../set/state/ensureWritebackRuntime.js",
  "../../../core/config/writebackErrorCodes.js",
  "./mapUrlShareSelectResult.js",
  "./presentPendingUrlShareMessage.js",
  "../bridge/ensureNewDashboardOption.js",
  "./waitForSingleSelectInventoryQuiet.js"
], function (
  _readUrlParameterId,
  _ensureWritebackRuntime,
  _errorCodes,
  _mapUrlShareSelectResult,
  _presentPendingUrlShareMessage,
  _ensureNewDashboardOption,
  _waitForSingleSelectInventoryQuiet
) {
  "use strict";

  function isUrlShareDestroyed(_KDB, _controller) {
    if (_KDB && _KDB._isDisposed === true) return true;
    return !!(_controller && _controller.signal && _controller.signal.aborted);
  }

  function clearPending(_runtime) {
    _runtime.pendingUrlShareMessage = null;
    _runtime.pendingRestoreFailure = false;
    _runtime.pendingRestoreInfo = null;
  }

  function readRecoverCopy(_mapped) {
    return _mapped && _mapped.recoverCopy === "hostListUnready" ? "hostListUnready" : "missingId";
  }

  function appendRecoveryDiagnostics(_restoreResult, _mapped) {
    if (!_restoreResult || !Array.isArray(_restoreResult.diagnostics)) return;
    if (_mapped.recoverCopy === "hostListUnready") {
      _restoreResult.diagnostics.push(_errorCodes.makeDiagnostic(
        _errorCodes.codes.WRITEBACK_URL_SHARE_HOST_LIST_UNREADY, "set",
        "host parameter-set list was not ready for URL share restore",
        { parameterId: _mapped.parameterId }
      ));
      return;
    }
    _restoreResult.diagnostics.push(_errorCodes.makeDiagnostic(
      _errorCodes.codes.WRITEBACK_URL_PARAMETER_ID_NOT_FOUND, "set",
      "URL parameterId was not found in the host parameter-set list",
      { parameterId: _mapped.parameterId }
    ));
    if (_mapped.waitTimedOut === true) {
      _restoreResult.diagnostics.push(_errorCodes.makeDiagnostic(
        _errorCodes.codes.WRITEBACK_URL_PARAMETER_SET_WAIT_TIMEOUT, "set",
        "matching parameter-set option existed but no matching SET settled in time",
        { parameterId: _mapped.parameterId }
      ));
    }
  }

  // The URL id could not be applied: reset to a new dashboard and leave the
  // alert copy pending for presentPendingUrlShareMessage.
  async function recoverUrlSharePending(_KDB, _runtime, _controller, _mapped) {
    var writebackSet = _KDB.services && _KDB.services.writebackSet;
    var recoverCopy = readRecoverCopy(_mapped);
    var restoreResult;
    _runtime.pendingUrlShareMessage = { parameterId: _mapped.parameterId, copy: recoverCopy };
    if (!writebackSet || typeof writebackSet.restore !== "function") {
      return { kind: "failed", parameterId: _mapped.parameterId };
    }
    try {
      restoreResult = await writebackSet.restore(null, "newDashboard");
    } catch (error) {
      console.error("[writebackSet.recoverUrlSharePending] recovery restore failed", error);
      if (isUrlShareDestroyed(_KDB, _controller)) {
        clearPending(_runtime);
      }
      return { kind: "failed", parameterId: _mapped.parameterId };
    }
    if (isUrlShareDestroyed(_KDB, _controller)) {
      clearPending(_runtime);
      return { kind: "failed", parameterId: _mapped.parameterId, restoreResult: restoreResult };
    }
    appendRecoveryDiagnostics(restoreResult, _mapped);
    if (!restoreResult || restoreResult.ok === false) {
      return { kind: "failed", parameterId: _mapped.parameterId, restoreResult: restoreResult };
    }
    return { kind: recoverCopy, parameterId: _mapped.parameterId, restoreResult: restoreResult };
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
      if (isUrlShareDestroyed(_KDB, controller)) {
        clearPending(runtime);
        return { kind: "failed", parameterId: null };
      }
      parameterId = _readUrlParameterId();
      if (isUrlShareDestroyed(_KDB, controller)) {
        clearPending(runtime);
        return { kind: "failed", parameterId: parameterId };
      }
      if (parameterId == null) {
        return { kind: "absent", parameterId: null };
      }
      quietResult = await _waitForSingleSelectInventoryQuiet(_KDB, controller.signal);
      if (!quietResult || quietResult.quiet !== true) {
        if ((quietResult && quietResult.aborted === true) || isUrlShareDestroyed(_KDB, controller)) {
          clearPending(runtime);
        } else {
          console.warn("[writebackSet.whenUrlShareRestoreSettled] single-select inventory quiet wait failed", parameterId);
        }
        return { kind: "failed", parameterId: parameterId };
      }
      bridge = _KDB.services && _KDB.services.writebackBridge;
      selectResult = await bridge.selectParameterSetById(parameterId, { signal: controller.signal });
      mapped = _mapUrlShareSelectResult(selectResult, parameterId, isUrlShareDestroyed(_KDB, controller));
      if (mapped.shouldRecover) {
        return await recoverUrlSharePending(_KDB, runtime, controller, mapped);
      }
      if (mapped.kind === "failed" && isUrlShareDestroyed(_KDB, controller)) {
        clearPending(runtime);
      }
      return mapped;
    } catch (error) {
      console.error("[writebackSet.whenUrlShareRestoreSettled] failed", error);
      if (isUrlShareDestroyed(_KDB, controller)) clearPending(runtime);
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
      if (runtime.abortControllers.urlShareStartup === controller) {
        delete runtime.abortControllers.urlShareStartup;
      }
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
