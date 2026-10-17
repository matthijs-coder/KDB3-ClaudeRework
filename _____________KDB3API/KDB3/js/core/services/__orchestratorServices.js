define([
  "./cognosHost/__orchestratorCognosHost.js",
  "./chrome/index.js",
  "./tableData/__orchestratorTableData.js",
  "./loadingService/__orchestratorLoadingService.js",
  "./messageService/__orchestratorMessageService.js",
  "./historyService/__orchestratorHistoryService.js",
  "./widgetBindingPlan/__orchestratorWidgetBindingPlan.js",
  "./widgetBindingApply/__orchestratorWidgetBindingApply.js",
  "./widgetBinding/index.js",
  "../../workflows/pdfExport/__orchestratorDashboardPdf.js",
  "../../workflows/parameterSet/__orchestratorWriteback.js",
  "./drillthrough/__orchestratorDrillthrough.js"
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

  function __orchestrator(_KDB) {
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

  return __orchestrator;
});
