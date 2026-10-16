define([], function () {
  "use strict";

  function readMetricsTreeState(_KDB) {
    return _KDB && _KDB.state ? _KDB.state.metricsTree : undefined;
  }

  function readMetricsTreeSources(_KDB) {
    const state = readMetricsTreeState(_KDB);
    if (!state || !Array.isArray(state.sourceOrder) || !state.bySource) {
      return [];
    }

    return state.sourceOrder.map(function (sourceKey) {
      return state.bySource[sourceKey];
    }).filter(function (sourceEntry) {
      return sourceEntry !== undefined;
    });
  }

  function readMetricsTreeSource(_KDB, _sourceKey) {
    const state = readMetricsTreeState(_KDB);
    if (!state || !state.bySource) {
      return undefined;
    }

    return state.bySource[_sourceKey];
  }

  function readMetricsTreeReady(_KDB) {
    const state = readMetricsTreeState(_KDB);
    return Boolean(state && state.lifecycle === "ready" && state.hasRenderableData);
  }

  return {
    readMetricsTreeState: readMetricsTreeState,
    readMetricsTreeSources: readMetricsTreeSources,
    readMetricsTreeSource: readMetricsTreeSource,
    readMetricsTreeReady: readMetricsTreeReady
  };
});
