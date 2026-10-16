define([
  "./labels.js",
  "../cognosHost/registerCognosHostSelectors.js",
  "../properties/__orchestratorProperties.js",
  "../config/__orchestratorConfig.js",
  "../css/__orchestratorCss.js",
  "../cognosAPI/__orchestratorCognosAPI.js",
  "../authoring/__orchestratorAuthoring.js",
  "../services/__orchestratorServices.js",
  "../homeDialog/__orchestratorHomeDialog.js",
  "../utils/__orchestratorUtils.js",
  "../../dashboard/header/__orchestratorHeader.js",
  "../../dashboard/footer/__orchestratorFooter.js",
  "../../dashboard/tabs/__orchestratorTabs.js",
  "../../dashboard/canvas/kdbControl/__orchestratorKdbControl.js",
  "../../dashboard/canvas/pageSurface/__orchestratorPageSurface.js",
  "../../dashboard/controls/historyControls/__orchestratorHistoryControls.js",
  "../../dashboard/controls/pdfExportControls/__orchestratorPdfExportControls.js",
  "../../dashboard/controls/wienKiControls/__orchestratorWienKiControls.js",
  "../../dashboard/controls/shareControls/__orchestratorShareControls.js",
  "../../dashboard/launchpad/__orchestratorLaunchpad.js",
  "../../dashboard/widgets/widgetBase/__orchestratorWidgetBase.js",
  "../../dashboard/widgets/widgetSettings/__orchestratorWidgetSettings.js",
  "../../dashboard/widgets/widgetText/__orchestratorWidgetText.js",
  "../../dashboard/widgets/widgetVis/__orchestratorWidgetVis.js",
  "../../dashboard/widgets/widgetDataTable/__orchestratorWidgetDataTable.js",
  "../../dashboard/widgets/widgetTopN/__orchestratorWidgetTopN.js",
  "../../dashboard/canvas/dragDrop/__orchestratorDragDrop.js",
  "../../dashboard/metricsTree/__orchestratorMetricsTree.js",
  "../../dashboard/filters/filterDock/__orchestratorFilterDock.js",
  "../../dashboard/filters/singleSelect/__orchestratorSingleSelect.js",
  "../../dashboard/filters/dienststelle/__orchestratorDienststelle.js",
  "../../dashboard/filters/sicht/__orchestratorSicht.js",
  "../../dashboard/filters/specialSingleSelect/__orchestratorSpecialSingleSelect.js",
  "../../dashboard/filters/nativeMultiSelect/__orchestratorNativeMultiSelect.js",
  "./teardownSteps.js"
], function (
  _labels,
  _registerCognosHostSelectors,
  _orchestratorProperties,
  _orchestratorConfig,
  _orchestratorCss,
  _orchestratorCognosAPI,
  _orchestratorAuthoring,
  _orchestratorServices,
  _orchestratorHomeDialog,
  _orchestratorUtils,
  _orchestratorHeader,
  _orchestratorFooter,
  _orchestratorTabs,
  _orchestratorKdbControl,
  _orchestratorPageSurface,
  _orchestratorHistoryControls,
  _orchestratorPdfExportControls,
  _orchestratorWienKiControls,
  _orchestratorShareControls,
  _orchestratorLaunchpad,
  _orchestratorWidgetBase,
  _orchestratorWidgetSettings,
  _orchestratorWidgetText,
  _orchestratorWidgetVis,
  _orchestratorWidgetDataTable,
  _orchestratorWidgetTopN,
  _orchestratorDragDrop,
  _orchestratorMetricsTree,
  _orchestratorFilterDock,
  _orchestratorSingleSelect,
  _orchestratorDienststelle,
  _orchestratorSicht,
  _orchestratorSpecialSingleSelect,
  _orchestratorNativeMultiSelect,
  _teardownSteps
) {
  "use strict";

  // Single list of what KDB.js registers, mounts and destroys. Array order is the registration order and the
  // mount order. Entry paths are the current __orchestrator*.js files (shims included).
  //   api         _KDB.api key the orchestrator publishes (destroyed through its destroy())
  //   destroy     custom teardown for entries without an api object
  //   mount       { options, phase }: phase "boot" (default) mounts in array order during startModules,
  //               "afterLoading" mounts once the boot overlay is lifted
  //   replayKeys  history keys replayed by runtime.<name>.historyReplayHandlerContribution
  var entries = [
    { name: "bootstrapLabels", register: _labels.mergeBootstrapLabels },
    { name: "cognosHostSelectors", register: _registerCognosHostSelectors },
    { name: "properties", register: _orchestratorProperties, destroy: _teardownSteps.destroyPropertiesController },
    { name: "config", register: _orchestratorConfig },
    { name: "css", register: _orchestratorCss },
    { name: "cognosAPI", register: _orchestratorCognosAPI },
    { name: "authoring", register: _orchestratorAuthoring, api: "authoring" },
    { name: "services", register: _orchestratorServices },
    { name: "homeDialog", register: _orchestratorHomeDialog },
    { name: "utils", register: _orchestratorUtils },
    { name: "header", register: _orchestratorHeader, api: "header", mount: { options: {} },
      replayKeys: ["header_chromeChange", "header_textChange"] },
    { name: "footer", register: _orchestratorFooter, api: "footer", mount: { options: {} },
      replayKeys: ["footer_chromeChange"] },
    { name: "tabs", register: _orchestratorTabs, api: "tabs", mount: { options: {} },
      replayKeys: ["tabs_move", "tabs_delete", "tabs_duplicate", "tabs_rename"] },
    { name: "kdbControl", register: _orchestratorKdbControl, api: "kdbControl", mount: { options: {} },
      replayKeys: ["kdbControl_settingsChange"] },
    { name: "pageSurface", register: _orchestratorPageSurface, api: "canvas", mount: { options: {} } },
    { name: "historyControls", register: _orchestratorHistoryControls, api: "historyControls", mount: { options: {} } },
    { name: "pdfExportControls", register: _orchestratorPdfExportControls, api: "pdfExportControls", mount: { options: {} } },
    { name: "wienKiControls", register: _orchestratorWienKiControls, api: "wienKiControls", mount: { options: {} } },
    { name: "shareControls", register: _orchestratorShareControls, api: "shareControls", mount: { options: {} } },
    { name: "launchpad", register: _orchestratorLaunchpad, api: "launchpad", mount: { options: {} } },
    { name: "widgetBase", register: _orchestratorWidgetBase, api: "widgetBase", mount: { options: {} },
      replayKeys: ["widget_canvasDrop", "widget_launchpadTransfer", "widget_layoutMove", "widget_layoutResize"] },
    { name: "widgetSettings", register: _orchestratorWidgetSettings, api: "widgetSettings", mount: { options: {} },
      replayKeys: ["widgetSettings_optionSelect"] },
    { name: "widgetText", register: _orchestratorWidgetText, api: "widgetText", mount: { options: {} },
      replayKeys: ["widget_textEdit"] },
    { name: "widgetVis", register: _orchestratorWidgetVis, api: "widgetVis", mount: { options: { enableDrillthrough: true } } },
    { name: "widgetDataTable", register: _orchestratorWidgetDataTable, api: "widgetDataTable", mount: { options: {} } },
    { name: "widgetTopN", register: _orchestratorWidgetTopN, api: "widgetTopN", mount: { options: {} } },
    { name: "dragDrop", register: _orchestratorDragDrop, api: "dragDrop", mount: { options: {} } },
    { name: "metricsTree", register: _orchestratorMetricsTree, api: "metricsTree", mount: { options: {} } },
    { name: "filterDock", register: _orchestratorFilterDock, api: "filterDock", mount: { options: {}, phase: "afterLoading" } },
    { name: "singleSelect", register: _orchestratorSingleSelect, api: "singleSelect", mount: { options: {} },
      replayKeys: ["filter_singleSelect"] },
    { name: "dienststelle", register: _orchestratorDienststelle, api: "dienststelle", mount: { options: {} },
      replayKeys: ["filter_dienststelle"] },
    { name: "sicht", register: _orchestratorSicht, api: "sicht", mount: { options: {} },
      replayKeys: ["filter_sicht"] },
    { name: "specialSingleSelect", register: _orchestratorSpecialSingleSelect, api: "specialSingleSelect", mount: { options: {} } },
    { name: "nativeMultiSelect", register: _orchestratorNativeMultiSelect, api: "nativeMultiSelect", mount: { options: {} },
      replayKeys: ["filter_nativeMultiSelect"] }
  ];

  // Feature names in teardown order. Not the reverse of the mount order: the toolbar controls, canvas, kdbControl
  // and tabs are torn down before the widgets and the launchpad, as before the manifest existed.
  var destroyOrder = [
    "nativeMultiSelect", "specialSingleSelect", "sicht", "dienststelle", "singleSelect", "filterDock", "metricsTree",
    "pdfExportControls", "wienKiControls", "shareControls", "pageSurface", "kdbControl", "tabs", "historyControls",
    "dragDrop", "widgetTopN", "widgetDataTable", "widgetVis", "widgetText", "widgetSettings", "widgetBase", "launchpad",
    "authoring", "footer", "header", "properties"
  ];

  // _KDB.services keys in teardown order; cognosHost goes last because consumers may still see a live (but already
  // aborting) host adapter during their own teardown.
  var serviceDestroyOrder = [
    "writebackBridge", "writebackSet", "writebackGet", "writebackMap", "dashboardPdf", "widgetBindingApply", "history",
    "message", "loading", "tableData", "cognosHost"
  ];

  // Feature names in the order the replay handlers are registered with the history service.
  var replayOrder = [
    "kdbControl", "header", "footer", "singleSelect", "sicht", "dienststelle", "nativeMultiSelect", "widgetBase",
    "widgetSettings", "widgetText", "tabs"
  ];

  return {
    entries: entries,
    destroyOrder: destroyOrder,
    serviceDestroyOrder: serviceDestroyOrder,
    replayOrder: replayOrder
  };
});
