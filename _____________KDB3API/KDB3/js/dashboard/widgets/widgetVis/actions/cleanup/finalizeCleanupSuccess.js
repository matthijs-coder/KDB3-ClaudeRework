define([
  "../../config/actionTypes.js",
  "../normalizeDispatchResult.js"
], function (_actionTypes, _normalizeDispatchResult) {
  "use strict";

  function finalizeCleanupSuccess(_context, _widgetId, _opSeq, _payload, _result, _cleanupDiagnostics) {
    var isTechnicalSettingsDeleteReset = _payload.clearBinding === true && _payload.reason === "settingsDelete";
    var isSemanticEmptyCleanup = _payload.clearBinding === true && !isTechnicalSettingsDeleteReset;
    _context.dispatchInternal({
      type: _actionTypes.CLEANUP_SUCCEEDED,
      widgetId: _widgetId,
      payload: {
        derived: Object.assign({}, (_result && _result.derived) || {}, {
          topNResultValues: [],
          emptyStatus: isSemanticEmptyCleanup ? "intentional" : null,
          emptyReason: isSemanticEmptyCleanup ? (_payload.reason || "cleanup") : null
        })
      }
    });
    var normalized = _result || { ok: true, widgetId: _widgetId, opSeq: _opSeq, status: "success" };
    if (_cleanupDiagnostics) {
      normalized.diagnostics = Object.assign({}, normalized.diagnostics || {}, {
        cleanup: _cleanupDiagnostics
      });
    }
    return _normalizeDispatchResult(normalized);
  }

  return finalizeCleanupSuccess;
});
