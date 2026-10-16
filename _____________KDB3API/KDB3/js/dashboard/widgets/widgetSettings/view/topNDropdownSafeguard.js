define([
  "../config/selectors.js",
  "../config/dropdownDefaults.js",
  "../state/ensureWidgetSettingsByWidget.js",
  "./dropdownOptionSelection.js",
  "./resolvePanel.js"
], function (_selectors, _dropdownDefaults, _ensureByWidget, _dropdownOptionSelection, _resolvePanel) {
  "use strict";

  function markTopNPending(_KDB, _widgetId, _isPending) {
    const panel = _resolvePanel(_KDB, _widgetId);
    if (!panel) {
      return;
    }
    const icon = panel.querySelector(_selectors.byAttr(_selectors.settingsIconKindAttr, "topN"));
    if (icon) {
      icon.classList.toggle(_selectors.dropdownPendingClass, _isPending === true);
    }
  }

  function revertTopNDropdownFromState(_KDB, _widgetId) {
    const widgetId = String(_widgetId || "");
    const panel = _resolvePanel(_KDB, widgetId);
    if (!panel) {
      return false;
    }
    const dropdown = panel.querySelector(
      _selectors.dropdownSelector + _selectors.byAttr(_selectors.dropdownKindAttr, "topN")
    );
    if (!dropdown) {
      return false;
    }
    const record = _ensureByWidget(_KDB, widgetId);
    const choice = record.topNChoice != null
      ? String(record.topNChoice)
      : String(_dropdownDefaults.topN.useValue || "none");
    const option = dropdown.querySelector(_selectors.byAttr(_selectors.optionKeyAttr, choice))
      || dropdown.querySelector(_selectors.byAttr(_selectors.optionValueAttr, choice));
    if (option) {
      _dropdownOptionSelection.markSelectedOption(option);
      const focusPanel = document.querySelector(_selectors.byAttr(_selectors.focusPanelRootAttr, widgetId));
      if (focusPanel) {
        const focusDropdown = focusPanel.querySelector(
          _selectors.dropdownSelector + _selectors.byAttr(_selectors.dropdownKindAttr, "topN")
        );
        if (focusDropdown) {
          const focusOption = focusDropdown.querySelector(_selectors.byAttr(_selectors.optionKeyAttr, choice))
            || focusDropdown.querySelector(_selectors.byAttr(_selectors.optionValueAttr, choice));
          if (focusOption) {
            _dropdownOptionSelection.markSelectedOption(focusOption);
          }
        }
      }
    }
    markTopNPending(_KDB, widgetId, false);
    return !!option;
  }

  return {
    markTopNPending: markTopNPending,
    revertTopNDropdownFromState: revertTopNDropdownFromState
  };
});
