define([
  "../config/selectors.js",
  "../effects/dispatchWidgetSettingsIntent.js",
  "../view/dropdownOptionSelection.js",
  "../view/resolvePanel.js"
], function (_selectors, _dispatchIntent, _dropdownOptionSelection, _resolvePanel) {
  "use strict";

  function applyWidgetSettingsOptionHistoryReplay(_KDB, _payload) {
    try {
      const payload = _payload || {};
      const step = payload.step || {};
      const targetValue = payload.targetValue || null;
      if (step.key !== "widgetSettings_optionSelect" || !targetValue) {
        return false;
      }
      const widgetId = String(targetValue.widgetId || "");
      const kind = String(targetValue.kind || "");
      if (!widgetId || !kind) {
        return false;
      }
      const panel = _resolvePanel(_KDB, widgetId);
      if (!panel) {
        console.warn("[widgetSettings.historyReplay] panel not found", { widgetId: widgetId, kind: kind });
        return false;
      }
      const dropdown = findDropdownByKind(panel, kind);
      if (!dropdown) {
        console.warn("[widgetSettings.historyReplay] dropdown not found", { widgetId: widgetId, kind: kind });
        return false;
      }
      const option = findOptionInDropdown(dropdown, targetValue);
      if (!option) {
        console.warn("[widgetSettings.historyReplay] option not found", {
          widgetId: widgetId,
          kind: kind,
          optionKey: targetValue.optionKey,
          optionValue: targetValue.optionValue
        });
        return false;
      }
      _dropdownOptionSelection.markSelectedOption(option);
      return Promise.resolve(
        _dispatchIntent.dropdownOption(_KDB, panel, option, { isHistoryReplay: true })
      ).then(function (dispatchResult) {
        return normalizeReplaySuccess(dispatchResult);
      });
    } catch (err) {
      console.error("[widgetSettings.applyWidgetSettingsOptionHistoryReplay] failed", err);
      return Promise.resolve(false);
    }
  }

  function normalizeReplaySuccess(_dispatchResult) {
    if (_dispatchResult === true) {
      return true;
    }
    if (_dispatchResult && _dispatchResult.ok === true) {
      return true;
    }
    return false;
  }

  function findDropdownByKind(_panel, _kind) {
    const kind = String(_kind || "");
    if (!_panel || !kind || typeof _panel.querySelector !== "function") {
      return null;
    }
    const dropdowns = _panel.querySelectorAll(_selectors.dropdownSelector);
    let index = 0;
    while (index < dropdowns.length) {
      const dropdown = dropdowns[index];
      if ((dropdown.getAttribute(_selectors.dropdownKindAttr) || "") === kind) {
        return dropdown;
      }
      index += 1;
    }
    const optionRow = _panel.querySelector(
      _selectors.dropdownOptionSelector + _selectors.byAttr(_selectors.dropdownKindAttr, kind)
    );
    if (optionRow && typeof optionRow.closest === "function") {
      return optionRow.closest(_selectors.dropdownSelector);
    }
    return null;
  }

  function findOptionInDropdown(_dropdown, _frame) {
    const frame = _frame || {};
    const optionKey = String(frame.optionKey || "");
    const optionValue = String(frame.optionValue || "");
    if (optionKey) {
      const byKey = _dropdown.querySelector(_selectors.byAttr(_selectors.optionKeyAttr, optionKey));
      if (byKey) {
        return byKey;
      }
    }
    if (optionValue) {
      return _dropdown.querySelector(_selectors.byAttr(_selectors.optionValueAttr, optionValue));
    }
    return null;
  }

  return applyWidgetSettingsOptionHistoryReplay;
});
