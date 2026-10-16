define(["../config/actionTypes.js", "../state/ensureWidgetBaseRuntime.js"], function (_actionTypes, _ensureWidgetBaseRuntime) {
  function waitForLaunchpadThenRouteAll(instance, dispatchFn, dispatchInternalFn, options) {
    const timeoutMs = typeof options.launchpadReadyTimeoutMs === "number" ? options.launchpadReadyTimeoutMs : 5000;
    const launchpad = instance._KDB.api && instance._KDB.api.launchpad;
    const waitPromise = launchpad && typeof launchpad.dispatch === "function"
      ? Promise.resolve(launchpad.dispatch({ type: "launchpad/waitUntilReady", payload: { timeoutMs: timeoutMs } }))
      : Promise.resolve(false);
    return waitPromise.then(function (isReady) {
      if (isReady !== true) {
        console.error("[widgetBase.mount] launchpad waitUntilReady returned false");
        dispatchInternalFn({ type: _actionTypes.ERROR_RECORDED, payload: { errorCode: "WIDGET_BASE_LAUNCHPAD_NOT_READY", errorMessage: "Launchpad was not ready before routeAllToLaunchpad." } });
        return false;
      }
      return dispatchFn({ type: _actionTypes.ROUTE_ALL_TO_LAUNCHPAD, payload: { reason: "startup", tabId: null } }).then(function (result) {
        if (!result || result.ok !== true) {
          console.warn("[widgetBase.mount] routeAllToLaunchpad completed without success", result);
          dispatchInternalFn({ type: _actionTypes.ERROR_RECORDED, payload: { errorCode: result && result.errorCode ? result.errorCode : "WIDGET_BASE_MOUNT_FAILED", errorMessage: "Startup routeAllToLaunchpad did not succeed." } });
          return false;
        }
        seedRoutedStartupTab(instance);
        return true;
      });
    }).catch(function (err) {
      console.error("[widgetBase.mount] routeAllToLaunchpad failed", err);
      dispatchInternalFn({ type: _actionTypes.ERROR_RECORDED, payload: { errorCode: "WIDGET_BASE_MOUNT_FAILED", errorMessage: String(err && err.message ? err.message : err) } });
      return false;
    });
  }

  // Seeds the startup tab into routedTabIds so the lazy-routing path
  // (contracts/widgetBase-lazyLaunchpadRouting-contractdelta.md §3.2) no-ops
  // for the tab the mount-time routeAllToLaunchpad already covered. When the
  // active tabId cannot be determined, skipping the seed is acceptable: the
  // ensure path stays idempotent and a redundant ensure is a harmless no-op.
  function seedRoutedStartupTab(instance) {
    try {
      const activeTabId = readActiveTabId(instance._KDB);
      if (!activeTabId) {
        return;
      }
      _ensureWidgetBaseRuntime.ensureWidgetBaseRuntime(instance._KDB);
      instance._KDB.runtime.widgetBase.routedTabIds[activeTabId] = true;
    } catch (err) {
      console.warn("[widgetBase.mount] could not seed startup tab as routed", err);
    }
  }

  function readActiveTabId(_KDB) {
    const tabsApi = _KDB.api ? _KDB.api.tabs : null;
    const tabsState = tabsApi && typeof tabsApi.getState === "function" ? tabsApi.getState() : null;
    if (!tabsState) {
      return null;
    }
    if (tabsState.activeTabId) {
      return tabsState.activeTabId;
    }
    const activeTab = tabsState.byIndex ? tabsState.byIndex[String(tabsState.activeIndex)] : null;
    return activeTab && activeTab.tabId ? activeTab.tabId : null;
  }

  return waitForLaunchpadThenRouteAll;
});
