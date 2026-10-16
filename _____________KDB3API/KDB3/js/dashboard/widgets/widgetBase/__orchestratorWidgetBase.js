define([
  "./createWidgetBaseController.js",
  "./state/selectors.js",
  "./state/initialState.js",
  "./state/ensureWidgetBaseRuntime.js",
  "./history/createWidgetBaseHistoryReplayHandler.js"
], function (_createWidgetBaseController, _selectors, _initialState, _ensureWidgetBaseRuntime, _createHandler) {
  // Lifecycle terms for widgetBase:
  //   idle, initializing, loading, ready, error, disposed.

  function stageWidgetBaseHistoryReplayHandler(_KDB) {
    const rt = _KDB.runtime && _KDB.runtime.widgetBase;
    if (!rt) {
      return null;
    }
    const handler = _createHandler(_KDB);
    rt.historyReplayHandlerContribution = handler;
    return handler;
  }

  function __orchestrator(_KDB, _options) {
    try {
      ensureNamespaces(_KDB);
      seedWidgetBaseLabels(_KDB);
      initializeState(_KDB);
      _ensureWidgetBaseRuntime.ensureWidgetBaseRuntime(_KDB);
      stageWidgetBaseHistoryReplayHandler(_KDB);
      stampHostFacets(_KDB);
      const controller = _createWidgetBaseController({
        _KDB: _KDB,
        options: _options || {},
        selectors: _selectors,
        widgetsFacet: _KDB.runtime.widgetBase.widgetsFacet,
        canvasFacet: _KDB.runtime.widgetBase.canvasFacet
      });
      _KDB.api = _KDB.api || {};
      _KDB.api.widgetBase = controller;
      return controller;
    } catch (err) {
      console.error("[widgetBase.__orchestrator] init failed", err);
      throw err;
    }
  }
  function ensureNamespaces(_KDB) {
    _KDB.state = _KDB.state || {};
    _KDB.runtime = _KDB.runtime || {};
    _KDB.api = _KDB.api || {};
    _KDB.state.widgets = _KDB.state.widgets || {};
  }
  function seedWidgetBaseLabels(_KDB) {
    _KDB.config = _KDB.config || {};
    _KDB.config.labels = _KDB.config.labels || {};
    _KDB.config.labels.de = _KDB.config.labels.de || {};
    const seed = { maxWidgetsPerTab: "Die maximale Anzahl von Widgets pro Tab ist bereits in Verwendung" };
    const existing = _KDB.config.labels.de.widgetBase;
    _KDB.config.labels.de.widgetBase = Object.assign({}, seed, existing && typeof existing === "object" ? existing : {});
  }

  function initializeState(_KDB) {
    if (!_KDB.state.widgets.base) {
      _KDB.state.widgets.base = _initialState();
    }
  }

  function readWidgetsFacet(_KDB) {
    var service = _KDB.services ? _KDB.services.cognosHost : null;
    return service && service.widgets ? service.widgets : null;
  }

  function readCanvasFacet(_KDB) {
    var service = _KDB.services ? _KDB.services.cognosHost : null;
    return service && service.canvas ? service.canvas : null;
  }

  function stampHostFacets(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.widgetBase = _KDB.runtime.widgetBase || {};
    _KDB.runtime.widgetBase.widgetsFacet = readWidgetsFacet(_KDB);
    _KDB.runtime.widgetBase.canvasFacet = readCanvasFacet(_KDB);
  }

  return __orchestrator;
});
