define([
  "./readCanvasDiscoverySources.js",
  "../view/resolveWidgetShell.js",
  "./scheduleWidgetBasePollDelay.js",
  "../../../tabs/effects/hasTabInnerFrame.js"
], function (_readCanvasDiscoverySources, _shellModule, _pollDelay, _hasTabInnerFrame) {
  // Bounded DOM waits so hidden-tab shells cannot stall tab-scoped discovery.
  const WAIT_TIMEOUT_MS = 2000;
  const POLL_INTERVAL_MS = 100;
  // Quiet after last shell appearance means Cognos' insertion burst is over.
  const SETTLE_QUIET_MS = 400;

  // Tab inner frame may be missing on first activation; timeout proceeds.
  function waitForTabContainer(_KDB, tabId) {
    try {
      if (!tabId || typeof document === "undefined" || !document.getElementById) {
        return Promise.resolve();
      }
      const runtime = _pollDelay.ensureWidgetBasePollRuntime(_KDB);
      const timerKey = "tabContainerPoll:" + tabId;
      return _pollDelay.beginAbortablePoll(runtime, timerKey, pollTabContainer.bind(null, _KDB, tabId, Date.now(), runtime, timerKey));
    } catch (err) {
      console.error("[widgetBase.waitForTabContainer] failed", tabId, err);
      return Promise.resolve();
    }
  }

  // Await DOM shells for this tab only; other-tab aliases are excluded from the wait.
  function waitForScopedShells(_KDB, canvasItems, options) {
    try {
      if (!options.tabId) {
        return Promise.resolve();
      }
      const otherTabAliases = options.otherTabAliases || {};
      const pendingWidgetIds = [];
      let index = 0;
      while (index < canvasItems.length) {
        const item = canvasItems[index];
        index += 1;
        const widgetId = _readCanvasDiscoverySources.resolveWidgetId(item);
        if (!widgetId || _shellModule.resolveWidgetShell(_KDB, widgetId)) {
          continue;
        }
        const ownTabId = _readCanvasDiscoverySources.resolveOwnTabId(_KDB, item);
        if (ownTabId && otherTabAliases[ownTabId] === true) {
          continue;
        }
        pendingWidgetIds.push(widgetId);
      }
      if (pendingWidgetIds.length === 0) {
        return Promise.resolve();
      }
      return pollUntilShellsSettled(_KDB, pendingWidgetIds, options.tabId);
    } catch (err) {
      console.error("[widgetBase.waitForScopedShells] failed", err);
      return Promise.resolve();
    }
  }

  // Stop when all pending shells are present, SETTLE_QUIET_MS idle, or WAIT_TIMEOUT_MS.
  function pollUntilShellsSettled(_KDB, widgetIds, tabId) {
    try {
      const runtime = _pollDelay.ensureWidgetBasePollRuntime(_KDB);
      const timerKey = "scopedShellsPoll:" + tabId;
      const pollState = { startedAt: Date.now(), lastProgressAt: Date.now(), lastPresentCount: 0 };
      return _pollDelay.beginAbortablePoll(runtime, timerKey, pollScopedShells.bind(null, _KDB, widgetIds, pollState, runtime, timerKey));
    } catch (err) {
      console.error("[widgetBase.pollUntilShellsSettled] failed", tabId, err);
      return Promise.resolve();
    }
  }

  function pollTabContainer(_KDB, _tabId, _startedAt, _runtime, _timerKey, _resolve, _signal) {
    try {
      if (_signal && _signal.aborted) { return; }
      if (_hasTabInnerFrame(_KDB, _tabId) || Date.now() - _startedAt >= WAIT_TIMEOUT_MS) {
        _pollDelay.finishPollWait(_runtime, _timerKey, _resolve);
        return;
      }
      _pollDelay.scheduleWidgetBasePollDelay(_runtime, _timerKey, POLL_INTERVAL_MS, pollTabContainer.bind(null, _KDB, _tabId, _startedAt, _runtime, _timerKey, _resolve, _signal));
    } catch (err) {
      console.error("[widgetBase.pollTabContainer] failed", _tabId, err);
      _pollDelay.finishPollWait(_runtime, _timerKey, _resolve);
    }
  }

  function pollScopedShells(_KDB, _widgetIds, _pollState, _runtime, _timerKey, _resolve, _signal) {
    try {
      if (_signal && _signal.aborted) { return; }
      const presentCount = countPresentShells(_KDB, _widgetIds);
      if (presentCount > _pollState.lastPresentCount) {
        _pollState.lastPresentCount = presentCount;
        _pollState.lastProgressAt = Date.now();
      }
      if (presentCount === _widgetIds.length
        || Date.now() - _pollState.lastProgressAt >= SETTLE_QUIET_MS
        || Date.now() - _pollState.startedAt >= WAIT_TIMEOUT_MS) {
        _pollDelay.finishPollWait(_runtime, _timerKey, _resolve);
        return;
      }
      _pollDelay.scheduleWidgetBasePollDelay(_runtime, _timerKey, POLL_INTERVAL_MS, pollScopedShells.bind(null, _KDB, _widgetIds, _pollState, _runtime, _timerKey, _resolve, _signal));
    } catch (err) {
      console.error("[widgetBase.pollScopedShells] failed", err);
      _pollDelay.finishPollWait(_runtime, _timerKey, _resolve);
    }
  }

  function countPresentShells(_KDB, widgetIds) {
    let count = 0;
    let index = 0;
    while (index < widgetIds.length) {
      if (_shellModule.resolveWidgetShell(_KDB, widgetIds[index])) {
        count += 1;
      }
      index += 1;
    }
    return count;
  }

  // Other tabs' tabId/pageId; unreadable tabs state just means we wait.
  function readOtherTabAliases(_KDB, targetTabId) {
    const aliases = {};
    try {
      const tabsApi = _KDB.api ? _KDB.api.tabs : null;
      const tabsState = tabsApi && typeof tabsApi.getState === "function" ? tabsApi.getState() : null;
      const tabTargets = tabsState && tabsState.tabTargets ? tabsState.tabTargets : {};
      Object.keys(tabTargets).forEach(function (tabIdx) {
        const target = tabTargets[tabIdx] || {};
        if (target.tabId === targetTabId || target.pageId === targetTabId) {
          return;
        }
        if (target.tabId) { aliases[target.tabId] = true; }
        if (target.pageId) { aliases[target.pageId] = true; }
      });
    } catch (_err) {
      return {};
    }
    return aliases;
  }

  return {
    waitForTabContainer: waitForTabContainer,
    waitForScopedShells: waitForScopedShells,
    readOtherTabAliases: readOtherTabAliases
  };
});
