define([
  "../config/selectors.js",
  "./ensureSichtRuntime.js"
], function (_selectors, _ensureSichtRuntime) {
  "use strict";

  function readFilterLabel(_filterEl, _filterLabelSelector, _filterDataIdAttr) {
    var labelEl = _filterEl && _filterEl.querySelector(_filterLabelSelector);
    return labelEl && _filterDataIdAttr ? String(labelEl.getAttribute(_filterDataIdAttr) || "").trim() : "";
  }

  function readPopupMountFromFilterEl(_filterEl, _popupMountSelector) {
    if (!_filterEl || !_popupMountSelector || !_filterEl.querySelector) {
      return null;
    }
    return _filterEl.querySelector(_popupMountSelector);
  }

  function resolveFilterElByHandoff(_KDB, _handoff) {
    var dockSelectors = _KDB && _KDB.elements && _KDB.elements.selectors
      ? _KDB.elements.selectors.filterDock
      : null;
    var dockRoot;
    var filterElArr;
    var idx;
    var filterEl;
    var targetLabel;
    if (!dockSelectors || typeof document === "undefined" || !_handoff) {
      return null;
    }
    targetLabel = String(_handoff.filterLabel || "").trim();
    if (!targetLabel) {
      return null;
    }
    dockRoot = document.querySelector(
      _handoff.filterScope === "pageContext"
        ? dockSelectors.pageContextDockSelector
        : dockSelectors.globalDockSelector
    );
    if (!dockRoot || !dockSelectors.filterItemSelector) {
      return null;
    }
    filterElArr = dockRoot.querySelectorAll(dockSelectors.filterItemSelector);
    for (idx = 0; idx < filterElArr.length; idx += 1) {
      filterEl = filterElArr[idx];
      if (readFilterLabel(filterEl, _selectors.filterLabelSelector, _selectors.filterDataIdAttr) === targetLabel) {
        return filterEl;
      }
    }
    return null;
  }

  function resolveSichtPopupMount(_KDB, _handoff, _allowDocumentFallback) {
    var runtime = _ensureSichtRuntime(_KDB);
    var domRefs = runtime.domRefs;
    var dockSelectors = _KDB.elements && _KDB.elements.selectors
      ? _KDB.elements.selectors.filterDock
      : null;
    var popupMountSelector = dockSelectors && dockSelectors.popupMountSelector
      ? dockSelectors.popupMountSelector
      : _selectors.popupMountFallbackSelector;
    var popupMount;
    var filterEl;
    if (domRefs.popupMount && domRefs.popupMount.querySelectorAll) {
      return domRefs.popupMount;
    }
    popupMount = readPopupMountFromFilterEl(domRefs.filterEl, popupMountSelector);
    if (popupMount) {
      domRefs.popupMount = popupMount;
      return popupMount;
    }
    filterEl = resolveFilterElByHandoff(_KDB, _handoff);
    if (filterEl) {
      domRefs.filterEl = filterEl;
      popupMount = readPopupMountFromFilterEl(filterEl, popupMountSelector);
      if (popupMount) {
        domRefs.popupMount = popupMount;
        return popupMount;
      }
    }
    if (_allowDocumentFallback === true && typeof document !== "undefined") {
      popupMount = document.querySelector(_selectors.popupMountFallbackSelector);
      if (popupMount) {
        domRefs.popupMount = popupMount;
        return popupMount;
      }
    }
    return null;
  }

  return resolveSichtPopupMount;
});
