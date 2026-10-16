define([
  "./resolveContentOwnerApi.js",
  "../../widgetVis/config/actionTypes.js",
  "../../widgetText/config/actionTypes.js"
], function (_contentOwnerApi, _widgetVisActionTypes, _widgetTextActionTypes) {
  "use strict";

  function dispatchRestoreContentCreate(context, kind, widgetId, widget, payload) {
    return kind === "vis"
      ? dispatchVisCreate(context, widgetId, widget, payload)
      : dispatchTextCreate(context, widgetId, payload);
  }

  function dispatchVisCreate(context, widgetId, widget, payload) {
    var entryIndex = typeof payload.entryIndex === "number" ? payload.entryIndex : null;
    var metric = _contentOwnerApi.resolveMetricByCode(context._KDB, widget.code || "");
    var diagnostics = [];
    if (!metric.resolved) {
      diagnostics.push({
        code: "WRITEBACK_SKIPPED_BY_DESIGN",
        entryIndex: entryIndex,
        message: "metric display name not resolvable from metrics tree; widget title falls back to metric code"
      });
    }
    var api = _contentOwnerApi.resolveContentApi(context._KDB, "vis");
    if (!api || typeof api.dispatch !== "function") {
      return Promise.resolve({ ok: false, message: "widgetVis API is unavailable for restore contentCreate dispatch", diagnostics: diagnostics });
    }
    var dispatchPromise = _contentOwnerApi.dispatchContentAction(api, {
      type: _widgetVisActionTypes.CONTENT_CREATE,
      widgetId: widgetId,
      payload: {
        metric: {
          code: widget.code || "",
          display: metric.display || "",
          metricsTable: metric.metricsTable || "",
          langtext: metric.langtext || "",
          url: metric.url || ""
        },
        code: widget.code || "",
        source: payload.source || "writebackSet",
        runId: payload.runId,
        skipHistory: true,
        isParameterSetRestore: true,
        isHistoryReplay: true
      }
    });
    return dispatchPromise.then(function (subResult) {
      return subResult && subResult.ok === true
        ? { ok: true, diagnostics: diagnostics, degraded: diagnostics.length > 0 }
        : { ok: false, message: "widgetVis/contentCreate failed for metric code \"" + String(widget.code || "") + "\"" };
    }, function (err) {
      return { ok: false, message: "widgetVis/contentCreate threw: " + String(err && err.message ? err.message : err) };
    });
  }

  function dispatchTextCreate(context, widgetId, payload) {
    var api = _contentOwnerApi.resolveContentApi(context._KDB, "text");
    if (!api || typeof api.dispatch !== "function") {
      return Promise.resolve({ ok: false, message: "widgetText API is unavailable for restore contentCreate dispatch" });
    }
    var dispatchPromise = _contentOwnerApi.dispatchContentAction(api, {
      type: _widgetTextActionTypes.CONTENT_CREATE,
      widgetId: widgetId,
      payload: {
        source: payload.source || "writebackSet",
        runId: payload.runId,
        skipHistory: true,
        isParameterSetRestore: true,
        isHistoryReplay: true
      }
    });
    return dispatchPromise.then(function (subResult) {
      return subResult && subResult.ok === true
        ? { ok: true }
        : { ok: false, message: "widgetText/contentCreate failed during restore orchestration" };
    }, function (err) {
      return { ok: false, message: "widgetText/contentCreate threw: " + String(err && err.message ? err.message : err) };
    });
  }

  return dispatchRestoreContentCreate;
});
