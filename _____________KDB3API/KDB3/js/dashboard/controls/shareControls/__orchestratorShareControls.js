define([
  "./config/domSelectors.js",
  "./config/iconAssets.js",
  "./config/shareLabels.js",
  "./createShareControlsController.js",
  "./effects/applyShareReadOnlyChrome.js"
], function (_domSelectors, _iconAssets, _shareLabels, _createShareControlsController, _applyShareReadOnlyChrome) {
  "use strict";

  function mergeSelectorConfig(_target, _source) {
    var key;
    for (key in _source) {
      if (Object.prototype.hasOwnProperty.call(_source, key) && _target[key] === undefined) _target[key] = _source[key];
    }
    return _target;
  }

  function normalizeRuntime(_runtime) {
    var runtime = _runtime || {};
    var facet = runtime.dashboardFacet;
    runtime.domRefs = runtime.domRefs || { toolbarHostEl: null, rootEl: null, buttonEl: null, iconEl: null, labelEl: null };
    runtime.subscriptions = runtime.subscriptions || {};
    runtime.listeners = runtime.listeners || {};
    runtime.abortControllers = runtime.abortControllers || {};
    runtime.abortControllers.mount = runtime.abortControllers.mount || null;
    runtime.observers = runtime.observers || {};
    runtime.timers = runtime.timers || {};
    runtime.pendingPromises = runtime.pendingPromises || {};
    runtime.pendingPromises.mount = runtime.pendingPromises.mount || null;
    runtime.viewModel = runtime.viewModel || { disabled: false, busy: false, serviceAvailable: true, label: _shareLabels.buttonTitle };
    runtime.dashboardFacet = facet || null;
    return runtime;
  }

  function readActionBarLeadingSelector(_KDB) {
    var toolbar = _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.toolbar : null;
    return toolbar && toolbar.actionBarLeadingSelector ? toolbar.actionBarLeadingSelector : null;
  }

  function stampDashboardFacet(_KDB, _runtime) {
    var cognosHost = _KDB.services && _KDB.services.cognosHost;
    _runtime.dashboardFacet = (cognosHost && cognosHost.dashboard) || null;
  }

  function applyReadOnlyChrome(_KDB) {
    _applyShareReadOnlyChrome(_KDB);
  }

  function __orchestrator(_KDB) {
    try {
      _KDB.api = _KDB.api || {};
      _KDB.runtime = _KDB.runtime || {};
      _KDB.config = _KDB.config || {};
      _KDB.config.labels = _KDB.config.labels || {};
      _KDB.config.labels.de = _KDB.config.labels.de || {};
      _KDB.elements = _KDB.elements || {};
      _KDB.elements.selectors = _KDB.elements.selectors || {};
      _KDB.elements.selectors.shareControls = mergeSelectorConfig(_KDB.elements.selectors.shareControls || {}, _domSelectors);
      _KDB.elements.selectors.shareControls.toolbarHostSelector = readActionBarLeadingSelector(_KDB);
      _KDB.config.labels.de.shareControls = Object.assign({}, _shareLabels, _KDB.config.labels.de.shareControls || {});
      _KDB.config.shareControls = Object.assign({}, _iconAssets, _KDB.config.shareControls || {});
      _KDB.runtime.shareControls = normalizeRuntime(_KDB.runtime.shareControls);
      stampDashboardFacet(_KDB, _KDB.runtime.shareControls);
      _applyShareReadOnlyChrome(_KDB);
      _KDB.api.shareControls = _createShareControlsController(_KDB);
      _KDB.api.shareControls.applyReadOnlyChrome = applyReadOnlyChrome.bind(null, _KDB);
      return _KDB.api.shareControls;
    } catch (error) {
      console.error("[shareControls.orchestrator] failed", error);
      throw error;
    }
  }

  return __orchestrator;
});
