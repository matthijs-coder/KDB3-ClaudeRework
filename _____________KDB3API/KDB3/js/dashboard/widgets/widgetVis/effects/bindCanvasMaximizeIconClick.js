define([], function () {
  "use strict";

  function onIconClick(_ctx, _event) {
    try {
      var _KDB;
      var widgetId;
      if (_event) {
        _event.preventDefault();
        _event.stopPropagation();
      }
      _KDB = _ctx._KDB;
      widgetId = _ctx.widgetId;
      if (!_KDB || !_KDB.api || !_KDB.api.widgetVis || typeof _KDB.api.widgetVis.dispatch !== "function") {
        console.error("[widgetVis.bindCanvasMaximizeIconClick] missing widgetVis api");
        return;
      }
      _KDB.api.widgetVis.dispatch({
        type: "widgetVis/maximizeToggle",
        widgetId: widgetId,
        payload: { source: "user" }
      });
    } catch (err) {
      console.error("[widgetVis.bindCanvasMaximizeIconClick]", err);
    }
  }

  function disposeClick(_iconEl, _bound) {
    try {
      if (_iconEl && _bound) {
        _iconEl.removeEventListener("click", _bound, true);
      }
    } catch (_ignore) {
      return;
    }
  }

  function noopDispose() {
    return;
  }

  function __controller(_options) {
    try {
      var options = _options || {};
      var runtime = options.runtime || {};
      var listeners = runtime.listeners || {};
      var bound;
      var dispose;
      runtime.listeners = listeners;
      if (typeof listeners.canvasMaximizeClick === "function") {
        listeners.canvasMaximizeClick();
      }
      if (!options.iconEl) {
        return noopDispose;
      }
      bound = onIconClick.bind(null, {
        _KDB: options._KDB,
        widgetId: options.widgetId
      });
      options.iconEl.addEventListener("click", bound, true);
      dispose = disposeClick.bind(null, options.iconEl, bound);
      listeners.canvasMaximizeClick = dispose;
      return dispose;
    } catch (err) {
      console.error("[widgetVis.bindCanvasMaximizeIconClick]", err);
      return noopDispose;
    }
  }

  return __controller;
});
