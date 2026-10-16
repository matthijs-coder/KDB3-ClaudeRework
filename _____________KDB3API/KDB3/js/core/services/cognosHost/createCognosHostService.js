define([
  "./runtime/ensureCognosHostRuntime.js",
  "./runtime/nextCognosHostGeneration.js",
  "./runtime/clearCognosHostRuntime.js",
  "./composeCognosHostFacets.js"
], function (
  _ensureCognosHostRuntime,
  _nextCognosHostGeneration,
  _clearCognosHostRuntime,
  _composeCognosHostFacets
) {
  "use strict";

  function logPublicMethodError(methodName, error) {
    console.error("[cognosHost." + methodName + "] public method failed", error);
  }

  function createCognosHostService(_KDB) {
    var _isDisposed = false;
    var publicApi;
    var generation;
    var facets;

    _ensureCognosHostRuntime(_KDB);
    generation = _nextCognosHostGeneration(_KDB);

    function getGeneration() {
      return generation;
    }

    function isDisposed() {
      return _isDisposed;
    }

    function isCurrentGeneration(_token) {
      if (_isDisposed) {
        return false;
      }
      return _token === generation;
    }

    function releaseRegistration() {
      // Ownership check: clear only our own registration, never one that was
      // installed after this instance.
      if (_KDB.services && _KDB.services.cognosHost === publicApi) {
        _KDB.services.cognosHost = null;
      }
    }

    function destroy() {
      if (_isDisposed) {
        return;
      }
      _isDisposed = true;
      try {
        _clearCognosHostRuntime(_KDB);
      } catch (error) {
        logPublicMethodError("destroy", error);
      } finally {
        releaseRegistration();
      }
    }

    facets = _composeCognosHostFacets({
      _KDB: _KDB,
      generation: generation,
      isDisposed: isDisposed
    });

    publicApi = {
      destroy: destroy,
      getGeneration: getGeneration,
      isCurrentGeneration: isCurrentGeneration,
      isDisposed: isDisposed,
      // The facet object stays reachable after destroy on purpose: every
      // operation guards on isDisposed and answers with the uniform disposed
      // Outcome. Nulling the key would turn a late call during teardown
      // ordering into a TypeError, which module-public-api.mdc forbids.
      filters: facets.filters,
      widgets: facets.widgets,
      canvas: facets.canvas,
      visualization: facets.visualization,
      dataQuery: facets.dataQuery,
      dashboard: facets.dashboard,
      dataSources: facets.dataSources,
      messages: facets.messages,
      tabs: facets.tabs
    };
    return publicApi;
  }

  return createCognosHostService;
});
