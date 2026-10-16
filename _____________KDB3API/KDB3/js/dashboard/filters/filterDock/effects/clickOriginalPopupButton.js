define(["./readFilterIdentity.js"], function (_readFilterIdentity) {
  "use strict";

  function readRuntime(_KDB) {
    return _KDB && _KDB.runtime && _KDB.runtime.filterDock ? _KDB.runtime.filterDock : null;
  }

  function readSelectors(_KDB) {
    return _KDB && _KDB.elements && _KDB.elements.selectors
      ? _KDB.elements.selectors.filterDock
      : null;
  }

  function readFilterLabel(_filterEl, _selectors) {
    var labelSelector = _selectors && _selectors.filterLabelSelector;
    var labelEl = labelSelector && _filterEl ? _filterEl.querySelector(labelSelector) : null;
    var attr = _selectors && _selectors.filterDataIdAttr;
    return labelEl && attr ? String(labelEl.getAttribute(attr) || "").trim() : "";
  }

  function readActiveFilterKey(_filterEl, _selectors) {
    var filterLabel;
    var scopeType;
    if (!_filterEl || !_selectors || !_selectors.globalDockSelector) {
      return null;
    }
    filterLabel = readFilterLabel(_filterEl, _selectors);
    if (!filterLabel) {
      return null;
    }
    scopeType = _filterEl.closest(_selectors.globalDockSelector) ? "global" : "pageContext";
    return scopeType + "__" + filterLabel;
  }

  function matchesActiveFilterPayload(_KDB, _runtime, _payload) {
    var activeFilterEl;
    var selectors;
    var activeFilterId;
    var payloadFilterId;
    var payloadFilterKey;
    var activeFilterKey;
    var payloadLabel;
    var activeLabel;
    if (!_payload) {
      return false;
    }
    activeFilterEl = _runtime.domRefs ? _runtime.domRefs.activeFilterEl : null;
    if (!activeFilterEl) {
      return false;
    }
    selectors = readSelectors(_KDB);
    if (!selectors) {
      return false;
    }
    payloadFilterId = _payload.filterId ? String(_payload.filterId).trim() : "";
    if (payloadFilterId) {
      activeFilterId = _readFilterIdentity.buildFilterIdFromElement(_KDB, activeFilterEl, selectors);
      if (!activeFilterId) {
        return false;
      }
      if (payloadFilterId !== activeFilterId) {
        return false;
      }
      return true;
    }
    payloadFilterKey = _payload.filterKey ? String(_payload.filterKey).trim() : "";
    if (payloadFilterKey) {
      activeFilterKey = readActiveFilterKey(activeFilterEl, selectors);
      if (!activeFilterKey) {
        return false;
      }
      if (payloadFilterKey !== activeFilterKey) {
        return false;
      }
      return true;
    }
    payloadLabel = _payload.filterLabel ? String(_payload.filterLabel).trim() : "";
    activeLabel = readFilterLabel(activeFilterEl, selectors);
    if (payloadLabel && activeLabel) {
      console.warn(
        "[filterDock.clickOriginalPopupButton] identity fallback to label only; filterId/filterKey preferred"
      );
      return payloadLabel === activeLabel;
    }
    return false;
  }

  function __controller(_KDB, _payload) {
    var runtime;
    var filterEl;
    var buttonTid;
    var originalFooter;
    var buttonEl;
    var selectors;
    if (!_KDB || !_payload || !_payload.buttonTid) {
      return false;
    }
    runtime = readRuntime(_KDB);
    if (!runtime || !matchesActiveFilterPayload(_KDB, runtime, _payload)) {
      return false;
    }
    selectors = readSelectors(_KDB);
    filterEl = runtime.domRefs.activeFilterEl;
    buttonTid = String(_payload.buttonTid);
    if (!selectors || !selectors.nativeFooterSelector) {
      return false;
    }
    originalFooter = filterEl.querySelector(selectors.nativeFooterSelector);
    if (!originalFooter) {
      return false;
    }
    buttonEl = originalFooter.querySelector('[data-tid="' + buttonTid + '"]');
    if (!buttonEl || typeof buttonEl.click !== "function") {
      return false;
    }
    buttonEl.click();
    return true;
  }

  return __controller;
});
