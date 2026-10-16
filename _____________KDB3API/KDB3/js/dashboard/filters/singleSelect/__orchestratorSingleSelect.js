define([
  "./state/initialState.js",
  "./config/selectors.js",
  "./createSingleSelectController.js",
  "./history/createSingleSelectHistoryReplayHandler.js",
  "./effects/ensureSingleSelectRuntime.js"
], function (_initialState, _selectorConfig, _createSingleSelectController, _createHandler, _ensureRuntime) {
  "use strict";

  // Lifecycle terms for singleSelect: idle, ready, error, disposed.

  function stageSingleSelectHistoryReplayHandler(_KDB) {
    var rt = _KDB.runtime && _KDB.runtime.singleSelect;
    if (!rt) {
      return null;
    }
    var handler = _createHandler(_KDB);
    rt.historyReplayHandlerContribution = handler;
    return handler;
  }

  // Composition root for the host adapter (tabs adapter model). cognosHost is
  // registered as the first core service, so it exists by the time the filter
  // orchestrators run; the guard covers a harness that boots without services.
  function readFiltersFacet(_KDB) {
    var service = _KDB.services ? _KDB.services.cognosHost : null;
    return service && service.filters ? service.filters : null;
  }

  function __orchestrator(_KDB, _options) {
    try {
      _KDB.state = _KDB.state || {};
      _KDB.state.filters = _KDB.state.filters || {};
      _KDB.api = _KDB.api || {};
      _KDB.elements = _KDB.elements || {};
      _KDB.elements.selectors = _KDB.elements.selectors || {};
      _KDB.elements.selectors.singleSelect = _selectorConfig;
      if (!_KDB.state.filters.singleSelect) {
        _KDB.state.filters.singleSelect = _initialState();
      }
      _ensureRuntime(_KDB);
      _KDB.runtime.singleSelect.filtersFacet = readFiltersFacet(_KDB);
      stageSingleSelectHistoryReplayHandler(_KDB);
      var controller = _createSingleSelectController({ _KDB: _KDB, options: _options || {} });
      _KDB.api.singleSelect = controller;
      return controller;
    } catch (error) {
      console.error("[singleSelect.__orchestrator] failed", error);
      throw error;
    }
  }

  return __orchestrator;
});
