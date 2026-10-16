define(["../config/defaults.js"], function (_defaults) {
  "use strict";

  function findExistingWrapper(_host, _wrapperClass) {
    var i;
    var child;
    if (!_host || !_host.children) {
      return null;
    }
    for (i = 0; i < _host.children.length; i += 1) {
      child = _host.children[i];
      if (child.classList && child.classList.contains(_wrapperClass)) {
        return child;
      }
    }
    return null;
  }

  function createWrapper(_wrapperClass) {
    var wrapper = document.createElement("div");
    wrapper.className = _wrapperClass;
    wrapper.setAttribute("role", "button");
    wrapper.setAttribute("title", "Vollbild");
    wrapper.setAttribute("tabindex", "0");
    return wrapper;
  }

  function __controller(_options) {
    try {
      var options = _options || {};
      var hostEl = options.hostEl;
      var wrapperClass = options.wrapperClass || _defaults.canvasMaximizeWrapperClass;
      var existingWrapper = findExistingWrapper(hostEl, wrapperClass);
      if (existingWrapper) {
        return { ok: true, wrapperEl: existingWrapper };
      }
      return { ok: true, wrapperEl: createWrapper(wrapperClass) };
    } catch (err) {
      console.error("[widgetVis.buildCanvasMaximizeIcon]", err);
      return {
        ok: false,
        errorCode: "WIDGET_VIS_MAXIMIZE_FAILED",
        errorMessage: String(err && err.message ? err.message : err)
      };
    }
  }

  return __controller;
});
