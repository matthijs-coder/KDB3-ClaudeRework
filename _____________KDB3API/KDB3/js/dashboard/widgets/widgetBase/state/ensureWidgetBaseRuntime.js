define([], function () {
  function ensureWidgetBaseRuntime(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.widgetBase = _KDB.runtime.widgetBase || {};
    const runtime = _KDB.runtime.widgetBase;
    runtime.subscriptions = runtime.subscriptions || {};
    runtime.abortControllers = runtime.abortControllers || {};
    runtime.listeners = runtime.listeners || {};
    runtime.observers = runtime.observers || {};
    runtime.timers = runtime.timers || {};
    runtime.pendingPromises = runtime.pendingPromises || {};
    runtime.routedTabIds = runtime.routedTabIds || {};
    runtime.pendingRouteByTabId = runtime.pendingRouteByTabId || {};
    runtime.tabMutationSnapshots = runtime.tabMutationSnapshots || {};
    runtime.tabMutationRunId = typeof runtime.tabMutationRunId === "number" ? runtime.tabMutationRunId : 0;
    runtime.byId = runtime.byId || {};
  }

  function ensureWidgetBaseWidgetRuntime(_KDB, widgetId) {
    ensureWidgetBaseRuntime(_KDB);
    _KDB.runtime.widgetBase.byId[widgetId] = _KDB.runtime.widgetBase.byId[widgetId] || {
      domRefs: { shellEl: null, canvasParentEl: null, launchpadSlotEl: null },
      listeners: {},
      abortControllers: {},
      observers: {},
      timers: {},
      pendingPromises: {},
      opSeq: 0
    };
  }

  return { ensureWidgetBaseRuntime: ensureWidgetBaseRuntime, ensureWidgetBaseWidgetRuntime: ensureWidgetBaseWidgetRuntime };
});
