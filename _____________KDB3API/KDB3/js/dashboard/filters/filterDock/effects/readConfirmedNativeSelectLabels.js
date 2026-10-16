define(["./resolvePopupMount.js"], function (_resolvePopupMount) {
  "use strict";

  function isNativeSelected(_wrapper, _selectors) {
    var roleOption;
    var checkbox;
    var selectedClass = _selectors && _selectors.selectedOptionClass;
    if (!_wrapper) {
      return false;
    }
    if (
      (selectedClass && _wrapper.classList.contains(selectedClass)) ||
      _wrapper.getAttribute("aria-selected") === "true"
    ) {
      return true;
    }
    if (_selectors && _selectors.roleOptionSelector) {
      roleOption = _wrapper.querySelector(_selectors.roleOptionSelector);
      if (roleOption && roleOption.getAttribute("aria-selected") === "true") {
        return true;
      }
    }
    if (_selectors && _selectors.checkboxSelector) {
      checkbox = _wrapper.querySelector(_selectors.checkboxSelector);
      return !!(checkbox && checkbox.checked === true);
    }
    return false;
  }

  function readOptionLabel(_wrapper, _selectors) {
    var labelEl;
    if (!_wrapper || !_selectors || !_selectors.optionLabelSelector) {
      return "";
    }
    labelEl = _wrapper.querySelector(_selectors.optionLabelSelector);
    if (!labelEl) {
      return "";
    }
    return String(labelEl.getAttribute("aria-label") || labelEl.textContent || "").trim();
  }

  function __controller(_filterEl, _dockRoot, _selectors, _runtime) {
    var popupRoot;
    var optionSelector;
    var options;
    var labels = [];
    var index;
    var wrapper;
    var label;
    if (!_selectors) {
      return null;
    }
    popupRoot = _resolvePopupMount(_filterEl, _dockRoot, _selectors, _runtime);
    if (!popupRoot) {
      return null;
    }
    optionSelector = _selectors.optionSelector;
    if (!optionSelector) {
      return null;
    }
    options = popupRoot.querySelectorAll(optionSelector);
    for (index = 0; index < options.length; index += 1) {
      wrapper = options[index];
      if (!isNativeSelected(wrapper, _selectors)) {
        continue;
      }
      label = readOptionLabel(wrapper, _selectors);
      if (label) {
        labels.push(label);
      }
    }
    return labels;
  }

  return __controller;
});
