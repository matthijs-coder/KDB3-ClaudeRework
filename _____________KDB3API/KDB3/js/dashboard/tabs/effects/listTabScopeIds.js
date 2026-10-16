define(["../state/listDashboardSlots.js"], function (_listDashboardSlots) {
  "use strict";

  // Live scopeId derivation for the tabs parameterSet restore/reset results
  // (contracts/tabs-parameterSetRestore-contractdelta.md §3.2). scopeId is the
  // Cognos layout container id of the tab: getTabsContainers()[physicalIndex].id.
  // Keyed by tabIdx (position within order filtered to dashboard tabs), never
  // persisted in state. Derivation failure degrades to an empty map: the
  // scopeId field is optional in the tabTargets contract.
  function listTabScopeIds(_ctx) {
    const scopeIdsByTabIdx = {};
    let layoutItems = [];
    try {
      layoutItems = normalizeList(_ctx.adapter.getTabsContainers());
    } catch (err) {
      console.warn("[tabs.listTabScopeIds] layout read failed; scopeId omitted", err);
      return scopeIdsByTabIdx;
    }
    _listDashboardSlots(_ctx.getRawState()).forEach(function (tab, tabIdx) {
      const layoutItem = layoutItems[tab.index];
      const scopeId = layoutItem && layoutItem.id ? String(layoutItem.id) : null;
      if (scopeId) { scopeIdsByTabIdx[String(tabIdx)] = scopeId; }
    });
    return scopeIdsByTabIdx;
  }

  function normalizeList(value) {
    if (!value) { return []; }
    if (Array.isArray(value)) { return value; }
    if (typeof value.length === "number") { return Array.prototype.slice.call(value); }
    return [value];
  }

  return listTabScopeIds;
});
