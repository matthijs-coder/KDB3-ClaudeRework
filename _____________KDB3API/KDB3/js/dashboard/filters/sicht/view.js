define([
  "./config.js",
  "./state/selectors.js"
], function (_config, _selectors) {
  "use strict";

  var SELECTORS = _config.SELECTORS;

  function syncSichtOptionAvailability(_KDB, _mappedHandoff, _byOption) {
    var popupMount;
    var dockSelectors;
    var optionElArr;
    var activeSichtValue;
    var visibleCount;
    var enabledCount;
    var idx;
    var optionEl;
    var label;
    var optionKey;
    var optionState;
    var appliedState;
    if (!_KDB || !_mappedHandoff || !_byOption) {
      return { didSync: false, visibleCount: 0, enabledCount: 0 };
    }
    popupMount = resolveSichtPopupMount(_KDB, _mappedHandoff, true);
    if (!popupMount || !popupMount.querySelectorAll) {
      return { didSync: false, visibleCount: 0, enabledCount: 0 };
    }
    popupMount.classList.add(SELECTORS.rootClass);
    dockSelectors = _KDB.elements && _KDB.elements.selectors
      ? _KDB.elements.selectors.filterDock
      : null;
    optionElArr = Array.prototype.slice.call(
      popupMount.querySelectorAll(
        dockSelectors && dockSelectors.optionSelector
          ? dockSelectors.optionSelector
          : SELECTORS.optionSelector
      )
    );
    hideDuplicateSichtOptions(optionElArr);
    activeSichtValue = _selectors.readActiveSichtValue(_KDB);
    visibleCount = 0;
    enabledCount = 0;
    for (idx = 0; idx < optionElArr.length; idx += 1) {
      optionEl = optionElArr[idx];
      label = readSichtOptionLabel(optionEl);
      optionKey = _config.VARIANT_BY_DISPLAY[label] || null;
      optionState = optionKey ? _byOption[optionKey] : null;
      appliedState = applySichtOptionState(
        optionEl,
        optionKey,
        optionState,
        isSichtOptionSelected(optionEl) || label === activeSichtValue
      );
      if (appliedState.isVisible) {
        visibleCount += 1;
      }
      if (appliedState.isEnabled) {
        enabledCount += 1;
      }
    }
    return { didSync: true, visibleCount: visibleCount, enabledCount: enabledCount };
  }

  function resolveSichtPopupMount(_KDB, _handoff, _allowDocumentFallback) {
    var domRefs = _KDB.runtime.sicht.domRefs;
    var dockSelectors = _KDB.elements && _KDB.elements.selectors
      ? _KDB.elements.selectors.filterDock
      : null;
    var popupMountSelector = dockSelectors && dockSelectors.popupMountSelector
      ? dockSelectors.popupMountSelector
      : SELECTORS.popupMountFallbackSelector;
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
      popupMount = document.querySelector(SELECTORS.popupMountFallbackSelector);
      if (popupMount) {
        domRefs.popupMount = popupMount;
        return popupMount;
      }
    }
    return null;
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
      if (readFilterLabel(filterEl, SELECTORS.filterLabelSelector, SELECTORS.filterDataIdAttr) === targetLabel) {
        return filterEl;
      }
    }
    return null;
  }

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

  function hideDuplicateSichtOptions(_optionElArr) {
    var byLabel = {};
    var duplicateArr;
    var keeperEl;
    var idx;
    var label;
    _optionElArr.forEach(function (_optionEl) {
      label = readSichtOptionLabel(_optionEl);
      if (label && label !== _config.ALLE_LABEL) {
        byLabel[label] = byLabel[label] || [];
        byLabel[label].push(_optionEl);
      }
    });
    Object.keys(byLabel).forEach(function (_label) {
      duplicateArr = byLabel[_label];
      if (!duplicateArr || duplicateArr.length <= 1) {
        return;
      }
      keeperEl = duplicateArr[0];
      for (idx = 0; idx < duplicateArr.length; idx += 1) {
        if (isSichtOptionSelected(duplicateArr[idx])) {
          keeperEl = duplicateArr[idx];
          break;
        }
      }
      duplicateArr.forEach(function (_optionEl) {
        if (_optionEl !== keeperEl) {
          _optionEl.style.display = "none";
        }
      });
    });
  }

  function applySichtOptionState(_optionEl, _optionKey, _optionState, _isSelected) {
    var label = readSichtOptionLabel(_optionEl);
    var variant;
    if (!label || label === _config.ALLE_LABEL) {
      _optionEl.classList.add(SELECTORS.hideAlleOptionClass);
      _optionEl.style.display = "none";
      _optionEl.setAttribute("aria-hidden", "true");
      return { isVisible: false, isEnabled: false };
    }
    if (_optionKey && label !== _optionKey) {
      return { isVisible: false, isEnabled: false };
    }
    if (!_optionState || _optionState.isVisible !== true) {
      _optionEl.style.display = _isSelected ? "" : "none";
      return { isVisible: _isSelected, isEnabled: false };
    }
    _optionEl.style.display = "";
    variant = _config.SICHT_VARIANTS[_optionKey];
    if (variant && variant.cssClass) {
      _optionEl.classList.add(variant.cssClass);
    }
    if (_optionState.isEnabled === true) {
      _optionEl.classList.remove(SELECTORS.disabledOptionClass);
      _optionEl.removeAttribute("aria-disabled");
      _optionEl.style.pointerEvents = "";
      return { isVisible: true, isEnabled: true };
    }
    _optionEl.classList.add(SELECTORS.disabledOptionClass);
    _optionEl.setAttribute("aria-disabled", "true");
    _optionEl.style.pointerEvents = "none";
    return { isVisible: true, isEnabled: false };
  }

  function readSichtOptionLabel(_optionEl) {
    var labelEl = _optionEl && _optionEl.querySelector(SELECTORS.optionLabelSelector);
    return String((labelEl && (labelEl.getAttribute("aria-label") || labelEl.textContent)) || "").trim();
  }

  function isSichtOptionSelected(_optionEl) {
    var roleOptionEl = _optionEl && _optionEl.querySelector(SELECTORS.roleOptionSelector);
    var checkboxEl = _optionEl && _optionEl.querySelector(SELECTORS.checkboxSelector);
    return _optionEl.classList.contains(SELECTORS.selectedOptionClass) ||
      _optionEl.classList.contains(SELECTORS.selectedKdbOptionClass) ||
      _optionEl.getAttribute("aria-selected") === "true" ||
      !!(roleOptionEl && roleOptionEl.getAttribute("aria-selected") === "true") ||
      !!(checkboxEl && checkboxEl.checked);
  }

  return {
    syncSichtOptionAvailability: syncSichtOptionAvailability
  };
});
