define([], function () {
  "use strict";

  var COMMIT_CLASS = "KDB_singleSelectCommitInProgress";
  var INVISIBLE_CLASS = "KDB_invisible";

  function __controller(_KDB, _runtime, _isCommitInProgress) {
    var refs = _runtime.domRefs || {};
    var bottomEl;
    var singleSelectSelectors =
      _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.singleSelect : null;
    if (refs.filterEl) {
      refs.filterEl.classList.toggle(COMMIT_CLASS, _isCommitInProgress === true);
      if (singleSelectSelectors && singleSelectSelectors.filterItemBottomSelector) {
        bottomEl = refs.filterEl.querySelector(singleSelectSelectors.filterItemBottomSelector);
        if (bottomEl) {
          bottomEl.classList.toggle(INVISIBLE_CLASS, _isCommitInProgress === true);
        }
      }
    }
    if (refs.popupMount) {
      refs.popupMount.classList.toggle(COMMIT_CLASS, _isCommitInProgress === true);
    }
  }

  return __controller;
});
