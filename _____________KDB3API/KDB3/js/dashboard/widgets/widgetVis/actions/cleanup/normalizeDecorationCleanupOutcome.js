define([
  "../../state.js",
  "../../results.js",
  "./finalizeCleanupSuccess.js"
], function (_state, _results, _finalizeCleanupSuccess) {
  "use strict";

  function normalizeDecorationCleanupOutcome(_context, _widgetId, _opSeq, _payload, _cleanupResult, _bindingResult) {
    if (_cleanupResult && _cleanupResult.stale === true) {
      return _results.normalizeDispatchResult({
        ok: false,
        widgetId: _widgetId,
        opSeq: _opSeq,
        stale: true,
        status: "aborted"
      });
    }
    if (!_cleanupResult || _cleanupResult.ok !== true) {
      _context.dispatchInternal({
        type: _state.ACTION_TYPES.ERROR_RECORDED,
        widgetId: _widgetId,
        payload: {
          errorCode: _cleanupResult && _cleanupResult.errorCode ? _cleanupResult.errorCode : "WIDGET_VIS_CLEANUP_FAILED",
          errorMessage: _cleanupResult && _cleanupResult.errorMessage
            ? _cleanupResult.errorMessage
            : "Visual decoration cleanup failed."
        }
      });
      return _results.normalizeDispatchResult(_cleanupResult || {
        ok: false,
        widgetId: _widgetId,
        opSeq: _opSeq,
        errorCode: "WIDGET_VIS_CLEANUP_FAILED"
      });
    }
    return _finalizeCleanupSuccess(
      _context,
      _widgetId,
      _opSeq,
      _payload,
      _bindingResult || {
        ok: true,
        widgetId: _widgetId,
        opSeq: _opSeq,
        status: "success"
      },
      _cleanupResult.diagnostics
    );
  }

  return normalizeDecorationCleanupOutcome;
});
