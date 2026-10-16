define([
  "../runtime.js",
  "../focus/maximizeIcon.js",
  "./click.js",
  "./icon.js",
  "./spec.js"
], function (_visRuntime, _maximizeIcon, _click, _icon, _spec) {
  "use strict";

  function hasCategories(_categories) {
    return Array.isArray(_categories) && _categories.length > 0;
  }

  function peekCategories(_KDB, _widgetId) {
    var facet = _visRuntime.readHostFacet(_KDB, "visualizationFacet");
    var outcome;
    if (!facet || typeof facet.getSelections !== "function") {
      return null;
    }
    try {
      outcome = facet.getSelections(_widgetId);
    } catch (err) {
      console.error("[widgetVis.peekCategories] getSelections failed", _widgetId, err);
      return null;
    }
    if (!outcome || typeof outcome.then === "function" || !outcome.data || !hasCategories(outcome.data.categories)) {
      return null;
    }
    return outcome.data.categories;
  }

  function makeDatapointSpec(_ctx) {
    var categories = peekCategories(_ctx._KDB, _ctx.widgetId);
    return _spec.assembleDatapointDrillthroughSpec({
      _KDB: _ctx._KDB,
      widgetId: _ctx.widgetId,
      sichtApi: _ctx.sichtApi,
      dienststelleApi: _ctx.dienststelleApi,
      tableDataReadRows: _ctx.tableDataReadRows,
      categories: categories
    });
  }

  function removeDatapointIcon(_runtime) {
    var listeners = _runtime.listeners;
    var iconEl = _runtime.domRefs.datapointDrillthroughIconEl;
    if (typeof listeners.drillthroughDatapointClick === "function") {
      listeners.drillthroughDatapointClick();
      delete listeners.drillthroughDatapointClick;
    }
    if (iconEl && iconEl.parentNode) {
      iconEl.parentNode.removeChild(iconEl);
    }
    _runtime.domRefs.datapointDrillthroughIconEl = null;
  }

  function plantDatapointIcon(_ctx) {
    var placed = _icon.placeDatapointDrillthroughIcon({ widgetId: _ctx.widgetId });
    if (!placed.ok || placed.skipped || !placed.anchorEl) {
      removeDatapointIcon(_ctx.runtime);
      return placed;
    }
    _click.bindDrillthroughClick({
      _KDB: _ctx._KDB,
      widgetId: _ctx.widgetId,
      runtime: _ctx.runtime,
      anchorEl: placed.anchorEl,
      listenerKey: "drillthroughDatapointClick",
      logMissingSpec: false,
      logLabel: "datapoint",
      makeSpec: makeDatapointSpec.bind(null, _ctx)
    });
    _ctx.runtime.domRefs.datapointDrillthroughIconEl = placed.wrapperEl;
    return { ok: true, skipped: false };
  }

  function retryCanvasMaximize(_ctx) {
    _maximizeIcon.installCanvasMaximize({ _KDB: _ctx._KDB, widgetId: _ctx.widgetId });
  }

  function syncDatapointChrome(_ctx, _hasSelection) {
    if (_hasSelection) {
      return plantDatapointIcon(_ctx);
    }
    removeDatapointIcon(_ctx.runtime);
    return { ok: true, skipped: false, hidden: true };
  }

  function syncFromSubscribe(_ctx, _dto) {
    retryCanvasMaximize(_ctx);
    return syncDatapointChrome(_ctx, !!(_dto && _dto.kind === "select" && hasCategories(_dto.categories)));
  }

  function syncFromPeek(_ctx) {
    retryCanvasMaximize(_ctx);
    return syncDatapointChrome(_ctx, peekCategories(_ctx._KDB, _ctx.widgetId) !== null);
  }

  return {
    syncFromSubscribe: syncFromSubscribe,
    syncFromPeek: syncFromPeek
  };
});
