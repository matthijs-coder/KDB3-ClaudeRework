define([
  "../config/actionTypes.js",
  "../config/defaults.js",
  "../reducer.js",
  "../chrome.js",
  "../view.js",
  "../pageLoading.js",
  "../tabMutation/loadingFrame.js",
  "../../../core/utils/kit/async.js",
  "./traverseOptions.js"
], function (_actionTypes, _defaults, _reducer, _chrome, _view, _applyTabPageLoading, _loadingFrame, _async, _traverseOptions) {
  "use strict";

  // Validates a tabs/traverse request and coalesces it on runtime.tabs.pendingPromises.traverse
  // (read by other modules to detect an in-flight traversal).
  function dispatchTabsTraverse(instance, rawPayload) {
    const options = _traverseOptions.normalizeTraverseOptions(rawPayload);
    if (instance.guard.isDisposed()) { return Promise.resolve(false); }
    if (options.includeHelperTabs) {
      return recordTraverseFailure(instance, "TABS_HELPER_TRAVERSE_UNSUPPORTED", "Helper tab traversal is not supported.");
    }
    if (options.scope === "singleTab" && typeof options.tabIndex !== "number") {
      return recordTraverseFailure(instance, "TABS_TRAVERSE_INVALID_PAYLOAD", "scope singleTab requires tabIndex.");
    }
    const runtime = instance._KDB.runtime && instance._KDB.runtime.tabs;
    const pendingPromises = runtime && runtime.pendingPromises;
    if (!pendingPromises) {
      return traverseTabs(instance.ctx, options);
    }
    const traverseKey = _traverseOptions.buildTraverseKey(options);
    if (pendingPromises.traverse && pendingPromises.traverseKey === traverseKey) {
      return pendingPromises.traverse;
    }
    if (pendingPromises.traverse) {
      return recordTraverseFailure(instance, "TABS_TRAVERSE_CONFLICT", "A different tabs traversal is already in flight.");
    }
    const promise = traverseTabs(instance.ctx, options).finally(function () {
      if (pendingPromises.traverse === promise) {
        delete pendingPromises.traverse;
        delete pendingPromises.traverseKey;
      }
    });
    pendingPromises.traverse = promise;
    pendingPromises.traverseKey = traverseKey;
    return promise;
  }

  function recordTraverseFailure(instance, errorCode, errorMessage) {
    _reducer.commitTabsState(instance._KDB, { type: _actionTypes.TRAVERSE, payload: _traverseOptions.buildFailedPayload(errorCode, errorMessage) });
    return Promise.resolve(false);
  }

  // Runs one normalized traversal. The traversal owns an AbortController in
  // runtime.abortControllers.traverse: destroy aborts it, and so does the timeout,
  // so a timed-out traversal stops clicking and never confirms after its failure.
  async function traverseTabs(_ctx, options) {
    const runtime = _ctx._KDB.runtime.tabs;
    const controller = new AbortController();
    runtime.abortControllers.traverse = controller;
    try {
      return await withTimeout(runTraverse(_ctx, options, controller.signal), options.timeoutMs, function () {
        controller.abort();
        _applyTabPageLoading.finish(_ctx._KDB);
        _ctx.dispatch({ type: _actionTypes.TRAVERSE, payload: _traverseOptions.buildFailedPayload("TABS_TRAVERSE_TIMEOUT", "Tabs traversal timed out.", options) });
        return false;
      });
    } catch (err) {
      console.error("[tabs.traverse] traversal failed", err);
      const message = err && err.message ? err.message : String(err);
      _ctx.dispatch({ type: _actionTypes.TRAVERSE, payload: _traverseOptions.buildFailedPayload("TABS_TRAVERSE_FAILED", message, options) });
      return false;
    } finally {
      if (runtime.abortControllers.traverse === controller) { delete runtime.abortControllers.traverse; }
    }
  }

  async function runTraverse(_ctx, options, signal) {
    try {
      const pendingPayload = { phase: "pending", traversedIndexes: [], canvasLoadedByIndex: {}, scope: options.scope, source: options.source };
      _ctx.dispatch({ type: _actionTypes.TRAVERSE, payload: pendingPayload });
      const buttons = await waitForTabButtons(_ctx, options.timeoutMs, signal);
      if (isStopped(_ctx, signal)) { return false; }
      const state = _ctx.getRawState();
      const activeIndex = typeof state.activeIndex === "number" ? state.activeIndex : 0;
      if (options.scope === "singleTab") {
        const requestedTab = state.byIndex && state.byIndex[String(options.tabIndex)];
        if (!_traverseOptions.shouldTraverseTab(requestedTab, options.tabIndex, options)) {
          const failed = _traverseOptions.buildFailedPayload("TABS_TRAVERSE_INVALID_PAYLOAD", "Requested tab is not traversable.", options);
          _ctx.dispatch({ type: _actionTypes.TRAVERSE, payload: failed });
          return false;
        }
      }
      if (shouldShowLoadingCover(_ctx._KDB, state, options)) {
        const coverTab = state.byIndex && state.byIndex[String(options.scope === "singleTab" ? options.tabIndex : activeIndex)];
        _applyTabPageLoading.start(_ctx._KDB, { pageId: coverTab && coverTab.pageId, tabId: coverTab && coverTab.tabId });
      }
      const visit = { traversedIndexes: [], canvasLoadedByIndex: {}, visitedHidden: false };
      await clickTargetTabs(_ctx, buttons, state, options, visit, signal);
      const restoreIndex = typeof options.restoreTabIndex === "number" ? options.restoreTabIndex : activeIndex;
      if (isStopped(_ctx, signal)) { return false; }
      if (options.restoreActiveTab) {
        _chrome.clickTabChromeButton(buttons[restoreIndex]);
      }
      if (visit.visitedHidden) {
        _view.syncDomFromState(_ctx._KDB, _ctx.getRawState());
      }
      const confirmedIndex = options.restoreActiveTab ? restoreIndex : activeIndex;
      const confirmed = _traverseOptions.buildConfirmedPayload(state, visit.traversedIndexes, visit.canvasLoadedByIndex, confirmedIndex, options);
      _ctx.dispatch({ type: _actionTypes.TRAVERSE, payload: confirmed });
      return true;
    } finally {
      // A timed-out traversal already finished the cover and a newer traversal may own it now; only a destroyed
      // instance (nobody else finishes the cover) or a traversal that was never aborted finishes it here.
      if (!signal.aborted || isDisposed(_ctx)) { _applyTabPageLoading.finish(_ctx._KDB); }
    }
  }

  // Mutation traversals reuse the mutation loading frame; PDF export and a
  // single-tab writebackGet traversal run without a cover.
  function shouldShowLoadingCover(_KDB, state, options) {
    if (options.source === "tabsMutation" && _loadingFrame.syncTraverseLine(_KDB, state, options) === true) { return false; }
    if (options.source === "dashboardPdf") { return false; }
    return options.source !== "writebackGet" || options.scope !== "singleTab";
  }

  // Resolves with the buttons found, possibly none once the wait runs out.
  async function waitForTabButtons(_ctx, timeoutMs, signal) {
    const outcome = await _async.pollUntil({
      check: function () { return _chrome.readTabButtons(_ctx._KDB); },
      predicate: function (buttons) { return buttons.length > 0; },
      timeoutMs: typeof timeoutMs === "number" && timeoutMs > 0 ? timeoutMs : _defaults.HYDRATE_TIMEOUT_MS,
      intervalMs: _defaults.POLL_INTERVAL_MS,
      signal: signal
    });
    return outcome.ok ? outcome.value : _chrome.readTabButtons(_ctx._KDB);
  }

  async function clickTargetTabs(_ctx, buttons, state, options, visit, signal) {
    const targetIndexes = _traverseOptions.collectTargetIndexes(state, options);
    let position = 0;
    while (position < targetIndexes.length) {
      const tabIndex = targetIndexes[position];
      const tab = state.byIndex && state.byIndex[String(tabIndex)];
      position += 1;
      if (!_traverseOptions.shouldTraverseTab(tab, tabIndex, options)) { continue; }
      _chrome.clickTabChromeButton(buttons[tabIndex]);
      visit.traversedIndexes.push(tabIndex);
      visit.canvasLoadedByIndex[String(tabIndex)] = true;
      if (tab && tab.visible !== true) { visit.visitedHidden = true; }
      await _async.sleep(_defaults.TRAVERSE_CLICK_DELAY_MS, signal);
      if (isStopped(_ctx, signal)) { return; }
      if (options.waitFor === "widgetsRendered") {
        await awaitTabWidgetsRendered(_ctx._KDB, tab);
        if (isStopped(_ctx, signal)) { return; }
      }
    }
  }

  // waitFor "widgetsRendered": ask the widgets-owned readiness API to render the
  // activated tab and wait for it. Legacy parity (traverseTabsSafely): a failed
  // render degrades with a warning and never aborts the traversal.
  async function awaitTabWidgetsRendered(_KDB, _tab) {
    const tabId = _tab && _tab.tabId ? _tab.tabId : null;
    const api = _KDB && _KDB.api ? _KDB.api.widgetBase : null;
    if (!tabId || !api) {
      return { ok: false, skipped: true };
    }
    try {
      const result = await api.dispatch({ type: "widgetBase/renderTabWidgetsRequested", payload: { tabId: tabId, reason: "tabsTraverse" } });
      if (!result || result.ok !== true) {
        console.warn("[tabs.awaitTabWidgetsRendered] degraded render wait", tabId, result);
      }
      return result || { ok: false };
    } catch (err) {
      console.warn("[tabs.awaitTabWidgetsRendered] render wait failed", tabId, err);
      return { ok: false };
    }
  }

  // Rejections of the wrapped promise propagate to the traversal boundary.
  function withTimeout(promise, timeoutMs, onTimeout) {
    return new Promise(function (resolve, reject) {
      let settled = false;
      const timerId = setTimeout(function () {
        if (settled) { return; }
        settled = true;
        resolve(onTimeout());
      }, timeoutMs);
      promise.then(function (result) {
        if (settled) { return; }
        settled = true;
        clearTimeout(timerId);
        resolve(result);
      }, function (err) {
        if (settled) { return; }
        settled = true;
        clearTimeout(timerId);
        reject(err);
      });
    });
  }

  function isDisposed(_ctx) {
    return typeof _ctx.isDisposed === "function" && _ctx.isDisposed();
  }

  function isStopped(_ctx, signal) {
    return signal.aborted === true || isDisposed(_ctx);
  }

  return { dispatchTabsTraverse: dispatchTabsTraverse, traverseTabs: traverseTabs };
});
