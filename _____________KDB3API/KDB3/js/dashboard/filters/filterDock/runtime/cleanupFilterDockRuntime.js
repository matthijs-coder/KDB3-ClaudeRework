define([
  "../observation/syncPopupDisplay.js",
  "../observation/watchFiltersReady.js"
], function (_syncPopupDisplay, _watchFiltersReady) {
  "use strict";

  function cleanupDockClickBinding(_runtime) {
    var abortControllers = _runtime.abortControllers || {};
    if (abortControllers.dockClick && typeof abortControllers.dockClick.abort === "function") {
      abortControllers.dockClick.abort();
      delete abortControllers.dockClick;
    }
    if (abortControllers.nmsDocumentClick && typeof abortControllers.nmsDocumentClick.abort === "function") {
      abortControllers.nmsDocumentClick.abort();
      delete abortControllers.nmsDocumentClick;
    }
    var record = _runtime.listeners && _runtime.listeners.dockClick;
    if (record && record.element && record.handler) {
      record.element.removeEventListener(record.type, record.handler, record.capture === true);
    }
    var nmsRecord = _runtime.listeners && _runtime.listeners.nmsDocumentClick;
    if (nmsRecord && nmsRecord.element && nmsRecord.handler) {
      nmsRecord.element.removeEventListener(nmsRecord.type, nmsRecord.handler, nmsRecord.capture === true);
    }
    if (_runtime.listeners) {
      _runtime.listeners.dockClick = null;
      _runtime.listeners.nmsDocumentClick = null;
    }
    if (_runtime.domRefs) {
      delete _runtime.domRefs.dockRoot;
      delete _runtime.domRefs.lastClickedElement;
      delete _runtime.domRefs.activeFilterEl;
    }
  }

  function cleanupSubscriptions(_subscriptions) {
    var keys = Object.keys(_subscriptions || {});
    var index;
    for (index = 0; index < keys.length; index += 1) {
      if (typeof _subscriptions[keys[index]] === "function") {
        _subscriptions[keys[index]]();
      }
      delete _subscriptions[keys[index]];
    }
  }

  function abortControllers(_abortControllers) {
    var keys = Object.keys(_abortControllers || {});
    var index;
    for (index = 0; index < keys.length; index += 1) {
      if (_abortControllers[keys[index]] && _abortControllers[keys[index]].abort) {
        _abortControllers[keys[index]].abort();
      }
      delete _abortControllers[keys[index]];
    }
  }

  function disconnectObservers(_observers) {
    if (_observers && _observers.dock && _observers.dock.disconnect) {
      _observers.dock.disconnect();
      _observers.dock = null;
    }
  }

  function clearTimers(_timers) {
    var keys = Object.keys(_timers || {});
    var index;
    var handle;
    var handleIdx;
    for (index = 0; index < keys.length; index += 1) {
      handle = _timers[keys[index]];
      if (typeof handle === "number") {
        if (typeof cancelAnimationFrame === "function") {
          cancelAnimationFrame(handle);
        } else {
          clearTimeout(handle);
        }
      } else if (Array.isArray(handle)) {
        for (handleIdx = 0; handleIdx < handle.length; handleIdx += 1) {
          if (typeof handle[handleIdx] === "number") {
            clearTimeout(handle[handleIdx]);
          }
        }
      }
      delete _timers[keys[index]];
    }
  }

  function resetRuntimeBuckets(_runtime) {
    _runtime.domRefs = {};
    _runtime.listeners = {};
    _runtime.subscriptions = {};
    _runtime.abortControllers = {};
    _runtime.observers = {};
    _runtime.timers = {};
    _runtime.pendingPromises = {};
    _runtime.pendingEvaluationMerge = null;
    delete _runtime.popupReadyState;
    delete _runtime.filtersReadyDispatched;
    _watchFiltersReady.clearFiltersReadyWatch(_runtime);
  }

  function cleanupFilterDockRuntime(_runtime, _deps) {
    if (_deps && typeof _deps.clearEvaluationTimer === "function") {
      _deps.clearEvaluationTimer(_runtime);
    }
    _runtime.pendingEvaluationMerge = null;
    delete _runtime.popupReadyState;
    delete _runtime.filtersReadyDispatched;
    _watchFiltersReady.clearFiltersReadyWatch(_runtime);
    _syncPopupDisplay.detach(_runtime);
    disconnectObservers(_runtime.observers);
    abortControllers(_runtime.abortControllers);
    cleanupDockClickBinding(_runtime);
    cleanupSubscriptions(_runtime.subscriptions);
    clearTimers(_runtime.timers);
    resetRuntimeBuckets(_runtime);
  }

  cleanupFilterDockRuntime.cleanupDockClickBinding = cleanupDockClickBinding;

  return cleanupFilterDockRuntime;
});
