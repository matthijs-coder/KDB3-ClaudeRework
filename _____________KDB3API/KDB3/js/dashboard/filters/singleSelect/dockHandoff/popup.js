define([
  "../config.js",
  "../state/instance.js",
  "../state/selection.js"
], function (_config, _instance, _selectionState) {
  "use strict";

  var selectors = _config.domSelectors;
  var ALLE = _config.ALLE;
  var COMMIT_CLASS = "KDB_singleSelectCommitInProgress";
  var INVISIBLE_CLASS = "KDB_invisible";

  var FOOTER_HTML =
    '<button title="" data-tid="cancelClickable" tabindex="0" class="bx--btn bx--btn--secondary" type="button">' +
    "Abbrechen</button>" +
    '<button title="" data-tid="okClickable" tabindex="-1" class="bx--btn bx--btn--primary" type="button">' +
    "Fertig</button>";

  var ALLE_HTML =
    '<div class="ba-common-listItem-wrapper KDB_singleSelect_AlleOption">' +
    '<div data-tid="KDB_singleSelect_AlleOption" role="option" ' +
    'class="ba-common-flexLayout ba-common-listItem is-selectable" aria-selected="false">' +
    '<div class="list-item-children"><div class="ba-common-flexLayout" style="max-width: 100%; display: flex;">' +
    '<div class="ba-common-container ba-common-flexLayout-item" style="flex-grow: 0; flex-shrink: 0; padding: 0px 8px 0px 0px;">' +
    '<div class="bx--form-item bx--checkbox-wrapper ba-common-checkbox is-visual">' +
    '<input tabindex="-1" data-tid="buc-Checkbox" type="checkbox" class="bx--checkbox">' +
    '<label class="bx--checkbox-label"><span class="bx--checkbox-label-text"></span></label></div></div>' +
    '<div class="ba-common-container ba-common-flexLayout-item" style="flex: 1 1 0px;">' +
    '<div class="ba-common-truncatedText" style="max-width: 216px; display: table;">' +
    '<div class="ba-common-truncatedText__text" aria-label="' + ALLE + '" dir="ltr">' + ALLE +
    "</div></div></div></div></div></div></div>";

  function requestOriginalButtonClick(_KDB, _handoffContext, _buttonTid, _options) {
    if (_options && typeof _options.clickOriginalButton === "function") {
      _options.clickOriginalButton(_handoffContext, _buttonTid);
      return;
    }
    if (!_KDB || !_KDB.api || !_KDB.api.filterDock || typeof _KDB.api.filterDock.dispatch !== "function") {
      return;
    }
    _KDB.api.filterDock.dispatch({
      type: "filterDock/clickOriginalButtonRequested",
      payload: {
        filterKey: _handoffContext.filterKey,
        filterId: _handoffContext.filterId,
        filterLabel: _handoffContext.filterLabel,
        buttonTid: _buttonTid
      }
    });
  }

  function requestClosePopup(_KDB, _options) {
    if (_options && typeof _options.closePopup === "function") {
      _options.closePopup();
      return;
    }
    if (!_KDB || !_KDB.api || !_KDB.api.filterDock || typeof _KDB.api.filterDock.dispatch !== "function") {
      return;
    }
    _KDB.api.filterDock.dispatch({
      type: "filterDock/closeActivePopupRequested",
      payload: {}
    });
  }

  function setCommitUiState(_runtime, _isCommitInProgress) {
    var refs = _runtime.domRefs || {};
    var bottomEl;
    if (refs.filterEl) {
      refs.filterEl.classList.toggle(COMMIT_CLASS, _isCommitInProgress === true);
      if (selectors.filterItemBottomSelector) {
        bottomEl = refs.filterEl.querySelector(selectors.filterItemBottomSelector);
        if (bottomEl) {
          bottomEl.classList.toggle(INVISIBLE_CLASS, _isCommitInProgress === true);
        }
      }
    }
    if (refs.popupMount) {
      refs.popupMount.classList.toggle(COMMIT_CLASS, _isCommitInProgress === true);
    }
  }

  function readPopupOptionLabel(_el) {
    var textNode;
    if (!_el) {
      return "";
    }
    if (_el.classList.contains(selectors.alleOptionClass)) {
      return ALLE;
    }
    textNode = _el.querySelector(selectors.optionLabelSelector);
    return textNode
      ? String(textNode.getAttribute("aria-label") || textNode.textContent || "").trim()
      : "";
  }

  function resolvePopupMountSelector(_KDB) {
    var filterDock =
      _KDB && _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.filterDock : null;
    if (filterDock && filterDock.popupMountSelector) {
      return filterDock.popupMountSelector;
    }
    return selectors.popupMountFallbackSelector;
  }

  function ensureAlleOption(_root, _hasAlle) {
    var alleSelector = "." + selectors.alleOptionClass;
    var a = _root.querySelectorAll(alleSelector);
    var alleMount;
    var i;
    if (_hasAlle !== true) {
      for (i = 0; i < a.length; i += 1) {
        a[i].remove();
      }
      return;
    }
    if (!_root.querySelector(alleSelector)) {
      alleMount = _root.querySelector(selectors.alleOptionMountSelector);
      if (alleMount) {
        alleMount.insertAdjacentHTML("afterbegin", ALLE_HTML);
      }
    }
  }

  function setCheckboxState(_wrapper, _on) {
    var checkbox;
    var roleOption;
    if (!_wrapper) {
      return;
    }
    checkbox = _wrapper.querySelector(selectors.checkboxInputSelector);
    if (checkbox) {
      checkbox.checked = _on === true;
      checkbox.setAttribute("aria-checked", _on ? "true" : "false");
    }
    roleOption = _wrapper.querySelector(selectors.roleOptionSelector);
    if (roleOption) {
      roleOption.setAttribute("aria-selected", _on ? "true" : "false");
    }
  }

  function setOptionSelected(_wrapper, _on) {
    if (!_wrapper) {
      return;
    }
    _wrapper.classList.toggle("KDB_selectedOption", _on);
    _wrapper.classList.toggle(selectors.selectedOptionClass, _on);
    _wrapper.setAttribute("aria-selected", _on ? "true" : "false");
    setCheckboxState(_wrapper, _on);
  }

  function syncPopupOptionSelection(_popupMount, _filterState) {
    var want;
    var options;
    var i;
    var el;
    if (!_popupMount || !_filterState) {
      return;
    }
    want = _selectionState.getPendingDisplayValue(_filterState.pendingSelection);
    options = _popupMount.querySelectorAll(selectors.optionWrapperSelector);
    for (i = 0; i < options.length; i += 1) {
      setOptionSelected(options[i], false);
    }
    for (i = 0; i < options.length; i += 1) {
      el = options[i];
      if (readPopupOptionLabel(el) === want) {
        setOptionSelected(el, true);
      }
    }
  }

  function ensureFooter(_filterEl) {
    var orig = _filterEl.querySelector(selectors.nativeFooterSelector);
    var foot;
    if (!orig) {
      return null;
    }
    orig.style.display = "none";
    foot = _filterEl.querySelector(selectors.customFooterSelector);
    if (foot) {
      return foot;
    }
    foot = document.createElement("div");
    foot.setAttribute("data-tid", selectors.footerTid);
    foot.className = selectors.footerCloneClassName + " KDB_singleSelectFooter";
    foot.innerHTML = FOOTER_HTML;
    (orig.parentElement || _filterEl).insertBefore(foot, orig.nextSibling);
    return foot;
  }

  function syncPopupFooter(_filterEl, _handoffContext, _filterState) {
    var foot = ensureFooter(_filterEl);
    var ok;
    var dis;
    if (!foot) {
      return;
    }
    foot.style.display =
      _handoffContext.condition && _handoffContext.hasAlleOption !== true ? "none" : "";
    ok = foot.querySelector(selectors.footerOkButtonSelector);
    if (!ok) {
      return;
    }
    dis =
      _filterState.isCommitInProgress === true ||
      _selectionState.getPendingDisplayValue(_filterState.pendingSelection) ===
        _selectionState.getConfirmedDisplayValue(_filterState.backupSelection);
    ok.disabled = dis;
    ok.tabIndex = dis ? -1 : 0;
    ok.classList.toggle(selectors.disabledButtonClass, dis);
  }

  function findFirstCognosOption(_root) {
    var a = _root.querySelectorAll(selectors.optionWrapperSelector);
    var i;
    for (i = 0; i < a.length; i += 1) {
      if (!a[i].classList.contains(selectors.alleOptionClass)) {
        return a[i];
      }
    }
    return null;
  }

  function hydrateStateFromPopup(_popupMount, _filterState) {
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
    a = _popupMount.querySelectorAll(selectors.optionWrapperSelector);
    for (i = 0; i < a.length; i += 1) {
      el = a[i];
      ro = el.querySelector(selectors.roleOptionSelector);
      if (
        !el.classList.contains(selectors.selectedOptionClass) &&
        !el.classList.contains("KDB_selectedOption") &&
        el.getAttribute("aria-selected") !== "true" &&
        (!ro || ro.getAttribute("aria-selected") !== "true")
      ) {
        continue;
      }
      sel = readPopupOptionLabel(el);
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

  // One out-click listener per filter key, rebound on every popup sync. The
  // handler reverts the live record, because reconcile may have replaced the
  // record that was captured at bind time.
  function bindOutClickRevert(_KDB, _runtime, _handoff, _filterState) {
    var catcher = document.querySelector(selectors.outClickCatcherSelector);
    var key = "outClick_" + (_filterState.filterKey || "default");
    var prior = _runtime.abortControllers[key];
    var controller;
    if (!catcher) {
      return;
    }
    if (prior) {
      prior.abort();
    }
    controller = new AbortController();
    _runtime.abortControllers[key] = controller;
    catcher.addEventListener("click", function () {
      var live;
      delete _runtime.abortControllers[key];
      live = _instance.lookupLiveFilterState(_KDB, _handoff, _filterState);
      if (live.isCommitInProgress !== true) {
        live.pendingSelection = _selectionState.createPendingSelection(
          _selectionState.getConfirmedDisplayValue(live.backupSelection)
        );
      }
    }, { once: true, signal: controller.signal });
  }

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
    if (_options && _options.actionType === _config.actions.FILTER_DOCK_POPUP_READY) {
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

  async function restorePopupSelection(_KDB, _runtime, _handoffContext, _filterState, _options) {
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
    popupMount = filterEl.querySelector(resolvePopupMountSelector(_KDB));
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
      ensureAlleOption(popupMount, _handoffContext.hasAlleOption);
      if (options.skipDomHydrate !== true && _handoffContext.filterType !== "sicht") {
        hydrateStateFromPopup(popupMount, _filterState);
      }
      syncPopupOptionSelection(popupMount, _filterState);
      syncPopupFooter(filterEl, _handoffContext, _filterState);
      bindOutClickRevert(_KDB, _runtime, _handoffContext, _filterState);
      return popupMount;
    } catch (error) {
      console.error("[singleSelect.restorePopupSelection] popup sync failed", error);
      return null;
    }
  }

  return {
    requestOriginalButtonClick: requestOriginalButtonClick,
    requestClosePopup: requestClosePopup,
    setCommitUiState: setCommitUiState,
    restorePopupSelection: restorePopupSelection
  };
});
