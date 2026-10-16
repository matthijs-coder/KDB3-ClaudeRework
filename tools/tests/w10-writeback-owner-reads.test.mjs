// W10 characterisation: what the writeback GET collectors, restore effects and persist landing read from the
// tabs / singleSelect owners and the shared constants they use. The fake owner "worlds" feed BOTH read paths (raw
// `_KDB.state.*` for the former selector reads and `_KDB.api.<owner>.getState` built from the real owner selectors),
// so the same scenarios run before and after the layering change and the golden does not move.
// Record (only on the unchanged code): W10_RECORD=1 node --test tools/tests/w10-writeback-owner-reads.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const WB = path.join(JS_ROOT, "core/services/writeback");
const GOLDEN = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/w10-writeback-owner-reads.golden.json");
const RECORD = process.env.W10_RECORD === "1";
const owner = (rel) => loadAmd(path.join(JS_ROOT, "dashboard", rel));
const tabsSelectors = owner("tabs/selectors.js");
const tabsState = owner("tabs/state.js");
const singleSelectSelectors = owner("filters/singleSelect/state/selectors.js");

const silent = { log() {}, info() {}, debug() {}, warn() {}, error() {} };
const settle = () => new Promise((resolve) => setImmediate(resolve));
const json = (value) => JSON.parse(JSON.stringify(value === undefined ? null : value));

function recordingConsole() {
  const calls = [];
  return {
    calls,
    stub: {
      log() {}, info() {}, debug() {},
      warn: (...args) => calls.push(["warn", String(args[0])]),
      error: (...args) => calls.push(["error", String(args[0])])
    }
  };
}

function tab(index, extra) {
  return Object.assign({
    index, tabId: "tab" + index, pageId: "page" + index, name: "Tab " + index, role: "dashboard", visible: true, isActive: false
  }, extra || {});
}

function buildTabs(entries, extra) {
  const state = tabsState.createInitialTabsState();
  entries.forEach((entry) => { state.byIndex[String(entry.index)] = entry; });
  state.order = entries.map((entry) => entry.index);
  state.activeIndex = entries.length ? entries[0].index : null;
  return Object.assign(state, extra || {});
}

function instance(id, extra) {
  return Object.assign({
    filterInstanceId: id, scopeType: "global", scopeId: "", filterLabel: "Label " + id, itemName: "item" + id, itemId: null,
    semanticInstanceKey: "", filterType: "singleSelect", selectionOwner: "singleSelect", identityQuality: "high",
    status: "active", hostStatus: "present", timestamps: { seenAt: 1 },
    currentSelection: { displayValue: "Wert " + id, useValue: "use-" + id, displaySource: "host" }
  }, extra || {});
}

function buildSingleSelect(instances, inventory) {
  const byId = {};
  instances.forEach((entry) => { byId[entry.filterInstanceId] = entry; });
  return {
    lifecycle: "ready",
    instancesById: byId,
    inventory: Object.assign({ generation: 3, freshness: "fresh", reconcileInFlight: false, reconciledAt: 1, errorCode: null }, inventory || {}),
    lastDiagnostics: []
  };
}

// Raw state (old selector reads) and api.getState (published reads) always describe the same owner state.
function world({ tabs, singleSelect, labels, dispatch, extra } = {}) {
  const _KDB = { state: {}, api: {}, services: {}, runtime: {}, config: { labels: { de: { loading: labels || {} } } } };
  if (tabs) {
    _KDB.state.tabs = tabs;
    _KDB.api.tabs = { getState: () => tabsSelectors.readTabsState(_KDB) };
    if (dispatch) _KDB.api.tabs.dispatch = dispatch;
  }
  if (singleSelect) {
    _KDB.state.filters = { singleSelect: singleSelect };
    _KDB.api.singleSelect = { getState: () => singleSelectSelectors.readSingleSelectState(_KDB) };
  }
  return Object.assign(_KDB, extra || {});
}

const LABELS = {
  tabProgressNamedCounted: "Registerkarte {n} von {m}: {name}",
  tabProgressCounted: "Registerkarte {n} von {m}",
  tabProgressName: "{name}"
};

function errorOf(error) {
  return { name: error.name, diagnostic: json(error.diagnostic), message: error.message };
}

const scenarios = {};

scenarios.collectTabs = () => {
  const collectTabs = loadAmd(path.join(WB, "get/collectors/collectTabs.js"));
  const run = (_KDB) => {
    const diagnostics = [];
    const result = collectTabs(_KDB, diagnostics);
    return { result: json(result), diagnostics: json(diagnostics) };
  };
  const noRole = (index, extra) => { const entry = tab(index, extra); delete entry.role; return entry; };
  return {
    mixed: run(world({ tabs: buildTabs([tab(0), tab(1, { visible: false }), tab(2), tab(5, { role: "helper", visible: true })]) })),
    nameless: run(world({ tabs: buildTabs([tab(0), tab(1, { name: "" })]) })),
    roleless: run(world({ tabs: buildTabs([noRole(0), noRole(1, { visible: false }), noRole(5, { isHelper: true }), noRole(6)]) })),
    roleless_no_limits: run(world({ tabs: buildTabs([noRole(0), noRole(4), noRole(5), noRole(6, { isHelper: true })], { limits: {} }) })),
    roleless_limit_two: run(world({ tabs: buildTabs([noRole(0), noRole(1), noRole(2)], { limits: { maxUserTabs: 2 } }) })),
    empty_state: run(world({ tabs: buildTabs([]) })),
    no_tabs_owner: run(world({}))
  };
};

scenarios.collectSingleSelectInstances = () => {
  const collect = loadAmd(path.join(WB, "get/collectors/collectSingleSelectInstances.js"), { stubs: { console: silent } });
  const run = (_KDB, targets) => {
    const diagnostics = [];
    try {
      const result = collect(_KDB, diagnostics, targets);
      return { result: json(result), diagnostics: json(diagnostics) };
    } catch (error) {
      return { error: errorOf(error), diagnostics: json(diagnostics) };
    }
  };
  const tabs = () => buildTabs([tab(0), tab(1), tab(2, { visible: false })]);
  const live = { 0: { tabId: "tab0", pageId: "page0", scopeId: "SCOPE-A", visible: true }, 1: { tabId: "tab1", scopeId: "SCOPE-B", visible: true },
    2: { tabId: "tab2", scopeId: "SCOPE-C", visible: false } };
  const global = [
    instance("g1", { filterLabel: "Jahr", semanticInstanceKey: "jahr" }),
    instance("g2", { filterLabel: "", itemName: "Monat" }),
    instance("s1", { filterType: "sicht" }), instance("d1", { filterType: "dienststelle" }),
    instance("inactive", { status: "inactive" }), instance("absent", { hostStatus: "missing" }),
    instance("native", { selectionOwner: "nativeMultiSelect" }),
    instance("noUse", { filterLabel: "Leer", currentSelection: { displayValue: "Etwas", useValue: "" } }),
    instance("noUseAlle", { filterLabel: "Alle", currentSelection: { displayValue: "Alle", useValue: "" } }),
    instance("special", { filterLabel: "Dienststelle_BW" })
  ];
  const paged = [
    instance("p1", { scopeType: "pageContext", scopeId: "SCOPE-A", filterLabel: "Seite" }),
    instance("p2", { scopeType: "pageContext", scopeId: "scope-b", filterLabel: "Seite" }),
    instance("p3", { scopeType: "pageContext", scopeId: "SCOPE-C", filterLabel: "Versteckt" }),
    instance("p4", { scopeType: "pageContext", scopeId: "NOPE", filterLabel: "Fremd" }),
    instance("p5", { scopeType: "pageContext", scopeId: "tab1", filterLabel: "Alias" })
  ];
  const twin = [
    instance("t1", { scopeType: "pageContext", scopeId: "DUP", filterLabel: "Zwilling" })
  ];
  const liveDup = { 0: { scopeId: "DUP", visible: true }, 1: { scopeId: "DUP", visible: true } };
  return {
    globals: run(world({ tabs: tabs(), singleSelect: buildSingleSelect(global) }), live),
    pageContext: run(world({ tabs: tabs(), singleSelect: buildSingleSelect(paged) }), live),
    pageContext_no_targets: run(world({ tabs: tabs(), singleSelect: buildSingleSelect(paged) }), null),
    ambiguous_live_scope: run(world({ tabs: tabs(), singleSelect: buildSingleSelect(twin) }), liveDup),
    same_key_twins: run(world({ tabs: tabs(), singleSelect: buildSingleSelect([
      instance("a", { filterLabel: "Gleich" }), instance("b", { filterLabel: "Gleich" })]) }), live),
    stale_inventory: run(world({ tabs: tabs(), singleSelect: buildSingleSelect(global, { freshness: "stale", generation: 9 }) }), live),
    inventory_without_freshness: run(world({ tabs: tabs(), singleSelect: Object.assign(buildSingleSelect(global), { inventory: {} }) }), live),
    no_singleSelect_owner: run(world({ tabs: tabs() }), live),
    no_tabs_owner_page_context: run(world({ singleSelect: buildSingleSelect(paged) }), live)
  };
};

scenarios.collectWidgetsTraverse = () => {
  const collectWidgets = loadAmd(path.join(WB, "get/collectors/collectWidgets.js"), { stubs: { console: silent } });
  const run = async (_KDB) => {
    const diagnostics = [];
    const result = await collectWidgets(_KDB, diagnostics);
    return { result: json(result), diagnostics: json(diagnostics) };
  };
  const dispatched = [];
  const traversing = (answer) => async (action) => { dispatched.push(json(action)); return answer; };
  const untraversed = () => buildTabs([tab(0), tab(1)], { traversal: { traversedIndexes: [0] } });
  const done = () => buildTabs([tab(0), tab(1)], { traversal: { traversedIndexes: [0, 1] } });
  return (async () => {
    const out = {};
    out.barrier_ok = await run(world({ tabs: untraversed(), dispatch: traversing(true) }));
    out.barrier_not_ok = await run(world({ tabs: untraversed(), dispatch: traversing(false) }));
    out.barrier_throws = await run(world({ tabs: untraversed(), dispatch: async () => { throw new Error("boom"); } }));
    out.no_dispatch = await run(world({ tabs: untraversed() }));
    out.already_traversed = await run(world({ tabs: done(), dispatch: traversing(true) }));
    out.no_tabs_owner = await run(world({}));
    out.dispatched = dispatched;
    return out;
  })();
};

scenarios.filterRestoreGeneration = () => {
  const gen = loadAmd(path.join(WB, "set/effects/filters/filterRestoreGeneration.js"));
  const makeRun = (phase) => {
    const diagnostics = [];
    return {
      diagnostics,
      dispatchOwnerPhase: async (spec) => { diagnostics.push(["phase", spec.phaseName, spec.type]); return phase; },
      addDiagnostic: (...args) => diagnostics.push(["diag", ...json(args)])
    };
  };
  const attempt = async (fn, run) => {
    try { return { value: await fn(), diagnostics: json(run.diagnostics) }; } catch (error) {
      return { threw: error && error.writebackSetAbort === true ? "ABORT" : String(error), diagnostics: json(run.diagnostics) };
    }
  };
  return (async () => {
    const out = {};
    const withInventory = (inventory) => world({ singleSelect: buildSingleSelect([], inventory) });
    let run = makeRun({ result: { generation: 7 } });
    out.reconcile_from_result = await attempt(() => gen.reconcileSingleSelectInventory(withInventory({ generation: 3 }), run), run);
    run = makeRun({ result: {} });
    out.reconcile_from_owner = await attempt(() => gen.reconcileSingleSelectInventory(withInventory({ generation: 5 }), run), run);
    run = makeRun({ result: {} });
    out.reconcile_owner_generation_zero = await attempt(() => gen.reconcileSingleSelectInventory(withInventory({ generation: 0 }), run), run);
    run = makeRun(null);
    out.reconcile_no_inventory = await attempt(() => gen.reconcileSingleSelectInventory(world({ singleSelect: { lifecycle: "ready" } }), run), run);
    run = makeRun({ result: {} });
    out.reconcile_no_owner = await attempt(() => gen.reconcileSingleSelectInventory(world({}), run), run);
    const stable = (_KDB, expected) => { const r = makeRun(null); return attempt(() => gen.assertStableGeneration(_KDB, r, expected, "p"), r); };
    out.stable_ok = await stable(withInventory({ generation: 4 }), 4);
    out.stable_changed = await stable(withInventory({ generation: 5 }), 4);
    out.stable_not_fresh = await stable(withInventory({ generation: 4, freshness: "stale" }), 4);
    out.stable_no_owner = await stable(world({}), 4);
    out.stable_no_generation = await stable(world({ singleSelect: buildSingleSelect([], { generation: "x" }) }), 4);
    return out;
  })();
};

scenarios.publishRestoreTabCaption = () => {
  const rec = recordingConsole();
  const publish = loadAmd(path.join(WB, "set/effects/publishRestoreTabCaption.js"), { stubs: { console: rec.stub } });
  const RUN = { loadingStarted: true, loadingHandle: { mountKey: "m" } };
  const out = {};
  const attempt = (name, tabs, request, labels) => {
    const updates = [];
    rec.calls.length = 0;
    const _KDB = world({ tabs: tabs, labels: labels === undefined ? LABELS : labels });
    _KDB.services.loading = { updateLoadingMessage: (arg) => { updates.push(json(arg)); return true; } };
    publish(_KDB, RUN, request);
    out[name] = { updates: updates, logs: json(rec.calls) };
  };
  const three = () => buildTabs([tab(0, { name: "Alpha" }), tab(1, { name: "" }), tab(2, { name: "Gamma" })]);
  attempt("named_counted", three(), { tabIdx: 0 });
  attempt("unnamed_counted", three(), { tabIdx: 1 });
  attempt("landing_first_visible", three(), { landing: true });
  attempt("hidden_tabs_not_counted", buildTabs([tab(0, { name: "A" }), tab(1, { name: "B", visible: false }), tab(2, { name: "C" })]), { tabIdx: 2 });
  attempt("index_missed", three(), { tabIdx: 9 });
  attempt("role_missing", buildTabs([(() => { const entry = tab(0); delete entry.role; return entry; })()]), { tabIdx: 0 });
  attempt("no_visible_landing", buildTabs([tab(0, { visible: false })]), { landing: true });
  attempt("no_request_index", three(), {});
  attempt("missing_label", three(), { tabIdx: 0 }, {});
  attempt("no_tabs_owner", null, { tabIdx: 0 });
  attempt("no_tabs_owner_landing", null, { landing: true });
  return out;
};

scenarios.persistLanding = () => {
  const rec = recordingConsole();
  const page = { id: "page0" };
  const host = { parentNode: page };
  const document = { getElementById: () => page, querySelector: () => host };
  const landing = loadAmd(path.join(WB, "get/persist/persistLanding.js"), { stubs: { console: rec.stub, document } });
  const overlay = loadAmd(path.join(WB, "get/persist/persistLoadingOverlay.js"), { stubs: { console: rec.stub, document } });
  return (async () => {
    const subscribed = [];
    const dispatched = [];
    const events = { subscribe: (name) => { subscribed.push(name); return () => {}; } };
    const entries = [tab(0, { pageId: "page0" }), tab(1, { pageId: "page1" })];
    const tabs = buildTabs(entries, { activeIndex: 1 });
    const _KDB = world({ tabs: tabs, dispatch: async (action) => { dispatched.push(json(action)); return { ok: true }; }, extra: { events: events,
      elements: { selectors: { root: { kdbWidget: ".w" } } } } });
    const pending = landing.applyWritebackGetPersistLanding(_KDB);
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 20));
    landing.cancelWritebackGetPersistLanding(_KDB);
    await pending;
    const afterLanding = { subscribed: subscribed.slice(), dispatched: dispatched.slice() };
    overlay.armCancelWatch(_KDB);
    return { landing: afterLanding, overlay: { subscribed: subscribed.slice(afterLanding.subscribed.length) } };
  })();
};

async function runAll() {
  const out = {};
  for (const name of Object.keys(scenarios)) out[name] = json(await scenarios[name]());
  return out;
}

test("writeback owner reads: collectors, effects and persist landing match the recorded old behaviour", async () => {
  const actual = await runAll();
  if (RECORD) {
    fs.writeFileSync(GOLDEN, JSON.stringify(actual, null, 2) + "\n");
    return;
  }
  const expected = JSON.parse(fs.readFileSync(GOLDEN, "utf8"));
  assert.deepStrictEqual(Object.keys(actual), Object.keys(expected));
  for (const name of Object.keys(expected)) assert.deepStrictEqual(actual[name], expected[name], name);
});
