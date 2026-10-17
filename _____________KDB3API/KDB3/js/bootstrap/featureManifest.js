define([
  "../core/bootstrap/labels.js",
  "../core/cognosHost/registerCognosHostSelectors.js",
  "../core/properties/index.js",
  "../core/config/registerConfig.js",
  "../core/css/index.js",
  "../core/css/removeCssLinks.js",
  "../core/cognosAPI/index.js",
  "../core/authoring/index.js",
  "./registerServices.js",
  "../core/homeDialog/index.js",
  "../core/homeDialog/destroyHomeDialog.js",
  "../core/utils/registerUtils.js",
  "../dashboard/header/__registerHeader.js",
  "../dashboard/footer/__registerFooter.js",
  "../dashboard/tabs/__registerTabs.js",
  "../dashboard/canvas/kdbControl/__registerKdbControl.js",
  "../dashboard/canvas/pageSurface/__registerPageSurface.js",
  "../dashboard/controls/historyControls/__registerHistoryControls.js",
  "../dashboard/controls/pdfExportControls/__registerPdfExportControls.js",
  "../dashboard/controls/wienKiControls/__registerWienKiControls.js",
  "../dashboard/controls/shareControls/__registerShareControls.js",
  "../dashboard/launchpad/__registerLaunchpad.js",
  "../dashboard/widgets/widgetBase/__registerWidgetBase.js",
  "../dashboard/widgets/widgetSettings/__registerWidgetSettings.js",
  "../dashboard/widgets/widgetText/__registerWidgetText.js",
  "../dashboard/widgets/widgetVis/__registerWidgetVis.js",
  "../dashboard/widgets/widgetDataTable/__registerWidgetDataTable.js",
  "../dashboard/widgets/widgetTopN/__registerWidgetTopN.js",
  "../dashboard/canvas/dragDrop/__registerDragDrop.js",
  "../dashboard/metricsTree/__registerMetricsTree.js",
  "../dashboard/filters/filterDock/__registerFilterDock.js",
  "../dashboard/filters/singleSelect/__registerSingleSelect.js",
  "../dashboard/filters/dienststelle/__registerDienststelle.js",
  "../dashboard/filters/sicht/__registerSicht.js",
  "../dashboard/filters/specialSingleSelect/__registerSpecialSingleSelect.js",
  "../dashboard/filters/nativeMultiSelect/__registerNativeMultiSelect.js",
  "../core/bootstrap/teardownSteps.js"
], function (
  _labels,
  _registerCognosHostSelectors,
  _registerProperties,
  _registerConfig,
  _registerCss,
  _removeCssLinks,
  _registerCognosAPI,
  _registerAuthoring,
  _registerServices,
  _registerHomeDialog,
  _destroyHomeDialog,
  _registerUtils,
  _registerHeader,
  _registerFooter,
  _registerTabs,
  _registerKdbControl,
  _registerPageSurface,
  _registerHistoryControls,
  _registerPdfExportControls,
  _registerWienKiControls,
  _registerShareControls,
  _registerLaunchpad,
  _registerWidgetBase,
  _registerWidgetSettings,
  _registerWidgetText,
  _registerWidgetVis,
  _registerWidgetDataTable,
  _registerWidgetTopN,
  _registerDragDrop,
  _registerMetricsTree,
  _registerFilterDock,
  _registerSingleSelect,
  _registerDienststelle,
  _registerSicht,
  _registerSpecialSingleSelect,
  _registerNativeMultiSelect,
  _teardownSteps
) {
  "use strict";

  // Composition root: the one place that names every feature orchestrator and the service registrar (core/ never
  // imports dashboard/ or workflows/). Single list of what KDB.js registers, mounts and destroys. Array order is
  // the registration order and the mount order. Entry paths are the current __orchestrator*.js files (shims included).
  //   api         _KDB.api key the orchestrator publishes (destroyed through its destroy())
  //   destroy     custom teardown for entries without an api object
  //   mount       { options, phase }: phase "boot" (default) mounts in array order during startModules,
  //               "afterLoading" mounts once the boot overlay is lifted
  //   replayKeys  history keys replayed by runtime.<name>.historyReplayHandlerContribution
  var entries = [
    { name: "bootstrapLabels", register: _labels.mergeBootstrapLabels },
    { name: "cognosHostSelectors", register: _registerCognosHostSelectors },
    { name: "properties", register: _registerProperties, destroy: _teardownSteps.destroyPropertiesController },
    { name: "config", register: _registerConfig },
    { name: "css", register: _registerCss, destroy: _removeCssLinks },
    { name: "cognosAPI", register: _registerCognosAPI },
    { name: "services", register: _registerServices },
    { name: "authoring", register: _registerAuthoring, api: "authoring" },
    { name: "homeDialog", register: _registerHomeDialog, destroy: _destroyHomeDialog },
    { name: "utils", register: _registerUtils },
    { name: "header", register: _registerHeader, api: "header", mount: { options: {} },
      replayKeys: ["header_chromeChange", "header_textChange"] },
    { name: "footer", register: _registerFooter, api: "footer", mount: { options: {} },
      replayKeys: ["footer_chromeChange"] },
    { name: "tabs", register: _registerTabs, api: "tabs", mount: { options: {} },
      replayKeys: ["tabs_move", "tabs_delete", "tabs_duplicate", "tabs_rename"] },
    { name: "kdbControl", register: _registerKdbControl, api: "kdbControl", mount: { options: {} },
      replayKeys: ["kdbControl_settingsChange"] },
    { name: "pageSurface", register: _registerPageSurface, api: "canvas", mount: { options: {} } },
    { name: "historyControls", register: _registerHistoryControls, api: "historyControls", mount: { options: {} } },
    { name: "pdfExportControls", register: _registerPdfExportControls, api: "pdfExportControls", mount: { options: {} } },
    { name: "wienKiControls", register: _registerWienKiControls, api: "wienKiControls", mount: { options: {} } },
    { name: "shareControls", register: _registerShareControls, api: "shareControls", mount: { options: {} } },
    { name: "launchpad", register: _registerLaunchpad, api: "launchpad", mount: { options: {} } },
    { name: "widgetBase", register: _registerWidgetBase, api: "widgetBase", mount: { options: {} },
      replayKeys: ["widget_canvasDrop", "widget_launchpadTransfer", "widget_layoutMove", "widget_layoutResize"] },
    { name: "widgetSettings", register: _registerWidgetSettings, api: "widgetSettings", mount: { options: {} },
      replayKeys: ["widgetSettings_optionSelect"] },
    { name: "widgetText", register: _registerWidgetText, api: "widgetText", mount: { options: {} },
      replayKeys: ["widget_textEdit"] },
    { name: "widgetVis", register: _registerWidgetVis, api: "widgetVis", mount: { options: { enableDrillthrough: true } } },
    { name: "widgetDataTable", register: _registerWidgetDataTable, api: "widgetDataTable", mount: { options: {} } },
    { name: "widgetTopN", register: _registerWidgetTopN, api: "widgetTopN", mount: { options: {} } },
    { name: "dragDrop", register: _registerDragDrop, api: "dragDrop", mount: { options: {} } },
    { name: "metricsTree", register: _registerMetricsTree, api: "metricsTree", mount: { options: {} } },
    { name: "filterDock", register: _registerFilterDock, api: "filterDock", mount: { options: {}, phase: "afterLoading" } },
    { name: "singleSelect", register: _registerSingleSelect, api: "singleSelect", mount: { options: {} },
      replayKeys: ["filter_singleSelect"] },
    { name: "dienststelle", register: _registerDienststelle, api: "dienststelle", mount: { options: {} },
      replayKeys: ["filter_dienststelle"] },
    { name: "sicht", register: _registerSicht, api: "sicht", mount: { options: {} },
      replayKeys: ["filter_sicht"] },
    { name: "specialSingleSelect", register: _registerSpecialSingleSelect, api: "specialSingleSelect", mount: { options: {} } },
    { name: "nativeMultiSelect", register: _registerNativeMultiSelect, api: "nativeMultiSelect", mount: { options: {} },
      replayKeys: ["filter_nativeMultiSelect"] }
  ];

  // Feature names in teardown order. Not the reverse of the mount order: the toolbar controls, canvas, kdbControl
  // and tabs are torn down before the widgets and the launchpad, as before the manifest existed.
  var destroyOrder = [
    "nativeMultiSelect", "specialSingleSelect", "sicht", "dienststelle", "singleSelect", "filterDock", "metricsTree",
    "pdfExportControls", "wienKiControls", "shareControls", "pageSurface", "authoring", "kdbControl", "tabs",
    "historyControls", "dragDrop", "widgetTopN", "widgetDataTable", "widgetVis", "widgetText", "widgetSettings", "widgetBase",
    "launchpad", "footer", "header", "properties", "homeDialog", "css"
  ];

  // _KDB.services keys in teardown order; cognosHost goes last because consumers may still see a live (but already
  // aborting) host adapter during their own teardown. drillthrough goes first: its pending wait windows hang on a
  // tableData load, so they are released before tableData (and anything else) can settle or reject that load.
  var serviceDestroyOrder = [
    "drillthrough", "writebackBridge", "writebackSet", "writebackGet", "writebackMap", "dashboardPdf", "widgetBindingApply", "history",
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
