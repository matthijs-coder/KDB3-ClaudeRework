define([
  "./state/actionTypes.js",
  "../../../core/utils/kit/history.js"
], function (_types, _kitHistory) {
  "use strict";

  var HISTORY_KEY = "kdbControl_settingsChange";

  // Tracked history targets. path: location in state.settings; isBoolean: snapshot holds a boolean, else a string.
  var TARGETS = {
    "dashboard.width": { path: ["dashboard", "width"] },
    "dashboard.height": { path: ["dashboard", "height"] },
    "dashboard.backgroundColor": { path: ["dashboard", "backgroundColor"] },
    "controlPanel.backgroundColor": { path: ["controlPanel", "backgroundColor"] },
    "controlPanel.buttonColor": { path: ["controlPanel", "buttonColor"] },
    "controlPanel.actionButtonColor": { path: ["controlPanel", "actionButtonColor"] },
    "controlPanel.innerBackgroundColor": { path: ["controlPanel", "innerBackgroundColor"] },
    "defaults.visualization.width": { path: ["defaultsNew", "visualization", "width"] },
    "defaults.visualization.height": { path: ["defaultsNew", "visualization", "height"] },
    "defaults.text.width": { path: ["defaultsNew", "comment", "width"] },
    "defaults.text.height": { path: ["defaultsNew", "comment", "height"] },
    "defaults.visualizationBackgroundColor": { path: ["defaultsNew", "visualization", "backgroundColor"] },
    "defaults.textBackgroundColor": { path: ["defaultsNew", "comment", "backgroundColor"] },
    "dashboard.areSettingsButtonsHidden": { path: ["dashboard", "hideWidgetSettingsButtons"], isBoolean: true },
    "dashboard.isDeveloperMode": { path: ["dashboard", "isDeveloperMode"], isBoolean: true }
  };

  // Action type -> payload key and value-to-target map used to find the history target of an action.
  var TARGET_BY_ACTION = {};
  TARGET_BY_ACTION[_types.ACTION_SETTINGS_SET_DASHBOARD_DIMENSION] = {
    key: "dimension", targets: { width: "dashboard.width", height: "dashboard.height" }
  };
  TARGET_BY_ACTION[_types.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR] = {
    key: "role",
    targets: {
      background: "controlPanel.backgroundColor",
      button: "controlPanel.buttonColor",
      actionButton: "controlPanel.actionButtonColor",
      innerBackground: "controlPanel.innerBackgroundColor"
    }
  };
  TARGET_BY_ACTION[_types.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT] = {
    key: "field",
    targets: {
      width: "defaults.visualization.width",
      height: "defaults.visualization.height",
      backgroundColor: "defaults.visualizationBackgroundColor"
    }
  };
  TARGET_BY_ACTION[_types.ACTION_SETTINGS_SET_COMMENT_DEFAULT] = {
    key: "field",
    targets: { width: "defaults.text.width", height: "defaults.text.height", backgroundColor: "defaults.textBackgroundColor" }
  };

  // Replay: target -> action to apply. kind: "dimension" (value must be non-blank), "color", "chrome" or "developerMode" (booleans).
  var REPLAY_BY_TARGET = {
    "dashboard.width": { kind: "dimension", type: _types.ACTION_SETTINGS_SET_DASHBOARD_DIMENSION, key: "dimension", field: "width" },
    "dashboard.height": { kind: "dimension", type: _types.ACTION_SETTINGS_SET_DASHBOARD_DIMENSION, key: "dimension", field: "height" },
    "dashboard.backgroundColor": { kind: "color", type: _types.ACTION_SETTINGS_SET_DASHBOARD_COLOR },
    "controlPanel.backgroundColor": { kind: "color", type: _types.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR, key: "role", field: "background" },
    "controlPanel.buttonColor": { kind: "color", type: _types.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR, key: "role", field: "button" },
    "controlPanel.actionButtonColor": { kind: "color", type: _types.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR, key: "role", field: "actionButton" },
    "controlPanel.innerBackgroundColor": {
      kind: "color", type: _types.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR, key: "role", field: "innerBackground"
    },
    "defaults.visualization.width": {
      kind: "dimension", type: _types.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT, key: "field", field: "width"
    },
    "defaults.visualization.height": {
      kind: "dimension", type: _types.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT, key: "field", field: "height"
    },
    "defaults.text.width": { kind: "dimension", type: _types.ACTION_SETTINGS_SET_COMMENT_DEFAULT, key: "field", field: "width" },
    "defaults.text.height": { kind: "dimension", type: _types.ACTION_SETTINGS_SET_COMMENT_DEFAULT, key: "field", field: "height" },
    "defaults.visualizationBackgroundColor": {
      kind: "color", type: _types.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT, key: "field", field: "backgroundColor"
    },
    "defaults.textBackgroundColor": { kind: "color", type: _types.ACTION_SETTINGS_SET_COMMENT_DEFAULT, key: "field", field: "backgroundColor" },
    "dashboard.areSettingsButtonsHidden": { kind: "chrome" },
    "dashboard.isDeveloperMode": { kind: "developerMode" }
  };

  function has(map, key) {
    return typeof key === "string" && Object.prototype.hasOwnProperty.call(map, key);
  }

  function isTrackedTarget(target) {
    return has(TARGETS, target);
  }

  function resolveTargetFromAction(action) {
    if (!action || typeof action.type !== "string") return null;
    var payload = action.payload || {};
    var type = action.type;
    if (has(TARGET_BY_ACTION, type)) {
      var route = TARGET_BY_ACTION[type];
      return has(route.targets, payload[route.key]) ? route.targets[payload[route.key]] : null;
    }
    if (type === _types.ACTION_SETTINGS_SET_DASHBOARD_COLOR) return "dashboard.backgroundColor";
    if (type === _types.ACTION_SETTINGS_TOGGLE_DASHBOARD_CHROME || type === _types.ACTION_SETTINGS_SET_DASHBOARD_CHROME) {
      return payload.key === "hideWidgetSettingsButtons" ? "dashboard.areSettingsButtonsHidden" : null;
    }
    if (type === _types.ACTION_SETTINGS_TOGGLE_DEVELOPER_MODE || type === _types.ACTION_SETTINGS_SET_DEVELOPER_MODE) {
      return "dashboard.isDeveloperMode";
    }
    return null;
  }

  function readTargetSnapshot(state, target) {
    var settings = state && state.settings;
    if (!settings || !isTrackedTarget(target)) return null;
    var spec = TARGETS[target];
    var node = settings;
    var index;
    for (index = 0; index < spec.path.length && node != null; index += 1) node = node[spec.path[index]];
    if (spec.isBoolean) return { value: node === true };
    return { value: node == null ? "" : String(node) };
  }

  function buildSettingsHistoryStep(target, oldSnapshot, newSnapshot) {
    return {
      key: HISTORY_KEY,
      old: { target: target, value: oldSnapshot },
      new: { target: target, value: newSnapshot }
    };
  }

  function pushSettingsHistoryStep(_KDB, action, prevState, nextState, commitOptions) {
    var target = resolveTargetFromAction(action);
    if (!target || !isTrackedTarget(target)) return;
    var oldSnapshot = readTargetSnapshot(prevState, target);
    var newSnapshot = readTargetSnapshot(nextState, target);
    if (!oldSnapshot || !newSnapshot) return;
    _kitHistory.pushHistoryStep(_KDB, buildSettingsHistoryStep(target, oldSnapshot, newSnapshot), commitOptions);
  }

  function readSnapshotScalar(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return null;
    if (typeof snapshot.value === "string" || typeof snapshot.value === "boolean") return snapshot.value;
    if (typeof snapshot.resolvedValue === "string" && snapshot.resolvedValue.trim()) return snapshot.resolvedValue;
    if (typeof snapshot.inputValue === "string" && snapshot.inputValue.trim()) return snapshot.inputValue;
    if (snapshot.pxValue != null && isFinite(Number(snapshot.pxValue))) return String(Math.round(Number(snapshot.pxValue))) + "px";
    return null;
  }

  function buildReplayAction(target, snapshot) {
    var spec = has(REPLAY_BY_TARGET, target) ? REPLAY_BY_TARGET[target] : null;
    var scalar = readSnapshotScalar(snapshot);
    if (!spec) return null;
    if (spec.kind === "chrome") {
      return typeof scalar === "boolean"
        ? { type: _types.ACTION_SETTINGS_SET_DASHBOARD_CHROME, payload: { key: "hideWidgetSettingsButtons", hidden: scalar === true } }
        : null;
    }
    if (spec.kind === "developerMode") {
      return typeof scalar === "boolean" ? { type: _types.ACTION_SETTINGS_SET_DEVELOPER_MODE, payload: { value: scalar === true } } : null;
    }
    if (scalar == null) return null;
    var value = String(scalar);
    if (spec.kind === "dimension" && !value.trim()) return null;
    var payload = { value: value };
    if (spec.key) payload[spec.key] = spec.field;
    return { type: spec.type, payload: payload };
  }

  function isReplayStepConsistent(step, target) {
    if (!step) return true;
    if (step.old && step.new && step.old.target !== step.new.target) return false;
    if (step.old && step.old.target && step.old.target !== target) return false;
    if (step.new && step.new.target && step.new.target !== target) return false;
    return true;
  }

  function applySettingsHistoryReplay(applySettingsAction, payload) {
    var request = payload || {};
    var target = typeof request.target === "string" ? request.target.trim() : "";
    var value = request.value;
    if (!target || !isTrackedTarget(target) || !value || typeof value !== "object") return false;
    if (!isReplayStepConsistent(request.step || null, target)) return false;
    var replayAction = buildReplayAction(target, value);
    if (!replayAction) return false;
    replayAction.commitOptions = { skipHistory: true, isHistoryReplay: true, forceApply: true };
    return applySettingsAction(replayAction) === true;
  }

  function createSettingsReplayHandler(applySettingsAction) {
    var applyByKey = {};
    applyByKey[HISTORY_KEY] = function (_KDB, targetValue, step, ctx) {
      var value = targetValue || {};
      return applySettingsHistoryReplay(applySettingsAction, {
        target: value.target,
        value: value.value,
        direction: ctx && ctx.direction,
        step: step || null
      });
    };
    return _kitHistory.createReplayHandler(applyByKey);
  }

  return {
    pushSettingsHistoryStep: pushSettingsHistoryStep,
    applySettingsHistoryReplay: applySettingsHistoryReplay,
    createSettingsReplayHandler: createSettingsReplayHandler
  };
});
