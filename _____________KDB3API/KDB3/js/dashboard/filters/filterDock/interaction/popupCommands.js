define(["../state.js", "../identity.js", "../selectors.js", "./dockDom.js"], function (
  _state,
  _identity,
  _selectors,
  _dockDom
) {
  "use strict";

  function toTrimmedString(value) {
    return value ? String(value).trim() : "";
  }

  function matchesActiveFilter(_KDB, runtime, payload, selectors) {
    var activeFilterEl = runtime.domRefs ? runtime.domRefs.activeFilterEl : null;
    var payloadFilterId = toTrimmedString(payload.filterId);
    var payloadFilterKey = toTrimmedString(payload.filterKey);
    var payloadLabel;
    var activeLabel;
    var activeFilterId;
    var activeFilterKey;
    if (!activeFilterEl) {
      return false;
    }
    if (payloadFilterId) {
      activeFilterId = _identity.buildFilterIdFromElement(_KDB, activeFilterEl, selectors);
      return !!activeFilterId && payloadFilterId === activeFilterId;
    }
    if (payloadFilterKey) {
      activeFilterKey = _identity.buildFilterKeyFromElement(activeFilterEl, selectors);
      return !!activeFilterKey && payloadFilterKey === activeFilterKey;
    }
    payloadLabel = toTrimmedString(payload.filterLabel);
    activeLabel = _identity.readFilterLabel(activeFilterEl, selectors);
    if (payloadLabel && activeLabel) {
      console.warn("[filterDock.clickOriginalPopupButton] identity fallback to label only; filterId/filterKey preferred");
      return payloadLabel === activeLabel;
    }
    return false;
  }

  function clickOriginalPopupButton(_KDB, payload) {
    var runtime = _selectors.readDockRuntime(_KDB);
    var selectors = _selectors.readDockSelectors(_KDB);
    var originalFooter;
    var buttonEl;
    if (!payload || !payload.buttonTid || !runtime || !selectors || !matchesActiveFilter(_KDB, runtime, payload, selectors)) {
      return false;
    }
    if (!selectors.nativeFooterSelector) {
      return false;
    }
    originalFooter = runtime.domRefs.activeFilterEl.querySelector(selectors.nativeFooterSelector);
    if (!originalFooter) {
      return false;
    }
    buttonEl = originalFooter.querySelector('[data-tid="' + CSS.escape(String(payload.buttonTid)) + '"]');
    if (!buttonEl || typeof buttonEl.click !== "function") {
      return false;
    }
    buttonEl.click();
    return true;
  }

  function readOutClickCatcher(_KDB) {
    var selectors = _selectors.readDockSelectors(_KDB);
    var catcherSelector = selectors ? selectors.outClickCatcherSelector : null;
    var dockRoot;
    var catcher = null;
    if (typeof document === "undefined" || !catcherSelector) {
      return null;
    }
    dockRoot = _dockDom.readDockRoot(_KDB);
    if (dockRoot) {
      catcher = dockRoot.querySelector(catcherSelector);
    }
    // Cognos portal exception: out-click catcher may live outside the dock root.
    return catcher || document.querySelector(catcherSelector);
  }

  function closeActivePopup(_KDB) {
    var catcher = readOutClickCatcher(_KDB);
    if (!catcher || typeof catcher.click !== "function") {
      console.warn("[filterDock.closeActivePopup] filterOutClickCatcher missing");
      return false;
    }
    catcher.click();
    return true;
  }

  function runPopupCommand(_KDB, action) {
    if (!action || !action.type) {
      return false;
    }
    if (action.type === _state.ACTIONS.CLICK_ORIGINAL_BUTTON_REQUESTED) {
      return clickOriginalPopupButton(_KDB, action.payload || {});
    }
    if (action.type === _state.ACTIONS.CLOSE_ACTIVE_POPUP_REQUESTED) {
      return closeActivePopup(_KDB);
    }
    return false;
  }

  return { runPopupCommand: runPopupCommand };
});
