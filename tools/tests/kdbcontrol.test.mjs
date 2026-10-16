// Golden tests for the pure parts of _____________KDB3API/KDB3/js/dashboard/canvas/kdbControl (state, gate, history, restore).
// Expected values were recorded from the pre-refactor modules (main b93cf29).
// Run: node --test tools/tests/kdbcontrol.test.mjs   (no dependencies)
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const at = (rel) => path.join(JS_ROOT, "dashboard/canvas/kdbControl", rel);
const quietConsole = { log() {}, info() {}, warn() {}, error() {} };
const domStub = { getElementById: (id) => ({ id }) };

const initialState = loadAmd(at("state/initialState.js"));
const reduceKdbControl = loadAmd(at("state/reducer.js"));
const selectors = loadAmd(at("state/selectors.js"));
const settingsInputs = loadAmd(at("config/settingsInputs.js"));
const gate = loadAmd(at("dimensionGate.js"), { stubs: { document: domStub, console: quietConsole } });
const history = loadAmd(at("history.js"));
const restore = loadAmd(at("restore.js"));
const registerKdbControl = loadAmd(at("__orchestratorKdbControl.js"), { stubs: { console: quietConsole } });

const dimensionAction = (value) => ({ type: "kdbControl/settings/setDashboardDimension", payload: { dimension: "width", value } });

test("initialState keeps the shape read by collectCanvasSettings", () => {
  const state = initialState();
  assert.equal(state.lifecycle, "idle");
  assert.deepEqual(state.settings, {
    dashboard: { width: "1800px", height: "800px", backgroundColor: "#ffffff", hideWidgetSettingsButtons: true, isDeveloperMode: false },
    controlPanel: { backgroundColor: "#ffffff", buttonColor: "#c0c0c0", actionButtonColor: "#0056b3", innerBackgroundColor: "#fafafa" },
    defaultsNew: {
      visualization: { width: "10cm", height: "10cm", backgroundColor: "#ffffff" },
      comment: { width: "15cm", height: "5cm", backgroundColor: "#00000000" }
    }
  });
  assert.deepEqual(state.framework, {
    activeTopPanel: "metrics", openSectionId: null, isCollapsed: false, placeholderInputs: {}, placeholderSelections: {}
  });
  assert.notEqual(initialState().settings, state.settings, "each call builds fresh objects");
});

test("reducer: recorded action sequence", () => {
  const actions = [
    { type: "kdbControl/init" },
    dimensionAction("300mm"),
    { type: "kdbControl/settings/setControlPanelColor", payload: { role: "button", value: "#111111" } },
    { type: "kdbControl/settings/setCommentDefault", payload: { field: "backgroundColor", value: "#222222" } },
    { type: "kdbControl/settings/toggleDashboardChrome", payload: { key: "hideWidgetSettingsButtons" } },
    { type: "kdbControl/settings/setDeveloperMode", payload: { value: true } },
    { type: "kdbControl/framework/selectPanel", payload: { panelId: "settings" } },
    { type: "kdbControl/framework/toggleSection", payload: { sectionId: "settingsCharts" } },
    { type: "kdbControl/framework/toggleCollapse", payload: {} },
    { type: "kdbControl/framework/setPlaceholderSelection", payload: { controlId: "c", value: 1 } },
    { type: "kdbControl/framework/setPlaceholderInput", payload: { inputId: "i", value: null } },
    { type: "kdbControl/framework/selectPanel", payload: { panelId: "settings" } }
  ];
  const state = actions.reduce(reduceKdbControl, initialState());
  assert.equal(state.lifecycle, "mounted");
  assert.deepEqual(state.framework, {
    activeTopPanel: "metrics", openSectionId: null, isCollapsed: true, placeholderInputs: { i: "" }, placeholderSelections: { c: "1" }
  });
  assert.deepEqual(state.settings.dashboard, {
    width: "300mm", height: "800px", backgroundColor: "#ffffff", hideWidgetSettingsButtons: false, isDeveloperMode: true
  });
  assert.equal(state.settings.controlPanel.buttonColor, "#111111");
  assert.equal(state.settings.defaultsNew.comment.backgroundColor, "#222222");
});

test("reducer: invalid and no-op actions keep the state object", () => {
  const state = initialState();
  [
    { type: "kdbControl/settings/setDashboardDimension", payload: { dimension: "depth", value: "1px" } },
    { type: "kdbControl/settings/setControlPanelColor", payload: { role: "bogus", value: "#1" } },
    { type: "kdbControl/settings/setDashboardChrome", payload: { key: "hideWidgetSettingsButtons", hidden: true } },
    { type: "kdbControl/settings/setDeveloperMode", payload: { value: false } },
    { type: "kdbControl/framework/selectPanel", payload: { panelId: "nope" } },
    { type: "kdbControl/unknown" }
  ].forEach((action) => assert.equal(reduceKdbControl(state, action), state, action.type));
  assert.equal(reduceKdbControl(null, { type: "kdbControl/init" }), null);
  assert.equal(reduceKdbControl(state, null), state);
  const failed = reduceKdbControl(null, { type: "kdbControl/error", payload: { errorCode: "mount", errorMessage: "x" } });
  assert.deepEqual([failed.lifecycle, failed.errorCode, failed.errorMessage], ["error", "mount", "x"]);
});

test("selectors: frozen read functions", () => {
  assert.deepEqual(selectors.readDashboardSettings(null), {
    width: "", height: "", backgroundColor: "", hideWidgetSettingsButtons: true, isDeveloperMode: false
  });
  assert.deepEqual(selectors.readCommentDefaults(initialState()), { width: "15cm", height: "5cm", backgroundColor: "#00000000" });
  assert.deepEqual(selectors.readVisualizationDefaults({ settings: { defaultsNew: { visualization: { width: 5 } } } }),
    { width: "5", height: "", backgroundColor: "" });
  assert.equal(selectors.readFrameworkCollapsed(undefined), false);
  assert.equal(selectors.readFrameworkActiveTopPanel(initialState()), "metrics");
});

test("settings inputs: actions, values and colour flags", () => {
  assert.deepEqual(settingsInputs.buildSettingsInputAction("dashboardHeight", "9px"),
    { type: "kdbControl/settings/setDashboardDimension", payload: { value: "9px", dimension: "height" } });
  assert.deepEqual(settingsInputs.buildSettingsInputAction("dashboardBg", "#123456"),
    { type: "kdbControl/settings/setDashboardColor", payload: { value: "#123456" } });
  assert.deepEqual(settingsInputs.buildSettingsInputAction("panelInnerBg", "#1"),
    { type: "kdbControl/settings/setControlPanelColor", payload: { value: "#1", role: "innerBackground" } });
  assert.equal(settingsInputs.buildSettingsInputAction("constructor", "x"), null);
  assert.equal(settingsInputs.isColorSettingsInput("graphBg"), true);
  assert.equal(settingsInputs.isColorSettingsInput("graphWidth"), false);
  assert.equal(settingsInputs.readSettingsInputValue(initialState().settings, "commentBg"), "#00000000");
  assert.equal(settingsInputs.readSettingsInputValue(undefined, "commentBg"), "");
});

test("dimension gate: parse, minimum and notifications", () => {
  const notes = [];
  const _KDB = { services: { message: {
    notify: (n) => notes.push(["notify", n]),
    notifyAnchored: (n) => notes.push(["anchored", { ...n, anchor: n.anchor.id }])
  } } };
  const run = (value) => { notes.length = 0; return gate.gateSettingsDimensionAction(_KDB, dimensionAction(value)); };
  assert.deepEqual(run(""), { proceed: false });
  assert.equal(notes[0][1].message, "Dimension is required (empty value is not allowed).");
  assert.deepEqual(run("12"), { proceed: false });
  assert.equal(notes[0][1].message, "Invalid dimension: a unit is required. Use mm, cm, or px (e.g. 200mm, 10cm, 800px).");
  assert.deepEqual(run("0mm"), { proceed: false });
  assert.deepEqual(run("1px").action.payload, { dimension: "width", value: "200mm" });
  assert.deepEqual(notes[0], ["anchored", {
    anchor: "dashboardWidth", code: "KDB_CONTROL_SETTINGS_DIMENSION_MIN_APPLIED",
    message: "Value was below the minimum; minimum 200mm has been applied.", severity: "info"
  }]);
  assert.deepEqual(run("200.50mm").action.payload, { dimension: "width", value: "200.5mm" });
  assert.equal(notes.length, 0);
  const untouched = { type: "kdbControl/settings/setVisualizationDefault", payload: { field: "backgroundColor", value: "#1" } };
  assert.deepEqual(gate.gateSettingsDimensionAction(_KDB, untouched), { proceed: true, action: untouched });
});

function createHistoryHarness() {
  const steps = [];
  const _KDB = { services: { history: { pushCommittedStep: (step) => { steps.push(step); return true; } } } };
  return { steps: steps, _KDB: _KDB };
}

test("history: step per tracked action, skipped on replay/skipHistory/untracked", () => {
  const { steps, _KDB } = createHistoryHarness();
  const prev = initialState();
  const action = dimensionAction("640px");
  const next = reduceKdbControl(prev, action);
  history.pushSettingsHistoryStep(_KDB, action, prev, next, null);
  assert.deepEqual(steps, [{
    key: "kdbControl_settingsChange",
    old: { target: "dashboard.width", value: { value: "1800px" } },
    new: { target: "dashboard.width", value: { value: "640px" } }
  }]);
  history.pushSettingsHistoryStep(_KDB, action, prev, next, { skipHistory: true });
  history.pushSettingsHistoryStep(_KDB, action, prev, next, { isHistoryReplay: true });
  history.pushSettingsHistoryStep(_KDB, { type: "kdbControl/framework/toggleCollapse" }, prev, next, null);
  assert.equal(steps.length, 1);
  const devAction = { type: "kdbControl/settings/toggleDeveloperMode" };
  history.pushSettingsHistoryStep(_KDB, devAction, prev, reduceKdbControl(prev, devAction), null);
  assert.deepEqual(steps[1].new, { target: "dashboard.isDeveloperMode", value: { value: true } });
  history.pushSettingsHistoryStep({ services: {} }, action, prev, next, null);
});

test("history: replay builds the settings action and ignores inconsistent steps", () => {
  const applied = [];
  const apply = (action) => { applied.push(action); return true; };
  const handler = history.createSettingsReplayHandler(apply);
  const step = (target) => ({ key: "kdbControl_settingsChange", old: { target: target }, new: { target: target } });
  assert.equal(handler.apply({}, { target: "dashboard.width", value: { value: "800px" } }, step("dashboard.width"), { direction: "undo" }), true);
  assert.deepEqual(applied[0], {
    type: "kdbControl/settings/setDashboardDimension", payload: { value: "800px", dimension: "width" },
    commitOptions: { skipHistory: true, isHistoryReplay: true, forceApply: true }
  });
  handler.apply({}, { target: "controlPanel.buttonColor", value: { resolvedValue: "#abcdef" } }, step("controlPanel.buttonColor"), {});
  assert.deepEqual(applied[1].payload, { value: "#abcdef", role: "button" });
  handler.apply({}, { target: "defaults.text.height", value: { pxValue: 250.4 } }, step("defaults.text.height"), {});
  assert.deepEqual(applied[2].payload, { value: "250px", field: "height" });
  handler.apply({}, { target: "dashboard.areSettingsButtonsHidden", value: { value: false } }, step("dashboard.areSettingsButtonsHidden"), {});
  assert.deepEqual(applied[3].payload, { key: "hideWidgetSettingsButtons", hidden: false });
  handler.apply({}, { target: "dashboard.isDeveloperMode", value: { value: true } }, step("dashboard.isDeveloperMode"), {});
  assert.deepEqual(applied[4].payload, { value: true });
  const count = applied.length;
  assert.equal(handler.apply({}, { target: "dashboard.width", value: { value: "" } }, step("dashboard.width"), {}), false);
  assert.equal(handler.apply({}, { target: "dashboard.areSettingsButtonsHidden", value: { value: "yes" } }, step("dashboard.areSettingsButtonsHidden"), {}), false);
  assert.equal(handler.apply({}, { target: "dashboard.width", value: { value: "9px" } },
    { key: "kdbControl_settingsChange", old: { target: "x" }, new: { target: "dashboard.width" } }, {}), false);
  assert.equal(handler.apply({}, { target: "nope", value: { value: "9px" } }, step("nope"), {}), false);
  assert.equal(handler.apply({}, undefined, step("dashboard.width"), {}), false);
  assert.equal(handler.apply({}, { target: "dashboard.width", value: { value: "9px" } }, { key: "other" }, {}), false);
  assert.equal(applied.length, count);
});

test("restore: applies the diff to owner defaults + payload overlay", async () => {
  const applied = [];
  const _KDB = { state: { kdbControl: initialState() }, runtime: { kdbControl: {} } };
  const deps = { applySettingsAction: (action) => { applied.push(action); return true; }, syncView: () => applied.push("sync") };
  const missingRun = await restore.restoreParameterSet(_KDB, deps, { payload: {} });
  assert.deepEqual(missingRun.diagnostics.map((d) => d.code), ["WRITEBACK_RESTORE_CANCELLED"]);
  const result = await restore.restoreParameterSet(_KDB, deps, { payload: {
    runId: 5, status: "restore", canvas: { w: 777 },
    settings: { dash: { bg: "#eeeeee", hidWs: 0, devOn: 1 }, newwg: { vis: { w: 12 } } }
  } });
  assert.equal(result.ok, true);
  assert.deepEqual(result.appliedKeys, ["canv.w", "sett.dash.bg", "sett.dash.hidWs", "sett.dash.devOn", "sett.newwg.vis.w"]);
  assert.deepEqual(applied[0], {
    type: "kdbControl/settings/setDashboardDimension", payload: { dimension: "width", value: "777px" },
    commitOptions: { skipHistory: false, forceApply: true }
  });
  assert.deepEqual(applied[3].payload, { value: true, source: "writebackRestore" });
  assert.equal(applied[applied.length - 1], "sync");
  const stale = await restore.restoreParameterSet(_KDB, deps, { payload: { runId: 4 } });
  assert.deepEqual(stale.diagnostics.map((d) => d.code), ["WRITEBACK_RESTORE_CANCELLED"]);
  assert.equal(_KDB.runtime.kdbControl.parameterSetRunId, 5);
  const notMounted = await restore.restoreParameterSet({ state: {}, runtime: {} }, deps, { payload: { runId: 1 } });
  assert.deepEqual(notMounted.diagnostics.map((d) => d.code), ["WRITEBACK_KDBCONTROL_RESTORE_FAILED"]);
});

test("controller: API surface and disposed guard", () => {
  const _KDB = { api: {}, state: {}, runtime: {} };
  registerKdbControl(_KDB);
  const api = _KDB.api.kdbControl;
  assert.deepEqual(Object.keys(api).sort(), ["destroy", "dispatch", "getState", "mount", "syncView"]);
  api.destroy();
  assert.deepEqual(api.dispatch({ type: "kdbControl/settings/toggleDeveloperMode" }), { ok: false, errorCode: "KDB_CONTROL_DISPOSED" });
  api.mount({});
  assert.equal(_KDB.runtime.kdbControl, undefined, "mount after destroy does not create runtime");
});
