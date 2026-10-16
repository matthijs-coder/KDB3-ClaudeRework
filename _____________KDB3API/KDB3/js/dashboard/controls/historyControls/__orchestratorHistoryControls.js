define(["./config/domSelectors.js", "./createHistoryControlsController.js"], function (_domSelectors, _createHistoryControlsController) {
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

  function normalizeRuntimeBuckets(_runtime) {
    _runtime.domRefs = _runtime.domRefs || {
      toolbarHostEl: null,
      rootEl: null,
      undoButtonEl: null,
      redoButtonEl: null
    };
    _runtime.subscriptions = _runtime.subscriptions || { historyChanged: null };
    _runtime.abortControllers = _runtime.abortControllers || { mount: null, click: null };
    _runtime.observers = _runtime.observers || { toolbar: null };
    _runtime.timers = _runtime.timers || {};
    _runtime.pendingPromises = _runtime.pendingPromises || { mount: null };
    _runtime.listeners = _runtime.listeners || {};
    return _runtime;
  }

  function readActionBarLeadingSelector(_KDB) {
    var toolbar = _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.toolbar : null;
    return toolbar && toolbar.actionBarLeadingSelector ? toolbar.actionBarLeadingSelector : null;
  }

  function __orchestrator(_KDB) {
    try {
      _KDB.api = _KDB.api || {};
      _KDB.runtime = _KDB.runtime || {};
      _KDB.elements = _KDB.elements || {};
      _KDB.elements.selectors = _KDB.elements.selectors || {};
      _KDB.elements.selectors.historyControls = mergeSelectorConfig(
        _KDB.elements.selectors.historyControls || {},
        _domSelectors
      );
      _KDB.elements.selectors.historyControls.toolbarHostSelector = readActionBarLeadingSelector(_KDB);
      _KDB.runtime.historyControls = normalizeRuntimeBuckets(_KDB.runtime.historyControls || {});
      _KDB.api.historyControls = _createHistoryControlsController(_KDB);
      return _KDB.api.historyControls;
    } catch (error) {
      console.error("[historyControls.orchestrator] failed", error);
      throw error;
    }
  }

  return __orchestrator;
});
