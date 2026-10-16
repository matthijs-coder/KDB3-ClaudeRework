define([
  "../state/ensureWidgetSettingsByWidget.js",
  "../view/topNDropdownSafeguard.js",
  "../view/resolvePanel.js",
  "../config/selectors.js"
], function (_ensureByWidget, _topNDropdownSafeguard, _resolvePanel, _selectors) {
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

  function readCommittedDimension(_KDB, _widgetId) {
    try {
      const record = _ensureByWidget(_KDB, _widgetId);
      return record.dimension;
    } catch (err) {
      console.error("[widgetSettings.readCommittedDimension] failed", { widgetId: _widgetId }, err);
      throw err;
    }
  }

  function readCommittedTopNChoice(_KDB, _widgetId) {
    try {
      const record = _ensureByWidget(_KDB, _widgetId);
      return record.topNChoice;
    } catch (err) {
      console.error("[widgetSettings.readCommittedTopNChoice] failed", { widgetId: _widgetId }, err);
      throw err;
    }
  }

  function readTopNAnchor(_KDB, _widgetId) {
    try {
      const panel = _resolvePanel(_KDB, _widgetId);
      if (!panel) {
        return null;
      }
      const icon = panel.querySelector(_selectors.byAttr(_selectors.settingsIconKindAttr, "topN"));
      if (icon && icon.isConnected === true) {
        return icon;
      }
      const dropdown = panel.querySelector(
        _selectors.dropdownSelector + _selectors.byAttr(_selectors.dropdownKindAttr, "topN")
      );
      if (dropdown && dropdown.isConnected === true) {
        return dropdown;
      }
      return null;
    } catch (err) {
      console.error("[widgetSettings.readTopNAnchor] failed", { widgetId: _widgetId }, err);
      throw err;
    }
  }

  function notifyGroupingRequired(_KDB, _anchor) {
    try {
      const labels = _KDB.config && _KDB.config.labels && _KDB.config.labels.de
        ? _KDB.config.labels.de.widgetSettings
        : null;
      const message = labels && labels.topNGroupingRequired
        ? labels.topNGroupingRequired
        : "Um die Top-N Funktion zu verwenden, muss zuerst eine Gruppierungsdimension gewählt werden.";
      const svc = _KDB.services && _KDB.services.message;
      if (!svc) {
        console.warn("[widgetSettings.validateTopNGroupingDimension] messageService missing", message);
        return;
      }
      const payload = {
        code: "WIDGET_SETTINGS_TOPN_DIMENSION_ABSENT",
        message: message,
        severity: "warning"
      };
      if (_anchor && typeof svc.notifyAnchored === "function") {
        svc.notifyAnchored({
          anchor: _anchor,
          code: payload.code,
          message: payload.message,
          severity: payload.severity
        });
        return;
      }
      if (typeof svc.notify === "function") {
        svc.notify(payload);
        return;
      }
      console.warn("[widgetSettings.validateTopNGroupingDimension] messageService missing", message);
    } catch (err) {
      console.error("[widgetSettings.notifyGroupingRequired] failed", err);
      throw err;
    }
  }

  function __controller(_KDB, _planned) {
    try {
      const planned = _planned || {};
      if (planned.type === "widgetVis/applyDimension") {
        if (!isAbsentSentinel(planned.optionKey)) {
          return null;
        }
        if (isAbsentSentinel(readCommittedDimension(_KDB, planned.widgetId))) {
          return null;
        }
        const topNChoice = readCommittedTopNChoice(_KDB, planned.widgetId);
        if (isAbsentSentinel(topNChoice)) {
          return null;
        }
        planned.coupledTopN = { previousValue: topNChoice, nextValue: "none" };
        return null;
      }
      if (planned.type !== "widgetVis/applyTopNChoice") {
        return null;
      }
      if (isAbsentSentinel(planned.optionKey)) {
        return null;
      }
      if (!isAbsentSentinel(readCommittedDimension(_KDB, planned.widgetId))) {
        return null;
      }
      _topNDropdownSafeguard.revertTopNDropdownFromState(_KDB, planned.widgetId);
      if (planned.isHistoryReplay !== true) {
        notifyGroupingRequired(_KDB, readTopNAnchor(_KDB, planned.widgetId));
      }
      return { ok: false, skipped: true, reasonCode: "WIDGET_SETTINGS_TOPN_DIMENSION_ABSENT" };
    } catch (err) {
      console.error("[widgetSettings.validateTopNGroupingDimension]", err);
      throw err;
    }
  }

  return __controller;
});
