define([
  "../config/actionTypes.js",
  "../effects/runBindingPipeline.js",
  "../runtime/contentReady.js",
  "./normalizeDispatchResult.js",
  "./isCompleteSettingsSnapshot.js",
  "./finalizePipelineResult.js",
  "./handleApplyIteratorZoom.js"
], function (_actionTypes, _runBindingPipeline, _contentReady, _normalizeDispatchResult, _isCompleteSettingsSnapshot, _finalizePipelineResult, _handleApplyIteratorZoom) {
  "use strict";

  function resolveSettingsFromSnapshot(_snapshot) {
    var settings = {
      dimension: _snapshot.dimension !== undefined ? _snapshot.dimension : null,
      visType: _snapshot.visType !== undefined ? _snapshot.visType : null,
      topNChoice: _snapshot.topNChoice !== undefined ? _snapshot.topNChoice : null
    };
    if (typeof _snapshot.showValues === "boolean") {
      settings.showValues = _snapshot.showValues;
    }
    if (_snapshot.grouping === "stichtag" || _snapshot.grouping === "jahr" || _snapshot.grouping === "jahrStichtag" || _snapshot.grouping === "stichtagProJahrH" || _snapshot.grouping === "stichtagProJahrV") {
      settings.grouping = _snapshot.grouping;
    }
    if (typeof _snapshot.iterator === "boolean") {
      settings.iterator = _snapshot.iterator;
    }
    if (typeof _snapshot.zoom === "boolean") {
      settings.zoom = _snapshot.zoom;
    }
    if (typeof _snapshot.valueCaption === "boolean") {
      settings.valueCaption = _snapshot.valueCaption;
    }
    return settings;
  }

  function buildBatchReportToSettings(_changedControls, _diagnostics) {
    return {
      controls: (_changedControls || []).map(function (entry) {
        return {
          kind: entry.kind,
          control: entry.control,
          previousValue: entry.previousValue,
          nextValue: entry.nextValue
        };
      }),
      diagnostics: _diagnostics || null
    };
  }

  function handleApplyStartupSettings(_context, _action) {
    var payload = Object.assign({}, (_action && _action.payload) || {});
    var widgetId = _action.widgetId;
    var applySource = resolveApplySource(payload);

    if (!applySource) {
      return Promise.resolve(_normalizeDispatchResult({
        ok: false,
        widgetId: widgetId,
        opSeq: _action.opSeq,
        status: "error",
        errorCode: "WIDGET_VIS_STARTUP_SOURCE_INVALID",
        errorMessage: "applyStartupSettings requires source: \"startup\" or history replay source: \"historyReplay\"."
      }));
    }

    if (!_isCompleteSettingsSnapshot(payload.settingsSnapshot)) {
      return Promise.resolve(_normalizeDispatchResult({
        ok: false,
        widgetId: widgetId,
        opSeq: _action.opSeq,
        status: "error",
        errorCode: "WIDGET_VIS_SETTINGS_SNAPSHOT_INCOMPLETE",
        errorMessage: "settingsSnapshot must include dimension, visType and topNChoice."
      }));
    }

    if (!_contentReady.isContentReady(_context._KDB, widgetId)) {
      return Promise.resolve(_normalizeDispatchResult({
        ok: false,
        widgetId: widgetId,
        opSeq: _action.opSeq,
        status: "error",
        errorCode: "WIDGET_VIS_CONTENT_CONTEXT_MISSING",
        errorMessage: "Visual record lacks required metric/data identity for BindingPlanSpec."
      }));
    }

    var settings = resolveSettingsFromSnapshot(payload.settingsSnapshot);
    _context.dispatchInternal({
      type: _actionTypes.MARK_PENDING,
      widgetId: widgetId,
      payload: { kind: applySource === "historyReplay" ? "historyReplay" : "startup", opSeq: _action.opSeq }
    });

    return _runBindingPipeline(_context, {
      widgetId: widgetId,
      opSeq: _action.opSeq,
      reason: applySource === "historyReplay" ? "historyReplay" : "startup",
      control: "startupBatch",
      payload: payload,
      metric: payload.metric || _context.readMetric(widgetId),
      settings: settings
    }).then(function (result) {
      return _finalizePipelineResult(_context, _action, result, {
        defaultErrorMessage: "Startup binding pipeline failed.",
        buildReportToSettings: function () {
          return buildBatchReportToSettings(
            payload.changedControls,
            (result.reportToSettings && result.reportToSettings.diagnostics) || result.diagnostics || null
          );
        }
      });
    });
  }

  function resolveApplySource(payload) {
    if (payload.source === "startup") {
      return "startup";
    }
    if (payload.source === "historyReplay" && payload.isHistoryReplay === true) {
      return "historyReplay";
    }
    return null;
  }

  return {
    handleApplyStartupSettings: handleApplyStartupSettings,
    handleApplyIteratorZoom: _handleApplyIteratorZoom
  };
});
