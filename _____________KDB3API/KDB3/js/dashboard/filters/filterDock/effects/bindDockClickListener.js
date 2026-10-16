define([
  "./resolveFilterInteraction.js",
  "./dispatchFilterHandoff.js",
  "../config/actions.js",
  "../runtime/readDockRoot.js",
  "../observation/handleOpenPopupDisplayResync.js",
  "../observation/applyPopupReadyTransition.js"
], function (
  _resolveFilterInteraction,
  _dispatchFilterHandoff,
  _actions,
  _readDockRoot,
  _handleOpenPopupDisplayResync,
  _applyPopupReadyTransition
) {
  "use strict";

  function onDockClick(_KDB, _runtime, _dispatch, _options, _event) {
    if (_options && typeof _options.isDisposed === "function" && _options.isDisposed()) {
      return;
    }
    try {
      var selectors = _KDB.elements.selectors.filterDock;
      var resolved = _resolveFilterInteraction(_KDB, _event, selectors);
      if (!resolved || !resolved.interaction) {
        return;
      }
      _runtime.domRefs = _runtime.domRefs || {};
      _runtime.domRefs.lastClickedElement = _event.target;
      if (resolved.filterEl) {
        _runtime.domRefs.activeFilterEl = resolved.filterEl;
        if (selectors.popupMountSelector) {
          var popupMount = resolved.filterEl.querySelector(selectors.popupMountSelector);
          if (popupMount) {
            _runtime.domRefs.activePopupEl = popupMount;
          }
        }
      }
      _applyPopupReadyTransition.resetSessionOnSingleSelectClick(_runtime, resolved.interaction);
      _dispatch({
        type: _actions.CLICK_OBSERVED,
        payload: {
          lastClickedFilter: resolved.lastClickedFilter,
          interaction: resolved.interaction,
          popup: resolved.interaction.popup
        }
      });
      _handleOpenPopupDisplayResync(_KDB, _runtime, resolved.interaction, _options);
      _dispatchFilterHandoff(_KDB, resolved.interaction, "stateChanged");
    } catch (error) {
      console.error("[filterDock.bindDockClickListener] click failed", error);
    }
  }

  function bindNmsDocumentClick(_KDB, _runtime, _dispatch, _options) {
    if ((_runtime.listeners && _runtime.listeners.nmsDocumentClick) ||
      (_runtime.abortControllers && _runtime.abortControllers.nmsDocumentClick) ||
      typeof document === "undefined") {
      return;
    }
    try {
      var handler = onDockClick.bind(null, _KDB, _runtime, _dispatch, _options);
      var onDocumentClick = function (_event) {
        var root;
        var lastClicked;
        if (_options && typeof _options.isDisposed === "function" && _options.isDisposed()) {
          return;
        }
        root = _readDockRoot(_KDB);
        if (root && root.contains(_event.target)) { return; }
        lastClicked = _KDB.state && _KDB.state.filters && _KDB.state.filters.filterDock
          ? _KDB.state.filters.filterDock.lastClickedFilter
          : null;
        if (!lastClicked || lastClicked.filterType !== "nativeMultiSelect") { return; }
        handler(_event);
      };
      if (typeof AbortController === "function") {
        var controller = new AbortController();
        _runtime.abortControllers = _runtime.abortControllers || {};
        _runtime.abortControllers.nmsDocumentClick = controller;
        document.addEventListener("click", onDocumentClick, { capture: true, signal: controller.signal });
      } else {
        document.addEventListener("click", onDocumentClick, true);
        _runtime.listeners = _runtime.listeners || {};
        _runtime.listeners.nmsDocumentClick = {
          element: document, type: "click", handler: onDocumentClick, capture: true
        };
      }
    } catch (error) {
      console.error("[filterDock.bindDockClickListener] nms document click failed", error);
    }
  }

  function __controller(_KDB, _runtime, _dispatch, _options) {
    var dockRoot = _readDockRoot(_KDB);
    var dockBound =
      (_runtime.listeners && _runtime.listeners.dockClick) ||
      (_runtime.abortControllers && _runtime.abortControllers.dockClick);
    if (!dockBound) {
      if (!dockRoot) {
        console.warn("[filterDock.mount] dock root not found");
      } else {
        try {
          var handler = onDockClick.bind(null, _KDB, _runtime, _dispatch, _options);
          if (typeof AbortController === "function") {
            var controller = new AbortController();
            _runtime.abortControllers = _runtime.abortControllers || {};
            _runtime.abortControllers.dockClick = controller;
            dockRoot.addEventListener("click", handler, {
              capture: true,
              signal: controller.signal
            });
          } else {
            dockRoot.addEventListener("click", handler, true);
            _runtime.listeners = _runtime.listeners || {};
            _runtime.listeners.dockClick = {
              element: dockRoot,
              type: "click",
              handler: handler,
              capture: true
            };
          }
          _runtime.domRefs = _runtime.domRefs || {};
          _runtime.domRefs.dockRoot = dockRoot;
        } catch (error) {
          console.error("[filterDock.bindDockClickListener] failed", error);
          bindNmsDocumentClick(_KDB, _runtime, _dispatch, _options);
          return false;
        }
      }
    }
    bindNmsDocumentClick(_KDB, _runtime, _dispatch, _options);
    return !!dockRoot;
  }

  return __controller;
});
