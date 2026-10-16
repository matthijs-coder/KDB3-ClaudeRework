define([
  "./state/initialState.js",
  "./createDienststelleController.js",
  "./history/createDienststelleHistoryReplayHandler.js",
  "./config/dienststelleLabels.js"
], function (_initialState, _createDienststelleController, _createHandler, _dienststelleLabels) {
  "use strict";

  // Lifecycle terms for dienststelle: idle, ready, error, disposed.

  function stageDienststelleHistoryReplayHandler(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.dienststelle = _KDB.runtime.dienststelle || {};
    var handler = _createHandler(_KDB);
    _KDB.runtime.dienststelle.historyReplayHandlerContribution = handler;
    return handler;
  }

  // cognosHost is registered as the first core service, so the facet exists by
  // the time this orchestrator runs; the guard covers a harness without services.
  function readFiltersFacet(_KDB) {
    var service = _KDB.services ? _KDB.services.cognosHost : null;
    return service && service.filters ? service.filters : null;
  }

  function readTabsFacet(_KDB) {
    var service = _KDB.services ? _KDB.services.cognosHost : null;
    return service && service.tabs ? service.tabs : null;
  }

  function __orchestrator(_KDB, _options) {
    _KDB.state = _KDB.state || {};
    _KDB.state.filters = _KDB.state.filters || {};
    _KDB.runtime = _KDB.runtime || {};
    _KDB.api = _KDB.api || {};

    if (!_KDB.state.filters.dienststelle) {
      _KDB.state.filters.dienststelle = _initialState();
    }

    _KDB.runtime.dienststelle = _KDB.runtime.dienststelle || {
      domRefs: {},
      listeners: {},
      subscriptions: {},
      abortControllers: {},
      observers: {},
      timers: {},
      pendingPromises: {},
      parameterSetRunId: 0
    };
    _KDB.runtime.dienststelle.tabsFacet = readTabsFacet(_KDB);

    try {
      _KDB.config = _KDB.config || {};
      _KDB.config.labels = _KDB.config.labels || {};
      _KDB.config.labels.de = _KDB.config.labels.de || {};
      _KDB.config.labels.de.dienststelle = Object.assign({}, _dienststelleLabels, _KDB.config.labels.de.dienststelle || {});
    } catch (err) {
      console.error("[dienststelle.orchestrator] labels merge failed", err);
    }

    stageDienststelleHistoryReplayHandler(_KDB);
    var controller = _createDienststelleController({
      _KDB: _KDB,
      filtersFacet: readFiltersFacet(_KDB),
      options: _options || {}
    });
    _KDB.api.dienststelle = controller;
    return controller;
  }

  return __orchestrator;
});
