define([
  "./config/widgetSettingsLabels.js",
  "./createWidgetSettingsController.js",
  "./state/initialState.js",
  "./runtime/initializeRuntime.js",
  "./history/createWidgetSettingsHistoryReplayHandler.js"
], function (_widgetSettingsLabels, _createWidgetSettingsController, _initialState, _initializeRuntime, _createHandler) {
  // Lifecycle terms for widgetSettings:
  //   idle, ready, error, disposed.

  function stageWidgetSettingsHistoryReplayHandler(_KDB) {
    const rt = _KDB.runtime && _KDB.runtime.widgetSettings;
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
      _KDB.config.labels.de.widgetSettings = Object.assign({}, _widgetSettingsLabels, _KDB.config.labels.de.widgetSettings || {});
      initializeState(_KDB);
      _initializeRuntime(_KDB);
      stageWidgetSettingsHistoryReplayHandler(_KDB);
      const controller = _createWidgetSettingsController({ _KDB: _KDB, options: _options || {} });
      _KDB.api.widgetSettings = controller;
      return controller;
    } catch (err) {
      console.error("[widgetSettings.__orchestrator] failed", err);
      throw err;
    }
  }
  function ensureNamespaces(_KDB) {
    try {
      _KDB.state = _KDB.state || {};
      _KDB.runtime = _KDB.runtime || {};
      _KDB.api = _KDB.api || {};
      _KDB.state.widgets = _KDB.state.widgets || {};
      _KDB.config = _KDB.config || {};
      _KDB.config.labels = _KDB.config.labels || {};
      _KDB.config.labels.de = _KDB.config.labels.de || {};
    } catch (err) {
      console.error("[widgetSettings.ensureNamespaces] failed", err);
      throw err;
    }
  }
  function initializeState(_KDB) {
    try {
      if (!_KDB.state.widgets.settings) {
        _KDB.state.widgets.settings = _initialState();
      }
    } catch (err) {
      console.error("[widgetSettings.initializeState] failed", err);
      throw err;
    }
  }
  return __orchestrator;
});
