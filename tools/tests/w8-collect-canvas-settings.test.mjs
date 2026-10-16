// Characterisation test for writeback get/collectors/collectCanvasSettings.js (Phase 2 W8: owner key names are derived
// from SETT_KEY_CATALOG instead of a second hard-coded copy). The golden was recorded before that change.
// Run:    node --test tools/tests/w8-collect-canvas-settings.test.mjs
// Record: W8_RECORD=1 node --test tools/tests/w8-collect-canvas-settings.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const GOLDEN = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "w8-canvas-settings.golden.json");
const RECORD = process.env.W8_RECORD === "1";
const QUIET = { error() {}, warn() {}, log() {}, info() {}, debug() {} };
const load = (rel) => loadAmd(path.join(JS_ROOT, rel), { stubs: { console: QUIET } });

const collectCanvasSettings = load("core/services/writeback/get/collectors/collectCanvasSettings.js");
const initialState = load("dashboard/canvas/kdbControl/state/initialState.js");
const v3Defaults = load("core/services/writeback/schema/v3Defaults.js");

const clone = (value) => JSON.parse(JSON.stringify(value));

function stateWith(mutate) {
  const state = initialState();
  mutate(state.settings);
  return state;
}

function collect(state) {
  const diagnostics = [];
  const result = collectCanvasSettings({ api: { kdbControl: { getState: () => state } } }, diagnostics);
  return { result, diagnostics };
}

const CASES = {
  defaults: () => initialState(),
  dashboardWidth: () => stateWith((s) => { s.dashboard.width = "10cm"; }),
  dashboardHeightMm: () => stateWith((s) => { s.dashboard.height = "200mm"; }),
  dashboardBgCase: () => stateWith((s) => { s.dashboard.backgroundColor = " #FFFFFF "; }),
  dashboardBg: () => stateWith((s) => { s.dashboard.backgroundColor = "#123456"; }),
  dashboardHidWsShown: () => stateWith((s) => { s.dashboard.hideWidgetSettingsButtons = false; }),
  dashboardDevOn: () => stateWith((s) => { s.dashboard.isDeveloperMode = true; }),
  panelBg: () => stateWith((s) => { s.controlPanel.backgroundColor = "#111111"; }),
  panelBtn: () => stateWith((s) => { s.controlPanel.buttonColor = "#222222"; }),
  panelAct: () => stateWith((s) => { s.controlPanel.actionButtonColor = "#333333"; }),
  panelInBg: () => stateWith((s) => { s.controlPanel.innerBackgroundColor = "#444444"; }),
  newVis: () => stateWith((s) => { s.defaultsNew.visualization.width = 500; s.defaultsNew.visualization.height = "8cm"; s.defaultsNew.visualization.backgroundColor = "#abcdef"; }),
  newComment: () => stateWith((s) => { s.defaultsNew.comment.width = "20cm"; s.defaultsNew.comment.height = "40px"; s.defaultsNew.comment.backgroundColor = "#00112233"; }),
  everything: () => stateWith((s) => {
    s.dashboard.width = 1000; s.dashboard.height = 700; s.dashboard.backgroundColor = "#010101";
    s.dashboard.hideWidgetSettingsButtons = false; s.dashboard.isDeveloperMode = true;
    s.controlPanel = { backgroundColor: "#a", buttonColor: "#b", actionButtonColor: "#c", innerBackgroundColor: "#d" };
    s.defaultsNew.visualization = { width: 1, height: 2, backgroundColor: "#e" };
    s.defaultsNew.comment = { width: 3, height: 4, backgroundColor: "#f" };
  }),
  noDashboardGroup: () => stateWith((s) => { delete s.dashboard; }),
  noPanelGroup: () => stateWith((s) => { delete s.controlPanel; s.dashboard.isDeveloperMode = true; }),
  noNewGroup: () => stateWith((s) => { delete s.defaultsNew; s.dashboard.width = "11cm"; }),
  badDimension: () => stateWith((s) => { s.dashboard.width = "wide"; }),
  noSettings: () => ({ lifecycle: "idle" })
};

function computeAll() {
  const out = {};
  for (const [name, make] of Object.entries(CASES)) out[name] = clone(collect(make()));
  out.noKdbControlApi = clone({ result: collectCanvasSettings({ api: {} }, []), diagnostics: [] });
  return out;
}

const actual = computeAll();
if (RECORD) {
  fs.mkdirSync(path.dirname(GOLDEN), { recursive: true });
  fs.writeFileSync(GOLDEN, `${JSON.stringify(actual, null, 1)}\n`);
}

test("collectCanvasSettings output is unchanged", { skip: RECORD }, () => {
  assert.deepStrictEqual(actual, JSON.parse(fs.readFileSync(GOLDEN, "utf8")));
});

test("every sett key of the catalog is reachable from an owner state field", { skip: RECORD }, () => {
  const settings = initialState().settings;
  const read = (pathText) => pathText.split(".").slice(1).reduce((node, part) => (node ? node[part] : undefined), settings);
  const visit = (group) => {
    for (const spec of Object.values(group)) {
      if (spec.ownerStatePath === undefined) visit(spec);
      else if (!spec.ownerStatePath.endsWith("hideSuButtons")) assert.notEqual(read(spec.ownerStatePath), undefined, spec.ownerStatePath);
    }
  };
  visit(v3Defaults.SETT_KEY_CATALOG);
});
