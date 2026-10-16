define(["../state.js", "../slots.js"], function (_state, _slots) {
  "use strict";

  // Reducer for the internal tabs/parameterSetApply action (contracts/tabs-parameterSetRestore-contractdelta.md
  // section 4 rule 5): applies validated name/visibility patches for dashboard slots in one atomic commit.
  // payload.entries: [{ physicalIndex, name?, visible? }], already normalized by the parameterSet actions.
  function reduceParameterSetApply(_current, _payload) {
    const current = _current || {};
    const entries = Array.isArray((_payload || {}).entries) ? _payload.entries : [];
    const byIndex = _state.cloneByIndex(current.byIndex);

    entries.forEach(function (entry) {
      const key = String(entry.physicalIndex);
      const tab = byIndex[key];
      if (!tab) { return; }
      const patch = {};
      if (typeof entry.name === "string" && entry.name !== "") { patch.name = entry.name; }
      if (typeof entry.visible === "boolean") {
        patch.visible = entry.visible;
        patch.button = _state.copyObject(tab.button, { visible: entry.visible });
      }
      byIndex[key] = _state.copyObject(tab, patch);
    });

    const order = Array.isArray(current.order) ? current.order : [];
    const visibleOrder = _state.buildVisibleOrder(byIndex, order);
    const active = remapActiveIndex(current, byIndex, visibleOrder);
    _state.markActive(byIndex, active.activeIndex);

    const next = _state.copyObject(current, {
      byIndex: byIndex,
      visibleOrder: visibleOrder,
      activeIndex: active.activeIndex,
      activeTabId: active.activeTabId,
      currentTabId: active.activeTabId,
      errorCode: null,
      errorMessage: null
    });
    next.editUi = _state.copyObject(_state.clearEditSessionFields(current.editUi), {
      toolboxVisible: visibleOrder.some(function (index) { return hasRenamableTab(byIndex, index); })
    });
    return next;
  }

  // Rule 7: when the previously active tab became hidden, remap to the first visible dashboard tab so
  // restoreActiveTab always lands on a valid tab.
  function remapActiveIndex(current, byIndex, visibleOrder) {
    const currentActive = typeof current.activeIndex === "number" ? current.activeIndex : null;
    const currentTab = currentActive == null ? null : byIndex[String(currentActive)];
    const keepCurrent = !!currentTab && currentTab.visible === true && _slots.isDashboardTab(currentTab);
    const activeIndex = keepCurrent ? currentActive : (visibleOrder.length > 0 ? visibleOrder[0] : null);
    const activeTab = activeIndex == null ? null : byIndex[String(activeIndex)];
    return { activeIndex: activeIndex, activeTabId: activeTab && activeTab.tabId || null };
  }

  function hasRenamableTab(byIndex, index) {
    const tab = byIndex[String(index)];
    return !!tab && tab.visible === true && _slots.isDashboardTab(tab) && !!tab.tabId;
  }

  return reduceParameterSetApply;
});
