define([], function () {
  "use strict";

  function removeListenerEntry(_entry) {
    if (typeof _entry === "function") {
      _entry();
    }
  }

  function clearDrillthroughDecorations(_runtime, _diagnostics) {
    var listeners = _runtime.listeners || {};
    var listenersRemoved = 0;
    Object.keys(listeners).forEach(function (_key) {
      if (_key.indexOf("drillthrough") !== -1) {
        removeListenerEntry(listeners[_key]);
        delete listeners[_key];
        listenersRemoved += 1;
      }
    });
    var timers = _runtime.timers || {};
    var timersCleared = 0;
    Object.keys(timers).forEach(function (_key) {
      if (_key.indexOf("drillthrough") !== -1) {
        clearTimeout(timers[_key]);
        clearInterval(timers[_key]);
        delete timers[_key];
        timersCleared += 1;
      }
    });
    var iconEl = _runtime.domRefs && _runtime.domRefs.drillthroughIconEl;
    var datapointIconEl = _runtime.domRefs && _runtime.domRefs.datapointDrillthroughIconEl;
    if (iconEl && iconEl.parentNode && typeof iconEl.parentNode.removeChild === "function") {
      iconEl.parentNode.removeChild(iconEl);
      _diagnostics.drillthroughIconRemoved = true;
    }
    if (datapointIconEl && datapointIconEl.parentNode && typeof datapointIconEl.parentNode.removeChild === "function") {
      datapointIconEl.parentNode.removeChild(datapointIconEl);
      _diagnostics.datapointDrillthroughIconRemoved = true;
    }
    if (_runtime.domRefs) {
      _runtime.domRefs.drillthroughIconEl = null;
      _runtime.domRefs.datapointDrillthroughIconEl = null;
    }
    _runtime.drillthrough = {
      installed: false,
      lastSelectionEvent: null,
      pendingSelectionEvents: [],
      captureActive: false
    };
    _diagnostics.drillthrough = {
      listenersRemoved: listenersRemoved,
      timersCleared: timersCleared,
      runtimeReset: true
    };
  }

  return clearDrillthroughDecorations;
});
