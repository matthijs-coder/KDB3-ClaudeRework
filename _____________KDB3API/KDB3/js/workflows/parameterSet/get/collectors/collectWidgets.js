define([
  "../../../../core/config/writebackErrorCodes.js",
  "../../../../core/events/tabs.js",
  "./buildWidgetObject.js",
  "./collectorSupport.js",
], function (_errorCodes, _tabsVocabulary, _buildWidgetObject, _support) {
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
    const tabsState = _support.readApiState(_KDB, "tabs");
    const orderedTabs = readOrderedDashboardTabs(tabsState);
    await ensureDashboardTabsTraversed(_KDB, _diagnostics, orderedTabs, tabsState);

    const baseState = _support.readApiState(_KDB, "widgetBase");
    if (!baseState || !baseState.byId) return {};
    const tabIdToIdx = buildTabIdToIdx(orderedTabs);
    const settingsByWidget = (_support.readApiState(_KDB, "widgetSettings") || {}).byWidget || {};
    const visById = (_support.readApiState(_KDB, "widgetVis") || {}).byId || {};
    const textById = (_support.readApiState(_KDB, "widgetText") || {}).byId || {};

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
      const ok = await tabsApi.dispatch({ type: _tabsVocabulary.ACTIONS.TRAVERSE, payload: TRAVERSE_PAYLOAD });
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
      .filter(function (tab) { return _support.isDashboardTab(tab, state); });
  }

  function buildTabIdToIdx(orderedTabs) {
    const map = {};
    for (let index = 0; index < orderedTabs.length; index += 1) {
      const tab = orderedTabs[index];
      if (tab && tab.tabId) map[tab.tabId] = index;
    }
    return map;
  }

  return collectWidgets;
});
