define([
  "../core/services/cognosHost/__orchestratorCognosHost.js",
  "../core/services/chrome/index.js",
  "../core/services/tableData/__orchestratorTableData.js",
  "../core/services/loadingService/__orchestratorLoadingService.js",
  "../core/services/messageService/__orchestratorMessageService.js",
  "../core/services/historyService/__orchestratorHistoryService.js",
  "../core/services/widgetBindingPlan/__orchestratorWidgetBindingPlan.js",
  "../core/services/widgetBindingApply/__orchestratorWidgetBindingApply.js",
  "../core/services/widgetBinding/index.js",
  "../workflows/pdfExport/__orchestratorDashboardPdf.js",
  "../workflows/parameterSet/__orchestratorWriteback.js",
  "../core/services/drillthrough/__orchestratorDrillthrough.js"
], function (
  _orchestratorCognosHost,
  _registerChrome,
  _orchestratorTableData,
  _orchestratorLoadingService,
  _orchestratorMessageService,
  _orchestratorHistoryService,
  _orchestratorWidgetBindingPlan,
  _orchestratorWidgetBindingApply,
  _registerWidgetBinding,
  _orchestratorDashboardPdf,
  _orchestratorWriteback,
  _orchestratorDrillthrough
) {
  "use strict";

  // Composition root of the services: the only place that imports both core services and the application workflows
  // (workflows/), because the order interleaves them (history registers after dashboardPdf, before the writeback
  // services). `destroy` order lives in featureManifest.serviceDestroyOrder.
  function registerServices(_KDB) {
    _KDB.services = _KDB.services || {};
    _orchestratorCognosHost(_KDB);
    _registerChrome(_KDB);
    _orchestratorTableData(_KDB);
    _orchestratorLoadingService(_KDB);
    _orchestratorMessageService(_KDB);
    _orchestratorWidgetBindingPlan(_KDB);
    _orchestratorWidgetBindingApply(_KDB);
    _registerWidgetBinding(_KDB);
    _orchestratorDashboardPdf(_KDB);
    if (!_KDB.services.history) {
      _orchestratorHistoryService(_KDB, { replayHandlers: {} });
    }
    _orchestratorWriteback(_KDB);
    _orchestratorDrillthrough(_KDB);
    return _KDB.services;
  }

  return registerServices;
});
