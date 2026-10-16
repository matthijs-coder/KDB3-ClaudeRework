define(["../slots.js"], function (_slots) {
  "use strict";

  // First-wins baseline capture for parameterSet reset defaults per
  // contracts/tabs-parameterSetRestore-contractdelta.md §4.1. Runs after a
  // successful syncFromDom commit; stores the pre-restore dashboard tab names
  // under _KDB.runtime.tabs.baselineNamesByIndex (session runtime, never
  // persisted). Because capture is first-wins, a later writeback restore can
  // never overwrite the baseline.
  function captureTabsBaselineNames(_KDB) {
    const runtime = _KDB.runtime && _KDB.runtime.tabs;
    if (!runtime || runtime.baselineNamesByIndex) { return; }
    const slots = _slots.listDashboardSlots(_KDB.state && _KDB.state.tabs);
    const hasHydratedIdentity = slots.some(function (tab) { return !!tab.tabId; });
    if (!hasHydratedIdentity) { return; }
    const baselineNamesByIndex = {};
    slots.forEach(function (tab) {
      if (typeof tab.name === "string" && tab.name !== "") {
        baselineNamesByIndex[String(tab.index)] = tab.name;
      }
    });
    runtime.baselineNamesByIndex = baselineNamesByIndex;
  }

  return captureTabsBaselineNames;
});
