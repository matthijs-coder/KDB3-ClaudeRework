define([
  "./ensureWidgetSettingsByWidget.js",
  "../config/intentDispatchMap.js",
  "../config/kindToStateKey.js"
], function (_ensureByWidget, _intentDispatchMap, _kindToStateKey) {
  "use strict";

  function recordWidgetSettingSeedError(_KDB, _widgetId, _kind, _errorCode, _errorMessage) {
    try {
      const widgetId = String(_widgetId || "");
      const kind = normalizeKind(_kind);
      const record = _ensureByWidget(_KDB, widgetId);
      record.pending = record.pending || { kind: null };
      record.pending.kind = kind || record.pending.kind || null;
      record.errorCode = String(_errorCode || "WIDGET_SETTINGS_SEED_FAILED");
      record.errorMessage = _errorMessage ? String(_errorMessage) : null;
      return record;
    } catch (err) {
      console.error("[widgetSettings.recordWidgetSettingSeedError] failed", { widgetId: _widgetId, kind: _kind }, err);
      throw err;
    }
  }

  function recordWidgetSettingSeedDeferred(_KDB, _widgetId, _kind, _diagnostics) {
    try {
      const widgetId = String(_widgetId || "");
      const kind = normalizeKind(_kind);
      const stateKey = _kindToStateKey[kind] || kind;
      const record = _ensureByWidget(_KDB, widgetId);
      record.deferred = record.deferred || {};
      record.deferred[stateKey] = {
        kind: kind,
        status: "deferred",
        diagnostics: _diagnostics || null
      };
      if (record.pending && record.pending.kind === kind) {
        record.pending.kind = null;
      }
      return record;
    } catch (err) {
      console.error("[widgetSettings.recordWidgetSettingSeedDeferred] failed", { widgetId: _widgetId, kind: _kind }, err);
      throw err;
    }
  }

  function recordWidgetSettingReadinessFailure(_KDB, _widgetId, _result) {
    try {
      const widgetId = String(_widgetId || "");
      const result = _result || {};
      const record = _ensureByWidget(_KDB, widgetId);
      record.pending = { kind: null };
      record.errorCode = String(result.errorCode || "WIDGET_SETTINGS_READINESS_FAILED");
      record.errorMessage = result.errorMessage
        ? String(result.errorMessage)
        : "Visual content readiness wait failed before startup defaults.";
      return record;
    } catch (err) {
      console.error("[widgetSettings.recordWidgetSettingReadinessFailure] failed", { widgetId: _widgetId }, err);
      throw err;
    }
  }

  function clearWidgetSettingSeedRuntime(_KDB, _widgetId) {
    try {
      const widgetId = String(_widgetId || "");
      const runtime = _KDB.runtime && _KDB.runtime.widgetSettings;
      if (!runtime || !runtime.pendingPromises) {
        return;
      }
      delete runtime.pendingPromises["seed:" + widgetId];
    } catch (err) {
      console.error("[widgetSettings.clearWidgetSettingSeedRuntime] failed", { widgetId: _widgetId }, err);
      throw err;
    }
  }

  function normalizeKind(kind) {
    return _intentDispatchMap.normalizeKind(kind);
  }

  return {
    recordError: recordWidgetSettingSeedError,
    recordDeferred: recordWidgetSettingSeedDeferred,
    recordReadinessFailure: recordWidgetSettingReadinessFailure,
    clearSeedRuntime: clearWidgetSettingSeedRuntime
  };
});
