define([
  "../events/eventNames",
  "./isHistoryTrackedSettingsTarget",
], function (_eventNames, _isTracked) {
  "use strict";

  function readSnapshotScalar(_snapshot) {
    if (!_snapshot || typeof _snapshot !== "object") {
      return null;
    }
    if (typeof _snapshot.value === "string" || typeof _snapshot.value === "boolean") {
      return _snapshot.value;
    }
    if (typeof _snapshot.resolvedValue === "string" && _snapshot.resolvedValue.trim()) {
      return _snapshot.resolvedValue;
    }
    if (typeof _snapshot.inputValue === "string" && _snapshot.inputValue.trim()) {
      return _snapshot.inputValue;
    }
    if (_snapshot.pxValue != null && isFinite(Number(_snapshot.pxValue))) {
      return String(Math.round(Number(_snapshot.pxValue))) + "px";
    }
    return null;
  }

  function buildDimensionReplay(_actionType, _payloadKey, _payloadField, _scalar) {
    var dimValue = _scalar != null ? String(_scalar) : "";
    if (!dimValue.trim()) {
      return null;
    }
    var payload = { value: dimValue };
    payload[_payloadKey] = _payloadField;
    return { type: _actionType, payload: payload };
  }

  function buildReplayAction(_target, _snapshot) {
    var scalar = readSnapshotScalar(_snapshot);
    if (scalar == null && typeof _snapshot !== "object") {
      return null;
    }
    if (_target === "dashboard.width" || _target === "dashboard.height") {
      return buildDimensionReplay(
        _eventNames.ACTION_SETTINGS_SET_DASHBOARD_DIMENSION,
        "dimension",
        _target === "dashboard.width" ? "width" : "height",
        scalar
      );
    }
    if (_target === "dashboard.backgroundColor") {
      if (scalar == null) return null;
      return { type: _eventNames.ACTION_SETTINGS_SET_DASHBOARD_COLOR, payload: { value: String(scalar) } };
    }
    var panelRole =
      _target === "controlPanel.backgroundColor" ? "background"
      : _target === "controlPanel.buttonColor" ? "button"
      : _target === "controlPanel.actionButtonColor" ? "actionButton"
      : _target === "controlPanel.innerBackgroundColor" ? "innerBackground"
      : null;
    if (panelRole) {
      if (scalar == null) return null;
      return {
        type: _eventNames.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR,
        payload: { role: panelRole, value: String(scalar) },
      };
    }
    if (_target === "defaults.visualization.width" || _target === "defaults.visualization.height") {
      return buildDimensionReplay(
        _eventNames.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT,
        "field",
        _target === "defaults.visualization.width" ? "width" : "height",
        scalar
      );
    }
    if (_target === "defaults.text.width" || _target === "defaults.text.height") {
      return buildDimensionReplay(
        _eventNames.ACTION_SETTINGS_SET_COMMENT_DEFAULT,
        "field",
        _target === "defaults.text.width" ? "width" : "height",
        scalar
      );
    }
    if (_target === "defaults.visualizationBackgroundColor") {
      if (scalar == null) return null;
      return {
        type: _eventNames.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT,
        payload: { field: "backgroundColor", value: String(scalar) },
      };
    }
    if (_target === "defaults.textBackgroundColor") {
      if (scalar == null) return null;
      return {
        type: _eventNames.ACTION_SETTINGS_SET_COMMENT_DEFAULT,
        payload: { field: "backgroundColor", value: String(scalar) },
      };
    }
    if (_target === "dashboard.areSettingsButtonsHidden") {
      if (typeof scalar !== "boolean") return null;
      return {
        type: _eventNames.ACTION_SETTINGS_SET_DASHBOARD_CHROME,
        payload: { key: "hideWidgetSettingsButtons", hidden: scalar === true },
      };
    }
    if (_target === "dashboard.isDeveloperMode") {
      if (typeof scalar !== "boolean") return null;
      return {
        type: _eventNames.ACTION_SETTINGS_SET_DEVELOPER_MODE,
        payload: { value: scalar === true },
      };
    }
    return null;
  }

  function applyControlSettingsHistoryReplay(_KDB, _applySettingsAction, _payload) {
    void _KDB;
    var payload = _payload || {};
    var target = typeof payload.target === "string" ? payload.target.trim() : "";
    var step = payload.step || null;
    var value = payload.value;
    if (!target || !_isTracked(target) || !value || typeof value !== "object") {
      return false;
    }
    if (step && step.old && step.new && step.old.target !== step.new.target) {
      return false;
    }
    if (step && step.old && step.old.target && step.old.target !== target) {
      return false;
    }
    if (step && step.new && step.new.target && step.new.target !== target) {
      return false;
    }
    var replayAction = buildReplayAction(target, value);
    if (!replayAction) {
      return false;
    }
    replayAction.commitOptions = {
      skipHistory: true,
      isHistoryReplay: true,
      forceApply: true,
    };
    if (typeof _applySettingsAction !== "function") {
      return false;
    }
    return _applySettingsAction(replayAction) === true;
  }

  return applyControlSettingsHistoryReplay;
});
