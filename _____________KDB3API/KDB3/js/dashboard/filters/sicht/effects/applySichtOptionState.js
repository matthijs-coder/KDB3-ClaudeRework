define([
  "../config/selectors.js",
  "../config/sichtDefinitions.js",
  "./readSichtOptionLabel.js"
], function (_selectors, _definitions, _readSichtOptionLabel) {
  "use strict";

  function readCssClassByKey(_optionKey) {
    var definition = _definitions[_optionKey];
    return definition && definition.cssClass ? definition.cssClass : null;
  }

  function applySichtOptionState(_optionEl, _optionKey, _optionState, _isSelected) {
    var label = _readSichtOptionLabel.readSichtOptionLabel(_optionEl);
    var cssClass;
    if (!label || label === "Alle") {
      _optionEl.classList.add(_selectors.hideAlleOptionClass);
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
    cssClass = readCssClassByKey(_optionKey);
    if (cssClass) {
      _optionEl.classList.add(cssClass);
    }
    if (_optionState.isEnabled === true) {
      _optionEl.classList.remove(_selectors.disabledOptionClass);
      _optionEl.removeAttribute("aria-disabled");
      _optionEl.style.pointerEvents = "";
      return { isVisible: true, isEnabled: true };
    }
    _optionEl.classList.add(_selectors.disabledOptionClass);
    _optionEl.setAttribute("aria-disabled", "true");
    _optionEl.style.pointerEvents = "none";
    return { isVisible: true, isEnabled: false };
  }

  return applySichtOptionState;
});
