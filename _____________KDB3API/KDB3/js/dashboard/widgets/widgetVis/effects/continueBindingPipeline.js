define([
  "./applyVisualizationProperties.js",
  "../config/resolveVisualizationBindingConfig.js",
  "./continueBindingPlanAndApply.js",
  "./syncVisualizationTitle.js"
], function (_applyVisualizationProperties, _resolveVisualizationBindingConfig, _continueBindingPlanAndApply, _syncVisualizationTitle) {
  "use strict";

  function isCleanupMode(_input) {
    return !!(_input && (_input.reason === "cleanup" || _input.forceEmpty === true));
  }

  function continueBindingPipeline(_context, _input, _ctx) {
    if (isCleanupMode(_input)) {
      return _continueBindingPlanAndApply(_context, _input, _ctx, null);
    }
    var widgetId = _ctx.widgetId;
    var opSeq = _ctx.opSeq;
    var settings = (_input && _input.settings) || {};
    var visualizationType = settings.visType || _resolveVisualizationBindingConfig.resolveDefaultVisualizationType(_ctx._KDB);
    return Promise.resolve(_applyVisualizationProperties(_ctx._KDB, {
      widgetId: widgetId,
      visualizationType: visualizationType,
      runtime: _ctx.runtime,
      input: _input,
      signal: _ctx.abortController.signal,
      phase: "preBinding"
    })).then(function (propertyResult) {
      if (_context.isStaleOpSeq(widgetId, opSeq)) {
        return { ok: false, widgetId: widgetId, opSeq: opSeq, stale: true, status: "aborted" };
      }
      if (propertyResult && propertyResult.aborted === true) {
        return { ok: false, widgetId: widgetId, opSeq: opSeq, stale: true, status: "aborted" };
      }
      var propertyDiagnostics = propertyResult && propertyResult.diagnostics;
      var propertyBlockers = propertyDiagnostics && propertyDiagnostics.blockers || [];
      if (propertyBlockers.length > 0) {
        return {
          ok: false,
          widgetId: widgetId,
          opSeq: opSeq,
          status: "error",
          errorCode: "WIDGET_VIS_VISUALIZATION_PROPERTY_BLOCKED",
          errorMessage: "Visualization property apply blocked: " + propertyBlockers.join(", "),
          diagnostics: propertyDiagnostics,
          propertyDiagnostics: propertyDiagnostics
        };
      }
      // Cognos title once before render (legacy parity); post-render is DOM-only.
      return Promise.resolve(_syncVisualizationTitle.applyPreRenderTitle({
        _KDB: _ctx._KDB, widgetId: widgetId, metric: (_input && _input.metric) || {}, settings: settings, runtime: _ctx.runtime, signal: _ctx.abortController && _ctx.abortController.signal
      })).then(function (titleResult) {
        if (titleResult && titleResult.aborted === true) {
          return { ok: false, widgetId: widgetId, opSeq: opSeq, stale: true, status: "aborted" };
        }
        return _continueBindingPlanAndApply(_context, _input, _ctx, propertyResult);
      });
    });
  }

  return continueBindingPipeline;
});
