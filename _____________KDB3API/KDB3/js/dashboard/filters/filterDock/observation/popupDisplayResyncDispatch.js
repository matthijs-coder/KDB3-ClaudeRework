define([
  "../config.js",
  "../ownerRoutes.js",
  "../ownerRouter.js",
  "../selectors.js",
  "../interaction/dockDom.js",
  "./popupReadyHandoff.js",
  "../../../../core/utils/kit/runtime.js"
], function (_config, _ownerRoutes, _ownerRouter, _selectors, _dockDom, _popupReadyHandoff, _runtime) {
  "use strict";

  var CONFIRM_KEYS = _config.POPUP_DISPLAY_RESYNC_CONFIRM_DELAYS_MS.map(function (delayMs, index) {
    return "popupDisplayResyncConfirm" + index;
  });

  function dispatchPopupDisplayResync(ctx, source) {
    var _KDB = ctx._KDB;
    var runtime = ctx.runtime;
    var lastClickedFilter = _selectors.readLastClickedFilter(_KDB);
    var selectors;
    var dockRoot;
    var scopeContext;
    var popup;
    var handoff;
    if (!lastClickedFilter || !_ownerRoutes.ownerNeedsPopupDisplayResync(lastClickedFilter.filterType)) {
      return false;
    }
    selectors = _selectors.readDockSelectors(_KDB);
    dockRoot = _dockDom.readDockRoot(_KDB);
    scopeContext = _dockDom.buildScopeContext(lastClickedFilter, selectors, runtime);
    if (!dockRoot || !selectors || !scopeContext) {
      return false;
    }
    popup = _dockDom.readPopupSnapshot(
      null,
      dockRoot,
      selectors,
      lastClickedFilter.filterId,
      lastClickedFilter.filterType,
      Date.now(),
      runtime,
      scopeContext
    );
    handoff = _popupReadyHandoff.buildPopupReadyHandoff(lastClickedFilter, _selectors.readLastInteraction(_KDB), popup);
    if (!handoff || !handoff.filterKey || !String(handoff.filterKey).trim()) {
      return false;
    }
    handoff.resyncSource = source ? String(source) : "mountMutation";
    handoff.observedAt = Date.now();
    return _ownerRouter.dispatchHandoffToOwner(_KDB, handoff, "popupReady") === true;
  }

  // Frame boundary.
  function runPrimaryResync(ctx) {
    try {
      if (ctx.isDisposed()) {
        return;
      }
      dispatchPopupDisplayResync(ctx, ctx.runtime.popupDisplayResyncPendingSource);
    } catch (error) {
      console.error("[filterDock.runPrimaryPopupDisplayResync] failed", error);
    }
  }

  // Timer boundary.
  function runConfirmResync(ctx) {
    try {
      if (ctx.isDisposed()) {
        return;
      }
      dispatchPopupDisplayResync(ctx, "mountMutationConfirm");
    } catch (error) {
      console.error("[filterDock.runConfirmPopupDisplayResync] failed", error);
    }
  }

  function clearPopupDisplayResyncTimers(runtime) {
    _runtime.clearTimer(runtime.timers, "popupDisplayResync");
    CONFIRM_KEYS.forEach(function (key) {
      _runtime.clearTimer(runtime.timers, key);
    });
  }

  // One frame dispatches with the latest pending source; the confirm ladder re-checks after Cognos settled.
  function schedulePopupDisplayResync(ctx, source) {
    var runtime = ctx.runtime;
    if (ctx.isDisposed()) {
      return false;
    }
    runtime.popupDisplayResyncPendingSource = source;
    CONFIRM_KEYS.forEach(function (key, index) {
      _runtime.scheduleTimeout(runtime.timers, key, function () {
        runConfirmResync(ctx);
      }, _config.POPUP_DISPLAY_RESYNC_CONFIRM_DELAYS_MS[index]);
    });
    if (runtime.timers.popupDisplayResync == null) {
      _runtime.scheduleFrame(runtime.timers, "popupDisplayResync", function () {
        runPrimaryResync(ctx);
      });
    }
    return true;
  }

  return {
    schedulePopupDisplayResync: schedulePopupDisplayResync,
    clearPopupDisplayResyncTimers: clearPopupDisplayResyncTimers,
    dispatchPopupDisplayResync: dispatchPopupDisplayResync
  };
});
