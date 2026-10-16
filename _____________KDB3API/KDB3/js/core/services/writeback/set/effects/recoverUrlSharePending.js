define(["../../schema/errorCodes.js"], function (_errorCodes) {
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

  async function recoverUrlSharePending(_KDB, _runtime, _mapped) {
    var writebackSet = _KDB.services && _KDB.services.writebackSet;
    var restoreResult;
    var recoverCopy;
    try {
      recoverCopy = readRecoverCopy(_mapped);
      _runtime.pendingUrlShareMessage = { parameterId: _mapped.parameterId, copy: recoverCopy };
      if (!writebackSet || typeof writebackSet.restore !== "function") {
        return { kind: "failed", parameterId: _mapped.parameterId };
      }
      try {
        restoreResult = await writebackSet.restore(null, "newDashboard");
      } catch (error) {
        console.error("[writebackSet.recoverUrlSharePending] recovery restore failed", error);
        if (isUrlShareDestroyed(_KDB, _runtime)) {
          clearPending(_runtime);
        }
        return { kind: "failed", parameterId: _mapped.parameterId };
      }
      if (isUrlShareDestroyed(_KDB, _runtime)) {
        clearPending(_runtime);
        return { kind: "failed", parameterId: _mapped.parameterId, restoreResult: restoreResult };
      }
      appendRecoveryDiagnostics(restoreResult, _mapped);
      if (!restoreResult || restoreResult.ok === false) {
        return { kind: "failed", parameterId: _mapped.parameterId, restoreResult: restoreResult };
      }
      return { kind: recoverCopy, parameterId: _mapped.parameterId, restoreResult: restoreResult };
    } catch (error) {
      console.error("[writebackSet.recoverUrlSharePending] failed", error);
      return { kind: "failed", parameterId: _mapped && _mapped.parameterId };
    }
  }

  return recoverUrlSharePending;
});
