define([
  "../effects/dispatchFilterHandoff.js",
  "../effects/resolveScopedPopupMount.js",
  "./dispatchPopupDisplayResync.js",
  "../../../../core/cognosHost/config/filterDockChromeSelectors.js"
], function (_dispatchFilterHandoff, _resolveScopedPopupMount, _dispatchPopupDisplayResync, _filterDockChrome) {
  "use strict";

  var chrome = _filterDockChrome.filterDock.strings;
  var OPTION_LABEL_CLASS = String(chrome.optionLabelSelector || "").replace(/^\./, "");

  function isPopupLabelTextNode(_el) {
    if (!_el || _el.nodeType !== 1) {
      return false;
    }
    if (_el.getAttribute && _el.getAttribute("data-tid") === chrome.optionLabelTid) {
      return true;
    }
    return _el.classList && _el.classList.contains(OPTION_LABEL_CLASS);
  }

  function isRelevantCharacterDataMutation(_record) {
    var parentEl;
    if (!_record || _record.type !== "characterData") {
      return false;
    }
    parentEl = _record.target && _record.target.parentElement;
    return isPopupLabelTextNode(parentEl);
  }

  function hasRelevantCharacterDataMutation(_records) {
    var index;
    if (!_records || !_records.length) {
      return false;
    }
    for (index = 0; index < _records.length; index += 1) {
      if (isRelevantCharacterDataMutation(_records[index])) {
        return true;
      }
    }
    return false;
  }

  function isRelevantMutation(_records) {
    var index;
    var record;
    if (!_records || !_records.length) {
      return false;
    }
    for (index = 0; index < _records.length; index += 1) {
      record = _records[index];
      if (record.type === "childList") {
        return true;
      }
      if (isRelevantCharacterDataMutation(record)) {
        return true;
      }
      if (
        record.type === "attributes" &&
        (record.attributeName === "aria-label" || record.attributeName === "title")
      ) {
        return true;
      }
    }
    return false;
  }

  function shouldSelfDetach(_KDB, _runtime) {
    var session = _runtime && _runtime.popupDisplayResyncSession;
    var mountEl = session && session.mountEl;
    var lastClicked;
    var popup;
    var selectors;
    var scopeContext;
    if (!mountEl) {
      return true;
    }
    try {
      if (
        typeof document !== "undefined" &&
        document.documentElement &&
        !document.documentElement.contains(mountEl)
      ) {
        return true;
      }
    } catch (_error) {
      return true;
    }
    lastClicked = _dispatchPopupDisplayResync.readFilterDockSlice(_KDB, "lastClickedFilter");
    if (!lastClicked || !_dispatchFilterHandoff.ownerNeedsPopupDisplayResync(lastClicked.filterType)) {
      return true;
    }
    selectors = _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.filterDock : null;
    scopeContext = selectors
      ? _resolveScopedPopupMount.buildScopeContext(lastClicked, selectors, _runtime)
      : null;
    if (
      !scopeContext ||
      session.hostDataId !== scopeContext.hostDataId ||
      session.scopeType !== scopeContext.scopeType ||
      (lastClicked.filterType === "dienststelle" &&
        scopeContext.hostDataId === "Dienststelle_BW")
    ) {
      return true;
    }
    popup = _dispatchPopupDisplayResync.readFilterDockSlice(_KDB, "popup");
    if (popup && popup.isVisible === false) {
      return true;
    }
    return false;
  }

  return {
    isRelevantMutation: isRelevantMutation,
    hasRelevantCharacterDataMutation: hasRelevantCharacterDataMutation,
    shouldSelfDetach: shouldSelfDetach
  };
});
