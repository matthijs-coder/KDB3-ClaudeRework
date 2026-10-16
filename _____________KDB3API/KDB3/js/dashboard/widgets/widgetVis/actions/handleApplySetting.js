define([
  "../config/actionTypes.js",
  "../effects/runBindingPipeline.js",
  "./normalizeDispatchResult.js",
  "./isCompleteSettingsSnapshot.js",
  "./finalizePipelineResult.js",
  "../../widgetSettings/effects/startWidgetRenderLoading.js",
  "../../widgetSettings/view/resolveWidgetPlacementContext.js"
], function (_actionTypes, _runBindingPipeline, _normalizeDispatchResult, _isCompleteSettingsSnapshot, _finalizePipelineResult, _startWidgetRenderLoading, _resolveWidgetPlacementContext) {
  "use strict";

  var REASON_BY_CONTROL = {
    dimension: "dimension",
    visType: "visType",
    topNChoice: "topN"
  };

  var CONTROL_BY_ACTION = {};
  CONTROL_BY_ACTION[_actionTypes.APPLY_DIMENSION] = "dimension";
  CONTROL_BY_ACTION[_actionTypes.APPLY_VIS_TYPE] = "visType";
  CONTROL_BY_ACTION[_actionTypes.APPLY_TOPN_CHOICE] = "topNChoice";

  function normalizeIncomingSettingsPayload(_action) {
    var payload = Object.assign({}, (_action && _action.payload) || {});
    var control = payload.control || CONTROL_BY_ACTION[_action.type] || null;
    if (!control && payload.kind) {
      var kind = String(payload.kind).toLowerCase();
      if (kind === "visualization") { control = "visType"; }
      else if (kind === "dimension" || kind === "dimensions") { control = "dimension"; }
      else if (kind === "topn") { control = "topNChoice"; }
    }
    if (payload.nextValue === undefined && payload.optionValue !== undefined) {
      payload.nextValue = payload.optionValue;
    }
    payload.control = control;
    return payload;
  }

  function resolveSettings(_payload) {
    var source = _payload.source || "user";
    var isStartup = source === "startup";
    var snapshot = _payload.settingsSnapshot;
    if (!snapshot && !isStartup) {
      return {
        errorCode: "WIDGET_VIS_SETTINGS_SNAPSHOT_MISSING",
        errorMessage: "Apply actions require a complete settingsSnapshot from widgetSettings."
      };
    }
    if (snapshot && !isStartup && !_isCompleteSettingsSnapshot(snapshot)) {
      return {
        errorCode: "WIDGET_VIS_SETTINGS_SNAPSHOT_INCOMPLETE",
        errorMessage: "settingsSnapshot must include dimension, visType and topNChoice.",
        diagnostics: { settingsSnapshot: snapshot }
      };
    }
    var base = snapshot || {};
    var settings = {
      dimension: base.dimension !== undefined ? base.dimension : null,
      visType: base.visType !== undefined ? base.visType : null,
      topNChoice: base.topNChoice !== undefined ? base.topNChoice : null
    };
    if (typeof base.showValues === "boolean") {
      settings.showValues = base.showValues;
    }
    if (base.grouping === "stichtag" || base.grouping === "jahr" || base.grouping === "jahrStichtag" || base.grouping === "stichtagProJahrH" || base.grouping === "stichtagProJahrV") { settings.grouping = base.grouping; }
    if (_payload.control === "dimension" && _payload.nextValue !== undefined) {
      settings.dimension = _payload.nextValue;
    }
    if (_payload.control === "visType" && _payload.nextValue !== undefined) {
      settings.visType = _payload.nextValue;
    }
    if (_payload.control === "topNChoice" && _payload.nextValue !== undefined) {
      settings.topNChoice = _payload.nextValue;
    }
    if (_payload.control === "grouping" && (_payload.nextValue === "stichtag" || _payload.nextValue === "jahr" || _payload.nextValue === "jahrStichtag" || _payload.nextValue === "stichtagProJahrH" || _payload.nextValue === "stichtagProJahrV")) { settings.grouping = _payload.nextValue; }
    if (_payload.control === "grouping" && _payload.nextValue === "inherit") { delete settings.grouping; }
    return settings;
  }

  function startApplySettingRenderLoading(_context, _action, _payload) {
    try {
      var payload = _payload || {};
      var widgetId = String(_action && _action.widgetId || "");
      var widgetEl = payload.widgetEl;
      if (!widgetEl || widgetEl.nodeType !== 1) {
        widgetEl = _resolveWidgetPlacementContext.resolveWidgetEl(_context._KDB, widgetId);
      }
      _startWidgetRenderLoading(_context._KDB, {
        widgetId: widgetId,
        widgetType: "live",
        isHistoryReplay: payload.isHistoryReplay === true,
        source: payload.source,
        widgetEl: widgetEl
      });
    } catch (err) {
      console.error("[widgetVis.startApplySettingRenderLoading] failed", { widgetId: _action && _action.widgetId }, err);
    }
  }

  function finishApplySettingRenderLoadingIfFailed(_context, _action, _result) {
    try {
      var loading = _context && _context._KDB && _context._KDB.services && _context._KDB.services.loading;
      if ((_result && (_result.ok === true || _result.stale === true)) || !loading || typeof loading.finishLoading !== "function") {
        return;
      }
      loading.finishLoading({ mountKey: "kdb-widget-render-loading-" + String(_action && _action.widgetId || "") });
    } catch (err) {
      console.error("[widgetVis.finishApplySettingRenderLoadingIfFailed] failed", { widgetId: _action && _action.widgetId }, err);
    }
  }

  function handleApplySetting(_context, _action) {
    var payload = normalizeIncomingSettingsPayload(_action);
    var control = payload.control;
    var settings = resolveSettings(payload);
    if (settings.errorCode) {
      return Promise.resolve(_normalizeDispatchResult({
        ok: false,
        widgetId: _action.widgetId,
        opSeq: _action.opSeq,
        status: "error",
        errorCode: settings.errorCode,
        errorMessage: settings.errorMessage,
        diagnostics: settings.diagnostics || null
      }));
    }
    var reason = REASON_BY_CONTROL[control] || control || "dimension";
    _context.dispatchInternal({
      type: _actionTypes.MARK_PENDING,
      widgetId: _action.widgetId,
      payload: { kind: reason, opSeq: _action.opSeq }
    });
    startApplySettingRenderLoading(_context, _action, payload);
    return _runBindingPipeline(_context, {
      widgetId: _action.widgetId,
      opSeq: _action.opSeq,
      reason: reason,
      control: control,
      payload: payload,
      metric: payload.metric || _context.readMetric(_action.widgetId),
      settings: settings
    }).then(function (result) {
      finishApplySettingRenderLoadingIfFailed(_context, _action, result);
      return _finalizePipelineResult(_context, _action, result);
    });
  }

  return handleApplySetting;
});
