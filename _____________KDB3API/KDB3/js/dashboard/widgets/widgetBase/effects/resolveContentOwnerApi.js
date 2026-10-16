define([], function () {
  function resolveMetricByCode(_KDB, _code) {
    const api = _KDB && _KDB.api && _KDB.api.metricsTree;
    if (!api || typeof api.resolveMetricByCode !== "function") {
      return { resolved: false, code: "", display: "", metricsTable: "", langtext: "", url: "" };
    }
    const descriptor = api.resolveMetricByCode(_code);
    return descriptor && descriptor.resolved === true
      ? descriptor
      : { resolved: false, code: "", display: "", metricsTable: "", langtext: "", url: "" };
  }

  function resolveContentApi(_KDB, kind) {
    if (!_KDB || !_KDB.api) {
      return null;
    }
    if (kind === "text") {
      return _KDB.api.widgetText;
    }
    if (kind === "vis") {
      return _KDB.api.widgetVis;
    }
    if (kind === "datatable") {
      return _KDB.api.widgetDataTable;
    }
    if (kind === "topN") {
      return _KDB.api.widgetTopN;
    }
    return null;
  }

  function dispatchContentAction(api, action) {
    if (!api || typeof api.dispatch !== "function") {
      return null;
    }
    return Promise.resolve(api.dispatch(action));
  }

  return {
    resolveMetricByCode: resolveMetricByCode,
    resolveContentApi: resolveContentApi,
    dispatchContentAction: dispatchContentAction
  };
});
