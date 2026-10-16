define([
  "../view/placeDatapointDrillthroughIcon.js",
  "./bindDatapointDrillthroughIconClick.js",
  "../runtime.js",
  "./retryCanvasMaximize.js"
], function (_placeDatapointDrillthroughIcon, _bindDatapointDrillthroughIconClick, _visRuntime, _retryCanvasMaximize) {
  "use strict";

  function hasCategories(_categories) {
    return Array.isArray(_categories) && _categories.length > 0;
  }

  function peekHasCategories(_outcome) {
    return !!(
      _outcome &&
      typeof _outcome.then !== "function" &&
      _outcome.data &&
      hasCategories(_outcome.data.categories)
    );
  }

  function disposeDatapointClick(_runtime) {
    var listeners = _runtime && _runtime.listeners ? _runtime.listeners : null;
    if (listeners && typeof listeners.drillthroughDatapointClick === "function") {
      listeners.drillthroughDatapointClick();
      delete listeners.drillthroughDatapointClick;
    }
  }

  function removeDatapointIcon(_runtime) {
    var iconEl;
    try {
      disposeDatapointClick(_runtime);
      iconEl = _runtime && _runtime.domRefs ? _runtime.domRefs.datapointDrillthroughIconEl : null;
      if (iconEl && iconEl.parentNode && typeof iconEl.parentNode.removeChild === "function") {
        iconEl.parentNode.removeChild(iconEl);
      }
      if (_runtime && _runtime.domRefs) {
        _runtime.domRefs.datapointDrillthroughIconEl = null;
      }
    } catch (err) {
      console.error("[widgetVis.syncDatapointDrillthroughChrome] remove", err);
    }
  }

  function bindPlantedIcon(_ctx, _anchorEl) {
    _bindDatapointDrillthroughIconClick({
      _KDB: _ctx._KDB,
      widgetId: _ctx.widgetId,
      anchorEl: _anchorEl,
      runtime: _ctx.runtime,
      drillthroughService: _ctx.drillthroughService,
      sichtApi: _ctx.sichtApi,
      dienststelleApi: _ctx.dienststelleApi,
      tableDataReadRows: _ctx.tableDataReadRows
    });
  }

  function plantDatapointIcon(_ctx) {
    var placed;
    try {
      placed = _placeDatapointDrillthroughIcon({ widgetId: _ctx.widgetId });
      if (!placed || placed.ok !== true || placed.skipped || !placed.anchorEl) {
        removeDatapointIcon(_ctx.runtime);
        return placed || { ok: false, errorCode: "WIDGET_VIS_DRILLTHROUGH_FAILED" };
      }
      bindPlantedIcon(_ctx, placed.anchorEl);
      _ctx.runtime.domRefs = _ctx.runtime.domRefs || {};
      _ctx.runtime.domRefs.datapointDrillthroughIconEl = placed.wrapperEl;
      return { ok: true, skipped: false };
    } catch (err) {
      console.error("[widgetVis.syncDatapointDrillthroughChrome] plant", err);
      return { ok: false, errorCode: "WIDGET_VIS_DRILLTHROUGH_FAILED" };
    }
  }

  function peekSelections(_KDB, _widgetId) {
    var facet = _visRuntime.readHostFacet(_KDB, "visualizationFacet");
    var outcome;
    if (!facet || typeof facet.getSelections !== "function") {
      return null;
    }
    try {
      outcome = facet.getSelections(_widgetId);
    } catch (_err) {
      return null;
    }
    if (!outcome || typeof outcome.then === "function") {
      return null;
    }
    return outcome;
  }

  function shouldPlantFromDto(_dto) {
    return !!(
      _dto &&
      _dto.kind === "select" &&
      hasCategories(_dto.categories)
    );
  }

  function syncFromSubscribe(_ctx, _dto) {
    try {
      _retryCanvasMaximize(_ctx);
      if (shouldPlantFromDto(_dto)) {
        return plantDatapointIcon(_ctx);
      }
      removeDatapointIcon(_ctx.runtime);
      return { ok: true, skipped: false, hidden: true };
    } catch (err) {
      console.error("[widgetVis.syncDatapointDrillthroughChrome] subscribe", err);
      return { ok: false, errorCode: "WIDGET_VIS_DRILLTHROUGH_FAILED" };
    }
  }

  function syncFromPeek(_ctx) {
    try {
      _retryCanvasMaximize(_ctx);
      if (peekHasCategories(peekSelections(_ctx._KDB, _ctx.widgetId))) {
        return plantDatapointIcon(_ctx);
      }
      removeDatapointIcon(_ctx.runtime);
      return { ok: true, skipped: false, hidden: true };
    } catch (err) {
      console.error("[widgetVis.syncDatapointDrillthroughChrome] peek", err);
      return { ok: false, errorCode: "WIDGET_VIS_DRILLTHROUGH_FAILED" };
    }
  }

  return {
    syncFromSubscribe: syncFromSubscribe,
    syncFromPeek: syncFromPeek
  };
});
