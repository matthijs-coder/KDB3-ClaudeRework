define([
  "../config/actionTypes.js",
  "../runtime/ensureWidgetRuntime.js",
  "../runtime/contentReady.js",
  "../state/normalizeMetricIdentity.js",
  "../view/resolveVisualizationContent.js",
  "../effects/runBindingPipeline.js",
  "./normalizeDispatchResult.js",
  "./ensureFocusObserver.js",
  "./finalizePipelineResult.js",
  "../effects/runContentCreateDrillthroughInstall.js"
], function (
  _actionTypes,
  _ensureWidgetRuntime,
  _contentReady,
  _normalizeMetricIdentity,
  _resolveVisualizationContent,
  _runBindingPipeline,
  _normalizeDispatchResult,
  _ensureFocusObserver,
  _finalizePipelineResult,
  _runContentCreateDrillthroughInstall
) {
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
    var runtime = _ensureWidgetRuntime(_KDB, widgetId);
    var domRefs = _resolveVisualizationContent(widgetId);
    runtime.domRefs = Object.assign({}, runtime.domRefs || {}, domRefs);
    _context.dispatchInternal({
      type: _actionTypes.REGISTER_CONTENT,
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
    _contentReady.resolveContentReadyWaiters(_KDB, widgetId);
    _ensureFocusObserver(_context, widgetId, runtime);
  }

  function runExplicitInitialBinding(_context, _action, _metric, _settings) {
    _context.dispatchInternal({
      type: _actionTypes.MARK_PENDING,
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
      return _finalizePipelineResult(_context, _action, result, {
        defaultErrorCode: "WIDGET_VIS_CONTENT_CREATE_FAILED",
        defaultErrorMessage: "Content create binding failed."
      });
    });
  }
  function handleContentCreate(_context, _action) {
    try {
      var payload = _action.payload || {};
      var metric = _normalizeMetricIdentity.resolveMetricFromContentCreatePayload(payload);
      var widgetId = _action.widgetId;

      if (!metric.code) {
        return Promise.resolve(_normalizeDispatchResult({
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
        return Promise.resolve(_normalizeDispatchResult({
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
        type: _actionTypes.ERROR_RECORDED,
        widgetId: _action.widgetId,
        payload: {
          errorCode: "WIDGET_VIS_CONTENT_CREATE_FAILED",
          errorMessage: String(err && err.message ? err.message : err)
        }
      });
      return Promise.resolve(_normalizeDispatchResult({
        ok: false,
        widgetId: _action.widgetId,
        errorCode: "WIDGET_VIS_CONTENT_CREATE_FAILED",
        errorMessage: String(err && err.message ? err.message : err)
      }));
    }
  }

  return handleContentCreate;
});
