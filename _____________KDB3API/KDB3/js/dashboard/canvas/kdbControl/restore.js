define([
  "./state/actionTypes.js",
  "./state/initialState.js",
  "../../../core/utils/convertUnitToPx.js"
], function (_types, _initialState, _convertUnitToPx) {
  "use strict";

  var RESTORE_FAILED = "WRITEBACK_KDBCONTROL_RESTORE_FAILED";
  var CANCELLED = "WRITEBACK_RESTORE_CANCELLED";

  function dimensionField(value) { return { name: "dimension", value: value }; }
  function keyField(value) { return { name: "key", value: value }; }
  function roleField(value) { return { name: "role", value: value }; }
  function propertyField(value) { return { name: "field", value: value }; }

  // Catalog per contracts/writeback.md section 4.1.1: every restorable canv/sett key maps to exactly one owner state path
  // and one settings action. Restore is absolute: an omitted v3 key means owner default (section 4.6.1), so the desired
  // value is default + payload overlay, diffed against current state.
  var CATALOG = [
    { key: "canv.w", kind: "dim", statePath: ["dashboard", "width"], v3Path: ["canvas", "w"],
      type: _types.ACTION_SETTINGS_SET_DASHBOARD_DIMENSION, field: dimensionField("width") },
    { key: "canv.h", kind: "dim", statePath: ["dashboard", "height"], v3Path: ["canvas", "h"],
      type: _types.ACTION_SETTINGS_SET_DASHBOARD_DIMENSION, field: dimensionField("height") },
    { key: "sett.dash.bg", kind: "colour", statePath: ["dashboard", "backgroundColor"], v3Path: ["settings", "dash", "bg"],
      type: _types.ACTION_SETTINGS_SET_DASHBOARD_COLOR, field: null },
    { key: "sett.dash.hidWs", kind: "bool", statePath: ["dashboard", "hideWidgetSettingsButtons"], v3Path: ["settings", "dash", "hidWs"],
      type: _types.ACTION_SETTINGS_SET_DASHBOARD_CHROME, field: keyField("hideWidgetSettingsButtons") },
    { key: "sett.dash.devOn", kind: "boolValue", statePath: ["dashboard", "isDeveloperMode"], v3Path: ["settings", "dash", "devOn"],
      type: _types.ACTION_SETTINGS_SET_DEVELOPER_MODE, field: null },
    { key: "sett.panel.bg", kind: "colour", statePath: ["controlPanel", "backgroundColor"], v3Path: ["settings", "panel", "bg"],
      type: _types.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR, field: roleField("background") },
    { key: "sett.panel.btn", kind: "colour", statePath: ["controlPanel", "buttonColor"], v3Path: ["settings", "panel", "btn"],
      type: _types.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR, field: roleField("button") },
    { key: "sett.panel.act", kind: "colour", statePath: ["controlPanel", "actionButtonColor"], v3Path: ["settings", "panel", "act"],
      type: _types.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR, field: roleField("actionButton") },
    { key: "sett.panel.inBg", kind: "colour", statePath: ["controlPanel", "innerBackgroundColor"], v3Path: ["settings", "panel", "inBg"],
      type: _types.ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR, field: roleField("innerBackground") },
    { key: "sett.newwg.vis.w", kind: "dim", statePath: ["defaultsNew", "visualization", "width"], v3Path: ["settings", "newwg", "vis", "w"],
      type: _types.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT, field: propertyField("width") },
    { key: "sett.newwg.vis.h", kind: "dim", statePath: ["defaultsNew", "visualization", "height"], v3Path: ["settings", "newwg", "vis", "h"],
      type: _types.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT, field: propertyField("height") },
    { key: "sett.newwg.vis.bg", kind: "colour", statePath: ["defaultsNew", "visualization", "backgroundColor"],
      v3Path: ["settings", "newwg", "vis", "bg"], type: _types.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT, field: propertyField("backgroundColor") },
    { key: "sett.newwg.txt.w", kind: "dim", statePath: ["defaultsNew", "comment", "width"], v3Path: ["settings", "newwg", "txt", "w"],
      type: _types.ACTION_SETTINGS_SET_COMMENT_DEFAULT, field: propertyField("width") },
    { key: "sett.newwg.txt.h", kind: "dim", statePath: ["defaultsNew", "comment", "height"], v3Path: ["settings", "newwg", "txt", "h"],
      type: _types.ACTION_SETTINGS_SET_COMMENT_DEFAULT, field: propertyField("height") },
    { key: "sett.newwg.txt.bg", kind: "colour", statePath: ["defaultsNew", "comment", "backgroundColor"],
      v3Path: ["settings", "newwg", "txt", "bg"], type: _types.ACTION_SETTINGS_SET_COMMENT_DEFAULT, field: propertyField("backgroundColor") }
  ];

  function readPath(root, path) {
    var node = root;
    var index = 0;
    while (node != null && index < path.length) {
      node = node[path[index]];
      index += 1;
    }
    return node;
  }

  function isBooleanKind(kind) {
    return kind === "bool" || kind === "boolValue";
  }

  function resolveDesired(entry, v3Value, defaultValue) {
    if (isBooleanKind(entry.kind)) {
      if (v3Value === undefined || v3Value === null) return defaultValue === true;
      return v3Value === 1 || v3Value === true;
    }
    if (v3Value === undefined || v3Value === null) return defaultValue;
    return entry.kind === "dim" ? String(v3Value) + "px" : String(v3Value);
  }

  function isEqual(kind, current, desired) {
    if (kind === "dim") return _convertUnitToPx(current) === _convertUnitToPx(desired);
    if (isBooleanKind(kind)) return (current === true) === desired;
    return typeof current === "string" && typeof desired === "string" && current.trim().toLowerCase() === desired.trim().toLowerCase();
  }

  function buildAction(entry, desired) {
    var payload = {};
    if (entry.field) payload[entry.field.name] = entry.field.value;
    if (entry.kind === "boolValue") {
      payload = { value: desired === true, source: "writebackRestore" };
    } else if (entry.kind === "bool") {
      payload.hidden = desired;
    } else {
      payload.value = desired;
    }
    return { type: entry.type, payload: payload };
  }

  function buildParameterSetRestoreActions(currentSettings, payload) {
    var defaults = _initialState().settings;
    var overlay = payload.status === "newDashboard" ? {} : { canvas: payload.canvas, settings: payload.settings };
    var actions = [];
    var skippedKeys = [];
    CATALOG.forEach(function (entry) {
      var current = readPath(currentSettings, entry.statePath);
      var desired = resolveDesired(entry, readPath(overlay, entry.v3Path), readPath(defaults, entry.statePath));
      if (isEqual(entry.kind, current, desired)) {
        skippedKeys.push(entry.key);
        return;
      }
      actions.push({ key: entry.key, action: buildAction(entry, desired) });
    });
    return { actions: actions, skippedKeys: skippedKeys };
  }

  function resultPromise(ok, appliedKeys, skippedKeys, diagnostics) {
    return Promise.resolve({ ok: ok, appliedKeys: appliedKeys, skippedKeys: skippedKeys, diagnostics: diagnostics });
  }

  function failedResult(code, message) {
    return resultPromise(false, [], [], [{ code: code, message: message }]);
  }

  // kdbControl/parameterSetRestoreRequested per contracts/kdbControl-parameterSetRestore-contractdelta.md. Applies the
  // desired canv/sett end state (owner defaults + payload overlay; defaults only for status "newDashboard") through the
  // normal settings action path, so canvas intents, panel visuals and history suppression reuse the existing owner flows.
  // Ends with one configuration UI sync.
  function restoreParameterSet(_KDB, deps, action) {
    var payload = (action && action.payload) || {};
    if (typeof payload.runId !== "number") {
      return failedResult(CANCELLED, "kdbControl/parameterSetRestoreRequested requires a numeric runId");
    }
    var runtime = _KDB.runtime && _KDB.runtime.kdbControl;
    var state = _KDB.state && _KDB.state.kdbControl;
    if (!runtime || !state || !state.settings) {
      return failedResult(RESTORE_FAILED, "kdbControl is not mounted; cannot restore canv/sett");
    }
    if (typeof runtime.parameterSetRunId === "number" && payload.runId < runtime.parameterSetRunId) {
      return failedResult(CANCELLED, "stale parameterSet runId " + payload.runId + " superseded by " + runtime.parameterSetRunId);
    }
    runtime.parameterSetRunId = payload.runId;

    var plan = buildParameterSetRestoreActions(state.settings, payload);
    var appliedKeys = [];
    var diagnostics = [];
    plan.actions.forEach(function (entry) {
      entry.action.commitOptions = { skipHistory: payload.skipHistory === true, forceApply: true };
      if (deps.applySettingsAction(entry.action) === true) {
        appliedKeys.push(entry.key);
      } else {
        diagnostics.push({ code: RESTORE_FAILED, key: entry.key, message: "settings apply was rejected for " + entry.key });
      }
    });
    deps.syncView();
    return resultPromise(diagnostics.length === 0, appliedKeys, plan.skippedKeys, diagnostics);
  }

  return { restoreParameterSet: restoreParameterSet };
});
