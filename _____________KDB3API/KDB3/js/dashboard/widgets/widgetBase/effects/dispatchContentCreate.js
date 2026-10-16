define(["./resolveContentOwnerApi.js"], function (_contentOwnerApi) {
  function dispatchContentCreate(_KDB, _request) {
    try {
      const request = _request || {};
      const kind = request.kind;
      const widgetId = request.widgetId;
      const payload = request.payload || {};
      const api = _contentOwnerApi.resolveContentApi(_KDB, kind);
      if (!api || typeof api.dispatch !== "function") {
        return Promise.resolve({ ok: false, errorCode: "WIDGET_BASE_CONTENT_CREATE_FAILED", errorMessage: "Content owner API unavailable for kind " + kind + "." });
      }
      const action = buildContentAction(_KDB, kind, widgetId, payload);
      return _contentOwnerApi.dispatchContentAction(api, action).then(function (result) {
        if (result && result.ok === false) {
          return { ok: false, errorCode: "WIDGET_BASE_CONTENT_CREATE_FAILED", errorMessage: result.errorMessage || "Content create rejected." };
        }
        return { ok: true, result: result };
      }).catch(function (err) {
        console.error("[widgetBase.dispatchContentCreate] content owner dispatch failed", kind, widgetId, err);
        return { ok: false, errorCode: "WIDGET_BASE_CONTENT_CREATE_FAILED", errorMessage: String(err && err.message ? err.message : err) };
      });
    } catch (err) {
      console.error("[widgetBase.dispatchContentCreate] sync boundary failed", err);
      return Promise.resolve({ ok: false, errorCode: "WIDGET_BASE_CONTENT_CREATE_FAILED", errorMessage: String(err && err.message ? err.message : err) });
    }
  }

  function buildVisMetric(_KDB, dropPayload) {
    const source = dropPayload || {};
    const code = source.code || source.kennzahlCode || "";
    const resolved = _contentOwnerApi.resolveMetricByCode(_KDB, code);
    return {
      code: firstNonEmpty(resolved.code, code),
      display: firstNonEmpty(resolved.display, source.display, source.kennzahlDisplay, source.title),
      metricsTable: firstNonEmpty(resolved.metricsTable, source.metricsTable, source.kennzahlenTable),
      langtext: firstNonEmpty(resolved.langtext, source.langtext),
      url: firstNonEmpty(resolved.url, source.url)
    };
  }

  function firstNonEmpty() {
    for (let i = 0; i < arguments.length; i += 1) {
      const value = arguments[i];
      if (value != null && String(value).trim() !== "") {
        return String(value);
      }
    }
    return "";
  }

  function buildVisContentCreatePayload(_KDB, payload) {
    const requestPayload = payload || {};
    const dropPayload = requestPayload.payload || (requestPayload.dropRequest && requestPayload.dropRequest.payload) || {};
    return Object.assign({}, requestPayload, {
      metric: requestPayload.metric || buildVisMetric(_KDB, dropPayload)
    });
  }

  function buildContentAction(_KDB, kind, widgetId, payload) {
    if (kind === "text") {
      return { type: "widgetText/contentCreate", widgetId: widgetId, payload: payload };
    }
    if (kind === "vis") {
      return { type: "widgetVis/contentCreate", widgetId: widgetId, payload: buildVisContentCreatePayload(_KDB, payload) };
    }
    if (kind === "datatable") {
      return { type: "widgetDataTable/contentCreate", widgetId: widgetId, payload: payload };
    }
    if (kind === "topN") {
      return { type: "widgetTopN/contentCreate", widgetId: widgetId, payload: payload };
    }
    return { type: "widgetBase/unsupportedContentCreate", widgetId: widgetId, payload: payload };
  }

  return dispatchContentCreate;
});
