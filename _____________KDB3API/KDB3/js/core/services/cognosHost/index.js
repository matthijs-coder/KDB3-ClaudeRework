define([
  "./runtime.js",
  "./facets/filters/createFiltersAdapter.js",
  "./facets/widgets/createWidgetsAdapter.js",
  "./facets/canvas/createCanvasAdapter.js",
  "./facets/visualization/createVisualizationAdapter.js",
  "./facets/dataQuery/createDataQueryAdapter.js",
  "./facets/dashboard/createDashboardAdapter.js",
  "./facets/dataSources/createDataSourcesAdapter.js",
  "./facets/messages/createMessagesAdapter.js",
  "./facets/tabs/createTabsAdapter.js"
], function (
  _runtime,
  _createFiltersAdapter,
  _createWidgetsAdapter,
  _createCanvasAdapter,
  _createVisualizationAdapter,
  _createDataQueryAdapter,
  _createDashboardAdapter,
  _createDataSourcesAdapter,
  _createMessagesAdapter,
  _createTabsAdapter
) {
  "use strict";

  // Ring-1 cognosHost service: nine Outcome facets over _KDB.cognosAPI, registered as
  // _KDB.services.cognosHost. Each facet entry is function(ctx) -> facet object, with
  // ctx = { _KDB, generation, isDisposed }. Owner orchestrators stamp the facets on their runtime.

  function createCognosHostService(_KDB) {
    var _isDisposed = false;
    var generation;
    var ctx;
    var publicApi;

    _runtime.ensureRuntime(_KDB);
    generation = _runtime.nextGeneration(_KDB);

    function isDisposed() {
      return _isDisposed;
    }

    function getGeneration() {
      return generation;
    }

    function isCurrentGeneration(_token) {
      return !_isDisposed && _token === generation;
    }

    function destroy() {
      if (_isDisposed) {
        return;
      }
      _isDisposed = true;
      try {
        _runtime.clearRuntime(_KDB);
      } catch (error) {
        console.error("[cognosHost.destroy] public method failed", error);
      } finally {
        // Ownership check: clear only our own registration, never one installed after this instance.
        if (_KDB.services && _KDB.services.cognosHost === publicApi) {
          _KDB.services.cognosHost = null;
        }
      }
    }

    ctx = { _KDB: _KDB, generation: generation, isDisposed: isDisposed };
    // The facet objects stay reachable after destroy on purpose: every operation guards on
    // isDisposed and answers with the uniform disposed Outcome. Nulling a key would turn a late
    // call during teardown ordering into a TypeError, which module-public-api.mdc forbids.
    publicApi = {
      destroy: destroy,
      getGeneration: getGeneration,
      isCurrentGeneration: isCurrentGeneration,
      isDisposed: isDisposed,
      filters: _createFiltersAdapter(ctx),
      widgets: _createWidgetsAdapter(ctx),
      canvas: _createCanvasAdapter(ctx),
      visualization: _createVisualizationAdapter(ctx),
      dataQuery: _createDataQueryAdapter(ctx),
      dashboard: _createDashboardAdapter(ctx),
      dataSources: _createDataSourcesAdapter(ctx),
      messages: _createMessagesAdapter(ctx),
      tabs: _createTabsAdapter(ctx)
    };
    return publicApi;
  }

  function registerCognosHost(_KDB) {
    _KDB.services = _KDB.services || {};
    if (!_KDB.services.cognosHost) {
      _KDB.services.cognosHost = createCognosHostService(_KDB);
    }
    return _KDB.services.cognosHost;
  }

  return registerCognosHost;
});
