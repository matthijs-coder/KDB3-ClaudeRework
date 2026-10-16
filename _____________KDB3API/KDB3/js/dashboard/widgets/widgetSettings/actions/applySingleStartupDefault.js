define([
  "../effects/dispatchWidgetSettingsIntent.js",
  "../state/recordWidgetSettingSeedStatus.js",
  "../config/intentDispatchMap.js",
  "../state/commitWidgetSettingValue.js",
  "./seedDefaultsApplyResults.js"
], function (_dispatchIntent, _recordSeedStatus, _intentDispatchMap, _commitWidgetSettingValue, _applyResults) {
  "use strict";

  async function applySingleStartupDefault(_KDB, _descriptor) {
    const descriptor = _descriptor || {};
    const widgetId = String(descriptor.widgetId || "");
    const kind = _intentDispatchMap.normalizeKind(descriptor.kind);
    try {
      const dispatchResult = await _dispatchIntent.startupDefault(_KDB, descriptor);
      const normalized = _applyResults.normalizeApplyResult(dispatchResult);
      if (_applyResults.isTopNDeferred(kind, normalized)) {
        _recordSeedStatus.recordDeferred(_KDB, widgetId, kind, normalized.diagnostics || null);
        return {
          ok: true,
          widgetId: widgetId,
          kind: kind,
          status: "deferred",
          deferred: true,
          diagnostics: normalized
        };
      }
      if (_applyResults.isApplySuccess(normalized)) {
        commitReportToSettings(_KDB, descriptor, normalized.reportToSettings);
        return {
          ok: true,
          widgetId: widgetId,
          kind: kind,
          status: "success",
          reportToSettings: normalized.reportToSettings || null
        };
      }
      _recordSeedStatus.recordError(
        _KDB,
        widgetId,
        kind,
        normalized.errorCode || "WIDGET_SETTINGS_STARTUP_APPLY_FAILED",
        normalized.errorMessage || null
      );
      return {
        ok: false,
        widgetId: widgetId,
        kind: kind,
        status: "error",
        errorCode: normalized.errorCode || "WIDGET_SETTINGS_STARTUP_APPLY_FAILED",
        errorMessage: normalized.errorMessage || null
      };
    } catch (err) {
      console.error("[widgetSettings.applySingleStartupDefault] failed", { widgetId: widgetId, kind: kind }, err);
      _recordSeedStatus.recordError(
        _KDB,
        widgetId,
        kind,
        "WIDGET_SETTINGS_STARTUP_APPLY_ERROR",
        String(err.message || err)
      );
      return {
        ok: false,
        widgetId: widgetId,
        kind: kind,
        status: "error",
        errorCode: "WIDGET_SETTINGS_STARTUP_APPLY_ERROR",
        errorMessage: String(err.message || err)
      };
    }
  }

  function commitReportToSettings(_KDB, _descriptor, _reportToSettings) {
    const descriptor = _descriptor || {};
    const report = _reportToSettings || null;
    if (!report) {
      return;
    }
    if (report.controls && report.controls.length) {
      let index = 0;
      while (index < report.controls.length) {
        commitSingleReport(_KDB, descriptor, report.controls[index]);
        index += 1;
      }
      return;
    }
    commitSingleReport(_KDB, descriptor, report);
  }

  function commitSingleReport(_KDB, _descriptor, _report) {
    const descriptor = _descriptor || {};
    const report = _report || {};
    const widgetId = String(report.widgetId || descriptor.widgetId || "");
    const kind = _intentDispatchMap.normalizeKind(report.kind || descriptor.kind);
    if (!widgetId || !kind) {
      return;
    }
    const nextValue = report.nextValue != null ? report.nextValue : descriptor.optionValue;
    _commitWidgetSettingValue(_KDB, widgetId, kind, nextValue, report);
  }

  return applySingleStartupDefault;
});
