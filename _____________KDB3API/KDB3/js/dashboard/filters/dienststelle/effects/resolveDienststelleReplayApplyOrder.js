define([], function () {
  "use strict";

  function resolveDienststelleReplayApplyOrder(_valuesByScope) {
    var valuesByScope = _valuesByScope || {};
    var globalValues = valuesByScope.global;
    var pageContext = valuesByScope.pageContext || {};
    var pageKeys = Object.keys(pageContext);
    var hasGlobal = Array.isArray(globalValues) && globalValues.length > 0;
    var allTargetTabsEmpty = true;
    var anyTargetTabHasValue = false;
    var idx;
    var tabValues;
    var phases;

    for (idx = 0; idx < pageKeys.length; idx += 1) {
      tabValues = pageContext[pageKeys[idx]];
      if (Array.isArray(tabValues) && tabValues.length > 0) {
        allTargetTabsEmpty = false;
        anyTargetTabHasValue = true;
      }
    }

    if (hasGlobal && allTargetTabsEmpty) {
      phases = ["pageContext", "global"];
    } else if (!hasGlobal && anyTargetTabHasValue) {
      phases = ["global", "pageContext"];
    } else {
      phases = ["global", "pageContext"];
    }

    return {
      phases: phases,
      hasGlobal: hasGlobal,
      allTargetTabsEmpty: allTargetTabsEmpty,
      anyTargetTabHasValue: anyTargetTabHasValue
    };
  }

  return resolveDienststelleReplayApplyOrder;
});
