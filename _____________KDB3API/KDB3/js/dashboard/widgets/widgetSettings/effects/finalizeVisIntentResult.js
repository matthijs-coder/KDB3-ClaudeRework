define([
  "../config/intentDispatchMap.js",
  "./buildWidgetVisSettingsSnapshot.js",
  "./resolveCanonicalVisOptionValue.js",
  "../actions/seedDefaultsApplyResults.js",
  "../state/commitWidgetSettingValue.js",
  "../state/ensureWidgetSettingsByWidget.js",
  "../view/topNDropdownSafeguard.js",
  "../view/showValuesDropdownSafeguard.js",
  "../view/stampPanelVisType.js",
  "./commitCoupledTopNClear.js",
  "../view/markFocusDimensionAndTopNFromRecord.js"
], function (_intentDispatchMap, _visSnapshot, _resolveCanonicalVisOptionValue, _applyResults, _commitWidgetSettingValue, _ensureByWidget, _topNSafeguard, _showValuesSafeguard, _stampPanelVisType, _commitCoupledTopNClear, _markFocusDimensionAndTopNFromRecord) {
  function finalizeVisIntentResult(_KDB, _planned, _dispatchResult) {
    const planned = _planned || {};
    if (planned.source === "startup") {
      return _dispatchResult;
    }
    if (planned.target === "widgetText" && isWidgetTextSettingsKind(planned.kind)) {
      return Promise.resolve(_dispatchResult).then(function (result) {
        return handleTextIntentCompletion(_KDB, planned, result);
      });
    }
    if (planned.target !== "widgetVis" || !_visSnapshot.isWidgetVisKind(planned.kind)) {
      return _dispatchResult;
    }
    markSafeguardPending(_KDB, planned);
    return Promise.resolve(_dispatchResult).then(function (result) {
      return handleVisIntentCompletion(_KDB, planned, result);
    });
  }

  function isWidgetTextSettingsKind(_kind) {
    const kind = _intentDispatchMap.normalizeKind(_kind);
    return kind === "fontSize" || kind === "layout";
  }

  function safeguardRole(_kind) {
    const kind = _intentDispatchMap.normalizeKind(_kind);
    if (kind === "topN" || kind === "showValues") { return kind; }
    return null;
  }

  function markSafeguardPending(_KDB, _planned) {
    const role = safeguardRole(_planned.kind);
    if (!role) { return; }
    const record = _ensureByWidget(_KDB, _planned.widgetId);
    record.pending = record.pending || { kind: null };
    record.pending.kind = role;
    if (role === "showValues") {
      _showValuesSafeguard.markShowValuesPending(_KDB, _planned.widgetId, true);
    } else {
      _topNSafeguard.markTopNPending(_KDB, _planned.widgetId, true);
    }
  }

  function handleVisIntentCompletion(_KDB, _planned, _result) {
    const planned = _planned || {};
    const result = _result || {};
    const coupled = planned.coupledTopN;
    if (coupled && result && typeof result === "object") { result.coupledTopNAttempted = true; }
    if (!_applyResults.isVisApplyConfirmed(result)) {
      if (coupled && result.stale !== true) {
        _stampPanelVisType(_KDB, planned.widgetId);
        _markFocusDimensionAndTopNFromRecord(_KDB, planned.widgetId);
        return result;
      }
      revertSafeguardUnlessStale(_KDB, planned, result);
      return result;
    }
    try {
      if (coupled) { _commitCoupledTopNClear(_KDB, planned.widgetId); }
      const canonicalOptionValue = _resolveCanonicalVisOptionValue(planned);
      _commitWidgetSettingValue(_KDB, planned.widgetId, planned.kind, canonicalOptionValue, result.reportToSettings || { nextValue: canonicalOptionValue });
      clearSafeguardPending(_KDB, planned);
      if (coupled) { result.coupledTopNCommitted = true; }
      _stampPanelVisType(_KDB, planned.widgetId);
      if (coupled) { _markFocusDimensionAndTopNFromRecord(_KDB, planned.widgetId); }
    } catch (err) {
      console.error("[widgetSettings.handleVisIntentCompletion] commit failed", { widgetId: planned.widgetId, kind: planned.kind }, err);
      revertSafeguardUnlessStale(_KDB, planned, { errorCode: "WIDGET_SETTINGS_VIS_COMMIT_FAILED", errorMessage: String(err.message || err) });
    }
    return result;
  }

  function clearSafeguardPending(_KDB, _planned) {
    const role = safeguardRole(_planned.kind);
    if (role === "showValues") { _showValuesSafeguard.markShowValuesPending(_KDB, _planned.widgetId, false); }
    if (role === "topN") { _topNSafeguard.markTopNPending(_KDB, _planned.widgetId, false); }
  }

  function revertSafeguardUnlessStale(_KDB, _planned, _result) {
    const role = safeguardRole(_planned.kind);
    if (!role || (_result && _result.stale === true)) { return; }
    const record = _ensureByWidget(_KDB, _planned.widgetId);
    record.pending = record.pending || { kind: null };
    record.pending.kind = null;
    record.errorCode = (_result && _result.errorCode) || (role === "showValues" ? "WIDGET_SETTINGS_SHOWVALUES_APPLY_FAILED" : "WIDGET_SETTINGS_TOPN_APPLY_FAILED");
    record.errorMessage = (_result && _result.errorMessage) || null;
    if (role === "showValues") {
      _showValuesSafeguard.revertShowValuesDropdownFromState(_KDB, _planned.widgetId);
    } else {
      _topNSafeguard.revertTopNDropdownFromState(_KDB, _planned.widgetId);
    }
  }

  function handleTextIntentCompletion(_KDB, _planned, _result) {
    const planned = _planned || {};
    const result = _result || {};
    if (!_applyResults.isVisApplyConfirmed(result) || !result.reportToSettings) {
      return result;
    }
    try {
      commitReportToSettings(_KDB, planned, result.reportToSettings);
    } catch (err) {
      console.error("[widgetSettings.handleTextIntentCompletion] commit failed", { widgetId: planned.widgetId, kind: planned.kind }, err);
    }
    return result;
  }

  function commitReportToSettings(_KDB, _planned, _reportToSettings) {
    const report = _reportToSettings || {};
    if (report.controls && report.controls.length) {
      let index = 0;
      while (index < report.controls.length) {
        commitSingleReport(_KDB, _planned, report.controls[index]);
        index += 1;
      }
      return;
    }
    commitSingleReport(_KDB, _planned, report);
  }

  function commitSingleReport(_KDB, _planned, _report) {
    const planned = _planned || {};
    const report = _report || {};
    const widgetId = String(report.widgetId || planned.widgetId || "");
    const kind = _intentDispatchMap.normalizeKind(report.kind || planned.kind);
    if (!widgetId || !kind) { return; }
    const fallbackValue = _resolveCanonicalVisOptionValue(planned);
    const nextValue = report.nextValue != null ? report.nextValue : fallbackValue;
    _commitWidgetSettingValue(_KDB, widgetId, kind, nextValue, report);
  }

  return finalizeVisIntentResult;
});
