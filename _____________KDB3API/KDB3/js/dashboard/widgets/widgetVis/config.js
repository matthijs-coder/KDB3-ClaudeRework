define(["../../../core/config/visualizations/visTypeRules.js"], function (_rules) {
  "use strict";

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
    GROUPINGS: _rules.GRAINS,
    isGroupingValue: _rules.isGrain
  };
});
