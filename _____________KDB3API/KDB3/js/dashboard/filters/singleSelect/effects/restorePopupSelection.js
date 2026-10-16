define([
  "./hydrateStateFromPopup.js",
  "./syncPopupFooter.js",
  "./bindOutClickRevert.js",
  "./syncPopupOptionSelection.js",
  "./readPopupOptionLabel.js"
], function (
  _hydrateStateFromPopup,
  _syncPopupFooter,
  _bindOutClickRevert,
  _syncPopupOptionSelection,
  _readPopupOptionLabel
) {
  "use strict";

  var COMMIT_CLASS = "KDB_singleSelectCommitInProgress";

  function resolveFilterEl(_KDB, _runtime, _handoffContext, _options) {
    var sel;
    var dock;
    var scopeSel;
    var items;
    var i;
    var item;
    var labelEl;
    if (_options && typeof _options.resolveFilterEl === "function") {
      return _options.resolveFilterEl(_KDB, _handoffContext);
    }
    if (_runtime.domRefs && _runtime.domRefs.filterEl && _runtime.domRefs.filterKey === _handoffContext.filterKey &&
      typeof document !== "undefined" && document.contains(_runtime.domRefs.filterEl)) {
      return _runtime.domRefs.filterEl;
    }
    sel =
      _KDB.elements && _KDB.elements.selectors && _KDB.elements.selectors.filterDock
        ? _KDB.elements.selectors.filterDock
        : null;
    if (!sel || typeof document === "undefined") {
      return null;
    }
    scopeSel = _handoffContext.filterScope === "global" ? sel.globalDockSelector
      : _handoffContext.filterScope === "pageContext" ? sel.pageContextDockSelector : null;
    dock = scopeSel ? document.querySelector(scopeSel) : null;
    if (!dock) {
    dock = document.querySelector(sel.rootSelector);
    }
    if (!dock || !sel.filterItemSelector || !sel.filterLabelSelector || !sel.filterDataIdAttr) {
      return null;
    }
    items = dock.querySelectorAll(sel.filterItemSelector);
    for (i = 0; i < items.length; i += 1) {
      item = items[i];
      labelEl = item.querySelector(sel.filterLabelSelector);
      if (labelEl && String(labelEl.getAttribute(sel.filterDataIdAttr) || "").trim() === _handoffContext.filterLabel) {
        return item;
      }
    }
    return null;
  }

  function shouldSyncPopup(_handoffContext, _options) {
    if (_options && _options.actionType === "singleSelect/filterDockPopupReady") {
      return true;
    }
    return !!(_handoffContext.popup && _handoffContext.popup.isVisible === true);
  }

  function isStaleSync(_filterState, _options) {
    var seq = _options && _options.interactionSequence ? _options.interactionSequence : 0;
    if (!seq || _options.skipFreshnessGuard === true) {
      return false;
    }
    return seq < (_filterState.appliedInteractionSeq || 0);
  }

  async function __controller(_KDB, _runtime, _handoffContext, _filterState, _options) {
    var options = _options || {};
    var filterEl;
    var popupMount;
    if (!shouldSyncPopup(_handoffContext, options)) {
      return null;
    }
    if (isStaleSync(_filterState, options)) {
      return null;
    }
    if (options.forceFreshPopupMount === true && _runtime.domRefs) {
      delete _runtime.domRefs.popupMount;
      delete _runtime.domRefs.filterEl;
      delete _runtime.domRefs.filterKey;
    }
    filterEl = resolveFilterEl(_KDB, _runtime, _handoffContext, options);
    if (!filterEl) {
      return null;
    }
    popupMount = filterEl.querySelector(_readPopupOptionLabel.resolvePopupMountSelector(_KDB));
    if (!popupMount) {
      return null;
    }
    _runtime.domRefs.filterEl = filterEl;
    _runtime.domRefs.popupMount = popupMount;
    _runtime.domRefs.filterKey = _handoffContext.filterKey;
    try {
      if (_filterState.isCommitInProgress === true) {
        filterEl.classList.add(COMMIT_CLASS);
        popupMount.classList.add(COMMIT_CLASS);
        return popupMount;
      }
      filterEl.classList.remove(COMMIT_CLASS);
      popupMount.classList.remove(COMMIT_CLASS);
      if (isStaleSync(_filterState, options)) {
        return popupMount;
      }
      _readPopupOptionLabel.ensureAlleOption(popupMount, _handoffContext.hasAlleOption, _KDB);
      if (options.skipDomHydrate !== true && _handoffContext.filterType !== "sicht") {
        _hydrateStateFromPopup(popupMount, _filterState);
      }
      _syncPopupOptionSelection(popupMount, _filterState);
      _syncPopupFooter(filterEl, _handoffContext, _filterState);
      _bindOutClickRevert(_runtime, _filterState);
      return popupMount;
    } catch (error) {
      console.error("[singleSelect.restorePopupSelection] popup sync failed", error);
      return null;
    }
  }

  return __controller;
});
