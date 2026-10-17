define([
  "../core/services/cognosHost/index.js",
  "../core/services/chrome/index.js",
  "../core/services/tableData/index.js",
  "../core/services/loadingService/index.js",
  "../core/services/messageService/index.js",
  "../core/services/historyService/index.js",
  "../core/services/widgetBindingPlan/index.js",
  "../core/services/widgetBindingApply/index.js",
  "../core/services/widgetBinding/index.js",
  "../workflows/pdfExport/index.js",
  "../workflows/parameterSet/index.js",
  "../core/services/drillthrough/index.js"
], function (
  _registerCognosHost,
  _registerChrome,
  _registerTableData,
  _registerLoadingService,
  _registerMessageService,
  _registerHistoryService,
  _registerWidgetBindingPlan,
  _registerWidgetBindingApply,
  _registerWidgetBinding,
  _registerDashboardPdf,
  _registerWriteback,
  _registerDrillthrough
) {
  "use strict";

  // Composition root of the services: the only place that imports both core services and the application workflows
  // (workflows/), because the order interleaves them (history registers after dashboardPdf, before the writeback
  // services). `destroy` order lives in featureManifest.serviceDestroyOrder.
  function registerServices(_KDB) {
    _KDB.services = _KDB.services || {};
    _registerCognosHost(_KDB);
    _registerChrome(_KDB);
    _registerTableData(_KDB);
    _registerLoadingService(_KDB);
    _registerMessageService(_KDB);
    _registerWidgetBindingPlan(_KDB);
    _registerWidgetBindingApply(_KDB);
    _registerWidgetBinding(_KDB);
    _registerDashboardPdf(_KDB);
    if (!_KDB.services.history) {
      _registerHistoryService(_KDB, { replayHandlers: {} });
    }
    _registerWriteback(_KDB);
    _registerDrillthrough(_KDB);
    return _KDB.services;
  }

  return registerServices;
});
