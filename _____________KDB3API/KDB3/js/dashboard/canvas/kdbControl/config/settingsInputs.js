define(["../state/actionTypes.js"], function (_types) {
  "use strict";

  // Settings-bound inputs of the settings panel, keyed by `data-placeholder-input-id`.
  // path: location in state.settings; type/key/field: action dispatched on edit; isColor: also dispatched on every `input` event.
  var INPUTS = {
    dashboardWidth: { path: ["dashboard", "width"], type: _types.ACTION_SETTINGS_SET_DASHBOARD_DIMENSION, key: "dimension", field: "width" },
    dashboardHeight: { path: ["dashboard", "height"], type: _types.ACTION_SETTINGS_SET_DASHBOARD_DIMENSION, key: "dimension", field: "height" },
    dashboardBg: { path: ["dashboard", "backgroundColor"], type: _types.ACTION_SETTINGS_SET_DASHBOARD_COLOR, isColor: true },
    graphWidth: { path: ["defaultsNew", "visualization", "width"], type: _types.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT, key: "field", field: "width" },
    graphHeight: { path: ["defaultsNew", "visualization", "height"], type: _types.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT, key: "field", field: "height" },
    graphBg: {
      path: ["defaultsNew", "visualization", "backgroundColor"],
      type: _types.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT, key: "field", field: "backgroundColor", isColor: true
    },
    commentWidth: { path: ["defaultsNew", "comment", "width"], type: _types.ACTION_SETTINGS_SET_COMMENT_DEFAULT, key: "field", field: "width" },
    commentHeight: { path: ["defaultsNew", "comment", "height"], type: _types.ACTION_SETTINGS_SET_COMMENT_DEFAULT, key: "field", field: "height" },
    commentBg: {
      path: ["defaultsNew", "comment", "backgroundColor"],
      type: _types.ACTION_SETTINGS_SET_COMMENT_DEFAULT, key: "field", field: "backgroundColor", isColor: true
    },
    panelBg: {
      path: ["controlPanel", "backgroundColor"],
      type: _types.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR, key: "role", field: "background", isColor: true
    },
    panelButton: {
      path: ["controlPanel", "buttonColor"],
      type: _types.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR, key: "role", field: "button", isColor: true
    },
    panelActionButton: {
      path: ["controlPanel", "actionButtonColor"],
      type: _types.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR, key: "role", field: "actionButton", isColor: true
    },
    panelInnerBg: {
      path: ["controlPanel", "innerBackgroundColor"],
      type: _types.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR, key: "role", field: "innerBackground", isColor: true
    }
  };

  function readInputSpec(inputId) {
    return typeof inputId === "string" && Object.prototype.hasOwnProperty.call(INPUTS, inputId) ? INPUTS[inputId] : null;
  }

  function isSettingsInput(inputId) {
    return readInputSpec(inputId) !== null;
  }

  function isColorSettingsInput(inputId) {
    var spec = readInputSpec(inputId);
    return !!spec && spec.isColor === true;
  }

  function buildSettingsInputAction(inputId, value) {
    var spec = readInputSpec(inputId);
    if (!spec) return null;
    var payload = { value: value };
    if (spec.key) payload[spec.key] = spec.field;
    return { type: spec.type, payload: payload };
  }

  function readSettingsInputValue(settings, inputId) {
    var spec = readInputSpec(inputId);
    if (!spec) return "";
    var node = settings || {};
    var index;
    for (index = 0; index < spec.path.length && node != null; index += 1) node = node[spec.path[index]];
    return node != null ? String(node) : "";
  }

  return {
    isSettingsInput: isSettingsInput,
    isColorSettingsInput: isColorSettingsInput,
    buildSettingsInputAction: buildSettingsInputAction,
    readSettingsInputValue: readSettingsInputValue
  };
});
