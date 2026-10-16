define([
  "./config/domSelectors.js",
  "./adapters/resolveLoadingMountEl.js",
  "./createDashboardPdfService.js"
], function (_domSelectors, _resolveLoadingMountEl, _createDashboardPdfService) {
  "use strict";

  function mergeSelectorConfig(_target, _source) {
    var key;
    for (key in _source) {
      if (Object.prototype.hasOwnProperty.call(_source, key) && _target[key] === undefined) {
        _target[key] = _source[key];
      }
    }
    return _target;
  }

  function normalizeRuntime(_runtime) {
    var runtime = _runtime && typeof _runtime === "object" ? _runtime : {};
    return {
      domRefs: runtime.domRefs || {},
      subscriptions: runtime.subscriptions || {},
      listeners: runtime.listeners || {},
      abortControllers: runtime.abortControllers || { activeRun: null },
      observers: runtime.observers || {},
      timers: runtime.timers || {},
      pendingPromises: runtime.pendingPromises || { activeRun: null },
      activeRun: runtime.activeRun || null,
      dashboardFacet: runtime.dashboardFacet || null
    };
  }

  function readDashboardFacet(_KDB) {
    var service = _KDB.services ? _KDB.services.cognosHost : null;
    return service && service.dashboard ? service.dashboard : null;
  }

  function stampHostFacets(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.dashboardPdf = _KDB.runtime.dashboardPdf || {};
    _KDB.runtime.dashboardPdf.dashboardFacet = readDashboardFacet(_KDB);
  }

  function __orchestrator(_KDB) {
    _KDB.services = _KDB.services || {};
    _KDB.runtime = _KDB.runtime || {};
    _KDB.elements = _KDB.elements || {};
    _KDB.elements.selectors = _KDB.elements.selectors || {};
    _KDB.elements.selectors.dashboardPdf = mergeSelectorConfig(_KDB.elements.selectors.dashboardPdf || {}, _domSelectors);
    _KDB.runtime.dashboardPdf = normalizeRuntime(_KDB.runtime.dashboardPdf);
    stampHostFacets(_KDB);
    if (!_KDB.services.dashboardPdf) {
      _KDB.services.dashboardPdf = _createDashboardPdfService({
        _KDB: _KDB,
        resolveLoadingMountEl: _resolveLoadingMountEl
      });
    }
    return _KDB.services.dashboardPdf;
  }

  return __orchestrator;
});
