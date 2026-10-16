define([
  "../config.js",
  "../../../tabs/events/eventNames.js",
  "../../../../core/utils/kit/async.js",
  "../../../../core/utils/kit/runtime.js",
  "./bind.js"
], function (_config, _tabsEvents, _async, _rt, _bind) {
  "use strict";

  // Lazily loaded tabs render their page element only on activation, after the mount-time bind, and Cognos may
  // swap that node shortly after. On every tabs:changed the activated page alone is bound (other pages keep
  // their bindings), then one bounded poll re-checks it until a pass finds the same connected, bound element
  // one interval after the previous pass. A newer activation cancels the older poll.
  function subscribeTabsChangedRebind(ctx) {
    const events = ctx._KDB.events;

    if (!events || typeof events.subscribe !== "function") {
      return false;
    }
    if (typeof ctx.rt.subscriptions.tabsChanged === "function") {
      ctx.rt.subscriptions.tabsChanged();
    }
    ctx.rt.subscriptions.tabsChanged = events.subscribe(_tabsEvents.CHANGED, onTabsChanged.bind(null, ctx));
    return true;
  }

  // Boundary: event bus callback; a missed rebind stays recoverable via refreshDropboxes or the next activation.
  function onTabsChanged(ctx, payload) {
    try {
      const pageIds = readPageIds(payload);

      if (ctx.isDisposed() || _rt.readTabsBusy(ctx._KDB)) {
        return;
      }
      abortPendingPoll(ctx.rt);
      if (pageIds.length === 0) {
        _bind.bindAllDropboxes(ctx);
        return;
      }
      pollForPageDropbox(ctx, pageIds);
    } catch (error) {
      console.error("[dragDrop.onTabsChanged] rebind failed", error);
    }
  }

  function readPageIds(payload) {
    const source = payload || {};

    return [source.pageId, source.tabId].filter(Boolean).map(String);
  }

  function pollForPageDropbox(ctx, pageIds) {
    const controller = new AbortController();
    let previousBoundEls = [];

    function bindPage(info) {
      if (ctx.isDisposed()) {
        return null;
      }
      const result = _bind.bindPageDropboxes(ctx, pageIds);
      const wasStable = info.attempt > 1 && isSameConnectedSet(previousBoundEls, result.boundEls);

      previousBoundEls = result.boundEls;
      if (result.status === _bind.BIND_STATUS.HELPER) {
        return result.status;
      }
      return result.status === _bind.BIND_STATUS.BOUND && wasStable ? result.status : null;
    }

    ctx.rt.abortControllers.tabsChangedRebind = controller;
    return _async.pollUntil({
      check: bindPage,
      timeoutMs: _config.tabRebind.timeoutMs,
      intervalMs: _config.tabRebind.intervalMs,
      signal: controller.signal
    }).then(function (outcome) {
      if (ctx.rt.abortControllers.tabsChangedRebind === controller) {
        delete ctx.rt.abortControllers.tabsChangedRebind;
      }
      if (!outcome.ok && outcome.reason === "timeout" && outcome.lastError) {
        console.error("[dragDrop.pollForPageDropbox] rebind did not settle", outcome.lastError);
      }
    });
  }

  function isSameConnectedSet(previousEls, currentEls) {
    return currentEls.length > 0
      && currentEls.length === previousEls.length
      && currentEls.every(function (el, index) {
        return el === previousEls[index] && el.isConnected;
      });
  }

  function abortPendingPoll(rt) {
    const controller = rt.abortControllers.tabsChangedRebind;

    if (controller) {
      controller.abort();
      delete rt.abortControllers.tabsChangedRebind;
    }
  }

  return { subscribeTabsChangedRebind: subscribeTabsChangedRebind };
});
