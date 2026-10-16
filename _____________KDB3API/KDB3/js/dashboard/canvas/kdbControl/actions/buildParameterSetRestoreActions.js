define([
  "../events/eventNames",
  "../state/initialState",
  "../../../../core/utils/convertUnitToPx.js",
], function (_eventNames, _initialState, _convertUnitToPx) {
  "use strict";

  // Catalog per contracts/writeback.md §4.1.1: every restorable canv/sett key
  // maps to exactly one owner state path and one settings action. Restore is
  // absolute: an omitted v3 key means owner default (§4.6.1), so the desired
  // value is default + payload overlay, diffed against current state.
  var CATALOG = [
    { key: "canv.w", kind: "dim", statePath: ["dashboard", "width"], v3Path: ["canvas", "w"], type: _eventNames.ACTION_SETTINGS_SET_DASHBOARD_DIMENSION, field: { name: "dimension", value: "width" } },
    { key: "canv.h", kind: "dim", statePath: ["dashboard", "height"], v3Path: ["canvas", "h"], type: _eventNames.ACTION_SETTINGS_SET_DASHBOARD_DIMENSION, field: { name: "dimension", value: "height" } },
    { key: "sett.dash.bg", kind: "colour", statePath: ["dashboard", "backgroundColor"], v3Path: ["settings", "dash", "bg"], type: _eventNames.ACTION_SETTINGS_SET_DASHBOARD_COLOR, field: null },
    { key: "sett.dash.hidWs", kind: "bool", statePath: ["dashboard", "hideWidgetSettingsButtons"], v3Path: ["settings", "dash", "hidWs"], type: _eventNames.ACTION_SETTINGS_SET_DASHBOARD_CHROME, field: { name: "key", value: "hideWidgetSettingsButtons" } },
    { key: "sett.dash.devOn", kind: "boolValue", statePath: ["dashboard", "isDeveloperMode"], v3Path: ["settings", "dash", "devOn"], type: _eventNames.ACTION_SETTINGS_SET_DEVELOPER_MODE, field: null },
    { key: "sett.panel.bg", kind: "colour", statePath: ["controlPanel", "backgroundColor"], v3Path: ["settings", "panel", "bg"], type: _eventNames.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR, field: { name: "role", value: "background" } },
    { key: "sett.panel.btn", kind: "colour", statePath: ["controlPanel", "buttonColor"], v3Path: ["settings", "panel", "btn"], type: _eventNames.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR, field: { name: "role", value: "button" } },
    { key: "sett.panel.act", kind: "colour", statePath: ["controlPanel", "actionButtonColor"], v3Path: ["settings", "panel", "act"], type: _eventNames.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR, field: { name: "role", value: "actionButton" } },
    { key: "sett.panel.inBg", kind: "colour", statePath: ["controlPanel", "innerBackgroundColor"], v3Path: ["settings", "panel", "inBg"], type: _eventNames.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR, field: { name: "role", value: "innerBackground" } },
    { key: "sett.newwg.vis.w", kind: "dim", statePath: ["defaultsNew", "visualization", "width"], v3Path: ["settings", "newwg", "vis", "w"], type: _eventNames.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT, field: { name: "field", value: "width" } },
    { key: "sett.newwg.vis.h", kind: "dim", statePath: ["defaultsNew", "visualization", "height"], v3Path: ["settings", "newwg", "vis", "h"], type: _eventNames.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT, field: { name: "field", value: "height" } },
    { key: "sett.newwg.vis.bg", kind: "colour", statePath: ["defaultsNew", "visualization", "backgroundColor"], v3Path: ["settings", "newwg", "vis", "bg"], type: _eventNames.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT, field: { name: "field", value: "backgroundColor" } },
    { key: "sett.newwg.txt.w", kind: "dim", statePath: ["defaultsNew", "comment", "width"], v3Path: ["settings", "newwg", "txt", "w"], type: _eventNames.ACTION_SETTINGS_SET_COMMENT_DEFAULT, field: { name: "field", value: "width" } },
    { key: "sett.newwg.txt.h", kind: "dim", statePath: ["defaultsNew", "comment", "height"], v3Path: ["settings", "newwg", "txt", "h"], type: _eventNames.ACTION_SETTINGS_SET_COMMENT_DEFAULT, field: { name: "field", value: "height" } },
    { key: "sett.newwg.txt.bg", kind: "colour", statePath: ["defaultsNew", "comment", "backgroundColor"], v3Path: ["settings", "newwg", "txt", "bg"], type: _eventNames.ACTION_SETTINGS_SET_COMMENT_DEFAULT, field: { name: "field", value: "backgroundColor" } },
  ];

  function buildParameterSetRestoreActions(_currentSettings, _payload) {
    var defaults = _initialState().settings;
    var overlay = _payload.status === "newDashboard" ? {} : { canvas: _payload.canvas, settings: _payload.settings };
    var actions = [];
    var skippedKeys = [];
    CATALOG.forEach(function (entry) {
      var current = readPath(_currentSettings, entry.statePath);
      var desired = resolveDesired(entry, readPath(overlay, entry.v3Path), readPath(defaults, entry.statePath));
      if (isEqual(entry.kind, current, desired)) {
        skippedKeys.push(entry.key);
        return;
      }
      actions.push({ key: entry.key, action: buildAction(entry, desired) });
    });
    return { actions: actions, skippedKeys: skippedKeys };
  }

  function resolveDesired(entry, v3Value, defaultValue) {
    if (entry.kind === "bool" || entry.kind === "boolValue") {
      if (v3Value === undefined || v3Value === null) {
        return defaultValue === true;
      }
      return v3Value === 1 || v3Value === true;
    }
    if (v3Value === undefined || v3Value === null) {
      return defaultValue;
    }
    if (entry.kind === "dim") {
      return String(v3Value) + "px";
    }
    return String(v3Value);
  }

  function isEqual(kind, current, desired) {
    if (kind === "dim") {
      return _convertUnitToPx(current) === _convertUnitToPx(desired);
    }
    if (kind === "bool" || kind === "boolValue") {
      return current === true === desired;
    }
    return typeof current === "string" && typeof desired === "string"
      && current.trim().toLowerCase() === desired.trim().toLowerCase();
  }

  function buildAction(entry, desired) {
    var payload = {};
    if (entry.field) {
      payload[entry.field.name] = entry.field.value;
    }
    if (entry.kind === "boolValue") {
      payload = { value: desired === true, source: "writebackRestore" };
    } else if (entry.kind === "bool") {
      payload.hidden = desired;
    } else {
      payload.value = desired;
    }
    return { type: entry.type, payload: payload };
  }

  function readPath(root, path) {
    var node = root;
    var index = 0;
    while (node != null && index < path.length) {
      node = node[path[index]];
      index += 1;
    }
    return node;
  }

  return buildParameterSetRestoreActions;
});
