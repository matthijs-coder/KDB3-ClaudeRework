define([
  "../../state.js",
  "../../binding/pipeline.js",
  "../../results.js",
  "./runDecorationCleanup.js"
], function (_state, _bindingPipeline, _results, _runDecorationCleanup) {
  "use strict";

  function buildCleanupBindingInput(_context, _widgetId, _opSeq, _payload) {
    // settingsDelete rebuilds an empty binding after the clear.
    // parameterSetReset only clears. Rebinding the Cognos datasource leaves a
    // live model that rejects the later page-context filter write.
    var resetReason = _payload.reason === "settingsDelete" || _payload.reason === "parameterSetReset";
    var settingsDeleteReset = resetReason && _payload.clearBinding === true;
    var input = {
      widgetId: _widgetId,
      opSeq: _opSeq,
      reason: "cleanup",
      metric: _context.readMetric(_widgetId),
      settings: _context.readSettingsSnapshot(_widgetId, _payload),
      payload: _payload
    };
    if (settingsDeleteReset) {
      input.emptyIntent = { enabled: false, reason: null, itemId: null, value: null };
      input.resetIntent = {
        enabled: true,
        scope: "visTarget",
        clearAllSlots: true,
        clearAllLocalFilters: true,
        reason: _payload.reason
      };
      return input;
    }
    input.forceEmpty = true;
    input.emptyReason = _payload.reason || "cleanup";
    return input;
  }

  function runBindingCleanup(_context, _widgetId, _opSeq, _payload) {
    return _bindingPipeline.runBindingPipeline(_context, buildCleanupBindingInput(_context, _widgetId, _opSeq, _payload)).then(function (result) {
      if (result && result.stale === true) {
        return _results.normalizeDispatchResult(result);
      }
      if (!result || result.ok !== true) {
        var failureCode = result && result.errorCode
          ? result.errorCode
          : "WIDGET_VIS_CLEANUP_FAILED";
        if (_payload.clearBinding === true && failureCode === "WIDGET_VIS_BINDING_APPLY_FAILED") {
          failureCode = "WIDGET_VIS_EMPTY_APPLY_FAILED";
        }
        _context.dispatchInternal({
          type: _state.ACTION_TYPES.ERROR_RECORDED,
          widgetId: _widgetId,
          payload: {
            errorCode: failureCode,
            errorMessage: result && result.errorMessage ? result.errorMessage : "Cleanup binding failed."
          }
        });
        return _results.normalizeDispatchResult(Object.assign({}, result || {}, {
          ok: false,
          widgetId: _widgetId,
          opSeq: _opSeq,
          errorCode: failureCode
        }));
      }
      return _runDecorationCleanup(_context, _widgetId, _opSeq, _payload, result);
    });
  }

  return runBindingCleanup;
});
