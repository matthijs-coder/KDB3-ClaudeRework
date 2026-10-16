define([], function () {
  "use strict";

  var LOCAL_METRICS_DATASOURCE_FALLBACK = "Personal_KDB";

  function resolveCurrentMetricsDataSource(_KDB) {
    var api = _KDB && _KDB.api && _KDB.api.dataSourceContext;
    var fromApi = api && typeof api.getCurrentMetricsDataSource === "function"
      ? api.getCurrentMetricsDataSource()
      : null;
    if (fromApi != null && fromApi !== "") {
      return String(fromApi).trim();
    }
    var configDefault = _KDB && _KDB.config && _KDB.config.dataSources && _KDB.config.dataSources.metrics
      ? _KDB.config.dataSources.metrics.default
      : null;
    if (configDefault && typeof configDefault === "object" && configDefault.name) {
      return String(configDefault.name).trim();
    }
    if (configDefault != null && configDefault !== "") {
      return String(configDefault).trim();
    }
    return LOCAL_METRICS_DATASOURCE_FALLBACK;
  }

  return resolveCurrentMetricsDataSource;
});
