define([
  "../config/selectors.js",
  "./isHostOwnedOption.js"
], function (_selectors, _isHostOwnedOption) {
  function readSelectedOption(_dropdown) {
    try {
      if (!_dropdown || typeof _dropdown.querySelectorAll !== "function") {
        return null;
      }
      const rows = _dropdown.querySelectorAll(
        _selectors.dropdownOptionSelector + "." + _selectors.optionSelectedClass
      );
      let index = 0;
      while (index < rows.length) {
        if (_isHostOwnedOption(_dropdown, rows[index])) {
          return rows[index];
        }
        index += 1;
      }
      return null;
    } catch (err) {
      console.error("[widgetSettings.readSelectedOption] failed", err);
      return null;
    }
  }

  function markSelectedOption(_option) {
    try {
      const option = _option;
      const dropdown = option && typeof option.closest === "function"
        ? option.closest(_selectors.dropdownSelector)
        : null;
      const rows = dropdown ? dropdown.querySelectorAll(_selectors.dropdownOptionSelector) : [];
      let index = 0;
      while (index < rows.length) {
        if (_isHostOwnedOption(dropdown, rows[index])) {
          rows[index].classList.remove(_selectors.optionSelectedClass);
        }
        index += 1;
      }
      if (option) {
        option.classList.add(_selectors.optionSelectedClass);
      }
    } catch (err) {
      console.error("[widgetSettings.markSelectedOption] failed", err);
      throw err;
    }
  }

  return {
    readSelectedOption: readSelectedOption,
    markSelectedOption: markSelectedOption
  };
});
