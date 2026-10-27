define([
  "../config.js",
  "../state.js",
  "./downstream.js",
  "../view/optionMarking.js",
  "../../../../core/config/visualizations/visTypeRules.js"
], function (_config, _state, _downstream, _optionMarking, _visTypeRules) {
  "use strict";

  const FAILED_STATUSES = ["error", "timeout", "aborted"];

  function normalizeApplyResult(result) {
    const value = result || {};
    return {
      ok: value.ok === true,
      status: value.status || null,
      skipped: value.skipped === true,
      stale: value.stale === true,
      reasonCode: value.reasonCode || null,
      errorCode: value.errorCode || null,
      errorMessage: value.errorMessage || null,
      reportToSettings: value.reportToSettings || null,
      diagnostics: value.diagnostics || null
    };
  }

  function isApplySuccess(result) {
    if (!result || result.ok !== true) {
      return false;
    }
    if (result.status === "success" || result.reportToSettings) {
      return true;
    }
    return result.skipped !== true && result.stale !== true && !result.errorCode;
  }

  function isBatchApplySuccess(result) {
    if (!result || result.ok !== true || result.stale === true) {
      return false;
    }
    if (FAILED_STATUSES.indexOf(result.status) >= 0) {
      return false;
    }
    if (result.reportToSettings && result.reportToSettings.controls && result.reportToSettings.controls.length > 0) {
      return true;
    }
    return result.skipped !== true && !result.errorCode;
  }

  function isBatchDeferred(result) {
    return !!result && (result.status === "deferred" || result.status === "pending");
  }

  function isTopNDeferred(kind, result) {
    if (kind !== "topN" || !result) {
      return false;
    }
    if (result.status === "deferred" || result.status === "pending") {
      return true;
    }
    return result.skipped === true && !!result.reasonCode;
  }

  function isVisApplyConfirmed(result) {
    if (!result || result.ok !== true || result.stale === true) {
      return false;
    }
    if (result.skipped === true && !result.reportToSettings) {
      return false;
    }
    return FAILED_STATUSES.indexOf(result.status) < 0;
  }

  function commitCoupledTopNClear(_KDB, _widgetId) {
    return _state.commitWidgetSettingValue(_KDB, _widgetId, "topN", "none", { nextValue: "none" });
  }

  function commitUnavailableDimensionControls(_KDB, _widgetId) {
    _state.commitWidgetSettingValue(_KDB, _widgetId, "dimension", "none", { nextValue: "none" });
    return _state.commitWidgetSettingValue(_KDB, _widgetId, "topN", "none", { nextValue: "none" });
  }

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
    if (planned.target !== "widgetVis" || !_config.isWidgetVisKind(planned.kind)) {
      return _dispatchResult;
    }
    markSafeguardPending(_KDB, planned);
    return Promise.resolve(_dispatchResult).then(function (result) {
      return handleVisIntentCompletion(_KDB, planned, result);
    });
  }

  function isWidgetTextSettingsKind(_kind) {
    const kind = _config.normalizeKind(_kind);
    return kind === "fontSize" || kind === "layout";
  }

  function safeguardRole(_kind) {
    const kind = _config.normalizeKind(_kind);
    return kind === "topN" || kind === "showValues" ? kind : null;
  }

  function markSafeguardPending(_KDB, _planned) {
    const role = safeguardRole(_planned.kind);
    if (!role) {
      return;
    }
    const record = _state.ensureWidgetSettingsByWidget(_KDB, _planned.widgetId);
    record.pending.kind = role;
    if (role === "showValues") {
      _optionMarking.markShowValuesPending(_KDB, _planned.widgetId, true);
    } else {
      _optionMarking.markTopNPending(_KDB, _planned.widgetId, true);
    }
  }

  function handleVisIntentCompletion(_KDB, _planned, _result) {
    const planned = _planned || {};
    const result = _result || {};
    const coupled = planned.coupledTopN;
    if (coupled && result && typeof result === "object") {
      result.coupledTopNAttempted = true;
    }
    if (!isVisApplyConfirmed(result)) {
      if (coupled && result.stale !== true) {
        _optionMarking.stampPanelVisType(_KDB, planned.widgetId);
        _optionMarking.markFocusDimensionAndTopNFromRecord(_KDB, planned.widgetId);
        return result;
      }
      revertSafeguardUnlessStale(_KDB, planned, result);
      return result;
    }
    try {
      if (coupled) {
        commitCoupledTopNClear(_KDB, planned.widgetId);
      }
      const canonicalOptionValue = _downstream.resolveCanonicalVisOptionValue(planned);
      const report = result.reportToSettings || { nextValue: canonicalOptionValue };
      _state.commitWidgetSettingValue(_KDB, planned.widgetId, planned.kind, canonicalOptionValue, report);
      // Own flag, not planned.coupledTopN: that path overwrites payload.nextValue and would bind vis type "none".
      const clearUnavailableControls = _config.normalizeKind(planned.kind) === "visualization"
        && !_visTypeRules.supportsDimension(canonicalOptionValue);
      if (clearUnavailableControls) {
        commitUnavailableDimensionControls(_KDB, planned.widgetId);
        result.clearUnavailableControlsCommitted = true;
      }
      clearSafeguardPending(_KDB, planned);
      if (coupled) {
        result.coupledTopNCommitted = true;
      }
      _optionMarking.stampPanelVisType(_KDB, planned.widgetId);
      if (coupled || clearUnavailableControls) {
        _optionMarking.markFocusDimensionAndTopNFromRecord(_KDB, planned.widgetId);
      }
    } catch (err) {
      console.error("[widgetSettings.handleVisIntentCompletion] commit failed", { widgetId: planned.widgetId, kind: planned.kind }, err);
      revertSafeguardUnlessStale(_KDB, planned, { errorCode: "WIDGET_SETTINGS_VIS_COMMIT_FAILED", errorMessage: String(err.message || err) });
    }
    return result;
  }

  function clearSafeguardPending(_KDB, _planned) {
    const role = safeguardRole(_planned.kind);
    if (role === "showValues") {
      _optionMarking.markShowValuesPending(_KDB, _planned.widgetId, false);
    }
    if (role === "topN") {
      _optionMarking.markTopNPending(_KDB, _planned.widgetId, false);
    }
  }

  function revertSafeguardUnlessStale(_KDB, _planned, _result) {
    const role = safeguardRole(_planned.kind);
    if (!role || (_result && _result.stale === true)) {
      return;
    }
    const fallbackCode = role === "showValues" ? "WIDGET_SETTINGS_SHOWVALUES_APPLY_FAILED" : "WIDGET_SETTINGS_TOPN_APPLY_FAILED";
    const record = _state.ensureWidgetSettingsByWidget(_KDB, _planned.widgetId);
    record.pending.kind = null;
    record.errorCode = (_result && _result.errorCode) || fallbackCode;
    record.errorMessage = (_result && _result.errorMessage) || null;
    if (role === "showValues") {
      _optionMarking.revertShowValuesDropdownFromState(_KDB, _planned.widgetId);
    } else {
      _optionMarking.revertTopNDropdownFromState(_KDB, _planned.widgetId);
    }
  }

  function handleTextIntentCompletion(_KDB, _planned, _result) {
    const planned = _planned || {};
    const result = _result || {};
    if (!isVisApplyConfirmed(result) || !result.reportToSettings) {
      return result;
    }
    try {
      forEachReport(result.reportToSettings, function (report) {
        commitSingleReport(_KDB, planned, report);
      });
    } catch (err) {
      console.error("[widgetSettings.handleTextIntentCompletion] commit failed", { widgetId: planned.widgetId, kind: planned.kind }, err);
    }
    return result;
  }

  function forEachReport(_reportToSettings, visit) {
    const report = _reportToSettings || {};
    if (report.controls && report.controls.length) {
      for (let index = 0; index < report.controls.length; index += 1) {
        visit(report.controls[index]);
      }
      return;
    }
    visit(report);
  }

  function commitSingleReport(_KDB, _planned, _report) {
    const planned = _planned || {};
    const report = _report || {};
    const widgetId = String(report.widgetId || planned.widgetId || "");
    const kind = _config.normalizeKind(report.kind || planned.kind);
    if (!widgetId || !kind) {
      return;
    }
    const nextValue = report.nextValue != null ? report.nextValue : _downstream.resolveCanonicalVisOptionValue(planned);
    _state.commitWidgetSettingValue(_KDB, widgetId, kind, nextValue, report);
  }

  return {
    finalizeVisIntentResult: finalizeVisIntentResult,
    normalizeApplyResult: normalizeApplyResult,
    isApplySuccess: isApplySuccess,
    isBatchApplySuccess: isBatchApplySuccess,
    isBatchDeferred: isBatchDeferred,
    isTopNDeferred: isTopNDeferred,
    isVisApplyConfirmed: isVisApplyConfirmed,
    forEachReport: forEachReport
  };
});
