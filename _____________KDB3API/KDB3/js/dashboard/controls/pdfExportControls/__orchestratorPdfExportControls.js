define([
  "./config/domSelectors.js",
  "./config/iconAssets.js",
  "./createPdfExportControlsController.js"
], function (_domSelectors, _iconAssets, _createPdfExportControlsController) {
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
    runtime.abortControllers.exportRun = runtime.abortControllers.exportRun || null;
    runtime.observers = runtime.observers || {};
    runtime.timers = runtime.timers || {};
    runtime.pendingPromises = runtime.pendingPromises || { mount: null, exportRun: null };
    runtime.viewModel = runtime.viewModel || { disabled: false, busy: false, serviceAvailable: true, label: "PDF" };
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
      _KDB.elements = _KDB.elements || {};
      _KDB.elements.selectors = _KDB.elements.selectors || {};
      _KDB.elements.selectors.pdfExportControls = mergeSelectorConfig(_KDB.elements.selectors.pdfExportControls || {}, _domSelectors);
      _KDB.elements.selectors.pdfExportControls.toolbarHostSelector = readActionBarLeadingSelector(_KDB);
      _KDB.config.pdfExportControls = Object.assign({}, _iconAssets, _KDB.config.pdfExportControls || {});
      _KDB.runtime.pdfExportControls = normalizeRuntime(_KDB.runtime.pdfExportControls);
      _KDB.api.pdfExportControls = _createPdfExportControlsController(_KDB);
      return _KDB.api.pdfExportControls;
    } catch (error) {
      console.error("[pdfExportControls.orchestrator] failed", error);
      throw error;
    }
  }

  return __orchestrator;
});
