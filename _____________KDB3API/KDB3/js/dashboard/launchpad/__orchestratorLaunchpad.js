define([
  "./state/initialState.js",
  "./config/domSelectors.js",
  "./createLaunchpadController.js"
], function (_initialState, _domSelectors, _createLaunchpadController) {
  // Lifecycle terms for launchpad:
  //   idle, initializing, ready, error, disposed.
  function __orchestrator(_KDB, _options) {
    ensureNamespaces(_KDB);
    registerDomSelectors(_KDB);
    initializeState(_KDB);
    initializeRuntime(_KDB);
    stampHostFacets(_KDB);

    const controller = _createLaunchpadController({
      _KDB: _KDB,
      options: _options || {}
    });

    _KDB.api.launchpad = controller;

    return controller;
  }

  function ensureNamespaces(_KDB) {
    _KDB.state = _KDB.state || {};
    _KDB.runtime = _KDB.runtime || {};
    _KDB.api = _KDB.api || {};
    _KDB.elements = _KDB.elements || {};
    _KDB.elements.selectors = _KDB.elements.selectors || {};
  }

  function registerDomSelectors(_KDB) {
    if (!_KDB.elements.selectors.launchpad) {
      _KDB.elements.selectors.launchpad = _domSelectors;
    }
  }

  function initializeState(_KDB) {
    if (!_KDB.state.launchpad) {
      _KDB.state.launchpad = _initialState();
    }
  }

  function initializeRuntime(_KDB) {
    _KDB.runtime.launchpad = _KDB.runtime.launchpad || {};
    _KDB.runtime.launchpad.domRefs = _KDB.runtime.launchpad.domRefs || {};
    _KDB.runtime.launchpad.listeners = _KDB.runtime.launchpad.listeners || {};
    _KDB.runtime.launchpad.subscriptions = _KDB.runtime.launchpad.subscriptions || {};
    _KDB.runtime.launchpad.abortControllers = _KDB.runtime.launchpad.abortControllers || {};
    _KDB.runtime.launchpad.observers = _KDB.runtime.launchpad.observers || {};
    _KDB.runtime.launchpad.timers = _KDB.runtime.launchpad.timers || {};
    _KDB.runtime.launchpad.pendingPromises = _KDB.runtime.launchpad.pendingPromises || {};
  }

  function readCanvasFacet(_KDB) {
    var service = _KDB.services ? _KDB.services.cognosHost : null;
    return service && service.canvas ? service.canvas : null;
  }

  function readTabsFacet(_KDB) {
    var service = _KDB.services ? _KDB.services.cognosHost : null;
    return service && service.tabs ? service.tabs : null;
  }

  function stampHostFacets(_KDB) {
    _KDB.runtime.launchpad = _KDB.runtime.launchpad || {};
    _KDB.runtime.launchpad.canvasFacet = readCanvasFacet(_KDB);
    _KDB.runtime.launchpad.tabsFacet = readTabsFacet(_KDB);
  }

  return __orchestrator;
});
