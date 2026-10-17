// Characterisation of the controller skeleton shared by the five filter owner families
// (singleSelect, sicht, specialSingleSelect, dienststelle, nativeMultiSelect): lifecycle, disposed results,
// warn-once, error boundaries, runtime stamps. Recorded against the code BEFORE the owner kit (Phase 2 W4)
// and kept as is: the same expectations must hold after the owners adopt dashboard/filters/_core.
// Run: node --test tools/tests/filterOwnerControllers.characterisation.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const FILTERS = path.join(JS_ROOT, "dashboard/filters");

function makeConsole() {
  const logged = { warn: [], error: [] };
  return {
    logged,
    log() {}, info() {}, debug() {},
    warn: (...a) => logged.warn.push(a),
    error: (...a) => logged.error.push(a)
  };
}

// state accessor that throws once on demand: forces the next owner step that touches _KDB.state to fail
function armableKDB(base) {
  const KDB = Object.assign({}, base);
  const real = KDB.state;
  const arm = { on: false };
  Object.defineProperty(KDB, "state", {
    configurable: true,
    enumerable: true,
    get() {
      if (arm.on) {
        arm.on = false;
        throw new Error("armed failure");
      }
      return real;
    },
    set() {}
  });
  return { KDB, arm, state: real };
}

function eventsStub(counter) {
  return {
    subscribe(name) {
      counter.subscribed.push(name);
      return function unsubscribe() { counter.unsubscribed += 1; };
    }
  };
}

const TABLE = (rows) => ({ readRows: () => rows });

// --------------------------------------------------------------------------------------------------------------------
// harnesses: one per owner, each returns { api, KDB, arm, con, name, key }
// --------------------------------------------------------------------------------------------------------------------

function bootSingleSelect(modules) {
  const con = makeConsole();
  const register = loadAmd(path.join(FILTERS, "singleSelect/index.js"), { stubs: { console: con }, modules: modules || {} });
  const facet = { listFilterItems: () => ({ ok: true, outcome: "ok", data: [] }) };
  const counter = { subscribed: [], unsubscribed: 0 };
  const { KDB, arm } = armableKDB({
    state: { filters: {} }, runtime: {}, api: {}, elements: {},
    properties: { kennzahlenTablesPropObj: { personal: {} }, filterPropObj: { personal: { filterInstances: {} } } },
    services: { cognosHost: { filters: facet }, tableData: TABLE([]) },
    events: eventsStub(counter)
  });
  const api = register(KDB, {});
  return { api, KDB, arm, con, name: "singleSelect", key: "singleSelect", counter };
}

function bootSicht() {
  const con = makeConsole();
  const register = loadAmd(path.join(FILTERS, "sicht/index.js"), { stubs: { console: con, document: {} } });
  const counter = { subscribed: [], unsubscribed: 0 };
  const { KDB, arm } = armableKDB({
    state: { filters: { singleSelect: { instancesById: {}, inventory: { generation: 1 } } } }, runtime: {}, api: {}, elements: {},
    config: { tables: {} },
    services: {},
    events: eventsStub(counter)
  });
  const api = register(KDB);
  return { api, KDB, arm, con, name: "sicht", key: "sicht", counter };
}

function bootSpecial() {
  const con = makeConsole();
  const register = loadAmd(path.join(FILTERS, "specialSingleSelect/index.js"), {
    stubs: { console: con, document: { querySelector: () => null } }
  });
  const counter = { subscribed: [], unsubscribed: 0 };
  const { KDB, arm } = armableKDB({
    state: { filters: {} }, runtime: {}, api: {}, elements: {},
    config: { tables: {} },
    services: {},
    events: eventsStub(counter)
  });
  const api = register(KDB);
  return { api, KDB, arm, con, name: "specialSingleSelect", key: "specialSingleSelect", counter };
}

function bootDienststelle() {
  const con = makeConsole();
  const register = loadAmd(path.join(FILTERS, "dienststelle/index.js"), { stubs: { console: con } });
  const counter = { subscribed: [], unsubscribed: 0 };
  const { KDB, arm } = armableKDB({
    state: { filters: {} }, runtime: {}, api: {}, elements: {},
    config: { tables: {} },
    services: { cognosHost: {} },
    events: eventsStub(counter)
  });
  const api = register(KDB, {});
  return { api, KDB, arm, con, name: "dienststelle", key: "dienststelle", counter };
}

function bootNative() {
  const con = makeConsole();
  const register = loadAmd(path.join(FILTERS, "nativeMultiSelect/index.js"), { stubs: { console: con } });
  const counter = { subscribed: [], unsubscribed: 0 };
  const { KDB, arm } = armableKDB({
    state: { filters: {} }, runtime: {}, api: {}, elements: {},
    properties: { kennzahlenTablesPropObj: { personal: {} }, filterPropObj: { personal: {} } },
    services: { cognosHost: { filters: { listFilterItems: () => ({ ok: true, outcome: "ok", data: [] }) } } },
    events: eventsStub(counter)
  });
  const api = register(KDB, {});
  return { api, KDB, arm, con, name: "nativeMultiSelect", key: "nativeMultiSelect", counter };
}

const OWNERS = {
  sicht: bootSicht,
  specialSingleSelect: bootSpecial,
  dienststelle: bootDienststelle,
  nativeMultiSelect: bootNative
};

const warnTexts = (h) => h.con.logged.warn.map((a) => String(a[0]));
const errorTexts = (h) => h.con.logged.error.map((a) => String(a[0]));

// --------------------------------------------------------------------------------------------------------------------
// common surface
// --------------------------------------------------------------------------------------------------------------------

for (const [name, boot] of Object.entries(OWNERS)) {
  test(name + ": public surface, registration stamps", () => {
    const h = boot();
    const expected = name === "dienststelle"
      ? ["destroy", "dispatch", "getCurrentHierarchySnapshot", "getState", "mount"]
      : ["destroy", "dispatch", "getState", "mount"];
    assert.deepEqual(Object.keys(h.api).sort(), expected);
    assert.strictEqual(h.KDB.api[name], h.api);
    assert.equal(h.KDB.state.filters[name].lifecycle, "idle");
    const rt = h.KDB.runtime[name];
    ["domRefs", "listeners", "subscriptions", "abortControllers", "observers", "timers", "pendingPromises"]
      .forEach((bucket) => assert.equal(typeof rt[bucket], "object", bucket));
    if (name === "specialSingleSelect") {
      assert.equal("historyReplayHandlerContribution" in rt, false);
    } else {
      assert.equal(typeof rt.historyReplayHandlerContribution.apply, "function");
      assert.equal(rt.historyReplayHandlerContribution.apply({}, null, { key: "unknown_key" }), false);
    }
  });

  test(name + ": mount -> ready, second mount stays true, destroy -> disposed and idempotent", () => {
    const h = boot();
    assert.equal(h.api.mount({}), true);
    assert.equal(h.KDB.state.filters[name].lifecycle, "ready");
    assert.equal(h.api.mount({}), true);
    h.api.destroy();
    assert.equal(h.KDB.state.filters[name].lifecycle, "disposed");
    if (name === "specialSingleSelect") {
      assert.equal("historyReplayHandlerContribution" in h.KDB.runtime[name], false);
    } else {
      assert.strictEqual(h.KDB.runtime[name].historyReplayHandlerContribution, null);
    }
    h.api.destroy();
    assert.deepEqual(errorTexts(h), []);
    assert.deepEqual(warnTexts(h), []);
  });

  test(name + ": after destroy mount is refused (false), getState is undefined, warnings are once per method", () => {
    const h = boot();
    h.api.mount({});
    h.api.destroy();
    assert.equal(h.api.mount({}), false);
    assert.equal(h.api.mount({}), false);
    assert.strictEqual(h.api.getState(), undefined);
    assert.strictEqual(h.api.dispatch({ type: name + "/unknownThing" }), undefined);
    assert.strictEqual(h.api.dispatch({ type: name + "/unknownThing" }), undefined);
    assert.deepEqual(warnTexts(h).sort(), ["[" + name + ".dispatch] called after destroy", "[" + name + ".mount] called after destroy"].sort());
  });
}

// --------------------------------------------------------------------------------------------------------------------
// disposed results per action type
// --------------------------------------------------------------------------------------------------------------------

test("sicht: disposed results per action type", async () => {
  const h = bootSicht();
  h.api.mount({});
  h.api.destroy();
  const ack = (type, payload) => h.api.dispatch({ type, payload });
  const paramTypes = ["parameterSetClearRequested", "parameterSetRestoreRequested", "parameterSetDownstreamVisibilityRequested"];
  for (const t of paramTypes) {
    const result = ack("sicht/" + t, { runId: 1 });
    assert.equal(typeof result.then, "function", t);
    assert.deepEqual(await result, {
      ok: false, degraded: false,
      diagnostics: [{ code: "WRITEBACK_RESTORE_CANCELLED", message: "sicht controller is disposed" }]
    }, t);
  }
  const syncAckTypes = ["singleSelectCommitted", "singleSelectInventoryReconciled", "syncRequested", "singleSelectDraftChanged", "singleSelectDraftReverted"];
  for (const t of syncAckTypes) {
    const result = ack("sicht/" + t, { generation: "7" });
    assert.equal(typeof result.then, "undefined", t);
    assert.deepEqual(result, {
      ok: false, acknowledged: false, degraded: true, disposed: true, inventoryGeneration: 7,
      code: "SICHT_DISPOSED", message: "sicht controller is disposed",
      diagnostics: [{ code: "SICHT_DISPOSED", message: "sicht controller is disposed" }]
    }, t);
  }
  assert.equal(ack("sicht/syncRequested", { inventoryGeneration: "x" }).inventoryGeneration, null);
  assert.equal(ack("sicht/syncRequested").inventoryGeneration, null);
  for (const t of ["filterDockStateChanged", "filterDockPopupReady", "tableDataChanged", "error", "destroy", "unknown"]) {
    assert.strictEqual(ack("sicht/" + t, {}), undefined, t);
  }
  assert.strictEqual(h.api.dispatch(undefined), undefined);
});

test("specialSingleSelect: disposed results per action type", () => {
  const h = bootSpecial();
  h.api.mount({});
  h.api.destroy();
  for (const t of ["userSelectionCommitted", "singleSelectInventoryReconciled", "syncRequested"]) {
    const type = "specialSingleSelect/" + t;
    const result = h.api.dispatch({ type, payload: { inventoryGeneration: 4 } });
    assert.deepEqual(result, {
      ok: false, acknowledged: false, degraded: true, disposed: true,
      errorCode: "SPECIAL_SINGLE_SELECT_DISPOSED", errorMessage: "specialSingleSelect controller is disposed",
      actionType: type, inventoryGeneration: 4,
      diagnostics: [{ code: "SPECIAL_SINGLE_SELECT_DISPOSED", message: "specialSingleSelect controller is disposed" }]
    }, t);
  }
  assert.equal(h.api.dispatch({ type: "specialSingleSelect/syncRequested" }).inventoryGeneration, undefined);
  for (const t of ["sichtChanged", "filterDockStateChanged", "filterDockPopupReady", "tableDataChanged", "error", "unknown"]) {
    assert.strictEqual(h.api.dispatch({ type: "specialSingleSelect/" + t, payload: {} }), undefined, t);
  }
});

test("dienststelle: disposed results per action type", async () => {
  const h = bootDienststelle();
  h.api.mount({});
  h.api.destroy();
  for (const t of ["parameterSetClearRequested", "parameterSetRestoreRequested"]) {
    const result = h.api.dispatch({ type: "dienststelle/" + t, payload: { runId: 1 } });
    assert.deepEqual(await result, {
      ok: false, appliedScopes: [], fallbackScopes: [], missingValues: [],
      diagnostics: [{ code: "WRITEBACK_RESTORE_CANCELLED", message: "dienststelle controller is disposed" }]
    }, t);
  }
  for (const t of ["prepareTabMutation", "applyTabMutation", "restoreTabMutationSnapshot", "resyncTabMutationHost"]) {
    const result = h.api.dispatch({ type: "dienststelle/" + t, payload: { operationId: "op-1" } });
    assert.deepEqual(await result, {
      ok: false, operationId: "op-1",
      diagnostics: [{ code: "TABS_MUTATION_CANCELLED", message: "dienststelle controller is disposed" }]
    }, t);
    assert.equal((await h.api.dispatch({ type: "dienststelle/" + t })).operationId, null, t);
  }
  for (const t of ["historyReplayRequested", "sichtChanged", "syncRequested", "unknown"]) {
    assert.strictEqual(h.api.dispatch({ type: "dienststelle/" + t, payload: {} }), undefined, t);
  }
  assert.strictEqual(h.api.getCurrentHierarchySnapshot({}), undefined);
});

test("nativeMultiSelect: disposed results per action type, warning only for types without a result", async () => {
  const h = bootNative();
  h.api.mount({});
  h.api.destroy();
  for (const t of ["parameterSetClearRequested", "parameterSetRestoreRequested"]) {
    assert.deepEqual(await h.api.dispatch({ type: "nativeMultiSelect/" + t }), {
      ok: false, diagnostics: [{ code: "WRITEBACK_RESTORE_CANCELLED", message: "NativeMultiSelect controller is disposed" }]
    }, t);
  }
  for (const t of ["prepareTabMutation", "applyTabMutation", "restoreTabMutationSnapshot", "resyncTabMutationHost"]) {
    assert.deepEqual(await h.api.dispatch({ type: "nativeMultiSelect/" + t, payload: { operationId: "o9" } }), {
      ok: false, operationId: "o9",
      diagnostics: [{ code: "TABS_MUTATION_CANCELLED", message: "NativeMultiSelect controller is disposed" }]
    }, t);
  }
  assert.deepEqual(h.api.dispatch({ type: "nativeMultiSelect/collectWritebackSnapshotRequested" }), { ok: true, entries: [], diagnostics: [] });
  assert.equal(h.api.dispatch({ type: "nativeMultiSelect/historyReplayRequested" }), false);
  assert.deepEqual(warnTexts(h), []);
  assert.strictEqual(h.api.dispatch({ type: "nativeMultiSelect/filterDockStateChanged" }), undefined);
  assert.strictEqual(h.api.dispatch({ type: "nativeMultiSelect/unknown" }), undefined);
  assert.deepEqual(warnTexts(h), ["[nativeMultiSelect.dispatch] called after destroy"]);
});

test("singleSelect: disposed results per action type (index routing with real state)", async () => {
  const h = bootSingleSelect();
  h.api.destroy();
  const cancelled = { code: "WRITEBACK_RESTORE_CANCELLED", message: "singleSelect controller is disposed" };
  const types = [
    "parameterSetClearRequested", "parameterSetRestoreRequested", "parameterSetResyncRequested", "reconcileFilterInstances",
    "applyOwnerSelection", "applySpecialSelectionPolicy", "prepareTabMutation", "applyTabMutation", "restoreTabMutationSnapshot"
  ];
  for (const t of types) {
    assert.deepEqual(await h.api.dispatch({ type: "singleSelect/" + t, payload: {} }), {
      ok: false, degraded: false, applied: [], skipped: [], diagnostics: [cancelled]
    }, t);
  }
  assert.deepEqual(await h.api.dispatch({ type: "singleSelect/parameterSetRunFinished", payload: { runId: 5 } }), {
    ok: false, runId: 5, released: false, alreadyReleased: false, diagnostics: [cancelled]
  });
  assert.equal((await h.api.dispatch({ type: "singleSelect/parameterSetRunFinished", payload: { runId: "x" } })).runId, null);
  assert.equal((await h.api.dispatch({ type: "singleSelect/parameterSetRunFinished" })).runId, null);
  assert.strictEqual(h.api.dispatch({ type: "singleSelect/resyncTabMutationHost", payload: {} }), undefined);
  assert.strictEqual(h.api.dispatch({ type: "singleSelect/filterDockStateChanged", payload: {} }), undefined);
  assert.strictEqual(h.api.dispatch(undefined), undefined);
  assert.strictEqual(h.api.getState(), undefined);
  assert.deepEqual(warnTexts(h), ["[singleSelect.dispatch] called after destroy"]);
});

// --------------------------------------------------------------------------------------------------------------------
// error boundaries
// --------------------------------------------------------------------------------------------------------------------

test("sicht: mount failure logs and returns false without touching the state", () => {
  const h = bootSicht();
  h.arm.on = true;
  assert.equal(h.api.mount({}), false);
  assert.deepEqual(errorTexts(h), ["[sicht.mount] failed"]);
  assert.equal(h.KDB.state.filters.sicht.lifecycle, "idle");
});

test("sicht: destroy failure logs, guard stays disposed, replay handler already cleared", () => {
  const h = bootSicht();
  h.api.mount({});
  h.arm.on = true;
  h.api.destroy();
  assert.deepEqual(errorTexts(h), ["[sicht.destroy] failed"]);
  assert.strictEqual(h.KDB.runtime.sicht.historyReplayHandlerContribution, null);
  assert.equal(h.KDB.state.filters.sicht.lifecycle, "ready");
  assert.strictEqual(h.api.getState(), undefined);
  assert.equal(h.api.mount({}), false);
});

test("sicht: dispatch failure records the error state; ack types answer with SICHT_DISPATCH_FAILED", () => {
  const h = bootSicht();
  h.api.mount({});
  const throwing = (type) => ({ type, get payload() { throw new Error("bad payload"); } });
  assert.deepEqual(h.api.dispatch(throwing("sicht/singleSelectDraftChanged")), {
    ok: false, code: "SICHT_DISPATCH_FAILED", message: "bad payload"
  });
  assert.equal(h.KDB.state.filters.sicht.lifecycle, "error");
  assert.equal(h.KDB.state.filters.sicht.errorCode, "SICHT_DISPATCH_FAILED");
  assert.strictEqual(h.api.dispatch(throwing("sicht/error")), undefined);
  assert.deepEqual(errorTexts(h), ["[sicht.dispatch] failed", "[sicht.dispatch] failed"]);
  assert.equal(h.con.logged.error[0].length, 2);
});

test("specialSingleSelect: mount failure logs and returns false", () => {
  const h = bootSpecial();
  h.arm.on = true;
  assert.equal(h.api.mount({}), false);
  assert.deepEqual(errorTexts(h), ["[specialSingleSelect.mount] failed"]);
});

test("specialSingleSelect: destroy failure logs after the buckets were released", () => {
  const h = bootSpecial();
  h.api.mount({});
  h.arm.on = true;
  h.api.destroy();
  assert.deepEqual(errorTexts(h), ["[specialSingleSelect.destroy] failed"]);
  assert.strictEqual(h.KDB.runtime.specialSingleSelect.syncRequest, null);
  assert.equal(h.api.mount({}), false);
});

test("specialSingleSelect: dispatch failure -> ERROR state, ack types get the failure ack", () => {
  const h = bootSpecial();
  h.api.mount({});
  const throwing = (type) => ({ type, payload: { inventoryGeneration: 2, get filterId() { throw new Error("boom payload"); } } });
  const ack = h.api.dispatch(throwing("specialSingleSelect/userSelectionCommitted"));
  assert.deepEqual(ack, {
    ok: false, acknowledged: false, degraded: true, disposed: false,
    errorCode: "SPECIAL_SINGLE_SELECT_DISPATCH_FAILED", errorMessage: "boom payload",
    actionType: "specialSingleSelect/userSelectionCommitted", inventoryGeneration: 2,
    diagnostics: [{ code: "SPECIAL_SINGLE_SELECT_DISPATCH_FAILED", message: "boom payload" }]
  });
  assert.equal(h.KDB.state.filters.specialSingleSelect.lifecycle, "error");
  assert.equal(h.KDB.state.filters.specialSingleSelect.errorCode, "SPECIAL_SINGLE_SELECT_DISPATCH_FAILED");
  assert.strictEqual(h.api.dispatch({ type: "specialSingleSelect/sichtChanged", payload: { get activeSichtValue() { throw new Error("x"); } } }), undefined);
  assert.deepEqual(errorTexts(h), ["[specialSingleSelect.dispatch] failed", "[specialSingleSelect.dispatch] failed"]);
});

test("specialSingleSelect: a non-promise route result is dropped, the state is returned (pinned baseline)", () => {
  const h = bootSpecial();
  h.api.mount({});
  const result = h.api.dispatch({ type: "specialSingleSelect/filterDockStateChanged", payload: { filterId: "nope" } });
  assert.equal(result.lifecycle, "ready");
  assert.equal(typeof result.then, "undefined");
});

test("dienststelle: mount subscribes to tableData, destroy releases it and resets run bookkeeping", () => {
  const h = bootDienststelle();
  assert.deepEqual(h.counter.subscribed, []);
  assert.equal(h.api.mount({}), true);
  assert.deepEqual(h.counter.subscribed, ["tableData:loadFinished"]);
  assert.equal(h.api.mount({}), true);
  assert.equal(h.counter.unsubscribed, 1);
  h.KDB.runtime.dienststelle.tabMutationRunId = 4;
  h.KDB.runtime.dienststelle.tabMutationSnapshots = { x: 1 };
  h.api.destroy();
  assert.equal(h.counter.unsubscribed, 2);
  assert.equal(h.KDB.runtime.dienststelle.tabMutationRunId, 0);
  assert.deepEqual(h.KDB.runtime.dienststelle.tabMutationSnapshots, {});
  assert.deepEqual(h.KDB.runtime.dienststelle.subscriptions, {});
});

test("dienststelle: mount failure returns false, destroy failure logs", () => {
  const h = bootDienststelle();
  h.arm.on = true;
  assert.equal(h.api.mount({}), false);
  assert.deepEqual(errorTexts(h), ["[dienststelle.mount] failed"]);
  const g = bootDienststelle();
  g.api.mount({});
  g.arm.on = true;
  g.api.destroy();
  assert.deepEqual(errorTexts(g), ["[dienststelle.destroy] failed"]);
  assert.strictEqual(g.KDB.runtime.dienststelle.historyReplayHandlerContribution, null);
});

test("dienststelle: dispatch failure records the error state and returns undefined", () => {
  const h = bootDienststelle();
  h.api.mount({});
  const result = h.api.dispatch({ get type() { throw new Error("type boom"); } });
  assert.strictEqual(result, undefined);
  assert.equal(h.KDB.state.filters.dienststelle.errorCode, "DIENSTSTELLE_DISPATCH_FAILED");
  assert.equal(h.KDB.state.filters.dienststelle.errorMessage, "type boom");
  assert.deepEqual(errorTexts(h), ["[dienststelle.dispatch] failed"]);
});

test("nativeMultiSelect: mount/destroy/dispatch failures log without 'failed' and record the error state", () => {
  const h = bootNative();
  h.arm.on = true;
  assert.equal(h.api.mount({}), false);
  assert.equal(h.KDB.state.filters.nativeMultiSelect.errorCode, "NATIVE_MULTI_SELECT_MOUNT_FAILED");
  assert.deepEqual(errorTexts(h), ["[nativeMultiSelect.mount]"]);
  const g = bootNative();
  g.api.mount({});
  const result = g.api.dispatch({ get type() { throw new Error("type boom"); } });
  assert.strictEqual(result, undefined);
  assert.equal(g.KDB.state.filters.nativeMultiSelect.errorCode, "NATIVE_MULTI_SELECT_DISPATCH_FAILED");
  assert.equal(g.KDB.state.filters.nativeMultiSelect.errorMessage, "type boom");
  assert.deepEqual(errorTexts(g), ["[nativeMultiSelect.dispatch]"]);
  const d = bootNative();
  d.api.mount({});
  d.arm.on = true;
  d.api.destroy();
  assert.deepEqual(errorTexts(d), ["[nativeMultiSelect.destroy]"]);
  assert.strictEqual(d.KDB.runtime.nativeMultiSelect.historyReplayHandlerContribution, null);
});

test("nativeMultiSelect: getState returns the live reference, unknown types are reduced as given", () => {
  const h = bootNative();
  h.api.mount({});
  assert.strictEqual(h.api.getState(), h.KDB.state.filters.nativeMultiSelect);
  assert.strictEqual(h.api.dispatch({ type: "nativeMultiSelect/unknownThing" }), h.KDB.state.filters.nativeMultiSelect);
});

// singleSelect: handler modules are swapped for throwing stubs, index/state/reducer are real
const throwingHandler = (message) => function () { throw new Error(message); };
const SS_MODULES = {
  "./inventory/reconcile.js": { reconcileFilterInstances: throwingHandler("reconcile boom") },
  "./commit/ownerSelection.js": { applyOwnerSelection: throwingHandler("owner boom") }
};

test("singleSelect: a throwing reconcile during mount records SINGLE_SELECT_MOUNT_FAILED and returns false", () => {
  const h = bootSingleSelect(SS_MODULES);
  assert.equal(h.api.mount({}), false);
  assert.equal(h.KDB.state.filters.singleSelect.lifecycle, "error");
  assert.equal(h.KDB.state.filters.singleSelect.errorCode, "SINGLE_SELECT_MOUNT_FAILED");
  assert.equal(h.KDB.state.filters.singleSelect.errorMessage, "reconcile boom");
  assert.deepEqual(errorTexts(h), ["[singleSelect.mount] failed"]);
});

test("singleSelect: mount failure outside dispatch (state removed) -> MOUNT_FAILED", () => {
  const h = bootSingleSelect({});
  h.KDB.state.filters.singleSelect = null;
  assert.equal(h.api.mount({}), false);
  assert.equal(h.KDB.state.filters.singleSelect.errorCode, "SINGLE_SELECT_MOUNT_FAILED");
  assert.deepEqual(errorTexts(h), ["[singleSelect.mount] failed"]);
});

test("singleSelect: dispatch failure logs the action type, records the error state, returns undefined", () => {
  const h = bootSingleSelect(SS_MODULES);
  const result = h.api.dispatch({ type: "singleSelect/applyOwnerSelection", payload: {} });
  assert.strictEqual(result, undefined);
  assert.equal(h.KDB.state.filters.singleSelect.errorCode, "SINGLE_SELECT_DISPATCH_FAILED");
  assert.equal(h.KDB.state.filters.singleSelect.errorMessage, "owner boom");
  assert.equal(h.con.logged.error.length, 1);
  assert.equal(h.con.logged.error[0][0], "[singleSelect.dispatch] failed");
  assert.deepEqual(h.con.logged.error[0][1], { actionType: "singleSelect/applyOwnerSelection" });
  assert.equal(h.con.logged.error[0][2].message, "owner boom");
});

test("singleSelect: destroy resets the runtime, clears the replay handler and reduces DESTROY; failure logs", () => {
  const h = bootSingleSelect({});
  h.KDB.runtime.singleSelect.inFlight = { a: 1 };
  h.KDB.runtime.singleSelect.parameterSetRunId = 4;
  h.api.destroy();
  const rt = h.KDB.runtime.singleSelect;
  assert.deepEqual(rt.inFlight, {});
  assert.equal(rt.filtersFacet, null);
  assert.equal("parameterSetRunId" in rt, false);
  assert.strictEqual(rt.historyReplayHandlerContribution, null);
  assert.equal(h.KDB.state.filters.singleSelect.lifecycle, "disposed");
  const g = bootSingleSelect({});
  g.arm.on = true;
  g.api.destroy();
  assert.deepEqual(errorTexts(g), ["[singleSelect.destroy] failed"]);
  assert.strictEqual(g.api.getState(), undefined);
});

test("singleSelect: STATE handlers return the state snapshot, ERROR is reduced, getState is the projected copy", () => {
  const h = bootSingleSelect({});
  const state = h.api.dispatch({ type: "singleSelect/error", payload: { errorCode: "E1", errorMessage: "m" } });
  assert.equal(state.errorCode, "E1");
  assert.notStrictEqual(state, h.KDB.state.filters.singleSelect);
  assert.notStrictEqual(h.api.getState(), h.KDB.state.filters.singleSelect);
  assert.deepEqual(Object.keys(h.api.getState()).sort(), [
    "byScope", "compatibilityDiagnostics", "errorCode", "errorMessage", "instancesById", "inventory", "lastConfirmedAt",
    "lastDiagnostics", "lastInteraction", "lifecycle", "meta"
  ]);
});

// --------------------------------------------------------------------------------------------------------------------
// dienststelle / nativeMultiSelect: pieces the kit adoption (Phase 2 W5) moves: tableData watcher, run guard,
// destroy resets, return values. Recorded on the code BEFORE W5.
// --------------------------------------------------------------------------------------------------------------------

function bootDienststelleWithEvents() {
  const con = makeConsole();
  const register = loadAmd(path.join(FILTERS, "dienststelle/index.js"), { stubs: { console: con } });
  const handlers = [];
  const counter = { subscribed: [], unsubscribed: 0 };
  const { KDB, arm } = armableKDB({
    state: { filters: {} }, runtime: {}, api: {}, elements: {},
    config: { tables: { dienststelle_bw_hierarchy: { name: " Org Tree " } } },
    services: { cognosHost: {} },
    events: {
      subscribe(name, handler) {
        counter.subscribed.push(name);
        handlers.push(handler);
        return function unsubscribe() { counter.unsubscribed += 1; };
      }
    }
  });
  const api = register(KDB, {});
  return { api, KDB, arm, con, name: "dienststelle", key: "dienststelle", counter, handlers };
}

test("dienststelle: tableData handler dispatches TABLE_DATA_CHANGED for relevant tables only, through the public dispatch", () => {
  const h = bootDienststelleWithEvents();
  h.api.mount({});
  const seen = [];
  h.api.dispatch = (action) => { seen.push(action); };
  const fire = h.handlers[h.handlers.length - 1];
  fire({ tableName: "other", rowCount: 1 });
  fire({ tableName: "" });
  fire(undefined);
  fire({});
  fire({ tableName: "dienststelle_bw_default", rowCount: 3 });
  fire({ tableName: "ORG TREE", rowCount: 0 });
  fire({ tableName: "dienststelle_dezpv_hierarchy" });
  assert.deepEqual(seen, [
    { type: "dienststelle/tableDataChanged", payload: { tableName: "dienststelle_bw_default", rowCount: 3, source: "tableData" } },
    { type: "dienststelle/tableDataChanged", payload: { tableName: "ORG TREE", rowCount: 0, source: "tableData" } },
    { type: "dienststelle/tableDataChanged", payload: { tableName: "dienststelle_dezpv_hierarchy", rowCount: undefined, source: "tableData" } }
  ]);
});

test("dienststelle: a tableData event after destroy warns once through dispatch and does not throw", () => {
  const h = bootDienststelleWithEvents();
  h.api.mount({});
  const fire = h.handlers[h.handlers.length - 1];
  h.api.destroy();
  fire({ tableName: "dienststelle_bw_default", rowCount: 1 });
  fire({ tableName: "dienststelle_bw_default", rowCount: 1 });
  assert.deepEqual(warnTexts(h), ["[dienststelle.dispatch] called after destroy"]);
  assert.deepEqual(errorTexts(h), []);
});

test("dienststelle: parameterSet run guard (invalid, accepted + stamped, equal, stale) and its destroy behaviour", async () => {
  const h = bootDienststelleWithEvents();
  const run = (type, runId) => h.api.dispatch({ type: "dienststelle/" + type, payload: { runId } });
  const cancelledMessage = async (promise) => {
    const result = await promise;
    assert.equal(result.ok, false);
    assert.equal(result.diagnostics.length, 1);
    assert.equal(result.diagnostics[0].code, "WRITEBACK_RESTORE_CANCELLED");
    return result.diagnostics[0].message;
  };
  const INVALID = "dienststelle parameterSet action requires a numeric runId";
  for (const bad of [undefined, "7", NaN, Infinity]) {
    assert.equal(await cancelledMessage(run("parameterSetRestoreRequested", bad)), INVALID);
  }
  assert.equal(await cancelledMessage(h.api.dispatch({ type: "dienststelle/parameterSetClearRequested" })), INVALID);
  assert.equal(h.KDB.runtime.dienststelle.parameterSetRunId, 0);
  await run("parameterSetClearRequested", 5);
  assert.equal(h.KDB.runtime.dienststelle.parameterSetRunId, 5);
  assert.equal(await cancelledMessage(run("parameterSetRestoreRequested", 3)), "stale parameterSet runId 3 superseded by 5");
  assert.equal(h.KDB.runtime.dienststelle.parameterSetRunId, 5);
  await run("parameterSetClearRequested", 5);
  assert.equal(h.KDB.runtime.dienststelle.parameterSetRunId, 5);
  await run("parameterSetClearRequested", 9);
  assert.equal(h.KDB.runtime.dienststelle.parameterSetRunId, 9);
  h.api.mount({});
  h.api.destroy();
  assert.equal(h.KDB.runtime.dienststelle.parameterSetRunId, 9);
});

test("dienststelle: unknown actions return the live state, getState is a copy, history replay answers a promise of a boolean", async () => {
  const h = bootDienststelle();
  h.api.mount({});
  const live = h.KDB.state.filters.dienststelle;
  assert.strictEqual(h.api.dispatch({ type: "dienststelle/unknownThing" }), live);
  assert.strictEqual(h.api.dispatch(undefined), live);
  assert.notStrictEqual(h.api.getState(), live);
  assert.deepEqual(h.api.getState(), live);
  const replay = h.api.dispatch({ type: "dienststelle/historyReplayRequested", payload: {} });
  assert.equal(typeof replay.then, "function");
  assert.equal(typeof (await replay), "boolean");
  const snapshot = h.api.getCurrentHierarchySnapshot({});
  assert.ok(snapshot === null || typeof snapshot === "object");
  assert.deepEqual(errorTexts(h), []);
});

test("dienststelle: tab-mutation actions before mount create the runtime lazily and answer through the saga routes", async () => {
  const h = bootDienststelle();
  const result = h.api.dispatch({ type: "dienststelle/prepareTabMutation", payload: { operationId: "op-7" } });
  assert.equal(typeof result.then, "function");
  const settled = await result;
  assert.equal(settled.ok, false);
  assert.equal(h.KDB.runtime.dienststelle.tabMutationRunId >= 0, true);
});

test("nativeMultiSelect: destroy resets run bookkeeping; the run guard stamps and rejects through dispatch", async () => {
  const h = bootNative();
  h.api.mount({});
  const cancelled = (message) => ({ ok: false, diagnostics: [{ code: "WRITEBACK_RESTORE_CANCELLED", message }] });
  const clear = (runId) => h.api.dispatch({ type: "nativeMultiSelect/parameterSetClearRequested", payload: { runId } });
  assert.deepEqual(await clear(undefined), cancelled("NativeMultiSelect parameterSet action requires a numeric runId"));
  assert.deepEqual(await clear("3"), cancelled("NativeMultiSelect parameterSet action requires a numeric runId"));
  assert.equal(h.KDB.runtime.nativeMultiSelect.parameterSetRunId, 0);
  await clear(8);
  assert.equal(h.KDB.runtime.nativeMultiSelect.parameterSetRunId, 8);
  assert.deepEqual(await clear(2), cancelled("stale parameterSet runId 2 superseded by 8"));
  await clear(8);
  assert.equal(h.KDB.runtime.nativeMultiSelect.parameterSetRunId, 8);
  h.KDB.runtime.nativeMultiSelect.tabMutationRunId = 4;
  h.KDB.runtime.nativeMultiSelect.tabMutationSnapshots = { a: 1 };
  h.api.destroy();
  const rt = h.KDB.runtime.nativeMultiSelect;
  assert.equal(rt.parameterSetRunId, 0);
  assert.equal(rt.tabMutationRunId, 0);
  assert.deepEqual(rt.tabMutationSnapshots, {});
  assert.deepEqual(rt.subscriptions, {});
  assert.strictEqual(rt.historyReplayHandlerContribution, null);
  assert.equal(h.KDB.state.filters.nativeMultiSelect.lifecycle, "disposed");
});

test("nativeMultiSelect: runtime release failures are logged once as an array, destroy still completes", () => {
  const h = bootNative();
  h.api.mount({});
  h.KDB.runtime.nativeMultiSelect.observers = { bad: { disconnect() { throw new Error("disconnect boom"); } } };
  h.api.destroy();
  assert.equal(h.con.logged.error.length, 1);
  assert.equal(h.con.logged.error[0][0], "[nativeMultiSelect.destroy] runtime cleanup failed");
  assert.equal(Array.isArray(h.con.logged.error[0][1]), true);
  assert.equal(h.KDB.state.filters.nativeMultiSelect.lifecycle, "disposed");
});

test("dienststelle: runtime release failures warn per error and destroy still completes", () => {
  const h = bootDienststelle();
  h.api.mount({});
  h.KDB.runtime.dienststelle.observers = { bad: { disconnect() { throw new Error("disconnect boom"); } } };
  h.api.destroy();
  assert.deepEqual(warnTexts(h), ["[dienststelle.destroy] runtime release failed"]);
  assert.equal(h.KDB.state.filters.dienststelle.lifecycle, "disposed");
});
