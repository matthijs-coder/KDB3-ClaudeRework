define([
  "./binding/pipeline.js",
  "./config.js",
  "./results.js",
  "./runtime.js",
  "./settingsSnapshot.js",
  "./state.js",
  "../widgetSettings/effects/startWidgetRenderLoading.js",
  "../widgetSettings/view/resolveWidgetPlacementContext.js"
], function (_pipeline, _config, _results, _visRuntime, _settingsSnapshot, _state, _startWidgetRenderLoading, _resolveWidgetPlacementContext) {
  "use strict";

  var REASON_BY_CONTROL = { dimension: "dimension", visType: "visType", topNChoice: "topN" };
  var CONTROL_BY_ACTION = {};
  CONTROL_BY_ACTION[_state.ACTION_TYPES.APPLY_DIMENSION] = "dimension";
  CONTROL_BY_ACTION[_state.ACTION_TYPES.APPLY_VIS_TYPE] = "visType";
  CONTROL_BY_ACTION[_state.ACTION_TYPES.APPLY_TOPN_CHOICE] = "topNChoice";
  var CONTROL_BY_KIND = { visualization: "visType", dimension: "dimension", dimensions: "dimension", topn: "topNChoice" };

  function failure(_action, _errorCode, _errorMessage, _diagnostics) {
    var result = {
      ok: false,
      widgetId: _action.widgetId,
      opSeq: _action.opSeq,
      status: "error",
      errorCode: _errorCode,
      errorMessage: _errorMessage
    };
    if (_diagnostics !== undefined) {
      result.diagnostics = _diagnostics;
    }
    return _results.normalizeDispatchResult(result);
  }

  function readSnapshotSettings(_snapshot) {
    var settings = {
      dimension: _snapshot.dimension !== undefined ? _snapshot.dimension : null,
      visType: _snapshot.visType !== undefined ? _snapshot.visType : null,
      topNChoice: _snapshot.topNChoice !== undefined ? _snapshot.topNChoice : null
    };
    if (typeof _snapshot.showValues === "boolean") {
      settings.showValues = _snapshot.showValues;
    }
    if (_config.isGroupingValue(_snapshot.grouping)) {
      settings.grouping = _snapshot.grouping;
    }
    return settings;
  }

  function normalizeIncomingSettingsPayload(_action) {
    var payload = Object.assign({}, (_action && _action.payload) || {});
    var control = payload.control || CONTROL_BY_ACTION[_action.type] || null;
    if (!control && payload.kind) {
      control = CONTROL_BY_KIND[String(payload.kind).toLowerCase()] || null;
    }
    if (payload.nextValue === undefined && payload.optionValue !== undefined) {
      payload.nextValue = payload.optionValue;
    }
    payload.control = control;
    return payload;
  }

  function resolveSettings(_payload) {
    var isStartup = (_payload.source || "user") === "startup";
    var snapshot = _payload.settingsSnapshot;
    var settings;
    if (!snapshot && !isStartup) {
      return {
        errorCode: "WIDGET_VIS_SETTINGS_SNAPSHOT_MISSING",
        errorMessage: "Apply actions require a complete settingsSnapshot from widgetSettings."
      };
    }
    if (snapshot && !isStartup && !_settingsSnapshot.isCompleteSettingsSnapshot(snapshot)) {
      return {
        errorCode: "WIDGET_VIS_SETTINGS_SNAPSHOT_INCOMPLETE",
        errorMessage: "settingsSnapshot must include dimension, visType and topNChoice.",
        diagnostics: { settingsSnapshot: snapshot }
      };
    }
    settings = readSnapshotSettings(snapshot || {});
    if (_payload.nextValue !== undefined && (_payload.control === "dimension" || _payload.control === "visType" || _payload.control === "topNChoice")) {
      settings[_payload.control] = _payload.nextValue;
    }
    if (_payload.control === "grouping" && _config.isGroupingValue(_payload.nextValue)) {
      settings.grouping = _payload.nextValue;
    }
    if (_payload.control === "grouping" && _payload.nextValue === "inherit") {
      delete settings.grouping;
    }
    return settings;
  }

  function startApplySettingRenderLoading(_context, _action, _payload) {
    var widgetId = String(_action && _action.widgetId || "");
    var widgetEl = _payload.widgetEl;
    try {
      if (!widgetEl || widgetEl.nodeType !== 1) {
        widgetEl = _resolveWidgetPlacementContext.resolveWidgetEl(_context._KDB, widgetId);
      }
      _startWidgetRenderLoading(_context._KDB, {
        widgetId: widgetId,
        widgetType: "live",
        isHistoryReplay: _payload.isHistoryReplay === true,
        source: _payload.source,
        widgetEl: widgetEl
      });
    } catch (err) {
      console.error("[widgetVis.startApplySettingRenderLoading] failed", { widgetId: widgetId }, err);
    }
  }

  function finishApplySettingRenderLoadingIfFailed(_context, _action, _result) {
    var loading = _context._KDB.services && _context._KDB.services.loading;
    var widgetId = String(_action && _action.widgetId || "");
    if ((_result && (_result.ok === true || _result.stale === true)) || !loading || typeof loading.finishLoading !== "function") {
      return;
    }
    try {
      loading.finishLoading({ mountKey: "kdb-widget-render-loading-" + widgetId });
    } catch (err) {
      console.error("[widgetVis.finishApplySettingRenderLoadingIfFailed] failed", { widgetId: widgetId }, err);
    }
  }

  async function handleApplySetting(_context, _action) {
    var payload = normalizeIncomingSettingsPayload(_action);
    var control = payload.control;
    var settings = resolveSettings(payload);
    var reason;
    var result;
    if (settings.errorCode) {
      return failure(_action, settings.errorCode, settings.errorMessage, settings.diagnostics || null);
    }
    reason = REASON_BY_CONTROL[control] || control || "dimension";
    _context.dispatchInternal({
      type: _state.ACTION_TYPES.MARK_PENDING,
      widgetId: _action.widgetId,
      payload: { kind: reason, opSeq: _action.opSeq }
    });
    startApplySettingRenderLoading(_context, _action, payload);
    result = await _pipeline.runBindingPipeline(_context, {
      widgetId: _action.widgetId,
      opSeq: _action.opSeq,
      reason: reason,
      control: control,
      payload: payload,
      metric: payload.metric || _context.readMetric(_action.widgetId),
      settings: settings
    });
    finishApplySettingRenderLoadingIfFailed(_context, _action, result);
    return _results.finalizePipelineResult(_context, _action, result);
  }

  function resolveApplySource(_payload) {
    if (_payload.source === "startup") {
      return "startup";
    }
    return _payload.source === "historyReplay" && _payload.isHistoryReplay === true ? "historyReplay" : null;
  }

  function resolveStartupSettings(_snapshot) {
    var settings = readSnapshotSettings(_snapshot);
    ["iterator", "zoom", "valueCaption"].forEach(function (_key) {
      if (typeof _snapshot[_key] === "boolean") {
        settings[_key] = _snapshot[_key];
      }
    });
    return settings;
  }

  function buildBatchReportToSettings(_changedControls, _diagnostics) {
    return {
      controls: (_changedControls || []).map(function (_entry) {
        return { kind: _entry.kind, control: _entry.control, previousValue: _entry.previousValue, nextValue: _entry.nextValue };
      }),
      diagnostics: _diagnostics || null
    };
  }

  async function handleApplyStartupSettings(_context, _action) {
    var payload = Object.assign({}, (_action && _action.payload) || {});
    var widgetId = _action.widgetId;
    var applySource = resolveApplySource(payload);
    var result;
    if (!applySource) {
      return failure(_action, "WIDGET_VIS_STARTUP_SOURCE_INVALID",
        "applyStartupSettings requires source: \"startup\" or history replay source: \"historyReplay\".");
    }
    if (!_settingsSnapshot.isCompleteSettingsSnapshot(payload.settingsSnapshot)) {
      return failure(_action, "WIDGET_VIS_SETTINGS_SNAPSHOT_INCOMPLETE", "settingsSnapshot must include dimension, visType and topNChoice.");
    }
    if (!_visRuntime.isContentReady(_context._KDB, widgetId)) {
      return failure(_action, "WIDGET_VIS_CONTENT_CONTEXT_MISSING", "Visual record lacks required metric/data identity for BindingPlanSpec.");
    }
    _context.dispatchInternal({
      type: _state.ACTION_TYPES.MARK_PENDING,
      widgetId: widgetId,
      payload: { kind: applySource, opSeq: _action.opSeq }
    });
    result = await _pipeline.runBindingPipeline(_context, {
      widgetId: widgetId,
      opSeq: _action.opSeq,
      reason: applySource,
      control: "startupBatch",
      payload: payload,
      metric: payload.metric || _context.readMetric(widgetId),
      settings: resolveStartupSettings(payload.settingsSnapshot)
    });
    return _results.finalizePipelineResult(_context, _action, result, {
      defaultErrorMessage: "Startup binding pipeline failed.",
      buildReportToSettings: function () {
        return buildBatchReportToSettings(
          payload.changedControls,
          (result.reportToSettings && result.reportToSettings.diagnostics) || result.diagnostics || null
        );
      }
    });
  }

  return {
    handleApplySetting: handleApplySetting,
    handleApplyStartupSettings: handleApplyStartupSettings
  };
});
