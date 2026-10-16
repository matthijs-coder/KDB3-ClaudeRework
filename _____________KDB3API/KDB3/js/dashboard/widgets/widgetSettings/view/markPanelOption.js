define([
  "../config/selectors.js",
  "./isHostOwnedOption.js"
], function (_selectors, _isHostOwnedOption) {
  "use strict";

  function markPanelOption(_panel, _kind, _optionKey, _fallbackSelector) {
    try {
      var dropdown = _panel.querySelector(_selectors.dropdownSelector + _selectors.byAttr(_selectors.dropdownKindAttr, _kind))
        || (_fallbackSelector ? _panel.querySelector(_fallbackSelector) : null);
      var option;
      var rows;
      var index = 0;
      if (!dropdown) {
        return;
      }
      option = dropdown.querySelector(_selectors.byAttr(_selectors.optionKeyAttr, _optionKey))
        || dropdown.querySelector(_selectors.byAttr(_selectors.optionValueAttr, _optionKey));
      rows = dropdown.querySelectorAll(_selectors.dropdownOptionSelector);
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
      console.error("[widgetSettings.markPanelOption]", err);
      throw err;
    }
  }

  return markPanelOption;
});
