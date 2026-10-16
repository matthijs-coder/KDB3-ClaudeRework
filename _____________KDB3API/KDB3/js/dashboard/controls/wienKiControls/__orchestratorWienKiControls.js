define([
  "./config/domSelectors.js",
  "./config/wienKiLabels.js",
  "./createWienKiControlsController.js"
], function (_domSelectors, _wienKiLabels, _createWienKiControlsController) {
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
    runtime.domRefs = runtime.domRefs || { toolbarHostEl: null, rootEl: null, buttonEl: null, iconEl: null, labelEl: null };
    runtime.subscriptions = runtime.subscriptions || {};
    runtime.listeners = runtime.listeners || {};
    runtime.abortControllers = runtime.abortControllers || {};
    runtime.abortControllers.mount = runtime.abortControllers.mount || null;
    runtime.observers = runtime.observers || {};
    runtime.timers = runtime.timers || {};
    runtime.pendingPromises = runtime.pendingPromises || {};
    runtime.pendingPromises.mount = runtime.pendingPromises.mount || null;
    runtime.viewModel = runtime.viewModel || { disabled: false, serviceAvailable: true, label: _wienKiLabels.buttonTitle };
    return runtime;
  }

  function readActionBarLeadingSelector(_KDB) {
    var toolbar = _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.toolbar : null;
    return toolbar && toolbar.actionBarLeadingSelector ? toolbar.actionBarLeadingSelector : null;
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
      _KDB.elements.selectors.wienKiControls = mergeSelectorConfig(_KDB.elements.selectors.wienKiControls || {}, _domSelectors);
      _KDB.elements.selectors.wienKiControls.toolbarHostSelector = readActionBarLeadingSelector(_KDB);
      _KDB.config.labels.de.wienKiControls = Object.assign({}, _wienKiLabels, _KDB.config.labels.de.wienKiControls || {});
      _KDB.runtime.wienKiControls = normalizeRuntime(_KDB.runtime.wienKiControls);
      _KDB.api.wienKiControls = _createWienKiControlsController(_KDB);
      return _KDB.api.wienKiControls;
    } catch (error) {
      console.error("[wienKiControls.orchestrator] failed", error);
      throw error;
    }
  }

  return __orchestrator;
});
