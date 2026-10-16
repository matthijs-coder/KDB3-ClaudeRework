define([
  "../config/selectors.js",
  "../effects/dispatchWidgetSettingsIntent.js",
  "./dropdownOptionSelection.js"
], function (_selectors, _dispatchIntent, _dropdownOptionSelection) {
  function __controller(_panel, _dropdown) {
    try {
      const selectedOption = _dropdownOptionSelection.readSelectedOption(_dropdown);
      if (selectedOption) {
        return _dispatchIntent.buildDropdownDescriptorFromOption(_panel, selectedOption);
      }
      return _dispatchIntent.buildDropdownDescriptorFromParts(readPanelContext(_panel), readDropdownKind(_dropdown), "", "");
    } catch (err) {
      console.error("[widgetSettings.buildDropdownSelectionFrame] failed", err);
      return null;
    }
  }

  function readPanelContext(_panel) {
    return {
      widgetId: String(_panel.getAttribute(_selectors.panelRootAttr) || ""),
      widgetType: _panel.getAttribute(_selectors.panelWidgetTypeAttr) === "text" ? "text" : "live"
    };
  }

  function readDropdownKind(_dropdown) {
    return _dropdown ? (_dropdown.getAttribute(_selectors.dropdownKindAttr) || "") : "";
  }

  return __controller;
});
