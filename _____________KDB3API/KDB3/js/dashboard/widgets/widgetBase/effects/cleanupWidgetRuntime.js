define([
  "./widgetMoveInteraction.js",
  "./widgetResizeInteraction.js"
], function (_widgetMoveInteraction, _widgetResizeInteraction) {
  function cleanupWidgetRuntime(_KDB, _widgetId) {
    const runtime = _KDB.runtime && _KDB.runtime.widgetBase ? _KDB.runtime.widgetBase : null;
    if (!runtime || !_widgetId) {
      return { ok: false };
    }
    try {
      const widgetRuntime = runtime.byId && runtime.byId[_widgetId] ? runtime.byId[_widgetId] : null;
      if (widgetRuntime) {
        _widgetMoveInteraction.teardownMoveInteraction(_KDB, _widgetId);
        _widgetResizeInteraction.teardownResizeInteraction(_KDB, _widgetId);
        abortBucket(widgetRuntime.abortControllers);
        clearBucket(widgetRuntime.listeners, "function");
        clearBucket(widgetRuntime.observers, "disconnect");
        clearBucket(widgetRuntime.timers, "timer");
        clearBucket(widgetRuntime.pendingPromises, "function");
        widgetRuntime.domRefs = { shellEl: null, canvasParentEl: null, launchpadSlotEl: null };
      }
      if (runtime.byId) {
        delete runtime.byId[_widgetId];
      }
      return { ok: true };
    } catch (err) {
      console.error("[widgetBase.cleanupWidgetRuntime] cleanup failed", _widgetId, err);
      return { ok: false };
    }
  }
  function destroyWidgetBaseModule(_KDB) {
    try {
      const runtime = _KDB.runtime && _KDB.runtime.widgetBase ? _KDB.runtime.widgetBase : null;
      if (!runtime) {
        return;
      }
      clearSubscription(runtime, "dropValidated");
      abortBucket(runtime.abortControllers);
      clearBucket(runtime.subscriptions, "function");
      clearBucket(runtime.listeners, "function");
      clearBucket(runtime.observers, "disconnect");
      clearBucket(runtime.timers, "timer");
      const widgetIds = Object.keys(runtime.byId || {});
      let index = 0;
      while (index < widgetIds.length) {
        cleanupWidgetRuntime(_KDB, widgetIds[index]);
        index += 1;
      }
      runtime.byId = {};
      runtime.routedTabIds = {};
      runtime.pendingRouteByTabId = {};
      runtime.tabMutationSnapshots = {};
      runtime.tabMutationRunId = 0;
      runtime.historyReplayHandlerContribution = null;
    } catch (err) {
      console.error("[widgetBase.destroyWidgetBaseModule] destroy boundary failed", err);
    }
  }
  function clearSubscription(runtime, key) {
    if (runtime.subscriptions && typeof runtime.subscriptions[key] === "function") {
      runtime.subscriptions[key]();
      delete runtime.subscriptions[key];
    }
  }
  function abortBucket(bucket) {
    const keys = Object.keys(bucket || {});
    let index = 0;
    while (index < keys.length) {
      const controller = bucket[keys[index]];
      if (controller && typeof controller.abort === "function") {
        controller.abort();
      }
      delete bucket[keys[index]];
      index += 1;
    }
  }
  function clearBucket(bucket, mode) {
    const keys = Object.keys(bucket || {});
    let index = 0;
    while (index < keys.length) {
      const value = bucket[keys[index]];
      if (mode === "timer") {
        clearTimeout(value);
        clearInterval(value);
      } else if (mode === "disconnect" && value && typeof value.disconnect === "function") {
        value.disconnect();
      } else if (typeof value === "function") {
        value();
      }
      delete bucket[keys[index]];
      index += 1;
    }
  }
  return { cleanupWidgetRuntime: cleanupWidgetRuntime, destroyWidgetBaseModule: destroyWidgetBaseModule };
});
