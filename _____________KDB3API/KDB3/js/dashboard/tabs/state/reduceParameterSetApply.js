define(["../slots.js"], function (_slots) {
  "use strict";

  // Pure reducer branch for the internal tabs/parameterSetApply action
  // (contracts/tabs-parameterSetRestore-contractdelta.md §4 rule 5).
  // Applies validated name/visibility patches for dashboard slots in one
  // atomic commit; input is already normalized by the parameterSet actions.
  // payload.entries: [{ physicalIndex, name?, visible? }]
  function reduceParameterSetApply(_state, _payload) {
    const state = _state || {};
    const payload = _payload || {};
    const entries = Array.isArray(payload.entries) ? payload.entries : [];
    const byIndex = cloneByIndex(state.byIndex);

    entries.forEach(function (entry) {
      const key = String(entry.physicalIndex);
      const tab = byIndex[key];
      if (!tab) { return; }
      const patch = {};
      if (typeof entry.name === "string" && entry.name !== "") { patch.name = entry.name; }
      if (typeof entry.visible === "boolean") {
        patch.visible = entry.visible;
        patch.button = copyObject(tab.button, { visible: entry.visible });
      }
      byIndex[key] = copyObject(tab, patch);
    });

    const order = Array.isArray(state.order) ? state.order : [];
    const visibleOrder = buildVisibleOrder(byIndex, order);
    const active = remapActiveIndex(state, byIndex, visibleOrder);
    markActive(byIndex, active.activeIndex);

    const next = copyObject(state, {
      byIndex: byIndex,
      visibleOrder: visibleOrder,
      activeIndex: active.activeIndex,
      activeTabId: active.activeTabId,
      currentTabId: active.activeTabId,
      errorCode: null,
      errorMessage: null
    });
    next.editUi = copyObject(clearEditSessionFields(state.editUi), {
      toolboxVisible: visibleOrder.some(function (index) { return hasRenamableTab(byIndex, index); })
    });
    return next;
  }

  // §4 rule 7: when the previously active tab became hidden, remap to the
  // first visible dashboard tab so restoreActiveTab always lands on a valid tab.
  function remapActiveIndex(state, byIndex, visibleOrder) {
    const currentActive = typeof state.activeIndex === "number" ? state.activeIndex : null;
    const currentTab = currentActive == null ? null : byIndex[String(currentActive)];
    const keepCurrent = !!currentTab && currentTab.visible === true && _slots.isDashboardTab(currentTab);
    const activeIndex = keepCurrent ? currentActive : (visibleOrder.length > 0 ? visibleOrder[0] : null);
    const activeTab = activeIndex == null ? null : byIndex[String(activeIndex)];
    return { activeIndex: activeIndex, activeTabId: activeTab && activeTab.tabId || null };
  }

  function markActive(byIndex, activeIndex) {
    Object.keys(byIndex).forEach(function (key) { byIndex[key].isActive = Number(key) === activeIndex; });
  }

  function buildVisibleOrder(byIndex, order) {
    return order.filter(function (index) {
      const tab = byIndex[String(index)];
      return _slots.isDashboardTab(tab) && tab.visible === true;
    });
  }

  function hasRenamableTab(byIndex, index) {
    const tab = byIndex[String(index)];
    return !!tab && tab.visible === true && _slots.isDashboardTab(tab) && !!tab.tabId;
  }

  function clearEditSessionFields(editUi) {
    return copyObject(editUi || {}, {
      activeTool: null, sessionTabIndex: null, sessionTabId: null,
      isEditingLabel: false, errorCode: null, errorMessage: null
    });
  }

  function cloneByIndex(byIndex) {
    const clone = {};
    Object.keys(byIndex || {}).forEach(function (key) {
      const tab = byIndex[key];
      clone[key] = copyObject(tab, { button: copyObject(tab && tab.button, {}), edit: copyObject(tab && tab.edit, {}) });
    });
    return clone;
  }

  function copyObject(base, patch) {
    return Object.assign({}, base || {}, patch || {});
  }

  return reduceParameterSetApply;
});
