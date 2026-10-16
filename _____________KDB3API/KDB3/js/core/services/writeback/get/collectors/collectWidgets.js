define([
  "../../schema/errorCodes.js",
  "../../../../../dashboard/tabs/config/actionTypes.js",
  "../../../../../dashboard/tabs/config/defaults.js",
  "./buildWidgetObject.js",
], function (_errorCodes, _actionTypes, _defaults, _buildWidgetObject) {
  "use strict";

  const TRAVERSE_PAYLOAD = {
    source: "writebackGet",
    scope: "visibleDashboard",
    includeHiddenDashboardTabs: false,
    restoreActiveTab: true,
    waitFor: "canvas",
    timeoutMs: 30000
  };

  async function collectWidgets(_KDB, _diagnostics) {
    try {
      const tabsState = readApiState(_KDB, "tabs");
      const orderedTabs = readOrderedDashboardTabs(tabsState);
      await ensureDashboardTabsTraversed(_KDB, _diagnostics, orderedTabs, tabsState);

      const baseState = readApiState(_KDB, "widgetBase");
      if (!baseState || !baseState.byId) return {};
      const tabIdToIdx = buildTabIdToIdx(orderedTabs);
      const settingsByWidget = (readApiState(_KDB, "widgetSettings") || {}).byWidget || {};
      const visById = (readApiState(_KDB, "widgetVis") || {}).byId || {};
      const textById = (readApiState(_KDB, "widgetText") || {}).byId || {};

      const widgets = [];
      const widgetIds = Object.keys(baseState.byId);
      for (let index = 0; index < widgetIds.length; index += 1) {
        const widgetId = widgetIds[index];
        const frame = baseState.byId[widgetId];
        if (!shouldCollectFrame(frame, widgetId)) continue;
        const tabIdx = tabIdToIdx[frame.tabId];
        if (tabIdx === undefined) {
          _diagnostics.push(_errorCodes.makeDiagnostic(
            _errorCodes.codes.WRITEBACK_TABS_TARGET_MISSING, "get",
            "widget tabId is not mapped to a dashboard tab index", { widgetId: widgetId }
          ));
          continue;
        }
        if (!orderedTabs[tabIdx] || orderedTabs[tabIdx].visible !== true) continue;
        const widget = _buildWidgetObject(
          stampOwnerLayout(frame), tabIdx, settingsByWidget[widgetId], visById[widgetId], textById[widgetId], _diagnostics
        );
        if (widget === null) continue;
        widgets.push(widget);
      }
      return widgets.length === 0 ? {} : { wgts: widgets };
    } catch (error) {
      console.error("[collectWidgets] failed", error);
      throw error;
    }
  }

  async function ensureDashboardTabsTraversed(_KDB, _diagnostics, orderedTabs, tabsState) {
    if (orderedTabs.length === 0 || !needsTraversal(orderedTabs, tabsState)) return;
    const tabsApi = _KDB && _KDB.api ? _KDB.api.tabs : null;
    if (!tabsApi || typeof tabsApi.dispatch !== "function") {
      _diagnostics.push(_errorCodes.makeDiagnostic(
        _errorCodes.codes.WRITEBACK_TABS_NOT_READY, "get",
        "tabs traversal barrier failed; widgets on not-yet-loaded dashboard tabs may be missing"
      ));
      return;
    }
    try {
      const ok = await tabsApi.dispatch({ type: _actionTypes.TRAVERSE, payload: TRAVERSE_PAYLOAD });
      if (ok !== true) {
        _diagnostics.push(_errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_TABS_NOT_READY, "get",
          "tabs traversal barrier failed; widgets on not-yet-loaded dashboard tabs may be missing"
        ));
      }
    } catch (error) {
      console.warn("[collectWidgets] tabs traversal barrier failed", error);
      _diagnostics.push(_errorCodes.makeDiagnostic(
        _errorCodes.codes.WRITEBACK_TABS_NOT_READY, "get",
        "tabs traversal barrier failed; widgets on not-yet-loaded dashboard tabs may be missing"
      ));
    }
  }

  function needsTraversal(orderedTabs, tabsState) {
    const traversed = tabsState && tabsState.traversal && Array.isArray(tabsState.traversal.traversedIndexes)
      ? tabsState.traversal.traversedIndexes : [];
    for (let index = 0; index < orderedTabs.length; index += 1) {
      const tab = orderedTabs[index];
      if (!tab || tab.visible !== true) continue;
      if (traversed.indexOf(tab.index) === -1) return true;
    }
    return false;
  }

  function stampOwnerLayout(frame) {
    const lastCanvasLayout = frame && frame.lastCanvasLayout;
    const hasNumericLast = !!(lastCanvasLayout
      && typeof lastCanvasLayout.x === "number"
      && typeof lastCanvasLayout.y === "number"
      && typeof lastCanvasLayout.width === "number"
      && typeof lastCanvasLayout.height === "number");
    const layout = hasNumericLast ? lastCanvasLayout : (frame && frame.layout);
    return Object.assign({}, frame, { layout: layout });
  }

  function shouldCollectFrame(frame, widgetId) {
    return !!(frame && frame.placement === "onCanvas" && frame.layout
      && frame.lifecycle !== "disposed"
      && (frame.kind === "vis" || frame.kind === "text")
      && frame.role !== "topNHelper"
      && widgetId !== "kdb3widget");
  }

  function readOrderedDashboardTabs(state) {
    if (!state) return [];
    const order = Array.isArray(state.order) ? state.order : [];
    return order
      .map(function (index) { return state.byIndex && state.byIndex[String(index)]; })
      .filter(function (tab) { return isDashboardTab(tab, state); });
  }

  function isDashboardTab(tab, state) {
    if (!tab) return false;
    if (tab.role) return tab.role === "dashboard";
    const maxUserTabs = state.limits && typeof state.limits.maxUserTabs === "number"
      ? state.limits.maxUserTabs : _defaults.MAX_USER_TABS;
    return tab.isHelper !== true && tab.index < maxUserTabs;
  }

  function buildTabIdToIdx(orderedTabs) {
    const map = {};
    for (let index = 0; index < orderedTabs.length; index += 1) {
      const tab = orderedTabs[index];
      if (tab && tab.tabId) map[tab.tabId] = index;
    }
    return map;
  }

  function readApiState(_KDB, owner) {
    const api = _KDB && _KDB.api ? _KDB.api[owner] : null;
    return api && typeof api.getState === "function" ? api.getState() : null;
  }

  return collectWidgets;
});
