define([], function () {
  "use strict";

  function firstNonEmpty() {
    for (var i = 0; i < arguments.length; i += 1) {
      var value = arguments[i];
      if (value != null && String(value).trim() !== "") {
        return String(value);
      }
    }
    return "";
  }

  function normalizeMetricIdentity(_source) {
    var source = _source || {};
    return {
      code: firstNonEmpty(source.code, source.kennzahlCode),
      display: firstNonEmpty(source.display, source.kennzahlDisplay, source.title),
      metricsTable: firstNonEmpty(source.metricsTable, source.kennzahlenTable),
      langtext: firstNonEmpty(source.langtext),
      url: firstNonEmpty(source.url)
    };
  }

  function resolveMetricFromContentCreatePayload(_payload) {
    var payload = _payload || {};
    if (payload.metric && typeof payload.metric === "object") {
      return normalizeMetricIdentity(payload.metric);
    }
    var dropPayload = payload.payload || (payload.dropRequest && payload.dropRequest.payload) || {};
    return normalizeMetricIdentity(dropPayload);
  }

  return {
    normalizeMetricIdentity: normalizeMetricIdentity,
    resolveMetricFromContentCreatePayload: resolveMetricFromContentCreatePayload
  };
});
