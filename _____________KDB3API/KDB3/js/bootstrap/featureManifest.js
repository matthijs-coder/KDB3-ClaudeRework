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
  "../dashboard/header/index.js",
  "../dashboard/footer/index.js",
  "../dashboard/tabs/index.js",
  "../dashboard/canvas/kdbControl/index.js",
  "../dashboard/canvas/pageSurface/index.js",
  "../dashboard/controls/toolbarControls/index.js",
  "../dashboard/launchpad/index.js",
  "../dashboard/widgets/widgetBase/index.js",
  "../dashboard/widgets/widgetSettings/index.js",
  "../dashboard/widgets/widgetText/index.js",
  "../dashboard/widgets/widgetVis/index.js",
  "../dashboard/widgets/widgetTopN/index.js",
  "../dashboard/canvas/dragDrop/index.js",
  "../dashboard/metricsTree/index.js",
  "../dashboard/filters/filterDock/index.js",
  "../dashboard/filters/singleSelect/index.js",
  "../dashboard/filters/dienststelle/index.js",
  "../dashboard/filters/sicht/index.js",
  "../dashboard/filters/specialSingleSelect/index.js",
  "../dashboard/filters/nativeMultiSelect/index.js",
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
  _registerToolbarControls,
  _registerLaunchpad,
  _registerWidgetBase,
  _registerWidgetSettings,
  _registerWidgetText,
  _registerWidgetVis,
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

  // Composition root: the one place that names every feature registrar and the service registrar (core/ never
  // imports dashboard/ or workflows/). Single list of what KDB.js registers, mounts and destroys. Array order is
  // the registration order and the mount order. Every `register` is a module's `register(_KDB)` (its index.js);
  // an entry without `register` is published by an earlier entry (the toolbar buttons by `toolbarControls`).
  // Features register their own history replay handlers (kit history.registerReplayKeys), not this manifest.
  //   api         _KDB.api key the orchestrator publishes (destroyed through its destroy())
  //   destroy     custom teardown for entries without an api object
  //   mount       { options, phase }: phase "boot" (default) mounts in array order during startModules,
  //               "afterLoading" mounts once the boot overlay is lifted
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
    { name: "header", register: _registerHeader, api: "header", mount: { options: {} } },
    { name: "footer", register: _registerFooter, api: "footer", mount: { options: {} } },
    { name: "tabs", register: _registerTabs, api: "tabs", mount: { options: {} } },
    { name: "kdbControl", register: _registerKdbControl, api: "kdbControl", mount: { options: {} } },
    { name: "pageSurface", register: _registerPageSurface, api: "canvas", mount: { options: {} } },
    { name: "toolbarControls", register: _registerToolbarControls },
    { name: "historyControls", api: "historyControls", mount: { options: {} } },
    { name: "pdfExportControls", api: "pdfExportControls", mount: { options: {} } },
    { name: "wienKiControls", api: "wienKiControls", mount: { options: {} } },
    { name: "shareControls", api: "shareControls", mount: { options: {} } },
    { name: "launchpad", register: _registerLaunchpad, api: "launchpad", mount: { options: {} } },
    { name: "widgetBase", register: _registerWidgetBase, api: "widgetBase", mount: { options: {} } },
    { name: "widgetSettings", register: _registerWidgetSettings, api: "widgetSettings", mount: { options: {} } },
    { name: "widgetText", register: _registerWidgetText, api: "widgetText", mount: { options: {} } },
    { name: "widgetVis", register: _registerWidgetVis, api: "widgetVis", mount: { options: { enableDrillthrough: true } } },
    { name: "widgetTopN", register: _registerWidgetTopN, api: "widgetTopN", mount: { options: {} } },
    { name: "dragDrop", register: _registerDragDrop, api: "dragDrop", mount: { options: {} } },
    { name: "metricsTree", register: _registerMetricsTree, api: "metricsTree", mount: { options: {} } },
    { name: "filterDock", register: _registerFilterDock, api: "filterDock", mount: { options: {}, phase: "afterLoading" } },
    { name: "singleSelect", register: _registerSingleSelect, api: "singleSelect", mount: { options: {} } },
    { name: "dienststelle", register: _registerDienststelle, api: "dienststelle", mount: { options: {} } },
    { name: "sicht", register: _registerSicht, api: "sicht", mount: { options: {} } },
    { name: "specialSingleSelect", register: _registerSpecialSingleSelect, api: "specialSingleSelect", mount: { options: {} } },
    { name: "nativeMultiSelect", register: _registerNativeMultiSelect, api: "nativeMultiSelect", mount: { options: {} } }
  ];

  // Feature names in teardown order. Not the reverse of the mount order: the toolbar controls, canvas, kdbControl
  // and tabs are torn down before the widgets and the launchpad, as before the manifest existed.
  var destroyOrder = [
    "nativeMultiSelect", "specialSingleSelect", "sicht", "dienststelle", "singleSelect", "filterDock", "metricsTree",
    "pdfExportControls", "wienKiControls", "shareControls", "pageSurface", "authoring", "kdbControl", "tabs",
    "historyControls", "dragDrop", "widgetTopN", "widgetVis", "widgetText", "widgetSettings", "widgetBase",
    "launchpad", "footer", "header", "properties", "homeDialog", "css"
  ];

  // _KDB.services keys in teardown order; cognosHost goes last because consumers may still see a live (but already
  // aborting) host adapter during their own teardown. drillthrough goes first: its pending wait windows hang on a
  // tableData load, so they are released before tableData (and anything else) can settle or reject that load.
  var serviceDestroyOrder = [
    "drillthrough", "writebackBridge", "writebackSet", "writebackGet", "writebackMap", "dashboardPdf", "widgetBindingApply", "history",
    "message", "loading", "tableData", "cognosHost"
  ];

  return {
    entries: entries,
    destroyOrder: destroyOrder,
    serviceDestroyOrder: serviceDestroyOrder
  };
});
