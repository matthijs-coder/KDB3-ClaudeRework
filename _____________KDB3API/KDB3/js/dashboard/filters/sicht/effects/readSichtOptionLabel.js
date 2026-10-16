define([
  "../config/selectors.js"
], function (_selectors) {
  "use strict";

  function readSichtOptionLabel(_optionEl) {
    var labelEl = _optionEl && _optionEl.querySelector(_selectors.optionLabelSelector);
    return String((labelEl && (labelEl.getAttribute("aria-label") || labelEl.textContent)) || "").trim();
  }

  function isSichtOptionSelected(_optionEl) {
    var roleOptionEl = _optionEl && _optionEl.querySelector(_selectors.roleOptionSelector);
    var checkboxEl = _optionEl && _optionEl.querySelector(_selectors.checkboxSelector);
    return _optionEl.classList.contains(_selectors.selectedOptionClass) ||
      _optionEl.classList.contains(_selectors.selectedKdbOptionClass) ||
      _optionEl.getAttribute("aria-selected") === "true" ||
      !!(roleOptionEl && roleOptionEl.getAttribute("aria-selected") === "true") ||
      !!(checkboxEl && checkboxEl.checked);
  }

  return {
    readSichtOptionLabel: readSichtOptionLabel,
    isSichtOptionSelected: isSichtOptionSelected
  };
});
