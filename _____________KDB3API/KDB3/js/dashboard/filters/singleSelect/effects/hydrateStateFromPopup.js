define([
  "../config/selectors.js",
  "../state/selectionState.js",
  "./readPopupOptionLabel.js"
], function (_selectors, _selectionState, _readPopupOptionLabel) {
  "use strict";

  function findFirstCognosOption(_root) {
    var a = _root.querySelectorAll(_selectors.optionWrapperSelector);
    var i;
    for (i = 0; i < a.length; i += 1) {
      if (!a[i].classList.contains(_selectors.alleOptionClass)) {
        return a[i];
      }
    }
    return null;
  }

  function __controller(_popupMount, _filterState) {
    var a;
    var i;
    var el;
    var ro;
    var sel;
    var cur;
    var bak;
    var uv;
    if (_filterState.wasHydratedFromDom === true || !findFirstCognosOption(_popupMount)) {
      return;
    }
    if (_selectionState.getConfirmedUseValue(_filterState.currentSelection)) {
      _filterState.wasHydratedFromDom = true;
      return;
    }
    a = _popupMount.querySelectorAll(_selectors.optionWrapperSelector);
    for (i = 0; i < a.length; i += 1) {
      el = a[i];
      ro = el.querySelector(_selectors.roleOptionSelector);
      if (
        !el.classList.contains(_selectors.selectedOptionClass) &&
        !el.classList.contains("KDB_selectedOption") &&
        el.getAttribute("aria-selected") !== "true" &&
        (!ro || ro.getAttribute("aria-selected") !== "true")
      ) {
        continue;
      }
      sel = _readPopupOptionLabel.readPopupOptionLabel(el);
      if (!sel) {
        continue;
      }
      cur = _selectionState.normalizeConfirmedSelection(_filterState.currentSelection);
      bak = _selectionState.normalizeConfirmedSelection(_filterState.backupSelection);
      uv = cur.displayValue === sel ? cur.useValue : bak.displayValue === sel ? bak.useValue : "";
      _filterState.currentSelection = _selectionState.createConfirmedSelection(sel, uv);
      _filterState.pendingSelection = _selectionState.createPendingSelection(sel);
      _filterState.backupSelection = _selectionState.createConfirmedSelection(sel, uv);
      _filterState.wasHydratedFromDom = true;
      return;
    }
  }

  return __controller;
});
