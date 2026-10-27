define(["../../../core/config/visualizations/visTypeRules.js"], function (_rules) {
  "use strict";

  // Line and Prognose widgets are found through our own stamp on the widget settings panel
  // (widgetSettings optionMarking.stampPanelVisType writes visTypeRules.settingsKey: "line" / "prognose";
  // the two long Prognose ids are listed too, like the focus-panel CSS). Panels are detached when a widget is
  // parked or cleaned up, so the Cognos id of the Line vis stays as fallback. The Cognos id of the Prognose
  // custom vis was never verified in the live DOM, so it is not used.
  var LINE_STAMP_VALUES = ["Line", "Prognose"].map(_rules.settingsKey).concat([
    "com.ibm.vis.custom.prognoseyear",
    "com.ibm.vis.custom.prognoseyearlinechart"
  ]);
  var LINE_WIDGET_SELECTOR = LINE_STAMP_VALUES.map(function (_value) {
    return '.KDB_widgetSettings[data-kdb-vis-type="' + _value + '"]';
  }).concat(['.liveWidgetContent[walkme-data-id="com.ibm.vis.rave2line"]']).join(", ");

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
    isGroupingValue: _rules.isGrain,
    lineTooltipHideClass: "kdb-hide-aggregate-tooltip",
    lineTooltipHoldMs: 800,
    lineTooltipWidgetSelector: LINE_WIDGET_SELECTOR,
    lineTooltipLegendSelector: ".Legend .Swatch li",
    lineTooltipChartSelector: "svg.rootSvg",
    lineTooltipPointSelector: "path.point-element",
    lineTooltipLabelsSelector: ".popover-content .labels",
    lineTooltipLabelValueSelector: ".labelValue"
  };
});
