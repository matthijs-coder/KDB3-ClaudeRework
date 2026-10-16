define(["../effects/resolvePopupMount.js"], function (_resolvePopupMount) {
  "use strict";

  function readOptionSelector(_selectors) {
    return _selectors && _selectors.optionSelector
      ? _selectors.optionSelector
      : null;
  }

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

  function __controller(_dockRoot, _selectors, _runtime) {
    var popupRoot;
    var optionSelector;
    var options;
    var index;
    var wrapper;
    if (!_dockRoot || !_selectors) {
      return false;
    }
    popupRoot = _resolvePopupMount(null, _dockRoot, _selectors, _runtime);
    if (!popupRoot) {
      return false;
    }
    optionSelector = readOptionSelector(_selectors);
    if (!optionSelector) {
      return false;
    }
    options = popupRoot.querySelectorAll(optionSelector);
    for (index = 0; index < options.length; index += 1) {
      wrapper = options[index];
      if (
        isNativeSelected(wrapper, _selectors) &&
        !wrapper.classList.contains(_selectors.kdbSelectedOptionClass)
      ) {
        return true;
      }
    }
    return false;
  }

  return __controller;
});
