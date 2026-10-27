define([
  "../state.js",
  "../config.js",
  "../config/selectors.js",
  "../view/optionMarking.js",
  "../view/resolveWidgetPlacementContext.js"
], function (_state, _config, _selectors, _optionMarking, _placementContext) {
  "use strict";

  function isAbsentSentinel(_value) {
    if (_value == null) {
      return true;
    }
    if (typeof _value !== "string") {
      return false;
    }
    const normalized = _value.trim().toLowerCase();
    return normalized === "" || normalized === "none" || normalized === "default";
  }

  function readTopNAnchor(_KDB, _widgetId) {
    const panel = _placementContext.resolvePanel(_KDB, _widgetId);
    if (!panel) {
      return null;
    }
    const icon = panel.querySelector(_selectors.byAttr(_selectors.settingsIconKindAttr, "topN"));
    if (icon && icon.isConnected === true) {
      return icon;
    }
    const dropdown = panel.querySelector(_selectors.dropdownSelector + _selectors.byAttr(_selectors.dropdownKindAttr, "topN"));
    if (dropdown && dropdown.isConnected === true) {
      return dropdown;
    }
    return null;
  }

  function notifyGroupingRequired(_KDB, _anchor) {
    const labels = _KDB.config && _KDB.config.labels && _KDB.config.labels.de
      ? _KDB.config.labels.de.widgetSettings
      : null;
    const message = labels && labels.topNGroupingRequired ? labels.topNGroupingRequired : _config.LABELS.topNGroupingRequired;
    const svc = _KDB.services && _KDB.services.message;
    const code = "WIDGET_SETTINGS_TOPN_DIMENSION_ABSENT";
    if (svc && _anchor) {
      svc.notifyAnchored({ anchor: _anchor, code: code, message: message, severity: "warning" });
      return;
    }
    if (svc) {
      svc.notify({ code: code, message: message, severity: "warning" });
      return;
    }
    console.warn("[widgetSettings.validateTopNGroupingDimension] messageService missing", message);
  }

  // Returns a blocking result when TopN is chosen without a grouping dimension; marks a dimension clear
  // that must also clear TopN (planned.coupledTopN). Returns null when the intent may proceed.
  function validateTopNGroupingDimension(_KDB, _planned) {
    const planned = _planned || {};
    if (planned.type === "widgetVis/applyDimension") {
      if (!isAbsentSentinel(planned.optionKey)) {
        return null;
      }
      const record = _state.ensureWidgetSettingsByWidget(_KDB, planned.widgetId);
      if (isAbsentSentinel(record.dimension) || isAbsentSentinel(record.topNChoice)) {
        return null;
      }
      planned.coupledTopN = { previousValue: record.topNChoice, nextValue: "none" };
      return null;
    }
    if (planned.type !== "widgetVis/applyTopNChoice" || isAbsentSentinel(planned.optionKey)) {
      return null;
    }
    if (!isAbsentSentinel(_state.ensureWidgetSettingsByWidget(_KDB, planned.widgetId).dimension)) {
      return null;
    }
    _optionMarking.revertTopNDropdownFromState(_KDB, planned.widgetId);
    if (planned.isHistoryReplay !== true) {
      notifyGroupingRequired(_KDB, readTopNAnchor(_KDB, planned.widgetId));
    }
    return { ok: false, skipped: true, reasonCode: "WIDGET_SETTINGS_TOPN_DIMENSION_ABSENT" };
  }

  return {
    isAbsentSentinel: isAbsentSentinel,
    validateTopNGroupingDimension: validateTopNGroupingDimension
  };
});
