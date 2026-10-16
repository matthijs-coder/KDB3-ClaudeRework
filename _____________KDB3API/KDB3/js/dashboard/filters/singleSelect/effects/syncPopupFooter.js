define([
  "../config/selectors.js",
  "../state/selectionState.js"
], function (_selectors, _selectionState) {
  "use strict";

  var FOOTER_HTML =
    '<button title="" data-tid="cancelClickable" tabindex="0" class="bx--btn bx--btn--secondary" type="button">Abbrechen</button><button title="" data-tid="okClickable" tabindex="-1" class="bx--btn bx--btn--primary" type="button">Fertig</button>';

  function ensureFooter(_filterEl) {
    var orig = _filterEl.querySelector(_selectors.nativeFooterSelector);
    var foot;
    if (!orig) {
      return null;
    }
    orig.style.display = "none";
    foot = _filterEl.querySelector(_selectors.customFooterSelector);
    if (foot) {
      return foot;
    }
    foot = document.createElement("div");
    foot.setAttribute("data-tid", _selectors.footerTid);
    foot.className = _selectors.footerCloneClassName + " KDB_singleSelectFooter";
    foot.innerHTML = FOOTER_HTML;
    (orig.parentElement || _filterEl).insertBefore(foot, orig.nextSibling);
    return foot;
  }

  function __controller(_filterEl, _handoffContext, _filterState) {
    var foot = ensureFooter(_filterEl);
    var ok;
    var dis;
    if (!foot) {
      return;
    }
    foot.style.display =
      _handoffContext.condition && _handoffContext.hasAlleOption !== true ? "none" : "";
    ok = foot.querySelector(_selectors.footerOkButtonSelector);
    if (!ok) {
      return;
    }
    dis =
      _filterState.isCommitInProgress === true ||
      _selectionState.getPendingDisplayValue(_filterState.pendingSelection) ===
        _selectionState.getConfirmedDisplayValue(_filterState.backupSelection);
    ok.disabled = dis;
    ok.tabIndex = dis ? -1 : 0;
    ok.classList.toggle(_selectors.disabledButtonClass, dis);
  }

  return __controller;
});
