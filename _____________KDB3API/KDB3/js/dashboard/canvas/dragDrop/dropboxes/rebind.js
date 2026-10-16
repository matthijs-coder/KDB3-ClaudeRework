define([
  "../config.js",
  "../../../tabs/events/eventNames.js",
  "../../../../core/utils/kit/async.js",
  "../../../../core/utils/kit/runtime.js",
  "./bind.js"
], function (_config, _tabsEvents, _async, _rt, _bind) {
  "use strict";

  // Lazily loaded tabs render their page element only on activation, after the mount-time bind. On every
  // tabs:changed the activated page alone is bound (bindings of other pages stay as they are); while its
  // element is still missing, one bounded poll keeps trying. A newer activation cancels the older poll.
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
      if (_bind.bindPageDropboxes(ctx, pageIds) === _bind.BIND_STATUS.MISSING) {
        pollForPageDropbox(ctx, pageIds);
      }
    } catch (error) {
      console.warn("[dragDrop.onTabsChanged] rebind failed", error);
    }
  }

  function readPageIds(payload) {
    const source = payload || {};

    return [source.pageId, source.tabId].filter(Boolean).map(String);
  }

  function pollForPageDropbox(ctx, pageIds) {
    const controller = new AbortController();

    ctx.rt.abortControllers.tabsChangedRebind = controller;
    return _async.pollUntil({
      check: function () {
        const status = ctx.isDisposed() ? null : _bind.bindPageDropboxes(ctx, pageIds);

        return status === _bind.BIND_STATUS.MISSING ? null : status;
      },
      timeoutMs: _config.tabRebind.timeoutMs,
      intervalMs: _config.tabRebind.intervalMs,
      signal: controller.signal
    }).then(function () {
      if (ctx.rt.abortControllers.tabsChangedRebind === controller) {
        delete ctx.rt.abortControllers.tabsChangedRebind;
      }
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
