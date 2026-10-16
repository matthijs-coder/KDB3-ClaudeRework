define(["../slots.js"], function (_slots) {
  "use strict";

  // Pure builder for the writeback tabTargets lookup per
  // contracts/tabs-parameterSetRestore-contractdelta.md §3/§3.1:
  //   { [tabIdx: string]: { tabId, pageId, scopeId?, visible } }
  // tabIdx convention mirrors the GET side (writeback collectTabs.js):
  // position within state.order filtered to dashboard-role tabs.
  // scopeIdsByTabIdx is optional; entries without a scopeId omit the field.
  function buildTabTargets(_state, _scopeIdsByTabIdx) {
    const scopeIds = _scopeIdsByTabIdx || {};
    const targets = {};
    _slots.listDashboardSlots(_state).forEach(function (tab, tabIdx) {
      const target = {
        tabId: tab.tabId || null,
        pageId: tab.pageId || null,
        visible: tab.visible === true
      };
      const scopeId = scopeIds[String(tabIdx)];
      if (typeof scopeId === "string" && scopeId !== "") {
        target.scopeId = scopeId;
      }
      targets[String(tabIdx)] = target;
    });
    return targets;
  }

  return buildTabTargets;
});
