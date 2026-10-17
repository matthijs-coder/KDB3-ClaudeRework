define([
  "./confirmDiscardUnsavedChanges.js",
  "./normalizeBridgeSetInput.js",
  "./bridgeResult.js",
  "../../../core/config/writebackErrorCodes.js",
  "./waitForBridgeSetSettlement.js",
  "../set/config/restoreConstants.js"
], function (
  _confirmDiscardUnsavedChanges,
  _normalizeBridgeSetInput,
  _bridgeResult,
  _errorCodes,
  _waitForBridgeSetSettlement,
  _restoreConstants
) {
  "use strict";

  function notifyAfterRestore(_KDB, result, rawStatus, restoreStartedAt) {
    var statusKind = _restoreConstants.STATUS_TABLE[rawStatus];
    var meta;
    if (!statusKind) return;
    meta = { statusKind: statusKind };
    if (typeof restoreStartedAt === "number") meta.restoreStartedAt = restoreStartedAt;
    _waitForBridgeSetSettlement.notifyBridgeSetSettled(_KDB, result, meta);
  }

  async function runBridgeSetRestore(_KDB, _raw, _status) {
    const status = _bridgeResult.normalizeStatus(_status);
    var restoreStartedAt;
    var didEnterRestore = false;
    var result;
    var statusKind;
    var proceed;
    statusKind = _restoreConstants.STATUS_TABLE[status];
    proceed = await _confirmDiscardUnsavedChanges(_KDB, statusKind);
    if (proceed !== true) {
      return _bridgeResult.cancelledResult(status);
    }
    try {
      if (status === "newDashboard") {
        restoreStartedAt = Date.now();
        didEnterRestore = true;
        result = await _KDB.services.writebackSet.restore(null, status);
        notifyAfterRestore(_KDB, result, status, restoreStartedAt);
        return result;
      }
      const input = _normalizeBridgeSetInput(_raw, status);
      if (input.format === "v3") {
        restoreStartedAt = Date.now();
        didEnterRestore = true;
        result = await _KDB.services.writebackSet.restore(input.payload, status, { source: "bridge" });
        notifyAfterRestore(_KDB, result, status, restoreStartedAt);
        return result;
      }
      if (input.format === "v2") {
        const diagnostics = [];
        const v3 = _KDB.services.writebackMap.toV3(input.payload, { diagnostics: diagnostics });
        restoreStartedAt = Date.now();
        didEnterRestore = true;
        result = await _KDB.services.writebackSet.restore(v3, status, { source: "bridge" });
        if (diagnostics.length > 0) {
          result.diagnostics = diagnostics.concat(result.diagnostics || []);
        }
        notifyAfterRestore(_KDB, result, status, restoreStartedAt);
        return result;
      }
      throw _errorCodes.createWritebackError(
        _errorCodes.codes.WRITEBACK_UNSUPPORTED_LEGACY_FORMAT, "bridge",
        "WBParameterSetFunction payload has an unsupported or unknown format",
        { detectedFormat: input.format, status: status }
      );
    } catch (error) {
      console.error("[writebackBridge.runBridgeSetRestore] failed", error);
      result = _bridgeResult.failureResult(status, [_bridgeResult.toBridgeDiagnostic(error)]);
      if (didEnterRestore) notifyAfterRestore(_KDB, result, status, restoreStartedAt);
      return result;
    }
  }

  return runBridgeSetRestore;
});
