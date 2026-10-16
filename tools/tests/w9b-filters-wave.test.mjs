// W9b: how the filters start the TopN wave (singleSelect commit and replay, nativeMultiSelect confirm and replay).
// The assertions describe the call contract only: payload, position in the commit flow, never awaited, failures
// logged and swallowed, skip guards. They hold for both delivery mechanisms: the direct widgetVis wave import
// (recorded first, shim still present) and the `filters:confirmed` event handled by widgetVis.
// Run: node --test tools/tests/w9b-filters-wave.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const SS = path.join(JS_ROOT, "dashboard/filters/singleSelect");
const NMS = path.join(JS_ROOT, "dashboard/filters/nativeMultiSelect");
const WAVE_SHIM = path.join(JS_ROOT, "dashboard/widgets/widgetVis/actions/runTopNFilterConfirmWave.js");
const DIRECT_IMPORT = fs.existsSync(WAVE_SHIM);
const JAHR_COL = "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]";

const clone = (value) => JSON.parse(JSON.stringify(value));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function consoleSpy() {
  const errors = [];
  return { errors, console: { log() {}, info() {}, debug() {}, warn() {}, error: (...a) => errors.push(a) } };
}

function createBus() {
  const createEventBus = loadAmd(path.join(JS_ROOT, "core/events/createEventBus.js"));
  return createEventBus();
}

// One fake wave per test. `behaviour` decides what the wave does: "ok", "hang", "reject", "throw".
function createWave(trace, behaviour) {
  const wave = {
    calls: [],
    run(_KDB, payload) {
      wave.calls.push(clone(payload));
      trace.push("wave");
      if (behaviour === "throw") { throw new Error("wave exploded"); }
      if (behaviour === "reject") { return Promise.reject(new Error("wave rejected")); }
      if (behaviour === "hang") { return new Promise(() => {}); }
      return Promise.resolve({ ok: true });
    }
  };
  return wave;
}

// Direct import: the filter modules get the fake through their own specifier. Event: widgetVis' real subscriber
// maps the event and calls the fake wave.
function wireWave(KDB, wave, spy) {
  const modules = {};
  if (DIRECT_IMPORT) {
    modules["../../../widgets/widgetVis/actions/runTopNFilterConfirmWave.js"] = wave.run;
    modules["../../widgets/widgetVis/actions/runTopNFilterConfirmWave.js"] = wave.run;
    return modules;
  }
  KDB.events = createBus();
  const filtersConfirmed = loadAmd(path.join(JS_ROOT, "dashboard/widgets/widgetVis/topN/filtersConfirmed.js"), {
    stubs: { console: spy.console },
    overrides: { "dashboard/widgets/widgetVis/topN/wave.js": { runTopNFilterConfirmWave: wave.run } }
  });
  filtersConfirmed.subscribe(KDB);
  return modules;
}

function waveFailureLogged(spy) {
  return spy.errors.some((args) => /topN wave failed/.test(String(args[0])));
}

async function settlesWithin(promise, ms) {
  let timer;
  const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve("timeout"), ms); });
  const winner = await Promise.race([promise, timeout]);
  clearTimeout(timer);
  return winner;
}

// ---------- singleSelect commit ----------

function loadSsCommit(KDB, trace, wave, spy) {
  const modules = Object.assign(wireWave(KDB, wave, spy), {
    "../hostFilterIo.js": {
      resolveFilterRef: () => ({ itemId: "i" }),
      isWriteReady: () => true,
      readValues: () => [],
      writeValues: async () => true,
      verifySelection: () => ({ ok: true, observed: { d: "A", u: "uA" } }),
      restorePreviousSelection: async () => true
    },
    "../history.js": { pushCommittedSelectionStep: () => trace.push("history") },
    "../runtime.js": { readFiltersFacet: () => ({}), isStaleInteraction: () => false, inFlight: { begin() {}, end() {} } },
    "../dockHandoff/popup.js": { setCommitUiState() {}, requestClosePopup: () => trace.push("close") },
    "../state/instance.js": { lookupLiveFilterState: (_KDB, _handoff, state) => state },
    "../state/selection.js": {
      getPendingDisplayValue: () => "A",
      normalizeConfirmedSelection: (selection) => selection || {},
      applyConfirmedState: () => trace.push("apply")
    },
    "./ownerNotify.js": { notifyOwnerCommit: async () => { trace.push("notify"); return { ok: true }; } },
    "./tableValues.js": { resolveFilterValueFromTable: async () => ({ ok: true, selectedValue: { d: "A", u: "uA" } }) }
  });
  return loadAmd(path.join(SS, "commit/commitSelection.js"), { stubs: { console: spy.console }, modules });
}

async function runSsCommit(handoff, behaviour) {
  const trace = [];
  const spy = consoleSpy();
  const wave = createWave(trace, behaviour || "ok");
  const KDB = { state: { filters: { singleSelect: {} } } };
  const commit = loadSsCommit(KDB, trace, wave, spy);
  const filterState = { pendingSelection: { displayValue: "A" }, backupSelection: {} };
  const handoffContext = Object.assign({ filterInstanceId: "i1", filterType: "singleSelect", filterScope: "global", filterLabel: "Land" }, handoff);
  const result = await settlesWithin(commit.commitConfirmedSelection(KDB, {}, handoffContext, filterState, {}), 500);
  await tick();
  return { result, trace, wave, spy, root: KDB.state.filters.singleSelect };
}

test("singleSelect commit: wave starts after owner notify, state apply and history push; payload", async () => {
  const run = await runSsCommit({ filterScope: "global", tabId: "t1" });
  assert.equal(run.result, true);
  assert.deepEqual(run.trace, ["notify", "apply", "history", "wave", "close"]);
  assert.deepEqual(run.wave.calls, [{ scopeType: "global", tabId: "t1", isJahr: false, filterType: "singleSelect" }]);
});

test("singleSelect commit: pageContext payload; tabId falls back to null", async () => {
  const page = await runSsCommit({ filterScope: "pageContext", tabId: "t2" });
  assert.deepEqual(page.wave.calls, [{ scopeType: "pageContext", tabId: "t2", isJahr: false, filterType: "singleSelect" }]);
  const global = await runSsCommit({ filterScope: "global" });
  assert.deepEqual(global.wave.calls, [{ scopeType: "global", tabId: null, isJahr: false, filterType: "singleSelect" }]);
});

test("singleSelect commit: sicht commits and tab-less page commits start no wave", async () => {
  const sicht = await runSsCommit({ filterType: "sicht", filterScope: "global" });
  assert.equal(sicht.result, true);
  assert.deepEqual(sicht.wave.calls, []);
  const tabless = await runSsCommit({ filterScope: "pageContext" });
  assert.equal(tabless.result, true);
  assert.deepEqual(tabless.wave.calls, []);
});

test("singleSelect commit: the wave is not awaited; a rejecting or throwing wave is logged and the commit still succeeds", async () => {
  const hang = await runSsCommit({ tabId: "t1" }, "hang");
  assert.equal(hang.result, true);
  const reject = await runSsCommit({ tabId: "t1" }, "reject");
  assert.equal(reject.result, true);
  assert.equal(waveFailureLogged(reject.spy), true);
  assert.equal(reject.root.errorCode, null);
  const thrown = await runSsCommit({ tabId: "t1" }, "throw");
  assert.equal(thrown.result, true);
  assert.equal(waveFailureLogged(thrown.spy), true);
  assert.equal(thrown.root.errorCode, null);
});

// ---------- singleSelect history replay ----------

function loadSsReplay(KDB, trace, wave, spy) {
  const record = { filterInstanceId: "i1", scopeType: "global", scopeId: "", filterLabel: "Jahr", itemId: JAHR_COL };
  const modules = Object.assign(wireWave(KDB, wave, spy), {
    "./history.js": {
      normalizeStepValue: (value) => value,
      sameInstance: () => true,
      recordHistoryReplayDiagnostic() {}
    },
    "./hostFilterIo.js": {
      isWriteReady: () => true,
      resolveFilterRef: () => ({ itemId: "i" }),
      readValues: () => [],
      writeInstanceSelection: async () => ({ ok: true }),
      restorePreviousSelection: async () => true
    },
    "./runtime.js": { readFiltersFacet: () => ({}) },
    "./state/selection.js": {
      normalizeConfirmedSelection: (selection) => selection || {},
      applyConfirmedState: () => trace.push("apply"),
      revertFilterState() {}
    },
    "./state/selectors.js": { readFilterInstance: () => record.live, readFilterInstances: () => [record.live] },
    "./commit/ownerNotify.js": { ownerActions: { specialCommitted: "x" }, isNegativeAck: () => false }
  });
  record.live = Object.assign({ selectionOwner: "singleSelect", status: "active", hostStatus: "present" }, record);
  return { handler: loadAmd(path.join(SS, "historyReplay.js"), { stubs: { console: spy.console }, modules }), record: record };
}

async function runSsReplay(recordOverrides, behaviour) {
  const trace = [];
  const spy = consoleSpy();
  const wave = createWave(trace, behaviour || "ok");
  const KDB = {
    state: { filters: { singleSelect: { inventory: { freshness: "fresh" }, instancesById: { i1: { selectionOwner: "singleSelect", currentSelection: {} } } } } },
    runtime: { singleSelect: {} }
  };
  const loaded = loadSsReplay(KDB, trace, wave, spy);
  Object.assign(loaded.record.live, recordOverrides || {});
  const step = { key: "filter_singleSelect", new: {}, old: {} };
  const targetValue = Object.assign({ filterInstanceId: "i1", scopeType: "global", filterLabel: "Jahr", itemId: JAHR_COL, displayValue: "2024", useValue: "u2024", displaySource: "cognos" }, recordOverrides && recordOverrides.target);
  const result = await settlesWithin(loaded.handler.applyHistoryReplay(KDB, { targetValue: targetValue, step: step, direction: "undo" }), 500);
  await tick();
  return { result, trace, wave, spy };
}

test("singleSelect replay: wave starts after the apply with the Jahr flag of the replayed column", async () => {
  const jahr = await runSsReplay({});
  assert.equal(jahr.result, true);
  assert.deepEqual(jahr.trace, ["apply", "wave"]);
  assert.deepEqual(jahr.wave.calls, [{ scopeType: "global", scopeId: "", isJahr: true, filterType: "singleSelect" }]);
  const other = await runSsReplay({ itemId: "[TM1].[Dim].[Land]", target: { itemId: "[TM1].[Dim].[Land]" } });
  assert.deepEqual(other.wave.calls, [{ scopeType: "global", scopeId: "", isJahr: false, filterType: "singleSelect" }]);
});

test("singleSelect replay: page replay without scopeId starts no wave; a failing wave never fails the replay", async () => {
  const noScope = await runSsReplay({ scopeType: "pageContext", target: { scopeType: "pageContext" } });
  assert.equal(noScope.result, true);
  assert.deepEqual(noScope.wave.calls, []);
  const page = await runSsReplay({ scopeType: "pageContext", scopeId: "p1", target: { scopeType: "pageContext", scopeId: "p1" } });
  assert.deepEqual(page.wave.calls, [{ scopeType: "pageContext", scopeId: "p1", isJahr: true, filterType: "singleSelect" }]);
  const hang = await runSsReplay({}, "hang");
  assert.equal(hang.result, true);
  const reject = await runSsReplay({}, "reject");
  assert.equal(reject.result, true);
  assert.equal(waveFailureLogged(reject.spy), true);
  const thrown = await runSsReplay({}, "throw");
  assert.equal(thrown.result, true);
  assert.equal(waveFailureLogged(thrown.spy), true);
});

// ---------- nativeMultiSelect ----------

const norm = (id) => String(id || "").replace(/_tabpanel$/, "");
const NMS_JAHR_ID = "[TM1].[Dim].[Jahr]";
const LAND_ID = "[TM1].[Dim].[Land]";
const pair = (d, u) => ({ d, u: u === undefined ? "u_" + d : u });

function nmsItem(itemId, itemName, rawScopeId, values) {
  return { itemId, itemName, sourceId: "src_" + itemName, scopeType: norm(rawScopeId) === "global" ? "global" : "pageContext", scopeId: norm(rawScopeId), rawScopeId, values: values || [] };
}

function nmsFacet(items) {
  return {
    items,
    listFilterItems(query) {
      const q = query || {};
      const data = q.allPageContextScopes ? items.filter((i) => norm(i.rawScopeId) !== "global") : items.filter((i) => norm(i.rawScopeId) === norm(q.scopeId));
      return { ok: true, outcome: "ok", data: clone(data) };
    },
    findFilterItem(query) {
      const found = items.find((i) => i.itemId === query.itemId && norm(i.rawScopeId) === norm(query.scopeId));
      return found ? { ok: true, data: clone(found) } : { ok: false };
    },
    async writeFilter(request) {
      const target = items.find((i) => i.itemId === request.ref.itemId && norm(i.rawScopeId) === norm(request.ref.rawScopeId));
      if (target) { target.values = clone(request.values); }
      return { ok: true };
    }
  };
}

function bootNms(behaviour) {
  const trace = [];
  const spy = consoleSpy();
  const wave = createWave(trace, behaviour || "ok");
  const items = [
    nmsItem(NMS_JAHR_ID, "Jahr", "global", [pair("2023", "[Jahr].[2023]")]),
    nmsItem(LAND_ID, "Land", "global", []),
    nmsItem(LAND_ID, "Land", "page1_tabpanel", [pair("DE")])
  ];
  const instances = {
    f2: { scopeType: "global", itemName: "Jahr", itemId: NMS_JAHR_ID, isNative: true },
    f4: { scopeType: "pageContext", itemName: "Land", itemId: LAND_ID, isNative: true }
  };
  const KDB = {
    state: { filters: {} },
    properties: { kennzahlenTablesPropObj: { Personal_KDB: {} }, filterPropObj: { Personal_KDB: { filterInstances: instances } } },
    services: {
      cognosHost: { filters: nmsFacet(items), tabs: { listTabs: () => ({ ok: true, data: [] }) } },
      history: { pushCommittedStep: () => { trace.push("history"); return true; } }
    },
    api: { tabs: { dispatch: async () => ({ ok: true, tabTargets: { 0: { tabId: "t1", scopeId: "page1_tabpanel" } } }) } },
    runtime: {}
  };
  const modules = wireWave(KDB, wave, spy);
  const register = loadAmd(path.join(NMS, "__orchestratorNativeMultiSelect.js"), { stubs: { console: spy.console }, modules });
  const api = register(KDB, {});
  return { api, trace, wave, spy };
}

const confirm = (b, payload) => b.api.dispatch({
  type: "nativeMultiSelect/filterDockStateChanged",
  payload: Object.assign({ interactionType: "confirm", confirmedLabels: ["2023", "2024"] }, payload)
});

test("nativeMultiSelect confirm: wave starts before the history push; payload per scope and column", async () => {
  const b = bootNms();
  await confirm(b, { filterLabel: "Jahr", scopeType: "global", itemIdHint: JAHR_COL, tabId: "t1" });
  assert.deepEqual(b.trace, ["wave", "history"]);
  assert.deepEqual(b.wave.calls, [{ scopeType: "global", tabId: null, scopeId: null, isJahr: true, selectedYearKnown: true, selectedYear: 2024, filterType: "nativeMultiSelect" }]);
  b.wave.calls.length = 0;
  await confirm(b, { filterLabel: "Land", scopeId: "page1_tabpanel", filterConfig: { itemId: LAND_ID }, tabId: "t1" });
  assert.deepEqual(b.wave.calls, [{ scopeType: "pageContext", tabId: "t1", scopeId: "page1_tabpanel", isJahr: false, selectedYearKnown: false, selectedYear: null, filterType: "nativeMultiSelect" }]);
});

test("nativeMultiSelect confirm: the wave is not awaited; failures are logged and the confirm still writes history", async () => {
  const hang = bootNms("hang");
  await settlesWithin(confirm(hang, { filterLabel: "Land", scopeType: "global", itemIdHint: LAND_ID, tabId: "t1" }), 500);
  assert.deepEqual(hang.trace, ["wave", "history"]);
  const reject = bootNms("reject");
  await confirm(reject, { filterLabel: "Land", scopeType: "global", itemIdHint: LAND_ID, tabId: "t1" });
  await tick();
  assert.deepEqual(reject.trace, ["wave", "history"]);
  assert.equal(waveFailureLogged(reject.spy), true);
  const thrown = bootNms("throw");
  await confirm(thrown, { filterLabel: "Land", scopeType: "global", itemIdHint: LAND_ID, tabId: "t1" });
  assert.deepEqual(thrown.trace, ["wave", "history"]);
  assert.equal(waveFailureLogged(thrown.spy), true);
});

test("nativeMultiSelect confirm: skipHistory starts no wave", async () => {
  const b = bootNms();
  await confirm(b, { filterLabel: "Land", scopeType: "global", itemIdHint: LAND_ID, skipHistory: true });
  assert.deepEqual(b.wave.calls, []);
  assert.deepEqual(b.trace, []);
});

test("nativeMultiSelect replay: wave starts after the scope write with the replayed values; no history push", async () => {
  const b = bootNms();
  const replay = (targetValue) => b.api.dispatch({
    type: "nativeMultiSelect/historyReplayRequested",
    payload: { targetValue, isHistoryReplay: true, skipHistory: true }
  });
  await replay({ itemName: "Jahr", scopeKey: "global", values: [pair("2021", "[J].[2021]"), pair("2019", "[J].[2019]")] });
  assert.deepEqual(b.trace, ["wave"]);
  assert.equal(b.wave.calls.length, 1);
  assert.equal(b.wave.calls[0].filterType, "nativeMultiSelect");
  assert.equal(b.wave.calls[0].scopeType, "global");
  assert.equal(b.wave.calls[0].selectedYearKnown, b.wave.calls[0].isJahr);
  assert.equal(b.wave.calls[0].selectedYear, b.wave.calls[0].isJahr ? 2021 : null);
});
