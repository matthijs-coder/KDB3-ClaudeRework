define(
  [
    "./glassMessages.js",
    "./dashboard.js",
    "./canvas.js",
    "./dataSources.js",
    "./widgets.js",
    "./visualization.js",
    "./dataQuery.js",
    "./filters.js",
    "./tabs.js",
    "./async.js",
  ],
  function (_glassMessages, _dashboard, _canvas, _dataSources, _widgets, _visualization, _dataQuery, _filters, _tabs, _async) {
    "use strict";

    function __orchestrator(_KDB) {
      try {
        _KDB.cognosAPI = _KDB.cognosAPI || {};
        _KDB.cognosAPI.glassMessages = _glassMessages(_KDB);
        _KDB.cognosAPI.dashboard = _dashboard(_KDB);
        _KDB.cognosAPI.canvas = _canvas(_KDB);
        _KDB.cognosAPI.dataSources = _dataSources(_KDB);
        _KDB.cognosAPI.widgets = _widgets(_KDB);
        _KDB.cognosAPI.visualization = _visualization(_KDB);
        _KDB.cognosAPI.dataQuery = _dataQuery(_KDB);
        _KDB.cognosAPI.filters = _filters(_KDB);
        _KDB.cognosAPI.tabs = _tabs(_KDB);
        _KDB.cognosAPI.async = _async(_KDB);
        return _KDB.cognosAPI;
      } catch (error) {
        console.error("[KDB][__orchestrator] failed", error);
        throw error;
      }
    }

    return __orchestrator;
  }
);
