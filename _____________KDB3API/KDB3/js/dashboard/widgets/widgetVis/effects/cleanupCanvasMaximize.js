define([], function () {
  "use strict";

  function removeListener(_runtime) {
    var listeners = _runtime && _runtime.listeners ? _runtime.listeners : null;
    if (listeners && typeof listeners.canvasMaximizeClick === "function") {
      listeners.canvasMaximizeClick();
      delete listeners.canvasMaximizeClick;
    }
  }

  function removeIcon(_runtime, _diagnostics) {
    var iconEl = _runtime && _runtime.domRefs ? _runtime.domRefs.canvasMaximizeIconEl : null;
    if (iconEl && iconEl.parentNode && typeof iconEl.parentNode.removeChild === "function") {
      iconEl.parentNode.removeChild(iconEl);
      if (_diagnostics) {
        _diagnostics.canvasMaximizeIconRemoved = true;
      }
    }
    if (_runtime && _runtime.domRefs) {
      _runtime.domRefs.canvasMaximizeIconEl = null;
    }
  }

  function __controller(_runtime, _diagnostics) {
    try {
      removeListener(_runtime);
      removeIcon(_runtime, _diagnostics);
    } catch (err) {
      console.error("[widgetVis.cleanupCanvasMaximize]", err);
    }
  }

  return __controller;
});
