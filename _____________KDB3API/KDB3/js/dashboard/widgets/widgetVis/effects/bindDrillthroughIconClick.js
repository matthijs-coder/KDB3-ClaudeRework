define(["./assembleDrillthroughSpec.js"], function (_assembleDrillthroughSpec) {
  "use strict";

  function onIconClick(_ctx, _event) {
    try {
      var spec;
      var service;
      var result;
      if (_event) {
        _event.preventDefault();
        _event.stopPropagation();
      }
      spec = _assembleDrillthroughSpec({
        _KDB: _ctx._KDB,
        widgetId: _ctx.widgetId,
        sichtApi: _ctx.sichtApi,
        dienststelleApi: _ctx.dienststelleApi,
        tableDataReadRows: _ctx.tableDataReadRows
      });
      if (!spec) {
        console.error("[widgetVis.bindDrillthroughIconClick] spec assembly failed");
        return;
      }
      service = _ctx.drillthroughService;
      if (!service || typeof service.openDrillthrough !== "function") {
        console.error("[widgetVis.bindDrillthroughIconClick] missing service");
        return;
      }
      result = service.openDrillthrough(spec);
      if (result && result.ok === false) {
        console.error("[widgetVis.bindDrillthroughIconClick]", result.errorCode || result);
      }
    } catch (err) {
      console.error("[widgetVis.bindDrillthroughIconClick]", err);
    }
  }

  function disposeClick(_anchorEl, _bound) {
    try {
      if (_anchorEl && _bound) {
        _anchorEl.removeEventListener("click", _bound, true);
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
      if (typeof listeners.drillthroughIconClick === "function") {
        listeners.drillthroughIconClick();
      }
      bound = onIconClick.bind(null, {
        _KDB: options._KDB,
        widgetId: options.widgetId,
        sichtApi: options.sichtApi,
        dienststelleApi: options.dienststelleApi,
        tableDataReadRows: options.tableDataReadRows,
        drillthroughService: options.drillthroughService
      });
      options.anchorEl.addEventListener("click", bound, true);
      dispose = disposeClick.bind(null, options.anchorEl, bound);
      listeners.drillthroughIconClick = dispose;
      return dispose;
    } catch (err) {
      console.error("[widgetVis.bindDrillthroughIconClick]", err);
      return noopDispose;
    }
  }

  return __controller;
});
