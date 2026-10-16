define([
  "../state.js",
  "../runtime.js",
  "../dom.js",
  "../effects/runBindingPipeline.js",
  "../results.js",
  "./ensureFocusObserver.js",
  "../effects/runContentCreateDrillthroughInstall.js"
], function (_state, _visRuntime, _dom, _runBindingPipeline, _results, _ensureFocusObserver, _runContentCreateDrillthroughInstall) {
  "use strict";

  function buildExplicitInitialSettings(_payload) {
    var initial = _payload.initialSettings || {};
    return {
      dimension: initial.dimension != null ? initial.dimension : null,
      visType: initial.visType != null ? initial.visType : null,
      topNChoice: initial.topNChoice != null ? initial.topNChoice : null
    };
  }

  function hasExplicitBindingIntent(_payload) {
    var initial = _payload.initialSettings;
    if (!initial || typeof initial !== "object") {
      return false;
    }
    return !!(initial.dimension || initial.visType || initial.topNChoice);
  }

  function registerContentContext(_context, _action, _metric) {
    var widgetId = _action.widgetId;
    var _KDB = _context._KDB;
    var runtime = _visRuntime.ensureWidgetRuntime(_KDB, widgetId);
    var domRefs = _dom.resolveVisualizationContent(widgetId);
    runtime.domRefs = Object.assign({}, runtime.domRefs || {}, domRefs);
    _context.dispatchInternal({
      type: _state.ACTION_TYPES.REGISTER_CONTENT,
      widgetId: widgetId,
      payload: {
        record: {
          derived: {
            titleText: _metric.display || _metric.code || "",
            code: _metric.code || null,
            display: _metric.display || null,
            metricsTable: _metric.metricsTable || null,
            langtext: _metric.langtext || null,
            url: _metric.url || null,
            datasourceName: _metric.metricsTable || null
          }
        }
      }
    });
    _visRuntime.resolveContentReadyWaiters(_KDB, widgetId);
    _ensureFocusObserver(_context, widgetId, runtime);
  }

  function runExplicitInitialBinding(_context, _action, _metric, _settings) {
    _context.dispatchInternal({
      type: _state.ACTION_TYPES.MARK_PENDING,
      widgetId: _action.widgetId,
      payload: { kind: "contentCreate", opSeq: _action.opSeq }
    });
    return _runBindingPipeline(_context, {
      widgetId: _action.widgetId,
      opSeq: _action.opSeq,
      reason: "contentCreate",
      metric: _metric,
      settings: _settings,
      payload: _action.payload || {}
    }).then(function (result) {
      return _results.finalizePipelineResult(_context, _action, result, {
        defaultErrorCode: "WIDGET_VIS_CONTENT_CREATE_FAILED",
        defaultErrorMessage: "Content create binding failed."
      });
    });
  }
  function handleContentCreate(_context, _action) {
    try {
      var payload = _action.payload || {};
      var metric = _state.resolveMetricFromContentCreatePayload(payload);
      var widgetId = _action.widgetId;

      if (!metric.code) {
        return Promise.resolve(_results.normalizeDispatchResult({
          ok: false,
          widgetId: widgetId,
          status: "error",
          errorCode: "WIDGET_VIS_CONTENT_CREATE_FAILED",
          errorMessage: "Metric identity is required for content create."
        }));
      }

      registerContentContext(_context, _action, metric);
      _runContentCreateDrillthroughInstall(_context, widgetId);

      if (!hasExplicitBindingIntent(payload)) {
        return Promise.resolve(_results.normalizeDispatchResult({
          ok: true,
          widgetId: widgetId,
          opSeq: _action.opSeq,
          status: "success"
        }));
      }

      return runExplicitInitialBinding(_context, _action, metric, buildExplicitInitialSettings(payload));
    } catch (err) {
      console.error("[widgetVis.handleContentCreate] failed", _action && _action.widgetId, err);
      _context.dispatchInternal({
        type: _state.ACTION_TYPES.ERROR_RECORDED,
        widgetId: _action.widgetId,
        payload: {
          errorCode: "WIDGET_VIS_CONTENT_CREATE_FAILED",
          errorMessage: String(err && err.message ? err.message : err)
        }
      });
      return Promise.resolve(_results.normalizeDispatchResult({
        ok: false,
        widgetId: _action.widgetId,
        errorCode: "WIDGET_VIS_CONTENT_CREATE_FAILED",
        errorMessage: String(err && err.message ? err.message : err)
      }));
    }
  }

  return handleContentCreate;
});
