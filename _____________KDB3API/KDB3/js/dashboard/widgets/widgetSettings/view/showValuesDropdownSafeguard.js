define([
  "../config/selectors.js",
  "../state/ensureWidgetSettingsByWidget.js",
  "./dropdownOptionSelection.js",
  "./resolvePanel.js"
], function (_selectors, _ensureByWidget, _dropdownOptionSelection, _resolvePanel) {
  "use strict";

  function markShowValuesPending(_KDB, _widgetId, _isPending) {
    try {
      const panel = _resolvePanel(_KDB, _widgetId);
      if (!panel) {
        return;
      }
      const icon = panel.querySelector(_selectors.byAttr(_selectors.settingsIconKindAttr, "showValues"));
      if (icon) {
        icon.classList.toggle(_selectors.dropdownPendingClass, _isPending === true);
      }
    } catch (err) {
      console.error("[widgetSettings.markShowValuesPending]", err);
    }
  }

  function revertShowValuesDropdownFromState(_KDB, _widgetId) {
    try {
      return revertShowValuesDropdown(_KDB, _widgetId);
    } catch (err) {
      console.error("[widgetSettings.revertShowValuesDropdownFromState]", err);
      return false;
    }
  }

  function revertShowValuesDropdown(_KDB, _widgetId) {
    const widgetId = String(_widgetId || "");
    const panel = _resolvePanel(_KDB, widgetId);
    if (!panel) {
      return false;
    }
    const dropdown = panel.querySelector(
      _selectors.dropdownSelector + _selectors.byAttr(_selectors.dropdownKindAttr, "showValues")
    );
    if (!dropdown) {
      return false;
    }
    const record = _ensureByWidget(_KDB, widgetId);
    const choice = resolveShowValuesOptionKey(record);
    const option = dropdown.querySelector(_selectors.byAttr(_selectors.optionKeyAttr, choice))
      || dropdown.querySelector(_selectors.byAttr(_selectors.optionValueAttr, choice));
    if (option) {
      _dropdownOptionSelection.markSelectedOption(option);
      const focusPanel = document.querySelector(_selectors.byAttr(_selectors.focusPanelRootAttr, widgetId));
      if (focusPanel) {
        const focusDropdown = focusPanel.querySelector(
          _selectors.dropdownSelector + _selectors.byAttr(_selectors.dropdownKindAttr, "showValues")
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
    markShowValuesPending(_KDB, widgetId, false);
    return !!option;
  }

  function resolveShowValuesOptionKey(_record) {
    if (_record && typeof _record.showValues === "boolean") {
      return _record.showValues ? "on" : "off";
    }
    return "inherit";
  }

  return {
    markShowValuesPending: markShowValuesPending,
    revertShowValuesDropdownFromState: revertShowValuesDropdownFromState
  };
});
