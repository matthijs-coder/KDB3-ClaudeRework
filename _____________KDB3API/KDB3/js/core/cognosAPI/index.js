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
    "./async.js"
  ],
  function (
    createGlassMessagesApi,
    createDashboardApi,
    createCanvasApi,
    createDataSourcesApi,
    createWidgetsApi,
    createVisualizationApi,
    createDataQueryApi,
    createFiltersApi,
    createTabsApi,
    createAsyncApi
  ) {
    "use strict";

    function registerCognosAPI(_KDB) {
      _KDB.cognosAPI = _KDB.cognosAPI || {};
      _KDB.cognosAPI.glassMessages = createGlassMessagesApi();
      _KDB.cognosAPI.dashboard = createDashboardApi();
      _KDB.cognosAPI.canvas = createCanvasApi();
      _KDB.cognosAPI.dataSources = createDataSourcesApi();
      _KDB.cognosAPI.widgets = createWidgetsApi();
      _KDB.cognosAPI.visualization = createVisualizationApi();
      _KDB.cognosAPI.dataQuery = createDataQueryApi();
      _KDB.cognosAPI.filters = createFiltersApi();
      _KDB.cognosAPI.tabs = createTabsApi();
      _KDB.cognosAPI.async = createAsyncApi();
      return _KDB.cognosAPI;
    }

    return registerCognosAPI;
  }
);
