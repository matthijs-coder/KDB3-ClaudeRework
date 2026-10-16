define([

  "./cognosHost/__orchestratorCognosHost.js",

  "./tableData/__orchestratorTableData.js",

  "./loadingService/__orchestratorLoadingService.js",

  "./messageService/__orchestratorMessageService.js",

  "./historyService/__orchestratorHistoryService.js",

  "./widgetBindingPlan/__orchestratorWidgetBindingPlan.js",

  "./widgetBindingApply/__orchestratorWidgetBindingApply.js",

  "./dashboardPdf/__orchestratorDashboardPdf.js",

  "./writeback/__orchestratorWriteback.js",

  "./drillthrough/__orchestratorDrillthrough.js",

  "./collectReplayHandlers.js",

], function (

  _orchestratorCognosHost,

  _orchestratorTableData,

  _orchestratorLoadingService,

  _orchestratorMessageService,

  _orchestratorHistoryService,

  _orchestratorWidgetBindingPlan,

  _orchestratorWidgetBindingApply,

  _orchestratorDashboardPdf,

  _orchestratorWriteback,

  _orchestratorDrillthrough,

  _collectReplayHandlers

) {

  "use strict";



  function registerEarlyServices(_KDB) {

    _KDB.services = _KDB.services || {};

    _orchestratorCognosHost(_KDB);

    _orchestratorTableData(_KDB);

    _orchestratorLoadingService(_KDB);

    _orchestratorMessageService(_KDB);

    _orchestratorWidgetBindingPlan(_KDB);

    _orchestratorWidgetBindingApply(_KDB);

    _orchestratorDashboardPdf(_KDB);

    if (!_KDB.services.history) {

      _orchestratorHistoryService(_KDB, { replayHandlers: {} });

    }

    _orchestratorWriteback(_KDB);

    _orchestratorDrillthrough(_KDB);

  }



  function __orchestrator(_KDB, _options) {

    const options = _options || {};

    if (options.bindHistoryReplayHandlersOnly === true) {

      const replayHandlers = _collectReplayHandlers(_KDB);

      _orchestratorHistoryService(_KDB, { bindReplayHandlersOnly: true, replayHandlers: replayHandlers });

      return _KDB.services;

    }

    if (options.registerHistoryOnly === true || options.deferHistory === true) {

      return _KDB.services || {};

    }

    registerEarlyServices(_KDB);

    return _KDB.services;

  }



  return __orchestrator;

});

