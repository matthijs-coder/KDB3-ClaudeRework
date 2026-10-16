define([
  "../config/kindToStateKey.js",
  "./ensureWidgetSettingsByWidget.js"
], function (_kindToStateKey, _ensureByWidget) {
  "use strict";

  function commitWidgetSettingValue(_KDB, _widgetId, _kind, _value, _report) {
    try {
      const widgetId = String(_widgetId || "");
      const kind = String(_kind || "");
      const stateKey = _kindToStateKey[kind] || kind;
      const record = _ensureByWidget(_KDB, widgetId);
      const report = _report || {};
      const nextValue = readCommittedValue(_value, report);
      if (isGroupingInheritAbsence(kind, stateKey, nextValue)) {
        delete record.grouping;
        delete record.groupingMeta;
      } else if (isBooleanInheritAbsence(kind, stateKey, nextValue)) {
        delete record[stateKey];
        delete record[stateKey + "Meta"];
      } else {
        record[stateKey] = nextValue;
        if (report.control && typeof report.control === "object") {
          record[stateKey + "Meta"] = {
            optionKey: report.control.optionKey || null,
            displayValue: report.control.displayValue || null
          };
        }
      }
      clearControlPending(record, kind);
      if (record.deferred) {
        delete record.deferred[stateKey];
      }
      if (!hasActivePendingOrError(record)) {
        record.errorCode = null;
        record.errorMessage = null;
      }
      return true;
    } catch (err) {
      console.error("[widgetSettings.commitWidgetSettingValue] failed", { widgetId: _widgetId, kind: _kind }, err);
      throw err;
    }
  }

  function isGroupingGrainToken(value) {
    return value === "stichtag"
      || value === "jahr"
      || value === "jahrStichtag"
      || value === "stichtagProJahrH"
      || value === "stichtagProJahrV";
  }

  function isGroupingInheritAbsence(kind, stateKey, value) {
    if (kind !== "grouping" && stateKey !== "grouping") {
      return false;
    }
    return value === "inherit" || !isGroupingGrainToken(value);
  }

  function isBooleanInheritAbsence(kind, stateKey, value) {
    return value === "inherit" && (kind === "showValues" || kind === "iterator" || kind === "zoom" || kind === "valueCaption" || stateKey === "showValues" || stateKey === "iterator" || stateKey === "zoom" || stateKey === "valueCaption");
  }

  function readCommittedValue(value, report) {
    if (report.nextValue != null) {
      return cloneSerializable(report.nextValue);
    }
    if (value != null) {
      return cloneSerializable(value);
    }
    return null;
  }

  function clearControlPending(record, kind) {
    const stateKey = _kindToStateKey[kind] || kind;
    if (record.pending && record.pending.kind === kind) {
      record.pending.kind = null;
    }
    delete record.deferred[stateKey];
  }

  function hasActivePendingOrError(record) {
    if (record.errorCode) {
      return true;
    }
    if (record.pending && record.pending.kind) {
      return true;
    }
    const deferredKeys = record.deferred ? Object.keys(record.deferred) : [];
    return deferredKeys.length > 0;
  }

  function cloneSerializable(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_error) {
      return value;
    }
  }

  return commitWidgetSettingValue;
});
