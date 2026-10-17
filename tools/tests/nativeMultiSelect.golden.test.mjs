// Golden tests for dashboard/filters/nativeMultiSelect (WS-H Task A).
// Run: node --test tools/tests/nativeMultiSelect.golden.test.mjs   (Node >= 22, no dependencies)
// Expected values were captured from the pre-restructure modules on main. The controller-level tests go
// through the frozen entry path (__orchestratorNativeMultiSelect.js) and survive the restructure unchanged;
// the unit-level tests load the pure functions from the module files listed in UNITS.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const NMS = path.join(JS_ROOT, "dashboard/filters/nativeMultiSelect");
const nmsFile = (rel) => path.join(NMS, rel);

function createConsoleSpy() {
  const spy = { warn: [], error: [], info: [], log: [] };
  return {
    spy,
    console: {
      warn: (...a) => spy.warn.push(a),
      error: (...a) => spy.error.push(a),
      info: (...a) => spy.info.push(a),
      log: (...a) => spy.log.push(a)
    }
  };
}

// ---------- unit loaders (old layout) ----------
const quiet = createConsoleSpy();
const unit = (rel, stubs) => loadAmd(nmsFile(rel), { stubs: stubs || { console: quiet.console } });
const UNITS = {
  mapConfirmedValues: () => unit("commit.js").mapConfirmedValues,
  prepareConfirmWrite: () => unit("commit.js").prepareConfirmWrite,
  mergeReplayItem: () => unit("history.js").mergeReplayItem,
  isUnownedFilterDescriptor: () => unit("inventory.js").isUnownedFilterDescriptor,
  readClaimDefinition: () => unit("inventory.js").readClaimDefinition,
  listUnownedItems: () => unit("inventory.js").listUnownedItems,
  createReducer: () => unit("state.js").createReducer,
  actions: () => unit("config.js").actions,
  buildCommittedStep: () => unit("commit.js").buildCommittedStep
};

// ---------- fixtures ----------
const norm = (s) => String(s || "").replace(/_tabpanel$/, "");
const clone = (v) => JSON.parse(JSON.stringify(v));

function item(itemId, itemName, rawScopeId, values) {
  return {
    itemId,
    itemName,
    sourceId: "src_" + itemName,
    scopeType: norm(rawScopeId) === "global" ? "global" : "pageContext",
    scopeId: norm(rawScopeId),
    rawScopeId,
    values: values || []
  };
}

const JAHR_ID = "[TM1].[Dim].[Jahr]";
const LAND_ID = "[TM1].[Dim].[Land]";
const v = (d, u) => ({ d, u: u === undefined ? "u_" + d : u });

function makeFacet(items, opts) {
  const options = opts || {};
  const facet = {
    items,
    writes: [],
    failWrites: !!options.failWrites,
    throwWrites: !!options.throwWrites,
    listFilterItems(query) {
      const q = query || {};
      let data;
      if (q.allPageContextScopes) {
        data = facet.items.filter((i) => norm(i.rawScopeId) !== "global");
      } else {
        data = facet.items.filter((i) => norm(i.rawScopeId) === norm(q.scopeId));
      }
      return { ok: true, outcome: "ok", data: clone(data) };
    },
    findFilterItem(query) {
      const q = query || {};
      const found = facet.items.find((i) => i.itemId === q.itemId && norm(i.rawScopeId) === norm(q.scopeId));
      return found ? { ok: true, data: clone(found) } : { ok: false };
    },
    async writeFilter(request) {
      const ref = request.ref;
      facet.writes.push({ itemId: ref.itemId, itemName: ref.itemName, scopeId: ref.rawScopeId, values: clone(request.values) });
      if (facet.throwWrites) { throw new Error("host write crashed"); }
      if (facet.failWrites) { return { ok: false, errorCode: "HOST_FAIL" }; }
      const target = facet.items.find((i) => i.itemId === ref.itemId && norm(i.rawScopeId) === norm(ref.rawScopeId));
      if (target) { target.values = clone(request.values); }
      return { ok: true };
    }
  };
  return facet;
}

function makeHistory() {
  const history = {
    steps: [],
    pushCommittedStep(step) {
      if (JSON.stringify(step.old) === JSON.stringify(step.new)) { return false; }
      history.steps.push(clone(step));
      return true;
    }
  };
  return history;
}

function defaultItems() {
  return [
    item(JAHR_ID, "Jahr", "global", [v("2023", "[Jahr].[2023]")]),
    item(LAND_ID, "Land", "global", []),
    item("[TM1].[Dim].[Geschlecht]", "Geschlecht", "global", []),
    item(JAHR_ID, "Jahr", "page1_tabpanel", [v("2020")]),
    item(LAND_ID, "Land", "page1_tabpanel", [v("DE"), v("AT")]),
    item(JAHR_ID, "Jahr", "page2_tabpanel", []),
    item(LAND_ID, "Land", "page2_tabpanel", [v("CH")])
  ];
}

function filterInstances() {
  return {
    f1: { scopeType: "global", itemName: "Geschlecht", itemId: "[TM1].[Dim].[Geschlecht]", isSingleSelect: true },
    f2: { scopeType: "global", itemName: "Jahr", itemId: JAHR_ID, isNative: true },
    f3: { scopeType: "pageContext", itemName: "Jahr", itemId: JAHR_ID, isNative: true },
    f4: { scopeType: "pageContext", itemName: "Land", itemId: LAND_ID, isNative: true }
  };
}

function boot(opts) {
  const options = opts || {};
  const { spy, console: testConsole } = createConsoleSpy();
  const facet = options.facet || makeFacet(options.items || defaultItems(), options.facetOptions);
  const history = makeHistory();
  const tabsDispatches = [];
  const tabsFacet = {
    listTabs: () => ({ ok: true, data: options.layoutTabs || [] })
  };
  const KDB = {
    state: { filters: {} },
    properties: {
      kennzahlenTablesPropObj: { Personal_KDB: {} },
      filterPropObj: { Personal_KDB: { filterInstances: options.filterInstances || filterInstances() } }
    },
    services: { cognosHost: { filters: facet, tabs: tabsFacet }, history },
    events: options.events,
    api: {
      tabs: {
        dispatch(action) {
          tabsDispatches.push(action);
          return Promise.resolve(options.tabsResult || { ok: true, tabTargets: { 0: { tabId: "t1", scopeId: "page1_tabpanel" } } });
        }
      }
    },
    runtime: {}
  };
  const register = loadAmd(path.join(options.nmsDir || NMS, "index.js"), {
    stubs: { console: testConsole },
    modules: options.modules || {}
  });
  const api = register(KDB, {});
  return { KDB, api, facet, history, spy, tabsDispatches, tabsFacet, rt: () => KDB.runtime.nativeMultiSelect };
}

const A = {
  confirm: "nativeMultiSelect/filterDockStateChanged",
  replay: "nativeMultiSelect/historyReplayRequested",
  clear: "nativeMultiSelect/parameterSetClearRequested",
  restore: "nativeMultiSelect/parameterSetRestoreRequested",
  collect: "nativeMultiSelect/collectWritebackSnapshotRequested",
  prepare: "nativeMultiSelect/prepareTabMutation",
  apply: "nativeMultiSelect/applyTabMutation",
  restoreSnapshot: "nativeMultiSelect/restoreTabMutationSnapshot",
  resync: "nativeMultiSelect/resyncTabMutationHost",
  scopeWrite: "nativeMultiSelect/tabMutationScopeWrite"
};

const stateOf = (b) => clone(b.KDB.state.filters.nativeMultiSelect);
const plain = (value) => clone(value);

// ---------- pure units ----------
test("units: action type strings are frozen", () => {
  assert.deepEqual(UNITS.actions(), {
    MOUNT_READY: "nativeMultiSelect/mountReady",
    PREPARE_TAB_MUTATION: "nativeMultiSelect/prepareTabMutation",
    APPLY_TAB_MUTATION: "nativeMultiSelect/applyTabMutation",
    RESTORE_TAB_MUTATION_SNAPSHOT: "nativeMultiSelect/restoreTabMutationSnapshot",
    RESYNC_TAB_MUTATION_HOST: "nativeMultiSelect/resyncTabMutationHost",
    TAB_MUTATION_SCOPE_WRITE: "nativeMultiSelect/tabMutationScopeWrite",
    PARAMETER_SET_CLEAR_REQUESTED: "nativeMultiSelect/parameterSetClearRequested",
    PARAMETER_SET_RESTORE_REQUESTED: "nativeMultiSelect/parameterSetRestoreRequested",
    COLLECT_WRITEBACK_SNAPSHOT_REQUESTED: "nativeMultiSelect/collectWritebackSnapshotRequested",
    FILTER_DOCK_STATE_CHANGED: "nativeMultiSelect/filterDockStateChanged",
    HISTORY_REPLAY_REQUESTED: "nativeMultiSelect/historyReplayRequested",
    ERROR: "nativeMultiSelect/error",
    DESTROY: "nativeMultiSelect/destroy"
  });
});

test("units: mapConfirmedValues resolves known use values, builds TM1 use values, drops unmappable labels", () => {
  const map = UNITS.mapConfirmedValues();
  const known = [v("2023", "[Jahr].[2023]"), { d: "", u: "x" }, { d: "2022", u: "" }];
  assert.deepEqual(map(["2023", " 2024 ", "", null], known, JAHR_ID), [
    { d: "2023", u: "[Jahr].[2023]" },
    { d: "2024", u: "[TM1].[Dim].[Jahr]->:[TMR].[Dim].[Jahr].[2024]" }
  ]);
  assert.deepEqual(map(["a->[b]"], [], JAHR_ID), [{ d: "a->[b]", u: "a->[b]" }]);
  assert.deepEqual(map(["x"], [], "[only].[two]"), []);
  assert.deepEqual(map(["x"], [], ""), []);
  assert.deepEqual(map(undefined, undefined, JAHR_ID), []);
});

test("units: prepareConfirmWrite merges the confirmed item into stored items and live items", () => {
  const prepare = UNITS.prepareConfirmWrite();
  const KDB = { state: { filters: { nativeMultiSelect: { byScope: {
    page1: [
      { itemId: JAHR_ID, itemName: "Jahr", sourceId: "s", values: [v("2020"), v("2021")] },
      { itemId: LAND_ID, itemName: "Land", sourceId: "s2", values: [v("DE")] }
    ]
  } } } } };
  const liveItems = [
    { itemId: JAHR_ID, itemName: "Jahr", sourceId: "s", values: [v("2020"), v("2021"), v("2022")] },
    { itemId: LAND_ID, itemName: "Land", sourceId: "s2", values: [v("DE")] }
  ];
  const payload = { confirmedLabels: ["2021", "2022", "2025"], itemIdHint: JAHR_ID };
  const result = prepare(KDB, payload, liveItems, liveItems[0], "Jahr", "page1");
  assert.deepEqual(plain(result), {
    oldValues: [v("2020"), v("2021")],
    newValues: [v("2021"), v("2022"), { d: "2025", u: "[TM1].[Dim].[Jahr]->:[TMR].[Dim].[Jahr].[2025]" }],
    items: [
      { itemId: JAHR_ID, itemName: "Jahr", sourceId: "s", values: [v("2021"), v("2022"), { d: "2025", u: "[TM1].[Dim].[Jahr]->:[TMR].[Dim].[Jahr].[2025]" }] },
      { itemId: LAND_ID, itemName: "Land", sourceId: "s2", values: [v("DE")] }
    ]
  });
  const seeded = prepare({ state: { filters: {} } }, { confirmedLabels: ["2022"], itemIdHint: JAHR_ID }, liveItems, liveItems[0], "Jahr", "page9");
  assert.deepEqual(plain(seeded.oldValues), []);
  assert.deepEqual(plain(seeded.items), [
    { itemId: JAHR_ID, itemName: "Jahr", sourceId: "s", values: [v("2022")] },
    { itemId: LAND_ID, itemName: "Land", sourceId: "s2", values: [v("DE")] }
  ]);
});

test("units: mergeReplayItem replaces by name, appends, and seeds from live items", () => {
  const mergeReplayItem = UNITS.mergeReplayItem();
  const merged = { itemId: "1", itemName: "Jahr", sourceId: "s", values: [v("2024")] };
  const live = [{ itemId: "1", itemName: "Jahr", sourceId: "s", values: [v("2020")] }, { itemId: "2", itemName: "Land", sourceId: "t", values: [] }];
  assert.deepEqual(plain(mergeReplayItem([], merged, live, "Jahr")), [
    { itemId: "1", itemName: "Jahr", sourceId: "s", values: [v("2020")] },
    { itemId: "2", itemName: "Land", sourceId: "t", values: [] }
  ]);
  const old = [{ itemId: "2", itemName: "Land", sourceId: "t", values: [v("DE")] }, { itemId: "1", itemName: " Jahr ", sourceId: "s", values: [] }];
  assert.deepEqual(plain(mergeReplayItem(old, merged, live, "Jahr")), [
    { itemId: "2", itemName: "Land", sourceId: "t", values: [v("DE")] },
    { itemId: "1", itemName: "Jahr", sourceId: "s", values: [v("2024")] }
  ]);
  assert.deepEqual(plain(mergeReplayItem([{ itemId: "2", itemName: "Land", values: null }], merged, live, "Jahr")), [
    { itemId: "2", itemName: "Land", sourceId: "", values: [] },
    { itemId: "1", itemName: "Jahr", sourceId: "s", values: [v("2024")] }
  ]);
});

test("units: readClaimDefinition and isUnownedFilterDescriptor", () => {
  const readClaimDefinition = UNITS.readClaimDefinition();
  const isUnowned = UNITS.isUnownedFilterDescriptor();
  const instances = Object.assign(filterInstances(), {
    dupA: { scopeType: "global", itemName: "Dup", itemId: "d1", isNative: true },
    dupB: { scopeType: "global", itemName: "Dup", itemId: "d1", isNative: true },
    amb: { scopeType: "global", itemName: "Amb", itemId: "a1", isNative: true },
    amb2: { scopeType: "global", itemName: "Amb", itemId: "a1", isNative: false },
    hier: { scopeType: "global", itemName: "Hier", itemId: "h1", isHierarchy: "true" },
    cond: { scopeType: "global", itemName: "Cond", itemId: "c1", condition: "Personengruppe" },
    casc: { scopeType: "global", itemName: "Casc", itemId: "k1", cascade: "downstream" },
    flagless: { scopeType: "global", itemName: "Flagless", itemId: "x1" },
    onlyHier: { scopeType: "global", itemName: "OnlyHier", itemId: "y1", isHierarchy: "false" }
  });
  const KDB = {
    state: {},
    properties: { kennzahlenTablesPropObj: { Personal_KDB: {} }, filterPropObj: { Personal_KDB: {
      filterInstances: instances,
      globalFilters: { LegacyOnly: { isNative: true } },
      pageContextFilters: { PageLegacy: { isSingleSelect: true } }
    } } }
  };
  assert.deepEqual(plain(readClaimDefinition(KDB, "global", "Jahr", JAHR_ID)), { status: "ok", definition: instances.f2 });
  assert.deepEqual(plain(readClaimDefinition(KDB, "global", "Dup", "d1")), { status: "ok", definition: instances.dupA });
  assert.deepEqual(readClaimDefinition(KDB, "global", "Amb", "a1"), { status: "ambiguous", definition: null });
  assert.deepEqual(readClaimDefinition(KDB, "global", "Nope", "n1"), { status: "missing", definition: null });
  assert.deepEqual(plain(readClaimDefinition(KDB, "global", "LegacyOnly", "")), { status: "ok", definition: { isNative: true } });
  assert.deepEqual(plain(readClaimDefinition(KDB, "pageContext", "PageLegacy", "")), { status: "ok", definition: { isSingleSelect: true } });
  assert.equal(readClaimDefinition({}, "global", "Jahr", JAHR_ID).status, "missing");

  const d = (itemId, itemName, rawScopeId) => ({ itemId, itemName, rawScopeId });
  assert.equal(isUnowned(KDB, d(JAHR_ID, "Jahr", "global")), true);
  assert.equal(isUnowned(KDB, d("[TM1].[Dim].[Geschlecht]", "Geschlecht", "global")), false);
  assert.equal(isUnowned(KDB, d(LAND_ID, "Land", "page1_tabpanel")), true);
  assert.equal(isUnowned(KDB, d("d9", "Dienststelle Foo", "global")), false);
  assert.equal(isUnowned(KDB, d("", "Jahr", "global")), false);
  assert.equal(isUnowned(KDB, d(JAHR_ID, "Jahr", "")), false);
  assert.equal(isUnowned(KDB, d("zz", "Unknown", "global")), true);
  assert.equal(isUnowned(KDB, d("a1", "Amb", "global")), true);
  assert.equal(isUnowned(KDB, d("h1", "Hier", "global")), false);
  assert.equal(isUnowned(KDB, d("c1", "Cond", "global")), false);
  assert.equal(isUnowned(KDB, d("k1", "Casc", "global")), false);
  assert.equal(isUnowned(KDB, d("x1", "Flagless", "global")), false);
  assert.equal(isUnowned(KDB, d("y1", "OnlyHier", "global")), true);
  assert.equal(isUnowned(KDB, null), false);
});

test("units: readClaimDefinition gives the same result with a prebuilt index", () => {
  const inventory = unit("inventory.js");
  const instances = {
    a: { scopeType: "global", itemName: "Jahr", itemId: "id1", isNative: true },
    b: { scopeType: "global", itemName: "Jahr", itemId: "id2", isNative: true },
    c: { scopeType: " global ", filterLabel: "Label", isNative: true },
    d: { scopeType: "pageContext", itemName: "Jahr", itemId: "id1", isSingleSelect: true },
    e: { scopeType: "pageContext", itemName: "Jahr", isSingleSelect: true },
    f: null,
    g: { scopeType: "global", itemName: "Same", itemId: "s1", isNative: true },
    h: { scopeType: "global", itemName: "Same", itemId: "s1", isNative: true }
  };
  const KDB = {
    state: {},
    properties: { kennzahlenTablesPropObj: { Src: {} }, filterPropObj: { Src: { filterInstances: instances, globalFilters: { OnlyLegacy: { isNative: true } } } } }
  };
  const index = inventory.createClaimIndex(KDB);
  const cases = [
    ["global", "Jahr", "id1"], ["global", "Jahr", "id2"], ["global", "Jahr", ""], ["global", "Jahr", "other"], ["global", "Label", ""],
    ["pageContext", "Jahr", "id1"], ["pageContext", "Jahr", "id9"], ["global", "Same", "s1"], ["global", "OnlyLegacy", ""],
    ["pageContext", "Missing", "x"], ["global", " Jahr ", " id1 "]
  ];
  for (const [scopeType, itemName, itemId] of cases) {
    assert.deepEqual(
      plain(inventory.readClaimDefinition(KDB, scopeType, itemName, itemId, index)),
      plain(inventory.readClaimDefinition(KDB, scopeType, itemName, itemId)),
      scopeType + "|" + itemName + "|" + itemId
    );
  }
  assert.equal(inventory.readClaimDefinition(KDB, "global", "Jahr", "").status, "ambiguous");
  assert.equal(inventory.readClaimDefinition(KDB, "global", "Jahr", "id2").definition, instances.b);
  assert.equal(inventory.readClaimDefinition(KDB, "global", "Label", "").definition, instances.c);
  assert.equal(inventory.readClaimDefinition(KDB, "global", "Same", "s1").definition, instances.g);
  assert.equal(inventory.readClaimDefinition({ state: {}, properties: {} }, "global", "Jahr", "id1", inventory.createClaimIndex({ properties: {} })).status, "missing");
});

test("units: reducer handles mount, scope write, error, destroy", () => {
  const createReducer = UNITS.createReducer();
  const reducer = createReducer();
  const initial = reducer(undefined, { type: "x" });
  assert.deepEqual(initial, { lifecycle: "idle", byScope: {}, errorCode: null, errorMessage: null });
  assert.equal(reducer(initial, { type: "other" }), initial);
  assert.deepEqual(reducer(initial, { type: "nativeMultiSelect/mountReady" }),
    { lifecycle: "ready", byScope: {}, errorCode: null, errorMessage: null });
  const written = reducer(initial, {
    type: A.scopeWrite,
    payload: { scopeId: 7, items: [{ itemId: 5, itemName: null, values: [{ d: 1, u: null }, null] }, null] }
  });
  assert.deepEqual(written.byScope, {
    7: [
      { itemId: "5", itemName: "", sourceId: "", values: [{ d: "1", u: "" }, { d: "", u: "" }] },
      { itemId: "", itemName: "", sourceId: "", values: [] }
    ]
  });
  assert.equal(reducer(written, { type: A.scopeWrite, payload: { scopeId: "", items: [] } }), written);
  assert.deepEqual(reducer(written, { type: A.scopeWrite, payload: { scopeId: "7", clear: true, items: [{}] } }).byScope, { 7: [] });
  assert.deepEqual(reducer(written, { type: "nativeMultiSelect/error", payload: { errorCode: 5, errorMessage: "m" } }),
    Object.assign({}, written, { lifecycle: "error", errorCode: "5", errorMessage: "m" }));
  assert.equal(reducer(written, { type: "nativeMultiSelect/destroy" }).lifecycle, "disposed");
});

test("units: buildCommittedStep clones and stringifies snapshots", () => {
  const build = UNITS.buildCommittedStep();
  assert.deepEqual(build({ itemName: "Jahr", scopeKey: "global", values: [{ d: 1, u: null }, null] }, null, 42), {
    key: "filter_nativeMultiSelect",
    timestamp: 42,
    old: { itemName: "Jahr", scopeKey: "global", values: [{ d: "1", u: "" }, { d: "", u: "" }] },
    new: { itemName: "", scopeKey: "", values: [] }
  });
  const stamped = build({}, {}, undefined);
  assert.equal(typeof stamped.timestamp, "number");
});

test("units: listUnownedItems keeps owned DTO shape and fails closed on an incomplete inventory", () => {
  const list = UNITS.listUnownedItems();
  const b = boot();
  const items = list(b.KDB, "global", b.facet);
  assert.deepEqual(plain(items), [
    { itemId: JAHR_ID, itemName: "Jahr", sourceId: "src_Jahr", values: [v("2023", "[Jahr].[2023]")] },
    { itemId: LAND_ID, itemName: "Land", sourceId: "src_Land", values: [] }
  ]);
  assert.deepEqual(list(b.KDB, "global", null), []);
  assert.deepEqual(list(b.KDB, "global", { listFilterItems: () => ({ ok: false, outcome: "failed", diagnostics: [{ m: 1 }] }) }), []);
  assert.deepEqual(list(b.KDB, "global", { listFilterItems: () => { throw new Error("boom"); } }), []);
});

// ---------- controller: register / lifecycle ----------
test("register: state, runtime buckets, stamps, history contribution, api", () => {
  const b = boot();
  assert.deepEqual(Object.keys(b.api).sort(), ["destroy", "dispatch", "getState", "mount"]);
  assert.strictEqual(b.KDB.api.nativeMultiSelect, b.api);
  assert.deepEqual(stateOf(b), { lifecycle: "idle", byScope: {}, errorCode: null, errorMessage: null });
  const rt = b.rt();
  assert.deepEqual(Object.keys(rt).sort(), [
    "abortControllers", "domRefs", "historyReplayHandlerContribution", "listeners", "observers", "parameterSetRunId", "pendingPromises",
    "subscriptions", "tabMutationRunId", "tabMutationSnapshots", "tabsFacet", "timers"
  ].sort());
  assert.equal(rt.tabsFacet, b.tabsFacet);
  assert.equal(typeof rt.historyReplayHandlerContribution.apply, "function");
  assert.equal(rt.tabMutationRunId, 0);
  assert.equal(rt.parameterSetRunId, 0);
  assert.deepEqual(rt.tabMutationSnapshots, {});
  assert.equal(b.api.mount({}), true);
  assert.equal(stateOf(b).lifecycle, "ready");
  assert.equal(b.api.getState().lifecycle, "ready");
});

test("register: existing state and runtime are kept", () => {
  const { console: c } = createConsoleSpy();
  const KDB = {
    state: { filters: { nativeMultiSelect: { lifecycle: "ready", byScope: { a: [] }, errorCode: null, errorMessage: null } } },
    runtime: { nativeMultiSelect: { tabMutationRunId: 9, listeners: { k: 1 } } },
    services: {},
    api: {}
  };
  loadAmd(nmsFile("index.js"), { stubs: { console: c } })(KDB);
  assert.deepEqual(KDB.state.filters.nativeMultiSelect.byScope, { a: [] });
  assert.equal(KDB.runtime.nativeMultiSelect.tabMutationRunId, 9);
  assert.deepEqual(KDB.runtime.nativeMultiSelect.listeners, { k: 1 });
  assert.equal(KDB.runtime.nativeMultiSelect.tabsFacet, null);
});

test("destroy: releases subscriptions, resets runtime, then reports disposed results per family", async () => {
  const b = boot();
  b.api.mount({});
  let unsubscribed = 0;
  const rt = b.rt();
  rt.subscriptions.one = () => { unsubscribed += 1; };
  rt.subscriptions.bad = () => { throw new Error("unsubscribe failed"); };
  rt.tabMutationRunId = 4;
  rt.parameterSetRunId = 3;
  rt.tabMutationSnapshots.x = { runId: 1 };
  b.api.destroy();
  assert.equal(unsubscribed, 1);
  assert.equal(rt.tabMutationRunId, 0);
  assert.equal(rt.parameterSetRunId, 0);
  assert.deepEqual(rt.tabMutationSnapshots, {});
  assert.deepEqual(rt.subscriptions, {});
  assert.equal(rt.historyReplayHandlerContribution, null);
  assert.equal(stateOf(b).lifecycle, "disposed");
  assert.equal(b.api.getState(), undefined);
  assert.equal(b.api.destroy(), undefined);
  assert.equal(b.api.mount({}), false);
  assert.deepEqual(await b.api.dispatch({ type: A.clear, payload: {} }), {
    ok: false, diagnostics: [{ code: "WRITEBACK_RESTORE_CANCELLED", message: "NativeMultiSelect controller is disposed" }]
  });
  assert.deepEqual(await b.api.dispatch({ type: A.restore }), {
    ok: false, diagnostics: [{ code: "WRITEBACK_RESTORE_CANCELLED", message: "NativeMultiSelect controller is disposed" }]
  });
  assert.deepEqual(b.api.dispatch({ type: A.collect }), { ok: true, entries: [], diagnostics: [] });
  for (const type of [A.prepare, A.apply, A.restoreSnapshot, A.resync]) {
    assert.deepEqual(await b.api.dispatch({ type, payload: { operationId: "op9" } }), {
      ok: false, operationId: "op9", diagnostics: [{ code: "TABS_MUTATION_CANCELLED", message: "NativeMultiSelect controller is disposed" }]
    });
  }
  assert.equal(await b.api.dispatch({ type: A.prepare }).then((r) => r.operationId), null);
  assert.equal(b.api.dispatch({ type: A.replay, payload: {} }), false);
  assert.equal(b.api.dispatch({ type: A.confirm, payload: {} }), undefined);
  assert.equal(b.api.dispatch({ type: "nativeMultiSelect/other" }), undefined);
  assert.ok(b.spy.warn.some((args) => String(args[0]).indexOf("[nativeMultiSelect.") === 0 && String(args[0]).indexOf("called after destroy") > 0));
});

test("destroy: aborts controllers, disconnects observers, cancels timers and removes listeners", async () => {
  const b = boot();
  const rt = b.rt();
  const calls = [];
  const controller = new AbortController();
  rt.abortControllers.main = controller;
  rt.observers.dom = { disconnect: () => calls.push("disconnect") };
  rt.listeners.click = { target: { removeEventListener: (...a) => calls.push(a[0]) }, type: "click", handler: () => {} };
  rt.timers.late = { kind: "timeout", id: setTimeout(() => calls.push("timer"), 5) };
  b.api.destroy();
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(controller.signal.aborted, true);
  assert.deepEqual(calls.sort(), ["click", "disconnect"]);
  assert.deepEqual(rt.timers, {});
  assert.deepEqual(rt.abortControllers, {});
  assert.deepEqual(rt.observers, {});
  assert.deepEqual(rt.listeners, {});
});

test("dispatch: unknown action reduces and returns state; reducer errors do not throw", () => {
  const b = boot();
  const state = b.api.dispatch({ type: "nativeMultiSelect/something" });
  assert.equal(state.lifecycle, "idle");
  const after = b.api.dispatch({ type: "nativeMultiSelect/error", payload: { errorCode: "E1", errorMessage: "bad" } });
  assert.equal(after.lifecycle, "error");
  assert.equal(after.errorCode, "E1");
  assert.equal(b.api.dispatch(undefined).lifecycle, "error");
});

// ---------- TopN wave payloads ----------
const JAHR_COL = "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]";

// Runs the confirm and replay paths and returns the wave payloads widgetVis builds from the `filters:confirmed`
// events (the real waveRequest mapper; the wave itself is not started).
async function captureWavePayloads(nmsDir) {
  const calls = [];
  const events = loadAmd(path.join(JS_ROOT, "core/events/createEventBus.js"))();
  const waveRequest = loadAmd(path.join(JS_ROOT, "dashboard/widgets/widgetVis/topN/waveRequest.js"));
  events.subscribe("filters:confirmed", (event) => { calls.push(clone(waveRequest.buildWavePayload(event))); });
  const items = defaultItems().concat([item(JAHR_COL, "Jahr", "global", [v("2022", "[J].[2022]")])]).filter((i) => !(i.itemName === "Jahr" && i.itemId === JAHR_ID && i.rawScopeId === "global"));
  const instances = Object.assign(filterInstances(), { jahrCol: { scopeType: "global", itemName: "Jahr", itemId: JAHR_COL, isNative: true } });
  const b = boot({ items, filterInstances: instances, nmsDir, events });
  const out = {};
  const confirm = (payload) => b.api.dispatch({ type: A.confirm, payload: Object.assign({ interactionType: "confirm", confirmedLabels: ["2023", "2024"] }, payload) });
  const replay = (targetValue) => b.api.dispatch({ type: A.replay, payload: { targetValue, isHistoryReplay: true, skipHistory: true } });
  const take = async (name, run) => { calls.length = 0; await run(); out[name] = clone(calls); };
  await take("confirmGlobalJahr", () => confirm({ filterLabel: "Jahr", scopeType: "global", itemIdHint: JAHR_COL, tabId: "t1" }));
  await take("confirmGlobalOther", () => confirm({ filterLabel: "Land", scopeType: "global", itemIdHint: LAND_ID, tabId: "t1" }));
  await take("confirmPage", () => confirm({ filterLabel: "Land", scopeId: "page1_tabpanel", filterConfig: { itemId: LAND_ID }, tabId: "t1" }));
  await take("confirmSkipHistory", () => confirm({ filterLabel: "Land", scopeType: "global", itemIdHint: LAND_ID, skipHistory: true }));
  await take("replayGlobalJahr", () => replay({ itemName: "Jahr", scopeKey: "global", values: [v("2021", "[J].[2021]"), v("2019", "[J].[2019]")] }));
  await take("replayPage", () => replay({ itemName: "Land", scopeKey: "page1_tabpanel", values: [v("FR")] }));
  await take("replayUnknown", () => replay({ itemName: "Nope", scopeKey: "global", values: [] }));
  return out;
}

// Expected payloads were captured by running captureWavePayloads against the pre-restructure modules (commit 899c47c,
// actions/handleFilterDockConfirm.js and actions/handleNativeMultiSelectHistoryReplay.js).
const OLD_WAVE_PAYLOADS = {
  "confirmGlobalJahr": [
    {
      "scopeType": "global",
      "tabId": null,
      "scopeId": null,
      "isJahr": true,
      "selectedYearKnown": true,
      "selectedYear": 2024,
      "filterType": "nativeMultiSelect"
    }
  ],
  "confirmGlobalOther": [
    {
      "scopeType": "global",
      "tabId": null,
      "scopeId": null,
      "isJahr": false,
      "selectedYearKnown": false,
      "selectedYear": null,
      "filterType": "nativeMultiSelect"
    }
  ],
  "confirmPage": [
    {
      "scopeType": "pageContext",
      "tabId": "t1",
      "scopeId": "page1_tabpanel",
      "isJahr": false,
      "selectedYearKnown": false,
      "selectedYear": null,
      "filterType": "nativeMultiSelect"
    }
  ],
  "confirmSkipHistory": [],
  "replayGlobalJahr": [
    {
      "scopeType": "global",
      "scopeId": null,
      "isJahr": true,
      "selectedYearKnown": true,
      "selectedYear": 2021,
      "filterType": "nativeMultiSelect"
    }
  ],
  "replayPage": [
    {
      "scopeType": "pageContext",
      "scopeId": "page1_tabpanel",
      "isJahr": false,
      "selectedYearKnown": false,
      "selectedYear": null,
      "filterType": "nativeMultiSelect"
    }
  ],
  "replayUnknown": []
};

test("TopN wave payloads of confirm and history replay match the pre-restructure modules", async () => {
  const captured = await captureWavePayloads(NMS);
  assert.deepEqual(captured, OLD_WAVE_PAYLOADS);
});

// ---------- controller: confirm ----------
test("confirm: global commit writes owner state, pushes one history step, equal confirm pushes none", async () => {
  const b = boot();
  const payload = { interactionType: "confirm", confirmedLabels: ["2023", "2024"], filterLabel: "Jahr", scopeType: "global", itemIdHint: JAHR_ID, tabId: "t1" };
  await b.api.dispatch({ type: A.confirm, payload });
  const expectedValues = [
    { d: "2023", u: "[Jahr].[2023]" },
    { d: "2024", u: "[TM1].[Dim].[Jahr]->:[TMR].[Dim].[Jahr].[2024]" }
  ];
  assert.deepEqual(stateOf(b).byScope, {
    global: [
      { itemId: JAHR_ID, itemName: "Jahr", sourceId: "src_Jahr", values: expectedValues },
      { itemId: LAND_ID, itemName: "Land", sourceId: "src_Land", values: [] }
    ]
  });
  assert.equal(b.history.steps.length, 1);
  const step = b.history.steps[0];
  assert.equal(step.key, "filter_nativeMultiSelect");
  assert.equal(typeof step.timestamp, "number");
  assert.deepEqual(step.old, { itemName: "Jahr", scopeKey: "global", values: [] });
  assert.deepEqual(step.new, { itemName: "Jahr", scopeKey: "global", values: expectedValues });
  await b.api.dispatch({ type: A.confirm, payload });
  assert.equal(b.history.steps.length, 1);
  await b.api.dispatch({ type: A.confirm, payload: Object.assign({}, payload, { confirmedLabels: ["2023"] }) });
  assert.equal(b.history.steps.length, 2);
  assert.deepEqual(b.history.steps[1].old.values, expectedValues);
  assert.deepEqual(b.history.steps[1].new.values, [{ d: "2023", u: "[Jahr].[2023]" }]);
});

test("confirm: skipHistory writes state without history; empty confirm writes state without history", async () => {
  const b = boot();
  const base = { interactionType: "confirm", filterLabel: "Jahr", scopeType: "global", itemIdHint: JAHR_ID };
  await b.api.dispatch({ type: A.confirm, payload: Object.assign({ confirmedLabels: ["2023"], skipHistory: true }, base) });
  assert.equal(stateOf(b).byScope.global[0].values.length, 1);
  assert.equal(b.history.steps.length, 0);
  await b.api.dispatch({ type: A.confirm, payload: Object.assign({ confirmedLabels: [] }, base) });
  assert.deepEqual(stateOf(b).byScope.global[0].values, []);
  assert.equal(b.history.steps.length, 0);
});

test("confirm: ignored inputs", async () => {
  const b = boot();
  const base = { interactionType: "confirm", confirmedLabels: ["2023"], filterLabel: "Jahr", scopeType: "global" };
  assert.equal(await b.api.dispatch({ type: A.confirm, payload: Object.assign({}, base, { interactionType: "open" }) }), undefined);
  assert.equal(await b.api.dispatch({ type: A.confirm, payload: Object.assign({}, base, { confirmedLabels: undefined }) }), undefined);
  assert.equal(await b.api.dispatch({ type: A.confirm, payload: Object.assign({}, base, { filterLabel: "", itemNameHint: "" }) }), undefined);
  assert.equal(await b.api.dispatch({ type: A.confirm, payload: Object.assign({}, base, { filterLabel: "Unknown" }) }), undefined);
  assert.deepEqual(stateOf(b).byScope, {});
  assert.equal(b.history.steps.length, 0);
});

test("confirm: page scope reuses the stored scope key and resolves via tabs targets", async () => {
  const b = boot();
  b.KDB.state.filters.nativeMultiSelect.byScope = { page1: [] };
  const base = { interactionType: "confirm", confirmedLabels: ["2020"], filterLabel: "Jahr", itemIdHint: JAHR_ID, skipHistory: true };
  await b.api.dispatch({ type: A.confirm, payload: Object.assign({ scopeId: "page1_tabpanel" }, base) });
  assert.deepEqual(Object.keys(stateOf(b).byScope), ["page1"]);
  assert.deepEqual(stateOf(b).byScope.page1.map((i) => i.itemName), ["Jahr", "Land"]);
  assert.equal(b.tabsDispatches.length, 0);
  await b.api.dispatch({ type: A.confirm, payload: Object.assign({ tabId: "t1" }, base) });
  assert.equal(b.tabsDispatches.length, 1);
  assert.deepEqual(b.tabsDispatches[0], { type: "tabs/resolveFilterScopeTargets", payload: { source: "nativeMultiSelectConfirm" } });
  assert.deepEqual(Object.keys(stateOf(b).byScope), ["page1"]);
  const unresolved = boot({ tabsResult: { ok: false } });
  await unresolved.api.dispatch({ type: A.confirm, payload: Object.assign({ tabId: "t1" }, base) });
  assert.deepEqual(stateOf(unresolved).byScope, {});
  assert.ok(unresolved.spy.warn.length >= 1);
});

// ---------- controller: history replay ----------
test("history replay: writes the host item and merges owner state; failures return false", async () => {
  const b = boot();
  const target = { itemName: "Jahr", scopeKey: "global", values: [{ d: "2022", u: "[Jahr].[2022]" }] };
  assert.equal(await b.api.dispatch({ type: A.replay, payload: { targetValue: target, isHistoryReplay: true, skipHistory: true } }), true);
  assert.deepEqual(b.facet.writes, [{ itemId: JAHR_ID, itemName: "Jahr", scopeId: "global", values: target.values }]);
  assert.deepEqual(stateOf(b).byScope.global, [
    { itemId: JAHR_ID, itemName: "Jahr", sourceId: "src_Jahr", values: target.values },
    { itemId: LAND_ID, itemName: "Land", sourceId: "src_Land", values: [] }
  ]);
  const second = { itemName: "Land", scopeKey: "global", values: [v("DE")] };
  assert.equal(await b.api.dispatch({ type: A.replay, payload: { targetValue: second } }), true);
  assert.deepEqual(stateOf(b).byScope.global.map((i) => [i.itemName, i.values.length]), [["Jahr", 1], ["Land", 1]]);
  assert.equal(await b.api.dispatch({ type: A.replay, payload: { targetValue: { itemName: "Nope", scopeKey: "global", values: [] } } }), false);
  assert.equal(await b.api.dispatch({ type: A.replay, payload: { targetValue: { itemName: "", scopeKey: "global" } } }), false);
  assert.equal(await b.api.dispatch({ type: A.replay, payload: {} }), false);
  const failing = boot({ facetOptions: { failWrites: true } });
  assert.equal(await failing.api.dispatch({ type: A.replay, payload: { targetValue: target } }), false);
  assert.deepEqual(stateOf(failing).byScope, {});
  const pagePayload = { itemName: "Land", scopeKey: "page1_tabpanel", values: [v("FR")] };
  assert.equal(await b.api.dispatch({ type: A.replay, payload: { targetValue: pagePayload } }), true);
  assert.deepEqual(Object.keys(stateOf(b).byScope).sort(), ["global", "page1_tabpanel"]);
  assert.deepEqual(b.facet.writes[b.facet.writes.length - 1], { itemId: LAND_ID, itemName: "Land", scopeId: "page1_tabpanel", values: pagePayload.values });
});

test("history replay: contribution applies only its own step key and goes through dispatch", async () => {
  const b = boot();
  const handler = b.rt().historyReplayHandlerContribution;
  assert.equal(handler.apply(b.KDB, {}, { key: "filter_other" }, {}), false);
  assert.equal(handler.apply(b.KDB, {}, undefined, {}), false);
  const step = { key: "filter_nativeMultiSelect", new: {} };
  const ok = await handler.apply(b.KDB, { itemName: "Jahr", scopeKey: "global", values: [v("2021")] }, step, { direction: "undo" });
  assert.equal(ok, true);
  assert.equal(b.facet.writes.length, 1);
  assert.equal(await handler.apply(b.KDB, { itemName: "Nope", scopeKey: "global" }, step, {}), false);
  const noApi = boot();
  delete noApi.KDB.api.nativeMultiSelect;
  assert.equal(await noApi.rt().historyReplayHandlerContribution.apply(noApi.KDB, {}, step, {}), false);
  const abort = boot();
  abort.KDB.api.nativeMultiSelect = { dispatch: () => { const e = new Error("a"); e.name = "AbortError"; throw e; } };
  assert.equal(await abort.rt().historyReplayHandlerContribution.apply(abort.KDB, {}, step, {}), false);
  assert.equal(abort.spy.error.length, 0);
  const crash = boot();
  crash.KDB.api.nativeMultiSelect = { dispatch: () => { throw new Error("x"); } };
  assert.equal(await crash.rt().historyReplayHandlerContribution.apply(crash.KDB, {}, step, {}), false);
  assert.equal(crash.spy.error.length, 1);
});

// ---------- controller: writeback snapshot ----------
test("collectWritebackSnapshot: global and visible page entries, duplicates, invisible and unresolved tabs", () => {
  const items = defaultItems().concat([
    item("[TM1].[Dim].[Jahr2]", "Jahr", "global", [v("1999")]),
    item(JAHR_ID, "Jahr", "page3_tabpanel", [v("2001")])
  ]);
  const b = boot({ items });
  const result = b.api.dispatch({
    type: A.collect,
    payload: {
      tabIdxToScopeId: {
        0: { visible: true, scopeId: "page1_tabpanel" },
        1: { visible: false, scopeId: "page2_tabpanel" },
        2: { visible: true, scopeId: "" },
        3: { visible: true, scopeId: "page3_tabpanel" },
        x: { visible: true, scopeId: "page2_tabpanel" },
        4: { visible: true, scopeId: "page1_tabpanel" }
      }
    }
  });
  assert.deepEqual(plain(result), {
    ok: true,
    entries: [
      { nm: "Jahr", vals: [v("2023", "[Jahr].[2023]")] },
      { nm: "Jahr", tab: 0, vals: [v("2020")] },
      { nm: "Land", tab: 0, vals: [v("DE"), v("AT")] },
      { nm: "Jahr", tab: 3, vals: [v("2001")] },
      { nm: "Jahr", tab: 4, vals: [v("2020")] },
      { nm: "Land", tab: 4, vals: [v("DE"), v("AT")] }
    ],
    diagnostics: [
      { code: "WRITEBACK_SKIPPED_BY_DESIGN", nm: "Jahr", message: "duplicate pcfs identity omitted" },
      { code: "WRITEBACK_SKIPPED_BY_DESIGN", tab: 2 }
    ]
  });
  const noTargets = b.api.dispatch({ type: A.collect, payload: {} });
  assert.deepEqual(plain(noTargets), {
    ok: true,
    entries: [{ nm: "Jahr", vals: [v("2023", "[Jahr].[2023]")] }],
    diagnostics: [
      { code: "WRITEBACK_SKIPPED_BY_DESIGN", nm: "Jahr", message: "duplicate pcfs identity omitted" },
      { code: "WRITEBACK_SKIPPED_BY_DESIGN", message: "live tab targets unavailable for page pcfs collect" }
    ]
  });
  assert.deepEqual(plain(b.api.dispatch({ type: A.collect, payload: { tabIdxToScopeId: [] } }).diagnostics.slice(-1)), [
    { code: "WRITEBACK_SKIPPED_BY_DESIGN", message: "live tab targets unavailable for page pcfs collect" }
  ]);
});

// ---------- controller: parameter set ----------
test("parameterSet clear: clears owned host items and owner state per scope", async () => {
  const b = boot();
  const result = await b.api.dispatch({
    type: A.clear,
    payload: { runId: 1, tabIdxToScopeId: { 0: { scopeId: "page1_tabpanel" }, 1: { scopeId: "page2_tabpanel" }, 2: { scopeId: "" } } }
  });
  assert.deepEqual(plain(result), {
    ok: true, degraded: false, clearedScopes: ["global", "page1_tabpanel", "page2_tabpanel"], diagnostics: []
  });
  assert.deepEqual(b.facet.writes.map((w) => [w.scopeId, w.itemName, w.values.length]), [
    ["global", "Jahr", 0], ["global", "Land", 0], ["page1_tabpanel", "Jahr", 0], ["page1_tabpanel", "Land", 0],
    ["page2_tabpanel", "Jahr", 0], ["page2_tabpanel", "Land", 0]
  ]);
  assert.deepEqual(stateOf(b).byScope, { global: [], page1_tabpanel: [], page2_tabpanel: [] });
  assert.equal(b.rt().parameterSetRunId, 1);
});

test("parameterSet clear: allowed tab indexes, no targets, guard and failure paths", async () => {
  const b = boot();
  const allowed = await b.api.dispatch({
    type: A.clear,
    payload: { runId: 2, allowedClearTabIdxs: [1], tabIdxToScopeId: { 0: { scopeId: "page1_tabpanel" }, 1: { scopeId: "page2_tabpanel" } } }
  });
  assert.deepEqual(plain(allowed.clearedScopes), ["global", "page2_tabpanel"]);
  const onlyGlobal = await b.api.dispatch({ type: A.clear, payload: { runId: 3, allowedClearTabIdxs: [] } });
  assert.deepEqual(plain(onlyGlobal.clearedScopes), ["global"]);
  const all = await b.api.dispatch({ type: A.clear, payload: { runId: 4, status: "newDashboard" } });
  assert.deepEqual(plain(all), { ok: true, degraded: false, clearedScopes: ["global", "page1", "page2"], diagnostics: [] });
  const stale = await b.api.dispatch({ type: A.clear, payload: { runId: 1 } });
  assert.deepEqual(plain(stale), {
    ok: false, diagnostics: [{ code: "WRITEBACK_RESTORE_CANCELLED", message: "stale parameterSet runId 1 superseded by 4" }]
  });
  const missing = await b.api.dispatch({ type: A.clear, payload: {} });
  assert.deepEqual(plain(missing), {
    ok: false, diagnostics: [{ code: "WRITEBACK_RESTORE_CANCELLED", message: "NativeMultiSelect parameterSet action requires a numeric runId" }]
  });
  const failing = boot({ facetOptions: { failWrites: true } });
  const failed = await failing.api.dispatch({ type: A.clear, payload: { runId: 1 } });
  assert.deepEqual(plain(failed), {
    ok: false,
    degraded: false,
    clearedScopes: [],
    diagnostics: [{ code: "WRITEBACK_FILTER_CLEAR_FAILED", itemId: JAHR_ID, scopeId: "global", message: "HOST_FAIL" }]
  });
  const crashing = boot({ facetOptions: { throwWrites: true } });
  assert.deepEqual(plain(await crashing.api.dispatch({ type: A.clear, payload: { runId: 1, status: "newDashboard" } })), {
    ok: true, degraded: true, clearedScopes: [], diagnostics: [{ code: "WRITEBACK_FILTER_CLEAR_FAILED", message: "host write crashed" }]
  });
  assert.equal((await crashing.api.dispatch({ type: A.clear, payload: { runId: 2 } })).ok, false);
});

test("parameterSet clear: skipped by design when the dest item is missing, and a superseded run stops", async () => {
  const b = boot({ items: [item(JAHR_ID, "Jahr", "global", [v("2023")])] });
  const origFind = b.facet.findFilterItem;
  b.facet.findFilterItem = () => ({ ok: false });
  const skipped = await b.api.dispatch({ type: A.clear, payload: { runId: 1 } });
  assert.deepEqual(plain(skipped), {
    ok: true,
    degraded: true,
    clearedScopes: ["global"],
    diagnostics: [{ code: "WRITEBACK_SKIPPED_BY_DESIGN", itemId: JAHR_ID, scopeId: "global", message: "dest host item missing" }]
  });
  b.facet.findFilterItem = origFind;
  const racing = boot();
  const orig = racing.facet.writeFilter;
  racing.facet.writeFilter = async function (request) {
    racing.rt().parameterSetRunId = 99;
    return orig.call(racing.facet, request);
  };
  const cancelled = await racing.api.dispatch({ type: A.clear, payload: { runId: 5 } });
  assert.deepEqual(plain(cancelled), {
    ok: false, diagnostics: [{ code: "WRITEBACK_RESTORE_CANCELLED", message: "stale parameterSet runId was superseded during clear" }]
  });
  assert.equal(racing.facet.writes.length, 1);
});

test("parameterSet restore: global and page entries, skipped items, failures", async () => {
  const b = boot();
  const payload = {
    runId: 1,
    tabIdxToScopeId: { 0: { scopeId: "page1_tabpanel" } },
    filters: [
      { nm: "Jahr", vals: [v("2022", "[Jahr].[2022]")] },
      { nm: "Gone", vals: [v("x")] },
      { nm: "Land", tab: 0, vals: [v("FR")] },
      { nm: "Nope", tab: 0, vals: [v("y")] }
    ]
  };
  const result = await b.api.dispatch({ type: A.restore, payload });
  assert.deepEqual(plain(result), {
    ok: true,
    degraded: true,
    appliedScopes: ["global", "page1_tabpanel"],
    skipped: [{ nm: "Gone", scopeId: "global" }, { nm: "Nope", tab: 0, scopeId: "page1_tabpanel" }],
    diagnostics: [
      { code: "WRITEBACK_SKIPPED_BY_DESIGN", itemName: "Gone", scopeId: "global", message: "dest host item missing" },
      { code: "WRITEBACK_SKIPPED_BY_DESIGN", itemName: "Nope", scopeId: "page1_tabpanel", message: "dest host item missing" }
    ]
  });
  assert.deepEqual(stateOf(b).byScope, {
    global: [{ itemId: JAHR_ID, itemName: "Jahr", sourceId: "src_Jahr", values: [v("2022", "[Jahr].[2022]")] }],
    page1_tabpanel: [{ itemId: LAND_ID, itemName: "Land", sourceId: "src_Land", values: [v("FR")] }]
  });
  const noTarget = await b.api.dispatch({ type: A.restore, payload: { runId: 2, filters: [{ nm: "Land", tab: 5, vals: [] }] } });
  assert.deepEqual(plain(noTarget), {
    ok: false,
    degraded: false,
    appliedScopes: [],
    skipped: [],
    diagnostics: [{ code: "WRITEBACK_TABS_TARGET_MISSING", tab: 5, message: "tab target has no resolvable scopeId" }]
  });
  const empty = await b.api.dispatch({ type: A.restore, payload: { runId: 3 } });
  assert.deepEqual(plain(empty), { ok: true, degraded: false, appliedScopes: [], skipped: [], diagnostics: [] });
  const failing = boot({ facetOptions: { failWrites: true } });
  const failed = await failing.api.dispatch({ type: A.restore, payload: { runId: 1, filters: [{ nm: "Jahr", vals: [v("1")] }] } });
  assert.deepEqual(plain(failed), {
    ok: false,
    degraded: false,
    appliedScopes: [],
    skipped: [],
    diagnostics: [{ code: "WRITEBACK_FILTER_RESTORE_FAILED", itemName: "Jahr", scopeId: "global", message: "HOST_FAIL" }]
  });
  const crashing = boot({ facetOptions: { throwWrites: true } });
  assert.deepEqual(plain(await crashing.api.dispatch({ type: A.restore, payload: { runId: 1, filters: [{ nm: "Jahr", vals: [v("1")] }] } })), {
    ok: false, diagnostics: [{ code: "WRITEBACK_FILTER_RESTORE_FAILED", message: "host write crashed" }]
  });
});

test("parameterSet restore: stale run is cancelled between items; guard rejects an older run", async () => {
  const b = boot();
  const orig = b.facet.writeFilter;
  b.facet.writeFilter = async function (request) {
    b.rt().parameterSetRunId = 50;
    return orig.call(b.facet, request);
  };
  const result = await b.api.dispatch({ type: A.restore, payload: { runId: 7, filters: [{ nm: "Jahr", vals: [v("1")] }] } });
  assert.deepEqual(plain(result), {
    ok: false, diagnostics: [{ code: "WRITEBACK_RESTORE_CANCELLED", message: "stale parameterSet runId was superseded during restore" }]
  });
  const older = await b.api.dispatch({ type: A.restore, payload: { runId: 6, filters: [] } });
  assert.deepEqual(plain(older).diagnostics[0].message, "stale parameterSet runId 6 superseded by 50");
});

test("parameterSet restore: missing display and use values are stored as empty strings", async () => {
  const b = boot();
  await b.api.dispatch({ type: A.restore, payload: { runId: 1, filters: [{ nm: "Jahr", vals: [{ d: null, u: "x" }, { d: 5 }, null] }] } });
  assert.deepEqual(stateOf(b).byScope.global[0].values, [{ d: "", u: "x" }, { d: "5", u: "" }, { d: "", u: "" }]);
});

// ---------- controller: tab mutation ----------
const tabTargets = () => ({
  0: { scopeId: "page1_tabpanel", tabId: "t0" },
  1: { scopeId: "page2_tabpanel", tabId: "t1" },
  2: { scopeId: "page3_tabpanel", tabId: "t2" }
});
const tmItems = () => defaultItems().concat([item(JAHR_ID, "Jahr", "page3_tabpanel", [])]);
const mutation = (extra) => Object.assign({ runId: 1, operationId: "op1", tabIdxToScopeId: tabTargets() }, extra);

test("tabMutation prepare: snapshot and history slice for delete, duplicate and move; failures", async () => {
  const b = boot({ items: tmItems() });
  const deletePlan = {
    operation: "delete",
    deletedSlot: { tabIdx: 1, tabId: "t1" },
    slotMoves: [{ fromTabIdx: 2, fromTabId: "t2", toTabIdx: 1, toTabId: "t1" }]
  };
  const prepared = await b.api.dispatch({ type: A.prepare, payload: mutation({ plan: deletePlan }) });
  assert.deepEqual(plain(prepared), {
    ok: true,
    operationId: "op1",
    snapshotScopes: ["page3_tabpanel", "page2_tabpanel"],
    diagnostics: [],
    historySlice: [
      { itemId: JAHR_ID, itemName: "Jahr", sourceId: "src_Jahr", values: [] },
      { itemId: LAND_ID, itemName: "Land", sourceId: "src_Land", values: [v("CH")] }
    ]
  });
  const snapshot = b.rt().tabMutationSnapshots.op1;
  assert.equal(snapshot.runId, 1);
  assert.deepEqual(Object.keys(snapshot.byScope), ["page3_tabpanel", "page2_tabpanel"]);
  const move = await b.api.dispatch({
    type: A.prepare,
    payload: mutation({ operationId: "op2", plan: { operation: "move", slotMoves: [{ fromTabIdx: 0, toTabIdx: 1 }] } })
  });
  assert.equal(move.ok, true);
  assert.equal("historySlice" in move, false);
  const dup = await b.api.dispatch({
    type: A.prepare,
    payload: mutation({ operationId: "op3", plan: { operation: "duplicate", sourceSlot: { tabIdx: 0, tabId: "t0" }, insertSlot: { tabIdx: 1 } } })
  });
  assert.deepEqual(plain(dup.historySlice).map((i) => i.itemName), ["Jahr", "Land"]);
  const noPlan = await b.api.dispatch({ type: A.prepare, payload: mutation({}) });
  assert.deepEqual(plain(noPlan), {
    ok: false, operationId: "op1", snapshotScopes: [], diagnostics: [{ code: "TABS_MUTATION_PREPARE_FAILED", message: "tab mutation plan is missing" }]
  });
  const unresolved = await b.api.dispatch({
    type: A.prepare,
    payload: mutation({ plan: { operation: "move", slotMoves: [{ fromTabIdx: 9, toTabIdx: 0 }] } })
  });
  assert.deepEqual(plain(unresolved), {
    ok: false,
    operationId: "op1",
    snapshotScopes: [],
    diagnostics: [{ code: "TABS_MUTATION_PREPARE_FAILED", message: "scopeId could not be resolved for tabIdx 9", tabId: null }]
  });
  const noIds = await b.api.dispatch({ type: A.prepare, payload: { plan: {} } });
  assert.equal(noIds.ok, false);
  assert.equal(noIds.diagnostics[0].code, "TABS_MUTATION_CANCELLED");
  assert.equal(noIds.diagnostics[0].message, "NativeMultiSelect tab mutation requires runId and operationId");
});

test("tabMutation prepare: layout scope fallback and global-scoped slots are skipped", async () => {
  const b = boot({ items: tmItems(), layoutTabs: [{ id: "page2_tabpanel", pageId: "p2" }] });
  const result = await b.api.dispatch({
    type: A.prepare,
    payload: {
      runId: 1,
      operationId: "opL",
      tabIdxToScopeId: { 0: { tabId: "page2_tabpanel" }, 1: { scopeId: "global" } },
      plan: { operation: "move", slotMoves: [{ fromTabIdx: 0, toTabIdx: 1 }] }
    }
  });
  assert.deepEqual(plain(result).snapshotScopes, ["page2_tabpanel"]);
});

test("tabMutation prepare: snapshots of older runs are pruned, same and newer runs stay", async () => {
  const b = boot({ items: tmItems() });
  b.rt().tabMutationSnapshots = { a: { runId: 3 }, b: { runId: 4 }, same: { runId: 5 }, odd: null, noRun: {} };
  const plan = { operation: "move", slotMoves: [{ fromTabIdx: 0, toTabIdx: 1 }] };
  assert.equal((await b.api.dispatch({ type: A.prepare, payload: mutation({ runId: 5, operationId: "c", plan }) })).ok, true);
  assert.deepEqual(Object.keys(b.rt().tabMutationSnapshots).sort(), ["c", "noRun", "odd", "same"]);
  const stale = await b.api.dispatch({ type: A.prepare, payload: mutation({ runId: 2, operationId: "d", plan }) });
  assert.equal(stale.ok, false);
  assert.deepEqual(Object.keys(b.rt().tabMutationSnapshots).sort(), ["c", "noRun", "odd", "same"]);
});

async function prepareAndApply(b, plan, extra) {
  const prepared = await b.api.dispatch({ type: A.prepare, payload: mutation({ plan }) });
  assert.equal(prepared.ok, true);
  b.facet.writes.length = 0;
  const applied = await b.api.dispatch({ type: A.apply, payload: mutation(Object.assign({ plan }, extra)) });
  return { prepared, applied };
}

test("tabMutation apply delete: clears the deleted scope and shifts later tabs", async () => {
  const b = boot({ items: tmItems() });
  const plan = {
    operation: "delete",
    deletedSlot: { tabIdx: 1, tabId: "t1" },
    slotMoves: [{ fromTabIdx: 2, fromTabId: "t2", toTabIdx: 1, toTabId: "t1" }]
  };
  const { applied } = await prepareAndApply(b, plan);
  assert.deepEqual(plain(applied), {
    ok: true, operationId: "op1", appliedScopes: ["page2_tabpanel"], clearedScopes: ["page2_tabpanel", "page3_tabpanel"], diagnostics: []
  });
  assert.deepEqual(b.facet.writes.map((w) => [w.scopeId, w.itemName, w.values.length]), [
    ["page2_tabpanel", "Jahr", 0], ["page2_tabpanel", "Land", 0], ["page3_tabpanel", "Jahr", 0], ["page2_tabpanel", "Jahr", 0]
  ]);
  assert.deepEqual(stateOf(b).byScope, {
    page2_tabpanel: [{ itemId: JAHR_ID, itemName: "Jahr", sourceId: "src_Jahr", values: [] }],
    page3_tabpanel: []
  });
});

test("tabMutation apply move: swaps scope contents using the snapshot", async () => {
  const b = boot({ items: tmItems() });
  const plan = {
    operation: "move",
    slotMoves: [{ fromTabIdx: 0, fromTabId: "t0", toTabIdx: 1, toTabId: "t1" }, { fromTabIdx: 1, fromTabId: "t1", toTabIdx: 0, toTabId: "t0" }]
  };
  const { applied } = await prepareAndApply(b, plan);
  assert.deepEqual(plain(applied), {
    ok: true,
    operationId: "op1",
    appliedScopes: ["page2_tabpanel", "page1_tabpanel"],
    clearedScopes: ["page1_tabpanel", "page2_tabpanel"],
    diagnostics: []
  });
  assert.deepEqual(b.facet.writes.map((w) => [w.scopeId, w.itemName, w.values.map((x) => x.d).join(",")]), [
    ["page1_tabpanel", "Jahr", ""], ["page1_tabpanel", "Land", ""], ["page2_tabpanel", "Jahr", ""], ["page2_tabpanel", "Land", ""],
    ["page2_tabpanel", "Jahr", "2020"], ["page2_tabpanel", "Land", "DE,AT"], ["page1_tabpanel", "Jahr", ""], ["page1_tabpanel", "Land", "CH"]
  ]);
});

test("tabMutation apply duplicate: copies the source scope", async () => {
  const b = boot({ items: tmItems() });
  const plan = {
    operation: "duplicate",
    sourceSlot: { tabIdx: 0, tabId: "t0" },
    insertSlot: { tabIdx: 1, tabId: "t1" },
    clonePair: { from: { tabIdx: 0, tabId: "t0" }, to: { tabIdx: 1, tabId: "t1" } },
    slotMoves: []
  };
  const { applied } = await prepareAndApply(b, plan);
  assert.deepEqual(plain(applied), { ok: true, operationId: "op1", appliedScopes: ["page2_tabpanel"], clearedScopes: [], diagnostics: [] });
  assert.deepEqual(b.facet.writes.map((w) => [w.scopeId, w.itemName, w.values.length]), [["page2_tabpanel", "Jahr", 1], ["page2_tabpanel", "Land", 2]]);
  assert.deepEqual(stateOf(b).byScope.page2_tabpanel.map((i) => [i.itemName, i.values.length]), [["Jahr", 1], ["Land", 2]]);
});

test("tabMutation apply restoreDeleted: writes the stored items into the insert slot", async () => {
  const b = boot({ items: tmItems() });
  const plan = {
    operation: "restoreDeleted",
    slotMoves: [],
    insertSlot: { tabIdx: 1, tabId: "t1" },
    restore: { filters: { nativeMultiSelect: [{ itemId: JAHR_ID, itemName: "Jahr", sourceId: "s", values: [v("2019")] }] } }
  };
  const { applied } = await prepareAndApply(b, plan);
  assert.deepEqual(plain(applied), { ok: true, operationId: "op1", appliedScopes: ["page2_tabpanel"], clearedScopes: [], diagnostics: [] });
  assert.deepEqual(b.facet.writes, [{ itemId: JAHR_ID, itemName: "Jahr", scopeId: "page2_tabpanel", values: [v("2019")] }]);
});

test("tabMutation apply: duplicate and restoreDeleted report unresolved slots with their diagnostics", async () => {
  const b = boot({ items: tmItems() });
  const targets = { 0: { scopeId: "page1_tabpanel", tabId: "t0" } };
  const base = { runId: 1, operationId: "opU", tabIdxToScopeId: targets };
  const dupPlan = { operation: "duplicate", sourceSlot: { tabIdx: 0 }, insertSlot: { tabIdx: 1 }, slotMoves: [{ fromTabIdx: 0, toTabIdx: 7 }] };
  await b.api.dispatch({ type: A.prepare, payload: Object.assign({}, base, { plan: { operation: "move", slotMoves: [] } }) });
  const unresolvedSlot = [{ code: "TABS_MUTATION_PREPARE_FAILED", message: "scopeId could not be resolved for tabIdx 7", tabId: null }];
  const dup = await b.api.dispatch({ type: A.apply, payload: Object.assign({}, base, { plan: dupPlan }) });
  assert.deepEqual(plain(dup), { ok: false, operationId: "opU", appliedScopes: [], clearedScopes: [], diagnostics: unresolvedSlot });
  const rdPlan = { operation: "restoreDeleted", insertSlot: { tabIdx: 1 }, slotMoves: [{ fromTabIdx: 0, toTabIdx: 7 }], restore: { filters: {} } };
  const rd = await b.api.dispatch({ type: A.apply, payload: Object.assign({}, base, { plan: rdPlan }) });
  assert.deepEqual(plain(rd), { ok: false, operationId: "opU", appliedScopes: [], clearedScopes: [], diagnostics: unresolvedSlot });
});

test("tabMutation apply: guards, missing snapshot, unsupported plan, superseded run", async () => {
  const b = boot({ items: tmItems() });
  const plan = { operation: "move", slotMoves: [{ fromTabIdx: 0, toTabIdx: 1 }] };
  const noSnapshot = await b.api.dispatch({ type: A.apply, payload: mutation({ plan }) });
  assert.deepEqual(plain(noSnapshot), {
    ok: false, operationId: "op1", appliedScopes: [], clearedScopes: [],
    diagnostics: [{ code: "TABS_MUTATION_APPLY_FAILED", message: "NativeMultiSelect prepare snapshot missing" }]
  });
  const unsupported = await b.api.dispatch({ type: A.apply, payload: mutation({ plan: { operation: "reorder" } }) });
  assert.equal(unsupported.diagnostics[0].message, "NativeMultiSelect apply supports delete, move, duplicate, and restoreDeleted");
  const noPlan = await b.api.dispatch({ type: A.apply, payload: mutation({}) });
  assert.equal(noPlan.ok, false);
  await b.api.dispatch({ type: A.prepare, payload: mutation({ plan }) });
  const stale = await b.api.dispatch({ type: A.apply, payload: mutation({ runId: 0, plan }) });
  assert.deepEqual(plain(stale), {
    ok: false, operationId: "op1", appliedScopes: [], clearedScopes: [],
    diagnostics: [{ code: "TABS_MUTATION_CANCELLED", message: "NativeMultiSelect tab mutation run was superseded", runId: 0, currentRunId: 1 }]
  });
  const orig = b.facet.writeFilter;
  b.facet.writeFilter = async function (request) {
    b.rt().tabMutationRunId = 8;
    return orig.call(b.facet, request);
  };
  const superseded = await b.api.dispatch({ type: A.apply, payload: mutation({ plan }) });
  assert.equal(superseded.ok, false);
  assert.equal(superseded.diagnostics[0].code, "TABS_MUTATION_CANCELLED");
});

test("tabMutation apply: host write failure becomes an apply diagnostic", async () => {
  const b = boot({ items: tmItems() });
  const plan = { operation: "move", slotMoves: [{ fromTabIdx: 0, fromTabId: "t0", toTabIdx: 1, toTabId: "t1" }] };
  await b.api.dispatch({ type: A.prepare, payload: mutation({ plan }) });
  b.facet.failWrites = true;
  const applied = await b.api.dispatch({ type: A.apply, payload: mutation({ plan }) });
  assert.equal(applied.ok, false);
  assert.ok(applied.diagnostics.length >= 1);
  assert.ok(applied.diagnostics.every((d) => d.code === "TABS_MUTATION_APPLY_FAILED" && d.message === "HOST_FAIL"));
});

test("tabMutation apply: a rejected host write during move and duplicate returns an apply failure and logs once", async () => {
  const plans = {
    move: { operation: "move", slotMoves: [{ fromTabIdx: 0, fromTabId: "t0", toTabIdx: 1, toTabId: "t1" }] },
    duplicate: {
      operation: "duplicate",
      sourceSlot: { tabIdx: 0, tabId: "t0" },
      insertSlot: { tabIdx: 1, tabId: "t1" },
      clonePair: { from: { tabIdx: 0, tabId: "t0" }, to: { tabIdx: 1, tabId: "t1" } },
      slotMoves: []
    }
  };
  for (const name of Object.keys(plans)) {
    const b = boot({ items: tmItems() });
    await b.api.dispatch({ type: A.prepare, payload: mutation({ plan: plans[name] }) });
    b.facet.throwWrites = true;
    const result = await b.api.dispatch({ type: A.apply, payload: mutation({ plan: plans[name] }) });
    assert.deepEqual(plain(result), {
      ok: false,
      operationId: "op1",
      appliedScopes: [],
      clearedScopes: [],
      diagnostics: [{ code: "TABS_MUTATION_APPLY_FAILED", message: "host write crashed" }]
    }, name);
    assert.equal(b.spy.error.length, 1, name);
  }
});

test("tabMutation restoreSnapshot: restores host and owner state and deletes the snapshot", async () => {
  const b = boot({ items: tmItems() });
  const plan = { operation: "move", slotMoves: [{ fromTabIdx: 0, toTabIdx: 1 }] };
  await b.api.dispatch({ type: A.prepare, payload: mutation({ plan }) });
  b.facet.writes.length = 0;
  const result = await b.api.dispatch({ type: A.restoreSnapshot, payload: mutation({}) });
  assert.deepEqual(plain(result), {
    ok: true, operationId: "op1", restored: ["page1_tabpanel", "page2_tabpanel"], unrecoverable: [], diagnostics: []
  });
  assert.deepEqual(b.rt().tabMutationSnapshots, {});
  assert.equal(b.facet.writes.length, 4);
  assert.deepEqual(stateOf(b).byScope.page1_tabpanel.map((i) => i.itemName), ["Jahr", "Land"]);
  const again = await b.api.dispatch({ type: A.restoreSnapshot, payload: mutation({}) });
  assert.deepEqual(plain(again), { ok: true, operationId: "op1", restored: [], unrecoverable: [], diagnostics: [] });
  const stale = await b.api.dispatch({ type: A.restoreSnapshot, payload: mutation({ runId: -1 }) });
  assert.equal(stale.ok, false);
  assert.equal(stale.errorCode, "TABS_MUTATION_CANCELLED");
});

test("tabMutation restoreSnapshot: failed host items are reported as unrecoverable", async () => {
  const b = boot({ items: tmItems() });
  const plan = { operation: "move", slotMoves: [{ fromTabIdx: 0, toTabIdx: 1 }] };
  await b.api.dispatch({ type: A.prepare, payload: mutation({ plan }) });
  b.facet.failWrites = true;
  const result = await b.api.dispatch({ type: A.restoreSnapshot, payload: mutation({}) });
  assert.equal(result.ok, false);
  assert.deepEqual(plain(result.unrecoverable), ["page1_tabpanel", "page2_tabpanel"]);
  assert.equal(result.diagnostics.length, 4);
  assert.equal(result.diagnostics[0].code, "TABS_MUTATION_ROLLBACK_INCOMPLETE");
  assert.deepEqual(b.rt().tabMutationSnapshots, {});
});

test("tabMutation restoreSnapshot: a throwing host write returns an incomplete result and deletes the snapshot", async () => {
  const b = boot({ items: tmItems() });
  const plan = { operation: "move", slotMoves: [{ fromTabIdx: 0, toTabIdx: 1 }] };
  await b.api.dispatch({ type: A.prepare, payload: mutation({ plan }) });
  b.facet.throwWrites = true;
  const result = await b.api.dispatch({ type: A.restoreSnapshot, payload: mutation({}) });
  assert.deepEqual(plain(result), {
    ok: false,
    operationId: "op1",
    restored: [],
    unrecoverable: ["page1_tabpanel", "page2_tabpanel"],
    diagnostics: [{ code: "TABS_MUTATION_ROLLBACK_INCOMPLETE", scopeId: "page1_tabpanel", message: "host write crashed" }]
  });
  assert.deepEqual(b.rt().tabMutationSnapshots, {});
  assert.equal(b.spy.error.length, 1);
  await b.api.dispatch({ type: A.prepare, payload: mutation({ runId: 2, operationId: "op2", plan }) });
  const stale = await b.api.dispatch({ type: A.restoreSnapshot, payload: mutation({ runId: 1, operationId: "op2" }) });
  assert.equal(stale.ok, false);
  assert.deepEqual(Object.keys(b.rt().tabMutationSnapshots), ["op2"]);
});

test("tabMutation resync: pushes owner state back to the host for affected slots", async () => {
  const b = boot({ items: tmItems() });
  b.KDB.state.filters.nativeMultiSelect.byScope = {
    page1_tabpanel: [{ itemId: JAHR_ID, itemName: "Jahr", sourceId: "s", values: [v("2018")] }, { itemId: "gone", itemName: "Gone", values: [] }]
  };
  const plan = { operation: "move", slotMoves: [{ fromTabIdx: 0, fromTabId: "t0", toTabIdx: 0, toTabId: "t0" }] };
  const result = await b.api.dispatch({ type: A.resync, payload: mutation({ plan }) });
  assert.deepEqual(plain(result), { ok: true, operationId: "op1", diagnostics: [] });
  assert.deepEqual(b.facet.writes, [{ itemId: JAHR_ID, itemName: "Jahr", scopeId: "page1_tabpanel", values: [v("2018")] }]);
  const unresolved = await b.api.dispatch({ type: A.resync, payload: mutation({ plan: { slotMoves: [{ fromTabIdx: 9, toTabIdx: 9 }] } }) });
  assert.equal(unresolved.ok, true);
  assert.equal(unresolved.diagnostics[0].code, "TABS_MUTATION_PREPARE_FAILED");
  const stale = await b.api.dispatch({ type: A.resync, payload: mutation({ runId: -3 }) });
  assert.deepEqual(plain(stale), {
    ok: false,
    diagnostics: [{ code: "TABS_MUTATION_CANCELLED", message: "NativeMultiSelect tab mutation run was superseded", runId: -3, currentRunId: 1 }]
  });
  b.facet.failWrites = true;
  const failing = await b.api.dispatch({ type: A.resync, payload: mutation({ plan }) });
  assert.deepEqual(plain(failing), {
    ok: true,
    operationId: "op1",
    diagnostics: [{ code: "TABS_MUTATION_APPLY_FAILED", itemId: JAHR_ID, scopeId: "page1_tabpanel", message: "HOST_FAIL" }]
  });
});
