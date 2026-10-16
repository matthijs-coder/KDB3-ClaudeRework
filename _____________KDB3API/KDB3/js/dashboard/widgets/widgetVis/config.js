define([], function () {
  "use strict";

  var GROUPINGS = ["stichtag", "jahr", "jahrStichtag", "stichtagProJahrH", "stichtagProJahrV"];

  function isGroupingValue(_value) {
    return GROUPINGS.indexOf(_value) !== -1;
  }

  return {
    applyTimeoutProfile: "vis",
    bindingPrerequisiteTimeoutMs: 5000,
    contentReadyTimeoutMs: 3000,
    drillthroughIconClass: "kdb_hyperlink_icon",
    datapointDrillthroughWrapperClass: "kdb-datapoint-pkz",
    datapointDrillthroughIconTitle: "Drillthrough der Selektion ins PKZ-Analysetool",
    canvasMaximizeWrapperClass: "kdb-widget-maximize",
    expandDrillthroughColumnClass: "kdb-expand-drillthrough-column",
    focusModePollMs: 50,
    focusModeWaitMs: 1200,
    GROUPINGS: GROUPINGS,
    isGroupingValue: isGroupingValue
  };
});
