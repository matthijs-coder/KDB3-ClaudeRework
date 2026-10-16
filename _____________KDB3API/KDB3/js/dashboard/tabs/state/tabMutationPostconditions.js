define(["../slots.js"], function (_slots) {
  "use strict";

  function passesPostcondition(byIndex, state, plan) {
    var order = Array.isArray(state.order) ? state.order : [];
    var minVisible = state.limits && typeof state.limits.minVisibleUserTabs === "number" ? state.limits.minVisibleUserTabs : 1;
    var visibleCount = 0;
    var seenHidden = false;
    for (var i = 0; i < order.length; i += 1) {
      var tab = byIndex[String(order[i])];
      if (!_slots.isDashboardTab(tab, state)) { continue; }
      if (tab.visible === true) {
        if (seenHidden) { return false; }
        visibleCount += 1;
      } else {
        seenHidden = true;
      }
    }
    if (visibleCount < minVisible) { return false; }
    if (plan && plan.operation === "move") {
      var before = state.byIndex || {};
      var beforeVisible = 0;
      for (var j = 0; j < order.length; j += 1) {
        var beforeTab = before[String(order[j])];
        var afterTab = byIndex[String(order[j])];
        if (!_slots.isDashboardTab(beforeTab, state)) { continue; }
        if (beforeTab.visible === true) { beforeVisible += 1; }
        if ((beforeTab.visible === true) !== (afterTab && afterTab.visible === true)) { return false; }
      }
      if (visibleCount !== beforeVisible) { return false; }
    }
    if (plan && (plan.operation === "duplicate" || plan.operation === "restoreDeleted")) {
      var beforeDup = state.byIndex || {};
      var beforeVisibleDup = 0;
      for (var k = 0; k < order.length; k += 1) {
        var beforeTabDup = beforeDup[String(order[k])];
        if (!_slots.isDashboardTab(beforeTabDup, state)) { continue; }
        if (beforeTabDup.visible === true) { beforeVisibleDup += 1; }
      }
      if (visibleCount !== beforeVisibleDup + 1) { return false; }
      var revealKey = String(plan.revealSlot.index);
      var revealTab = byIndex[revealKey];
      if (!revealTab || revealTab.visible !== true) { return false; }
    }
    return true;
  }

  return passesPostcondition;
});
