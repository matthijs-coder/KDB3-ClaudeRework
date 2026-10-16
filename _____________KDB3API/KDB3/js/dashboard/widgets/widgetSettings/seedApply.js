define([
  "./config.js",
  "./state.js",
  "./effects/dispatchWidgetSettingsIntent.js",
  "./intent/visSnapshot.js",
  "./intent/finalize.js",
  "./view/optionMarking.js"
], function (_config, _state, _dispatchIntent, _visSnapshot, _finalize, _optionMarking) {
  "use strict";

  async function applySingleStartupDefault(_KDB, _descriptor) {
    const descriptor = _descriptor || {};
    const widgetId = String(descriptor.widgetId || "");
    const kind = _config.normalizeKind(descriptor.kind);
    try {
      const normalized = _finalize.normalizeApplyResult(await _dispatchIntent.startupDefault(_KDB, descriptor));
      if (_finalize.isTopNDeferred(kind, normalized)) {
        _state.recordSeedDeferred(_KDB, widgetId, kind, normalized.diagnostics || null);
        return { ok: true, widgetId: widgetId, kind: kind, status: "deferred", deferred: true, diagnostics: normalized };
      }
      if (_finalize.isApplySuccess(normalized)) {
        commitStartupReport(_KDB, descriptor, normalized.reportToSettings);
        return { ok: true, widgetId: widgetId, kind: kind, status: "success", reportToSettings: normalized.reportToSettings || null };
      }
      const errorCode = normalized.errorCode || "WIDGET_SETTINGS_STARTUP_APPLY_FAILED";
      _state.recordSeedError(_KDB, widgetId, kind, errorCode, normalized.errorMessage || null);
      return { ok: false, widgetId: widgetId, kind: kind, status: "error", errorCode: errorCode, errorMessage: normalized.errorMessage || null };
    } catch (err) {
      console.error("[widgetSettings.applySingleStartupDefault] failed", { widgetId: widgetId, kind: kind }, err);
      const errorMessage = String(err.message || err);
      _state.recordSeedError(_KDB, widgetId, kind, "WIDGET_SETTINGS_STARTUP_APPLY_ERROR", errorMessage);
      return { ok: false, widgetId: widgetId, kind: kind, status: "error", errorCode: "WIDGET_SETTINGS_STARTUP_APPLY_ERROR", errorMessage: errorMessage };
    }
  }

  function commitStartupReport(_KDB, descriptor, reportToSettings) {
    if (!reportToSettings) {
      return;
    }
    _finalize.forEachReport(reportToSettings, function (_report) {
      const report = _report || {};
      const widgetId = String(report.widgetId || descriptor.widgetId || "");
      const kind = _config.normalizeKind(report.kind || descriptor.kind);
      if (!widgetId || !kind) {
        return;
      }
      const nextValue = report.nextValue != null ? report.nextValue : descriptor.optionValue;
      _state.commitWidgetSettingValue(_KDB, widgetId, kind, nextValue, report);
    });
  }

  async function applyVisStartupSeedBatch(_KDB, _widgetId, _widgetType, _descriptors) {
    const widgetId = String(_widgetId || "");
    const descriptors = _descriptors || [];
    try {
      const batchPayload = _visSnapshot.buildStartupBatch(_KDB, widgetId, descriptors);
      const dispatchResult = await _dispatchIntent.startupVisBatch(_KDB, widgetId, _widgetType, batchPayload);
      const normalized = _finalize.normalizeApplyResult(dispatchResult);
      if (_finalize.isBatchDeferred(normalized)) {
        recordBatchDeferred(_KDB, widgetId, descriptors, normalized.diagnostics || null);
        return { ok: true, widgetId: widgetId, kind: "visBatch", status: "deferred", deferred: true, diagnostics: normalized };
      }
      if (_finalize.isBatchApplySuccess(normalized)) {
        commitBatchControls(_KDB, widgetId, normalized.reportToSettings);
        _optionMarking.stampPanelVisType(_KDB, widgetId);
        return { ok: true, widgetId: widgetId, kind: "visBatch", status: "success", reportToSettings: normalized.reportToSettings || null };
      }
      recordBatchFailure(_KDB, widgetId, descriptors, normalized);
      return {
        ok: false,
        widgetId: widgetId,
        kind: "visBatch",
        status: "error",
        errorCode: normalized.errorCode || "WIDGET_SETTINGS_STARTUP_VIS_BATCH_FAILED",
        errorMessage: normalized.errorMessage || null
      };
    } catch (err) {
      console.error("[widgetSettings.applyVisStartupSeedBatch] failed", { widgetId: widgetId }, err);
      const errorMessage = String(err.message || err);
      recordBatchFailure(_KDB, widgetId, descriptors, { errorCode: "WIDGET_SETTINGS_STARTUP_VIS_BATCH_ERROR", errorMessage: errorMessage });
      return {
        ok: false,
        widgetId: widgetId,
        kind: "visBatch",
        status: "error",
        errorCode: "WIDGET_SETTINGS_STARTUP_VIS_BATCH_ERROR",
        errorMessage: errorMessage
      };
    }
  }

  // showValues entries are reported by widgetVis but committed through their own safeguard path.
  function commitBatchControls(_KDB, _widgetId, _reportToSettings) {
    const controls = (_reportToSettings && _reportToSettings.controls) || [];
    controls.forEach(function (entry) {
      if (!isShowValuesReportEntry(entry)) {
        _state.commitWidgetSettingValue(_KDB, _widgetId, entry.kind, entry.nextValue, entry);
      }
    });
  }

  function isShowValuesReportEntry(_entry) {
    const entry = _entry || {};
    return _config.normalizeKind(entry.kind) === "showValues" || entry.control === "showValues";
  }

  function recordBatchFailure(_KDB, _widgetId, _descriptors, _normalized) {
    const normalized = _normalized || {};
    _descriptors.forEach(function (descriptor) {
      _state.recordSeedError(
        _KDB,
        _widgetId,
        descriptor.kind,
        normalized.errorCode || "WIDGET_SETTINGS_STARTUP_VIS_BATCH_FAILED",
        normalized.errorMessage || null
      );
    });
  }

  function recordBatchDeferred(_KDB, _widgetId, _descriptors, _diagnostics) {
    _descriptors.forEach(function (descriptor) {
      const kind = _config.normalizeKind(descriptor.kind);
      if (kind === "topN") {
        _state.recordSeedDeferred(_KDB, _widgetId, kind, _diagnostics);
      }
    });
  }

  return {
    applySingleStartupDefault: applySingleStartupDefault,
    applyVisStartupSeedBatch: applyVisStartupSeedBatch
  };
});
