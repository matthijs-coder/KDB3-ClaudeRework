// kdbControl published read surface, the single syncView entry, and the readRightFlag switch (W3).
// Run: node --test tools/tests/w3-kdbControl-selectors.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const at = (rel) => path.join(JS_ROOT, "dashboard/canvas/kdbControl", rel);
const quiet = { log() {}, info() {}, warn() {}, error() {}, debug() {} };

const published = loadAmd(at("selectors.js"));
const stateSelectors = loadAmd(at("state/selectors.js"));
const initialState = loadAmd(at("state/initialState.js"));
const domSelectors = loadAmd(at("config/domSelectors.js"));
const reducer = loadAmd(at("state/reducer.js"));

function kdbWithState() {
  let state = reducer(initialState(), { type: "kdbControl/init" });
  state = reducer(state, { type: "kdbControl/settings/setCommentDefault", payload: { field: "backgroundColor", value: "#222222" } });
  state = reducer(state, { type: "kdbControl/settings/setDashboardDimension", payload: { dimension: "width", value: "300mm" } });
  return { state: { kdbControl: state }, api: { kdbControl: { getState: () => state } } };
}

test("exports exactly the published reads", () => {
  assert.deepEqual(Object.keys(published).sort(), [
    "readCommentDefaults", "readControlPanelSettings", "readDashboardSettings", "readDefaultSettings", "readDomSelectors", "readVisualizationDefaults"
  ]);
});

test("defaults and settings equal the state selectors applied to api.kdbControl.getState()", () => {
  const _KDB = kdbWithState();
  const snapshot = _KDB.api.kdbControl.getState();
  assert.deepEqual(published.readVisualizationDefaults(_KDB), stateSelectors.readVisualizationDefaults(snapshot));
  assert.deepEqual(published.readCommentDefaults(_KDB), stateSelectors.readCommentDefaults(snapshot));
  assert.deepEqual(published.readDashboardSettings(_KDB), stateSelectors.readDashboardSettings(snapshot));
  assert.deepEqual(published.readControlPanelSettings(_KDB), stateSelectors.readControlPanelSettings(snapshot));
  assert.equal(published.readCommentDefaults(_KDB).backgroundColor, "#222222");
  assert.equal(published.readDashboardSettings(_KDB).width, "300mm");
  assert.deepEqual(published.readVisualizationDefaults(_KDB), { width: "10cm", height: "10cm", backgroundColor: "#ffffff" });
});

test("missing state gives the empty values of the state selectors, never a throw", () => {
  for (const _KDB of [undefined, null, {}, { state: {} }, { state: { kdbControl: null } }]) {
    assert.deepEqual(published.readVisualizationDefaults(_KDB), stateSelectors.readVisualizationDefaults(undefined));
    assert.deepEqual(published.readCommentDefaults(_KDB), { width: "", height: "", backgroundColor: "" });
    assert.deepEqual(published.readDashboardSettings(_KDB), stateSelectors.readDashboardSettings(undefined));
    assert.deepEqual(published.readControlPanelSettings(_KDB), stateSelectors.readControlPanelSettings(undefined));
  }
});

test("readDefaultSettings is the owner default settings, fresh on every call; readDomSelectors is the config object", () => {
  assert.deepEqual(published.readDefaultSettings(), initialState().settings);
  assert.notEqual(published.readDefaultSettings(), published.readDefaultSettings());
  assert.deepEqual(published.readDomSelectors(), domSelectors);
  assert.equal(published.readDomSelectors().mainBlocksSelector, "#kdb-control-main-blocks");
});

test("the frozen deep paths stay importable with their shapes", () => {
  assert.equal(typeof stateSelectors.readCommentDefaults, "function");
  assert.equal(typeof initialState, "function");
  assert.equal(typeof domSelectors.mainBlocksSelector, "string");
});

// ---- syncView: api.kdbControl.syncView is the one public entry ----

const registerKdbControl = loadAmd(at("index.js"), { stubs: { console: quiet } });

test("api.kdbControl.syncView runs the bound framework sync (what header and footer reach through the bind context)", () => {
  const _KDB = { api: {}, state: {}, runtime: { kdbControl: {} } };
  registerKdbControl(_KDB);
  let syncs = 0;
  _KDB.runtime.kdbControl.frameworkBindContext = { syncView: () => { syncs += 1; } };
  _KDB.api.kdbControl.syncView();
  _KDB.runtime.kdbControl.frameworkBindContext.syncView();
  assert.equal(syncs, 2);
});

test("api.kdbControl.syncView is a no-op without a bind context (before mount, after destroy) or without a runtime", () => {
  const _KDB = { api: {}, state: {}, runtime: {} };
  registerKdbControl(_KDB);
  assert.doesNotThrow(() => _KDB.api.kdbControl.syncView());
  _KDB.runtime.kdbControl = {};
  assert.doesNotThrow(() => _KDB.api.kdbControl.syncView());
  _KDB.runtime.kdbControl.frameworkBindContext = null;
  assert.doesNotThrow(() => _KDB.api.kdbControl.syncView());
});

test("destroy clears the bind context, so a later syncView does nothing", () => {
  const _KDB = { api: {}, state: { kdbControl: initialState() }, runtime: { kdbControl: { domRefs: {}, warnedMissingApis: {} } } };
  registerKdbControl(_KDB);
  let syncs = 0;
  _KDB.runtime.kdbControl.frameworkBindContext = { syncView: () => { syncs += 1; } };
  _KDB.api.kdbControl.destroy();
  _KDB.api.kdbControl.syncView();
  assert.equal(syncs, 0);
});

// ---- readRightFlag in effects.js (was isRightAllowed(readFirstRowScalar(rows))) ----

const effects = loadAmd(at("effects.js"), { stubs: { console: quiet, document: { querySelector: () => null, getElementById: () => null } } });

async function revealsDeveloperColumn(rows, extra = {}) {
  const classes = [];
  const column = { classList: { add: (name) => classes.push(name) } };
  const rootEl = { querySelector: () => column };
  const _KDB = {
    state: { kdbControl: {} },
    runtime: { kdbControl: { domRefs: { rootEl }, abortControllers: {}, subscriptions: {}, observers: {}, timers: {}, listeners: {} } },
    services: { tableData: { waitForRows: async () => rows, readRows: () => rows } },
    ...extra
  };
  effects.applyInitialEffects(_KDB);
  await new Promise((resolve) => setImmediate(resolve));
  return classes;
}

test("developer-mode column is revealed for a granted right in every row shape and only then", async () => {
  const granted = [[{ c: 1 }], [{ c: "1" }], [{ c: true }], [{ c: { use: 1 } }], [{ c: { u: "1" } }], [{ c: { d: true } }]];
  for (const rows of granted) assert.deepEqual(await revealsDeveloperColumn(rows), ["kdb-control_dashboard-toggles-column--developer-mode-visible"], JSON.stringify(rows));
  const denied = [[], [{}], [{ c: 0 }], [{ c: "0" }], [{ c: false }], [{ c: null }], [{ c: { use: 0 } }], [{ c: "yes" }], [null], "nope"];
  for (const rows of denied) assert.deepEqual(await revealsDeveloperColumn(rows), [], JSON.stringify(rows));
});
