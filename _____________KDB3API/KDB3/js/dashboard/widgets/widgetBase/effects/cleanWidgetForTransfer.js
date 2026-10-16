define([
  "./cleanLaunchpadWidget.js",
  "./dispatchWidgetVisLifecycle.js"
], function (_cleanLaunchpadWidget, _dispatchWidgetVisLifecycle) {
  function teardownHandle(handle) {
    if (typeof handle === "number") {
      clearTimeout(handle);
      clearInterval(handle);
      return;
    }
    if (!handle) {
      return;
    }
    if (typeof handle === "function") {
      handle();
      return;
    }
    if (typeof handle.abort === "function") {
      handle.abort();
      return;
    }
    if (typeof handle.unsubscribe === "function") {
      handle.unsubscribe();
      return;
    }
    if (typeof handle.disconnect === "function") {
      handle.disconnect();
      return;
    }
    if (typeof handle.remove === "function") {
      handle.remove();
      return;
    }
    if (typeof handle.off === "function") {
      handle.off();
    }
  }

  function teardownBucket(bucket) {
    const keys = bucket ? Object.keys(bucket) : [];
    let index = 0;
    while (index < keys.length) {
      teardownHandle(bucket[keys[index]]);
      delete bucket[keys[index]];
      index += 1;
    }
  }

  function teardownWidgetState(_KDB, widgetId) {
    const runtime = _KDB && _KDB.runtime && _KDB.runtime.widgetBase && _KDB.runtime.widgetBase.byId
      ? _KDB.runtime.widgetBase.byId[widgetId]
      : null;
    if (runtime) {
      teardownBucket(runtime.listeners);
      teardownBucket(runtime.subscriptions);
      teardownBucket(runtime.observers);
      teardownBucket(runtime.timers);
      teardownBucket(runtime.abortControllers);
    }
  }

  function resolveWidgetEl(widgetElOrId) {
    if (widgetElOrId && widgetElOrId.nodeType === 1) {
      return widgetElOrId;
    }
    if (typeof document !== "undefined" && typeof document.getElementById === "function") {
      return document.getElementById(widgetElOrId);
    }
    return null;
  }

  function cleanWidgetForTransfer(_KDB, _widgetElOrId) {
    try {
      const widgetEl = resolveWidgetEl(_widgetElOrId);
      const widgetId = widgetEl ? widgetEl.id || widgetEl.getAttribute("id") : _widgetElOrId;
      return _cleanLaunchpadWidget(_KDB, widgetEl || widgetId).then(function () {
        if (!widgetId) {
          return;
        }
        _dispatchWidgetVisLifecycle.dispatchWidgetVisDispose(_KDB, { widgetId: widgetId, reason: "transfer" });
        teardownWidgetState(_KDB, widgetId);
      });
    } catch (err) {
      console.error("[widgetBase.cleanWidgetForTransfer] transfer clean failed", err);
      return Promise.resolve();
    }
  }

  // Park = dispose-punt voor élk pad (adapter-contract §3.7), ook wanneer de
  // route niet op een clean-pad uitkomt (bijv. legacy-frames waarvan kind ooit
  // naar "other" is overschreven): stille no-op zonder widgetVis-bucket.
  function disposeWidgetVisForTransfer(_KDB, _widgetId) {
    _dispatchWidgetVisLifecycle.dispatchWidgetVisDispose(_KDB, { widgetId: _widgetId, reason: "transfer" });
  }

  return {
    cleanWidgetForTransfer: cleanWidgetForTransfer,
    disposeWidgetVisForTransfer: disposeWidgetVisForTransfer
  };
});
