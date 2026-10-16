define([
  "../effects/dispatchWidgetSettingsIntent.js",
  "../effects/buildWidgetVisSettingsSnapshot.js",
  "../state/commitWidgetSettingValue.js",
  "../state/recordWidgetSettingSeedStatus.js",
  "../config/intentDispatchMap.js",
  "./seedDefaultsApplyResults.js",
  "../view/stampPanelVisType.js"
], function (_dispatchIntent, _visSnapshot, _commitWidgetSettingValue, _recordSeedStatus, _intentDispatchMap, _applyResults, _stampPanelVisType) {
  "use strict";

  async function applyVisStartupSeedBatch(_KDB, _widgetId, _widgetType, _descriptors) {
    const widgetId = String(_widgetId || "");
    const descriptors = _descriptors || [];
    try {
      const batchPayload = _visSnapshot.buildStartupBatch(_KDB, widgetId, descriptors);
      const dispatchResult = await _dispatchIntent.startupVisBatch(
        _KDB,
        widgetId,
        _widgetType,
        batchPayload
      );
      const normalized = _applyResults.normalizeApplyResult(dispatchResult);
      if (_applyResults.isBatchDeferred(normalized)) {
        recordBatchDeferred(_KDB, widgetId, descriptors, normalized.diagnostics || null);
        return {
          ok: true,
          widgetId: widgetId,
          kind: "visBatch",
          status: "deferred",
          deferred: true,
          diagnostics: normalized
        };
      }
      if (_applyResults.isBatchApplySuccess(normalized)) {
        commitBatchControls(_KDB, widgetId, normalized.reportToSettings);
        stampPanelAfterBatch(_KDB, widgetId);
        return {
          ok: true,
          widgetId: widgetId,
          kind: "visBatch",
          status: "success",
          reportToSettings: normalized.reportToSettings || null
        };
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
      recordBatchFailure(_KDB, widgetId, descriptors, {
        errorCode: "WIDGET_SETTINGS_STARTUP_VIS_BATCH_ERROR",
        errorMessage: String(err.message || err)
      });
      return {
        ok: false,
        widgetId: widgetId,
        kind: "visBatch",
        status: "error",
        errorCode: "WIDGET_SETTINGS_STARTUP_VIS_BATCH_ERROR",
        errorMessage: String(err.message || err)
      };
    }
  }

  function commitBatchControls(_KDB, _widgetId, _reportToSettings) {
    const controls = (_reportToSettings && _reportToSettings.controls) || [];
    let index = 0;
    while (index < controls.length) {
      const entry = controls[index];
      if (!isShowValuesReportEntry(entry)) {
        _commitWidgetSettingValue(
          _KDB,
          _widgetId,
          entry.kind,
          entry.nextValue,
          entry
        );
      }
      index += 1;
    }
  }

  function isShowValuesReportEntry(_entry) {
    const entry = _entry || {};
    return _intentDispatchMap.normalizeKind(entry.kind) === "showValues" || entry.control === "showValues";
  }

  function stampPanelAfterBatch(_KDB, _widgetId) {
    try {
      _stampPanelVisType(_KDB, _widgetId);
    } catch (err) {
      console.error("[widgetSettings.applyVisStartupSeedBatch] stampPanelVisType failed", { widgetId: _widgetId }, err);
    }
  }

  function recordBatchFailure(_KDB, _widgetId, _descriptors, _normalized) {
    const normalized = _normalized || {};
    let index = 0;
    while (index < (_descriptors || []).length) {
      const descriptor = _descriptors[index];
      _recordSeedStatus.recordError(
        _KDB,
        _widgetId,
        descriptor.kind,
        normalized.errorCode || "WIDGET_SETTINGS_STARTUP_VIS_BATCH_FAILED",
        normalized.errorMessage || null
      );
      index += 1;
    }
  }

  function recordBatchDeferred(_KDB, _widgetId, _descriptors, _diagnostics) {
    let index = 0;
    while (index < (_descriptors || []).length) {
      const descriptor = _descriptors[index];
      const kind = _intentDispatchMap.normalizeKind(descriptor.kind);
      if (kind === "topN") {
        _recordSeedStatus.recordDeferred(_KDB, _widgetId, kind, _diagnostics);
      }
      index += 1;
    }
  }

  return applyVisStartupSeedBatch;
});
