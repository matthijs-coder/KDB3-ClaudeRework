define([
  "./state/initialState.js",
  "./createNativeMultiSelectController.js",
  "./history/createNativeMultiSelectHistoryReplayHandler.js"
], function (_initialState, _createNativeMultiSelectController, _createHandler) {
  "use strict";

  // Lifecycle terms for NativeMultiSelect: idle, ready, error, disposed.

  function stageNativeMultiSelectHistoryReplayHandler(_KDB) {
    try {
      _KDB.runtime = _KDB.runtime || {};
      _KDB.runtime.nativeMultiSelect = _KDB.runtime.nativeMultiSelect || {};
      var handler = _createHandler(_KDB);
      _KDB.runtime.nativeMultiSelect.historyReplayHandlerContribution = handler;
      return handler;
    } catch (err) {
      console.error("[nativeMultiSelect.stageNativeMultiSelectHistoryReplayHandler] failed", err);
      return null;
    }
  }

  // Composition root for the host adapter (tabs adapter model). cognosHost is
  // registered as the first core service, so it exists by the time the filter
  // orchestrators run; the guard covers a harness that boots without services.
  function readFiltersFacet(_KDB) {
    var service = _KDB.services ? _KDB.services.cognosHost : null;
    return service && service.filters ? service.filters : null;
  }

  // Tabs-leak stamp only — not filter-DI. Deep files read runtime.tabsFacet
  // and must not look up _KDB.services.cognosHost themselves.
  function readTabsFacet(_KDB) {
    var service = _KDB.services ? _KDB.services.cognosHost : null;
    return service && service.tabs ? service.tabs : null;
  }

  function __orchestrator(_KDB, _options) {
    _KDB.state = _KDB.state || {};
    _KDB.state.filters = _KDB.state.filters || {};
    _KDB.runtime = _KDB.runtime || {};
    _KDB.api = _KDB.api || {};

    if (!_KDB.state.filters.nativeMultiSelect) {
      _KDB.state.filters.nativeMultiSelect = _initialState();
    }

    _KDB.runtime.nativeMultiSelect = _KDB.runtime.nativeMultiSelect || {
      listeners: {},
      subscriptions: {},
      abortControllers: {},
      observers: {},
      timers: {},
      pendingPromises: {},
      tabMutationRunId: 0,
      parameterSetRunId: 0,
      tabMutationSnapshots: {}
    };
    _KDB.runtime.nativeMultiSelect.tabsFacet = readTabsFacet(_KDB);

    stageNativeMultiSelectHistoryReplayHandler(_KDB);

    var controller = _createNativeMultiSelectController({
      _KDB: _KDB,
      filtersFacet: readFiltersFacet(_KDB),
      options: _options || {}
    });
    _KDB.api.nativeMultiSelect = controller;
    return controller;
  }

  return __orchestrator;
});
