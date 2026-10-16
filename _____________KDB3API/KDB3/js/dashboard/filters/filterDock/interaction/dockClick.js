define([
  "../state.js",
  "../selectors.js",
  "../ownerRoutes.js",
  "../ownerRouter.js",
  "../observation/popupDisplayResync.js",
  "../observation/popupReadySession.js",
  "./clickInteraction.js",
  "./dockDom.js"
], function (
  _state,
  _selectors,
  _ownerRoutes,
  _ownerRouter,
  _popupDisplayResync,
  _popupReadySession,
  _clickInteraction,
  _dockDom
) {
  "use strict";

  function rememberClickTarget(ctx, resolved, event) {
    var runtime = ctx.runtime;
    var popupMountSelector = _selectors.readDockSelectors(ctx._KDB).popupMountSelector;
    var popupMount;
    runtime.domRefs.lastClickedElement = event.target;
    if (!resolved.filterEl) {
      return;
    }
    runtime.domRefs.activeFilterEl = resolved.filterEl;
    if (popupMountSelector) {
      popupMount = resolved.filterEl.querySelector(popupMountSelector);
      if (popupMount) {
        runtime.domRefs.activePopupEl = popupMount;
      }
    }
  }

  // DOM event boundary: a failing click must not break Cognos' own handlers.
  function onDockClick(ctx, event) {
    var _KDB = ctx._KDB;
    var resolved;
    if (ctx.isDisposed()) {
      return;
    }
    try {
      resolved = _clickInteraction.resolveClickInteraction(_KDB, event, _selectors.readDockSelectors(_KDB));
      if (!resolved || !resolved.interaction) {
        return;
      }
      rememberClickTarget(ctx, resolved, event);
      _popupReadySession.resetSessionOnSingleSelectClick(ctx.runtime, resolved.interaction);
      ctx.dispatch({
        type: _state.ACTIONS.CLICK_OBSERVED,
        payload: {
          lastClickedFilter: resolved.lastClickedFilter,
          interaction: resolved.interaction,
          popup: resolved.interaction.popup
        }
      });
      _popupDisplayResync.attachPopupDisplayResyncOnOpen(ctx, resolved.interaction);
      _ownerRouter.dispatchHandoffToOwner(_KDB, resolved.interaction, "stateChanged");
    } catch (error) {
      console.error("[filterDock.onDockClick] click failed", error);
    }
  }

  function onOutsideDockClick(ctx, event) {
    var root;
    var lastClicked;
    if (ctx.isDisposed()) {
      return;
    }
    root = _dockDom.readDockRoot(ctx._KDB);
    if (root && root.contains(event.target)) {
      return;
    }
    lastClicked = _selectors.readLastClickedFilter(ctx._KDB);
    if (lastClicked && _ownerRoutes.receivesOutsideDockClicks(lastClicked.filterType)) {
      onDockClick(ctx, event);
    }
  }

  function listenForClicks(runtime, key, target, handler) {
    var controller = new AbortController();
    runtime.abortControllers[key] = controller;
    target.addEventListener("click", handler, { capture: true, signal: controller.signal });
  }

  function bindDockClick(ctx, dockRoot) {
    var runtime = ctx.runtime;
    if (!runtime.abortControllers.dockClick) {
      listenForClicks(runtime, "dockClick", dockRoot, function (event) { onDockClick(ctx, event); });
      runtime.domRefs.dockRoot = dockRoot;
    }
    if (!runtime.abortControllers.nmsDocumentClick && typeof document !== "undefined") {
      listenForClicks(runtime, "nmsDocumentClick", document, function (event) { onOutsideDockClick(ctx, event); });
    }
  }

  function unbindDockClick(runtime) {
    ["dockClick", "nmsDocumentClick"].forEach(function (key) {
      if (runtime.abortControllers[key]) {
        runtime.abortControllers[key].abort();
        delete runtime.abortControllers[key];
      }
    });
    delete runtime.domRefs.dockRoot;
    delete runtime.domRefs.lastClickedElement;
    delete runtime.domRefs.activeFilterEl;
  }

  return {
    bindDockClick: bindDockClick,
    unbindDockClick: unbindDockClick,
    onDockClick: onDockClick
  };
});
