define(["../../../../core/utils/rewriteUniqueNameSourceToken.js"], function (
  _rewriteUniqueNameSourceToken
) {
  "use strict";

  function readMetricsDataSourcePrefix(_KDB) {
    var defaultConfig = _KDB && _KDB.config && _KDB.config.dataSources && _KDB.config.dataSources.metrics
      ? _KDB.config.dataSources.metrics.default
      : null;
    if (defaultConfig && typeof defaultConfig === "object") {
      return defaultConfig.prefix || defaultConfig.name || null;
    }
    return defaultConfig || null;
  }

  function rewriteToMetricsSource(_KDB, _itemId) {
    var targetPrefix = readMetricsDataSourcePrefix(_KDB);
    return _rewriteUniqueNameSourceToken.rewriteUniqueNameSourceToken(_itemId, targetPrefix);
  }

  function rewriteValuesToMetricsSource(_KDB, _values) {
    var values = Array.isArray(_values) ? _values : [];
    var idx;
    var out = [];
    for (idx = 0; idx < values.length; idx += 1) {
      out.push(rewriteToMetricsSource(_KDB, values[idx]));
    }
    return out;
  }

  return {
    rewriteToMetricsSource: rewriteToMetricsSource,
    rewriteValuesToMetricsSource: rewriteValuesToMetricsSource
  };
});
