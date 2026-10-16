define(["../config/actionTypes.js", "../config/defaults.js", "./syncTabsDomFromState.js", "./readTabButtonWrappers.js", "./resolveTraverseTabIndexes.js", "./clickTraverseTabSequence.js", "./buildTraverseDispatchPayload.js", "./applyTabPageLoading.js", "./formatTabMutationCaption.js"], function (_actionTypes, _defaults, _syncTabsDomFromState, _readTabButtonWrappers, _resolveTraverseTabIndexes, _clickTraverseTabSequence, _buildTraverseDispatchPayload, _applyTabPageLoading, _formatTabMutationCaption) {
  "use strict";

  async function __controller(_ctx, _payload) {
    const options = _buildTraverseDispatchPayload(_payload);
    try {
      if (isDisposed(_ctx)) { return false; }
      if (options.includeHelperTabs) {
        _ctx.dispatch({ type: _actionTypes.TRAVERSE, payload: _buildTraverseDispatchPayload.buildFailedPayload("TABS_HELPER_TRAVERSE_UNSUPPORTED", "Helper tab traversal is not supported.", options) });
        return false;
      }
      if (options.scope === "singleTab" && typeof options.tabIndex !== "number") {
        _ctx.dispatch({ type: _actionTypes.TRAVERSE, payload: _buildTraverseDispatchPayload.buildFailedPayload("TABS_TRAVERSE_INVALID_PAYLOAD", "scope singleTab requires tabIndex.", options) });
        return false;
      }
      return await withTimeout(runTraverse(_ctx, options), options.timeoutMs, function () {
        _applyTabPageLoading.finish(_ctx._KDB);
        _ctx.dispatch({ type: _actionTypes.TRAVERSE, payload: _buildTraverseDispatchPayload.buildFailedPayload("TABS_TRAVERSE_TIMEOUT", "Tabs traversal timed out.", options) });
        return false;
      });
    } catch (err) {
      console.error("[tabs.traverseTabs] traversal failed", err);
      _applyTabPageLoading.finish(_ctx._KDB);
      _ctx.dispatch({ type: _actionTypes.TRAVERSE, payload: _buildTraverseDispatchPayload.buildFailedPayload("TABS_TRAVERSE_FAILED", err && err.message ? err.message : String(err), options) });
      return false;
    }
  }

  async function runTraverse(_ctx, options) {
    try {
      _ctx.dispatch({ type: _actionTypes.TRAVERSE, payload: { phase: "pending", traversedIndexes: [], canvasLoadedByIndex: {}, scope: options.scope, source: options.source } });
      const buttons = await waitForTabButtons(_ctx, options.timeoutMs);
      if (isDisposed(_ctx)) { return false; }
      const state = _ctx.getRawState();
      const activeIndex = typeof state.activeIndex === "number" ? state.activeIndex : 0;
      const traversedIndexes = [];
      const canvasLoadedByIndex = {};
      const targetIndexes = _resolveTraverseTabIndexes(state, options);
      if (options.scope === "singleTab") {
        const requestedTab = state.byIndex && state.byIndex[String(options.tabIndex)];
        if (!_resolveTraverseTabIndexes.shouldTraverseTab(requestedTab, options.tabIndex, options)) {
          _ctx.dispatch({ type: _actionTypes.TRAVERSE, payload: _buildTraverseDispatchPayload.buildFailedPayload("TABS_TRAVERSE_INVALID_PAYLOAD", "Requested tab is not traversable.", options) });
          return false;
        }
      }
      if ((options.source !== "tabsMutation" || _formatTabMutationCaption.syncTraverseLine(_ctx._KDB, state, options) !== true) && options.source !== "dashboardPdf" && (options.source !== "writebackGet" || options.scope !== "singleTab")) {
        const coverTab = state.byIndex && state.byIndex[String(options.scope === "singleTab" ? options.tabIndex : activeIndex)];
        _applyTabPageLoading.start(_ctx._KDB, { pageId: coverTab && coverTab.pageId, tabId: coverTab && coverTab.tabId });
      }
      const visitedHidden = await _clickTraverseTabSequence(_ctx, buttons, state, targetIndexes, traversedIndexes, canvasLoadedByIndex, options, delay);
      const restoreIndex = typeof options.restoreTabIndex === "number" ? options.restoreTabIndex : activeIndex;
      if (options.restoreActiveTab) {
        _clickTraverseTabSequence.restoreActiveButton(buttons, restoreIndex, state, options);
      }
      if (visitedHidden && !isDisposed(_ctx)) {
        _syncTabsDomFromState(_ctx._KDB, _ctx.getRawState());
      }
      _ctx.dispatch({ type: _actionTypes.TRAVERSE, payload: _buildTraverseDispatchPayload.buildConfirmedPayload(state, traversedIndexes, canvasLoadedByIndex, options.restoreActiveTab ? restoreIndex : activeIndex, options) });
      return true;
    } finally {
      _applyTabPageLoading.finish(_ctx._KDB);
    }
  }

  async function waitForTabButtons(_ctx, timeoutMs) {
    try {
      const start = Date.now();
      const limit = typeof timeoutMs === "number" && timeoutMs > 0 ? timeoutMs : _defaults.HYDRATE_TIMEOUT_MS;
      let buttons = _readTabButtonWrappers(_ctx._KDB);
      while (!isDisposed(_ctx) && buttons.length === 0 && Date.now() - start < limit) {
        await delay(_ctx, _defaults.POLL_INTERVAL_MS);
        buttons = _readTabButtonWrappers(_ctx._KDB);
      }
      return buttons;
    } catch (err) {
      console.error("[tabs.waitForTabButtons] wait failed", err);
      throw err;
    }
  }

  function delay(_ctx, ms) {
    const runtime = _ctx._KDB.runtime.tabs;
    return new Promise(function (resolve) {
      const timerId = setTimeout(function () {
        delete runtime.timers.traverseDelay;
        resolve();
      }, ms);
      runtime.timers.traverseDelay = timerId;
    });
  }

  function withTimeout(promise, timeoutMs, onTimeout) {
    return new Promise(function (resolve) {
      let settled = false;
      const timerId = setTimeout(function () {
        if (settled) { return; }
        settled = true;
        resolve(onTimeout());
      }, timeoutMs);
      Promise.resolve(promise).then(function (result) {
        if (settled) { return; }
        settled = true;
        clearTimeout(timerId);
        resolve(result);
      }).catch(function () {
        if (settled) { return; }
        settled = true;
        clearTimeout(timerId);
        resolve(false);
      });
    });
  }

  function isDisposed(_ctx) { return _ctx && typeof _ctx.isDisposed === "function" && _ctx.isDisposed(); }

  return __controller;
});
