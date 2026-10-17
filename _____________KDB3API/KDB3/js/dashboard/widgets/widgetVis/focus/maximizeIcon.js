define([
  "../config.js",
  "../runtime.js",
  "./domQueries.js"
], function (_config, _visRuntime, _domQueries) {
  "use strict";

  function createMaximizeWrapper() {
    var wrapper = document.createElement("div");
    wrapper.className = _config.canvasMaximizeWrapperClass;
    wrapper.setAttribute("role", "button");
    wrapper.setAttribute("title", "Vollbild");
    wrapper.setAttribute("tabindex", "0");
    return wrapper;
  }

  function findMaximizeWrapper(_widgetEl) {
    var children = _widgetEl.children || [];
    var i;
    for (i = 0; i < children.length; i += 1) {
      if (children[i].classList && children[i].classList.contains(_config.canvasMaximizeWrapperClass)) {
        return children[i];
      }
    }
    return null;
  }

  function placeCanvasMaximizeIcon(_widgetId) {
    var widgetEl = _domQueries.resolveWidgetElement(_widgetId);
    var wrapperEl;
    if (!widgetEl) {
      return { ok: true, skipped: true, reason: "missing widget" };
    }
    wrapperEl = findMaximizeWrapper(widgetEl) || createMaximizeWrapper();
    if (wrapperEl.parentNode !== widgetEl) {
      widgetEl.appendChild(wrapperEl);
    }
    return { ok: true, skipped: false, wrapperEl: wrapperEl };
  }

  function onMaximizeClick(_ctx, _event) {
    var api = _ctx._KDB && _ctx._KDB.api ? _ctx._KDB.api.widgetVis : null;
    try {
      if (_event) {
        _event.preventDefault();
        _event.stopPropagation();
      }
      if (!api) {
        console.error("[widgetVis.canvasMaximizeClick] missing widgetVis api");
        return;
      }
      api.dispatch({ type: "widgetVis/maximizeToggle", widgetId: _ctx.widgetId, payload: { source: "user" } });
    } catch (err) {
      console.error("[widgetVis.canvasMaximizeClick]", err);
    }
  }

  function removeMaximizeClick(_iconEl, _handler) {
    _iconEl.removeEventListener("click", _handler, true);
  }

  function bindCanvasMaximizeClick(_options) {
    var listeners = _options.runtime.listeners;
    var handler;
    if (typeof listeners.canvasMaximizeClick === "function") {
      listeners.canvasMaximizeClick();
    }
    handler = onMaximizeClick.bind(null, { _KDB: _options._KDB, widgetId: _options.widgetId });
    _options.iconEl.addEventListener("click", handler, true);
    listeners.canvasMaximizeClick = removeMaximizeClick.bind(null, _options.iconEl, handler);
  }

  function installCanvasMaximize(_options) {
    var options = _options || {};
    var _KDB = options._KDB;
    var widgetId = options.widgetId;
    var runtime;
    var placed;
    try {
      runtime = _visRuntime.ensureWidgetRuntime(_KDB, widgetId);
      placed = placeCanvasMaximizeIcon(widgetId);
      if (placed.skipped) {
        return placed;
      }
      bindCanvasMaximizeClick({ _KDB: _KDB, widgetId: widgetId, iconEl: placed.wrapperEl, runtime: runtime });
      runtime.domRefs.canvasMaximizeIconEl = placed.wrapperEl;
      return { ok: true, skipped: false };
    } catch (err) {
      console.error("[widgetVis.installCanvasMaximize]", widgetId, err);
      return { ok: false, errorCode: "WIDGET_VIS_MAXIMIZE_FAILED" };
    }
  }

  function cleanupCanvasMaximize(_runtime, _diagnostics) {
    var listeners = _runtime.listeners;
    var iconEl = _runtime.domRefs ? _runtime.domRefs.canvasMaximizeIconEl : null;
    if (listeners && typeof listeners.canvasMaximizeClick === "function") {
      listeners.canvasMaximizeClick();
      delete listeners.canvasMaximizeClick;
    }
    if (iconEl && iconEl.parentNode) {
      iconEl.parentNode.removeChild(iconEl);
      if (_diagnostics) {
        _diagnostics.canvasMaximizeIconRemoved = true;
      }
    }
    if (_runtime.domRefs) {
      _runtime.domRefs.canvasMaximizeIconEl = null;
    }
  }

  return {
    installCanvasMaximize: installCanvasMaximize,
    cleanupCanvasMaximize: cleanupCanvasMaximize
  };
});
