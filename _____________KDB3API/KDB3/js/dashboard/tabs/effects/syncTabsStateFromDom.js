define([
  "../config/actionTypes.js",
  "../config/defaults.js",
  "../config/selectors.js",
  "../chrome.js",
  "../slots.js",
  "./bindTabRenameEditSession.js",
  "./syncTabsKdbControlReadView.js",
  "./captureTabsBaselineNames.js"
], function (_actionTypes, _defaults, _selectors, _chrome, _slots, _bindTabRenameEditSession, _syncTabsKdbControlReadView, _captureTabsBaselineNames) {
  "use strict";

  function syncTabsStateFromDom(_ctx) {
    try {
      _bindTabRenameEditSession.cleanupTabRenameEditSession(_ctx._KDB);
      const payload = buildSyncPayload(_ctx);
      _ctx.dispatch({ type: _actionTypes.SYNC_FROM_DOM, payload: payload });
      _captureTabsBaselineNames(_ctx._KDB);
      _syncTabsKdbControlReadView(_ctx._KDB);
      return payload;
    } catch (err) {
      console.error("[tabs.syncFromDom] sync failed", err);
      throw err;
    }
  }

  function buildSyncPayload(_ctx) {
    const containers = normalizeList(_ctx.adapter.getTabsContainers()); const content = normalizeList(_ctx.adapter.getTabsContent()); const buttons = _chrome.readTabButtons(_ctx._KDB);
    const byIndex = {}; const order = []; let activeIndex = null; let index = 0;
    while (index <= _defaults.HELPER_TAB_INDEX) {
      const tab = buildTabDescriptor(_ctx, containers, content, buttons, index);
      if (tab) {
        byIndex[String(index)] = tab;
        order.push(index);
        if (tab.isActive) { activeIndex = index; }
      }
      index += 1;
    }
    activeIndex = activeIndex == null ? resolveFallbackActiveIndex(byIndex, order) : activeIndex;
    markActive(byIndex, activeIndex);
    return { byIndex: byIndex, order: order, visibleOrder: buildVisibleOrder(byIndex, order), activeIndex: activeIndex, activeTabId: readTabId(byIndex, activeIndex), currentTabId: readTabId(byIndex, activeIndex), helperTab: buildHelperTab(byIndex), lastSyncedAt: Date.now() };
  }

  function buildTabDescriptor(_ctx, containers, content, buttons, index) {
    const source = containers[index] || content[index] || null; const button = buttons[index] || null;
    if (!source && !button && index >= _defaults.MAX_USER_TABS) { return null; }
    if (!source && !button && index >= _defaults.MIN_VISIBLE_USER_TABS) { return null; }
    const tabId = extractId(source, button, index); const pageId = extractPageId(source, tabId); const name = readTabName(_ctx, pageId, source, button, index);
    const role = _slots.readTabRole(_ctx._KDB, index); const isDashboard = role === "dashboard"; const isHelper = !isDashboard; const visible = isDashboard ? readButtonVisible(button, index, role) : false;
    return { index: index, tabId: tabId, pageId: pageId, name: name, role: role, visible: visible, isActive: _chrome.isButtonActive(button), isHelper: isHelper, isCanvasLoaded: !!content[index], button: { visible: visible, disabled: false, domStatus: button ? "present" : "missing" }, edit: { canRename: isDashboard, canDelete: false, canDuplicate: false, canMove: false, canReorder: false }, lifecycle: "idle", errorCode: null, errorMessage: null };
  }

  function readTabName(_ctx, pageId, source, button, index) {
    const fallback = fallbackTabName(button || source, index);
    return pageId ? normalizeTextValue(_ctx.adapter.getTabName({ pageId: pageId }), fallback) : fallback;
  }

  function normalizeList(value) { if (!value) { return []; } if (Array.isArray(value)) { return value; } if (typeof value.length === "number") { return toArray(value); } return [value]; }
  function fallbackTabName(node, index) { return normalizeTextValue(node && (node.textContent || node.label || node.title || node.name), "Tab " + (index + 1)); }
  function extractId(source, button, index) { return normalizeIdValue(source && (source.tabId || source.pageId || source.id)) || button && (button.getAttribute && (button.getAttribute(_selectors.tabIdAttribute) || button.getAttribute(_selectors.pageIdAttribute) || button.id)) || null; }
  function extractPageId(source, tabId) { const child = source && source.items && source.items[0]; return normalizeIdValue(source && source.pageId) || normalizeIdValue(child && (child.pageId || child.id)) || normalizeIdValue(source && source.id) || tabId || null; }
  function readButtonVisible(button, index, role) { if (role !== "dashboard") { return false; } return button && button.classList ? button.classList.contains(_defaults.VISIBLE_CLASS) || index < _defaults.MIN_VISIBLE_USER_TABS : index < _defaults.MIN_VISIBLE_USER_TABS; }
  function resolveFallbackActiveIndex(byIndex, order) { const visible = buildVisibleOrder(byIndex, order); return visible.length > 0 ? visible[0] : null; }
  function markActive(byIndex, activeIndex) { Object.keys(byIndex).forEach(function (key) { byIndex[key].isActive = Number(key) === activeIndex; }); }
  function buildVisibleOrder(byIndex, order) { return order.filter(function (index) { const tab = byIndex[String(index)]; return !!tab && tab.visible === true && _slots.isDashboardTab(tab); }); }
  function readTabId(byIndex, index) { const tab = byIndex[String(index)]; return tab && tab.tabId || null; }
  function buildHelperTab(byIndex) { const helper = byIndex[String(_defaults.HELPER_TAB_INDEX)]; return { index: _defaults.HELPER_TAB_INDEX, tabId: helper && helper.tabId || null, pageId: helper && helper.pageId || null, lifecycle: helper ? "ready" : "idle", errorCode: null, errorMessage: null }; }
  function toArray(nodeList) { return Array.prototype.slice.call(nodeList || []); }
  function normalizeTextValue(value, fallback) {
    if (typeof value === "string") { return value.trim() || fallback; }
    if (value == null) { return fallback; }
    if (typeof value === "number" || typeof value === "boolean") { return String(value); }
    if (typeof value === "object") {
      return normalizeTextValue(value.text || value.value || value.label || value.defaultValue || value.name || value.title, fallback);
    }
    return fallback;
  }
  function normalizeIdValue(value) {
    if (typeof value === "string") { return value || null; }
    if (typeof value === "number") { return String(value); }
    return null;
  }

  return syncTabsStateFromDom;
});
