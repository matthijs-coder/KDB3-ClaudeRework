define([
  "../config/selectors.js"
], function (_selectors) {
  function isHostOwnedOption(host, option) {
    return !!(host && option && typeof option.closest === "function"
      && option.closest(_selectors.dropdownSelector) === host);
  }

  function readSelectedOption(dropdown) {
    if (!dropdown || typeof dropdown.querySelectorAll !== "function") {
      return null;
    }
    const rows = dropdown.querySelectorAll(_selectors.dropdownOptionSelector + "." + _selectors.optionSelectedClass);
    return Array.prototype.find.call(rows, function (row) {
      return isHostOwnedOption(dropdown, row);
    }) || null;
  }

  function selectHostOption(dropdown, option) {
    const rows = dropdown ? dropdown.querySelectorAll(_selectors.dropdownOptionSelector) : [];
    Array.prototype.forEach.call(rows, function (row) {
      if (isHostOwnedOption(dropdown, row)) {
        row.classList.remove(_selectors.optionSelectedClass);
      }
    });
    if (option) {
      option.classList.add(_selectors.optionSelectedClass);
    }
  }

  function markSelectedOption(option) {
    const dropdown = option && typeof option.closest === "function" ? option.closest(_selectors.dropdownSelector) : null;
    selectHostOption(dropdown, option);
  }

  return {
    readSelectedOption: readSelectedOption,
    markSelectedOption: markSelectedOption,
    selectHostOption: selectHostOption,
    isHostOwnedOption: isHostOwnedOption
  };
});
