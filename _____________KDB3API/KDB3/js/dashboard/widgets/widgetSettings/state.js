define([
  "./config.js",
  "../../../core/utils/kit/data.js"
], function (_config, _kitData) {
  "use strict";

  const GROUPING_GRAINS = ["stichtag", "jahr", "jahrStichtag", "stichtagProJahrH", "stichtagProJahrV"];
  const BOOLEAN_KINDS = ["showValues", "iterator", "zoom", "valueCaption"];

  function createInitialState() {
    return {
      lifecycle: "idle",
      byWidget: {},
      errorCode: null,
      errorMessage: null
    };
  }

  function ensureWidgetSettingsByWidget(_KDB, _widgetId) {
    const widgetId = String(_widgetId || "");
    const settings = _KDB.state.widgets.settings;
    settings.byWidget = settings.byWidget || {};
    if (!settings.byWidget[widgetId]) {
      settings.byWidget[widgetId] = {
        pending: { kind: null },
        deferred: {},
        errorCode: null,
        errorMessage: null
      };
    }
    const record = settings.byWidget[widgetId];
    record.pending = record.pending || { kind: null };
    record.deferred = record.deferred || {};
    return record;
  }

  function commitWidgetSettingValue(_KDB, _widgetId, _kind, _value, _report) {
    const kind = String(_kind || "");
    const stateKey = _config.stateKeyForKind(kind);
    const record = ensureWidgetSettingsByWidget(_KDB, _widgetId);
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
    if (record.pending && record.pending.kind === kind) {
      record.pending.kind = null;
    }
    delete record.deferred[stateKey];
    if (!hasActivePendingOrError(record)) {
      record.errorCode = null;
      record.errorMessage = null;
    }
    return true;
  }

  function isGroupingInheritAbsence(kind, stateKey, value) {
    if (kind !== "grouping" && stateKey !== "grouping") {
      return false;
    }
    return value === "inherit" || GROUPING_GRAINS.indexOf(value) < 0;
  }

  function isBooleanInheritAbsence(kind, stateKey, value) {
    return value === "inherit" && (BOOLEAN_KINDS.indexOf(kind) >= 0 || BOOLEAN_KINDS.indexOf(stateKey) >= 0);
  }

  function readCommittedValue(value, report) {
    if (report.nextValue != null) {
      return cloneOrKeep(report.nextValue);
    }
    if (value != null) {
      return cloneOrKeep(value);
    }
    return null;
  }

  function cloneOrKeep(value) {
    try {
      return _kitData.cloneJson(value);
    } catch (_error) {
      return value;
    }
  }

  function hasActivePendingOrError(record) {
    if (record.errorCode) {
      return true;
    }
    if (record.pending && record.pending.kind) {
      return true;
    }
    return record.deferred ? Object.keys(record.deferred).length > 0 : false;
  }

  function recordSeedError(_KDB, _widgetId, _kind, _errorCode, _errorMessage) {
    const kind = _config.normalizeKind(_kind);
    const record = ensureWidgetSettingsByWidget(_KDB, _widgetId);
    record.pending.kind = kind || record.pending.kind || null;
    record.errorCode = String(_errorCode || "WIDGET_SETTINGS_SEED_FAILED");
    record.errorMessage = _errorMessage ? String(_errorMessage) : null;
    return record;
  }

  function recordSeedDeferred(_KDB, _widgetId, _kind, _diagnostics) {
    const kind = _config.normalizeKind(_kind);
    const record = ensureWidgetSettingsByWidget(_KDB, _widgetId);
    record.deferred[_config.stateKeyForKind(kind)] = {
      kind: kind,
      status: "deferred",
      diagnostics: _diagnostics || null
    };
    if (record.pending.kind === kind) {
      record.pending.kind = null;
    }
    return record;
  }

  function recordReadinessFailure(_KDB, _widgetId, _result) {
    const result = _result || {};
    const record = ensureWidgetSettingsByWidget(_KDB, _widgetId);
    record.pending = { kind: null };
    record.errorCode = String(result.errorCode || "WIDGET_SETTINGS_READINESS_FAILED");
    record.errorMessage = result.errorMessage
      ? String(result.errorMessage)
      : "Visual content readiness wait failed before startup defaults.";
    return record;
  }

  function clearSeedRuntime(_KDB, _widgetId) {
    const runtime = _KDB.runtime && _KDB.runtime.widgetSettings;
    if (runtime && runtime.pendingPromises) {
      delete runtime.pendingPromises["seed:" + String(_widgetId || "")];
    }
  }

  return {
    createInitialState: createInitialState,
    ensureWidgetSettingsByWidget: ensureWidgetSettingsByWidget,
    commitWidgetSettingValue: commitWidgetSettingValue,
    recordSeedError: recordSeedError,
    recordSeedDeferred: recordSeedDeferred,
    recordReadinessFailure: recordReadinessFailure,
    clearSeedRuntime: clearSeedRuntime
  };
});
