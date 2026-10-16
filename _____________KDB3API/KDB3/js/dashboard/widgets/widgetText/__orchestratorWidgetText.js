define([
  "./createWidgetTextController.js",
  "./state/selectors.js",
  "./state/initialState.js",
  "./runtime/initializeRuntime.js",
  "./history/createWidgetTextHistoryReplayHandler.js"
], function (_createWidgetTextController, _selectors, _initialState, _initializeRuntime, _createHandler) {
  // Lifecycle terms for widgetText:
  //   idle, initializing, ready, error, disposed.

  function stageWidgetTextHistoryReplayHandler(_KDB) {
    var rt = _KDB.runtime && _KDB.runtime.widgetText;
    if (!rt) {
      return null;
    }
    rt.historyReplayHandlerContribution = _createHandler(_KDB);
    return rt.historyReplayHandlerContribution;
  }

  function __orchestrator(_KDB, _options) {
    try {
      ensureNamespaces(_KDB);
      initializeState(_KDB);
      _initializeRuntime(_KDB);
      stageWidgetTextHistoryReplayHandler(_KDB);
      stampHostFacets(_KDB);
      var controller = _createWidgetTextController({
        _KDB: _KDB,
        options: _options || {},
        selectors: _selectors,
        widgetsFacet: _KDB.runtime.widgetText.widgetsFacet
      });
      _KDB.api.widgetText = controller;
      return controller;
    } catch (err) {
      console.error("[widgetText.__orchestrator] failed", err);
      throw err;
    }
  }

  function ensureNamespaces(_KDB) {
    _KDB.state = _KDB.state || {};
    _KDB.runtime = _KDB.runtime || {};
    _KDB.api = _KDB.api || {};
    _KDB.state.widgets = _KDB.state.widgets || {};
  }

  function initializeState(_KDB) {
    if (!_KDB.state.widgets.text) {
      _KDB.state.widgets.text = _initialState();
    }
  }

  function readWidgetsFacet(_KDB) {
    var service = _KDB.services ? _KDB.services.cognosHost : null;
    return service && service.widgets ? service.widgets : null;
  }

  function stampHostFacets(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.widgetText = _KDB.runtime.widgetText || {};
    _KDB.runtime.widgetText.widgetsFacet = readWidgetsFacet(_KDB);
  }

  return __orchestrator;
});
