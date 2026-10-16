define([
  "./assembleDatapointDrillthroughSpec.js",
  "../runtime.js"
], function (_assembleDatapointDrillthroughSpec, _visRuntime) {
  "use strict";

  function peekHasOpenableData(_peek) {
    return !!(
      _peek &&
      typeof _peek.then !== "function" &&
      _peek.data &&
      Array.isArray(_peek.data.categories) &&
      _peek.data.categories.length
    );
  }

  function peekSelections(_KDB, _widgetId) {
    var facet = _visRuntime.readHostFacet(_KDB, "visualizationFacet");
    var peek;
    if (!facet || typeof facet.getSelections !== "function") {
      return null;
    }
    peek = facet.getSelections(_widgetId);
    if (!peek || typeof peek.then === "function") {
      return null;
    }
    return peek;
  }

  function onIconClick(_ctx, _event) {
    try {
      var peek;
      var spec;
      var service;
      var result;
      if (_event) {
        _event.preventDefault();
        _event.stopPropagation();
      }
      peek = peekSelections(_ctx._KDB, _ctx.widgetId);
      if (!peekHasOpenableData(peek)) {
        return;
      }
      spec = _assembleDatapointDrillthroughSpec({
        _KDB: _ctx._KDB,
        widgetId: _ctx.widgetId,
        sichtApi: _ctx.sichtApi,
        dienststelleApi: _ctx.dienststelleApi,
        tableDataReadRows: _ctx.tableDataReadRows,
        categories: peek.data.categories
      });
      if (!spec) {
        return;
      }
      service = _ctx.drillthroughService;
      if (!service || typeof service.openDrillthrough !== "function") {
        console.error("[widgetVis.bindDatapointDrillthroughIconClick] missing service");
        return;
      }
      result = service.openDrillthrough(spec);
      if (result && result.ok === false) {
        console.error("[widgetVis.bindDatapointDrillthroughIconClick]", result.errorCode || result);
      }
    } catch (err) {
      console.error("[widgetVis.bindDatapointDrillthroughIconClick]", err);
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
      if (typeof listeners.drillthroughDatapointClick === "function") {
        listeners.drillthroughDatapointClick();
      }
      if (!options.anchorEl) {
        return noopDispose;
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
      listeners.drillthroughDatapointClick = dispose;
      return dispose;
    } catch (err) {
      console.error("[widgetVis.bindDatapointDrillthroughIconClick]", err);
      return noopDispose;
    }
  }

  return __controller;
});
