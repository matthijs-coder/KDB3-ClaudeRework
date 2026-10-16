define([], function () {
  "use strict";

  return {
    applyTimeoutProfile: "vis",
    bindingPrerequisiteTimeoutMs: 5000,
    contentReadyTimeoutMs: 3000,
    drillthroughIconPath: "./v1/ext/KDB3/images/pkzDrillthrough.png",
    drillthroughIconClass: "kdb_hyperlink_icon",
    datapointDrillthroughWrapperClass: "kdb-datapoint-pkz",
    datapointDrillthroughIconTitle: "Drillthrough der Selektion ins PKZ-Analysetool",
    canvasMaximizeWrapperClass: "kdb-widget-maximize",
    expandDrillthroughColumnClass: "kdb-expand-drillthrough-column",
    focusModePollMs: 50,
    focusModeWaitMs: 1200
  };
});
