// Unit tests of dashboard/filters/_core/{ownerController,tableDataWatcher}.js. The controller specs also model the two
// owners that adopt the kit later (dienststelle: default logging + disposed table; nativeMultiSelect: custom log
// text, warn-only-without-result, error state reporting) to prove the API needs no change for them.
// Run: node --test tools/tests/filterOwnerKit.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const CORE = path.join(JS_ROOT, "dashboard/filters/_core");

function makeConsole() {
  const logged = { warn: [], error: [] };
  return {
    logged,
    log() {}, info() {}, debug() {},
    warn: (...a) => logged.warn.push(a),
    error: (...a) => logged.error.push(a)
  };
}

function loadKit(file, con) {
  return loadAmd(path.join(CORE, file), { stubs: { console: con || makeConsole() } });
}

function loadGuardKit(con) {
  return loadAmd(path.join(JS_ROOT, "core/utils/kit/errors.js"), { stubs: { console: con } });
}

// ---------------------------------------------------------------------------------------------------------------
// ownerController
// ---------------------------------------------------------------------------------------------------------------

function makeOwner(overrides, con) {
  const quiet = con || makeConsole();
  const controllerKit = loadKit("ownerController.js", quiet);
  const kitErrors = loadGuardKit(quiet);
  const KDB = { state: { filters: { demo: { lifecycle: "idle" } } }, runtime: { demo: { historyReplayHandlerContribution: { apply() {} } } } };
  const guard = kitErrors.createDisposedGuard("demo");
  const events = [];
  const reduce = controllerKit.createStateWriter(KDB, "demo", (state, action) => {
    events.push("reduce:" + action.type);
    return Object.assign({}, state, { last: action.type });
  });
  const spec = Object.assign({
    _KDB: KDB,
    name: "demo",
    guard,
    reduce,
    mount() { events.push("mount"); },
    teardown() { events.push("teardown:disposed=" + guard.isDisposed()); },
    route(action) { events.push("route:" + action.type); return "routed"; },
    destroyAction: "demo/destroy",
    clearsReplayContribution: true,
    disposedResults: {}
  }, overrides || {});
  const api = controllerKit.createOwnerController(spec);
  return { api, KDB, guard, events, controllerKit, kitErrors };
}

test("controller: returns exactly the four public methods", () => {
  const { api } = makeOwner();
  assert.deepEqual(Object.keys(api), ["mount", "destroy", "dispatch", "getState"]);
});

test("controller: mount runs the body and returns true; blocked after destroy with one warning per method", () => {
  const con = makeConsole();
  const { api, events } = makeOwner({}, con);
  assert.equal(api.mount({ a: 1 }), true);
  assert.deepEqual(events, ["mount"]);
  api.destroy();
  assert.equal(api.mount(), false);
  assert.equal(api.mount(), false);
  assert.deepEqual(con.logged.warn.map((a) => a[0]), ["[demo.mount] called after destroy"]);
});

test("controller: mount body receives the options; a throwing body logs, runs onMountError and returns false", () => {
  const con = makeConsole();
  const seen = [];
  const { api } = makeOwner({
    mount(options) { seen.push(options); throw new Error("mount boom"); },
    onMountError(error) { seen.push(error.message); }
  }, con);
  assert.equal(api.mount({ x: 1 }), false);
  assert.deepEqual(seen, [{ x: 1 }, "mount boom"]);
});

test("controller: destroy disposes the guard first, then teardown, replay clear, DESTROY; second destroy is a no-op", () => {
  const { api, events, KDB } = makeOwner();
  api.destroy();
  assert.deepEqual(events, ["teardown:disposed=true", "reduce:demo/destroy"]);
  assert.strictEqual(KDB.runtime.demo.historyReplayHandlerContribution, null);
  assert.equal(KDB.state.filters.demo.last, "demo/destroy");
  api.destroy();
  assert.deepEqual(events, ["teardown:disposed=true", "reduce:demo/destroy"]);
});

test("controller: destroy without clearsReplayContribution / destroyAction leaves both alone", () => {
  const { api, events, KDB } = makeOwner({ clearsReplayContribution: false, destroyAction: undefined });
  api.destroy();
  assert.deepEqual(events, ["teardown:disposed=true"]);
  assert.equal(typeof KDB.runtime.demo.historyReplayHandlerContribution.apply, "function");
});

test("controller: a throwing teardown logs, skips the remaining steps and calls onDestroyError", () => {
  const con = makeConsole();
  const seen = [];
  const { api, events, KDB } = makeOwner({
    teardown() { throw new Error("teardown boom"); },
    onDestroyError(error) { seen.push(error.message); }
  }, con);
  api.destroy();
  assert.deepEqual(events, []);
  assert.equal(typeof KDB.runtime.demo.historyReplayHandlerContribution.apply, "function");
  assert.deepEqual(seen, ["teardown boom"]);
  assert.equal(con.logged.error[0][0], "[demo.destroy] failed");
  assert.equal(api.mount(), false);
});

test("controller: dispatch returns the route result; the action is normalised to an object", () => {
  const { api, events } = makeOwner({ route(action) { events.push(typeof action); return action.type; } });
  assert.equal(api.dispatch({ type: "demo/x" }), "demo/x");
  assert.equal(api.dispatch(undefined), undefined);
  assert.equal(api.dispatch(null), undefined);
  assert.deepEqual(events, ["object", "object", "object"]);
});

test("controller: dispatch failure logs with the default text, reports through onDispatchError and returns its result", () => {
  const con = makeConsole();
  const reported = [];
  const { api } = makeOwner({
    route() { throw new Error("route boom"); },
    onDispatchError(error, action) { reported.push([error.message, action.type]); return { ok: false }; }
  }, con);
  assert.deepEqual(api.dispatch({ type: "demo/x" }), { ok: false });
  assert.deepEqual(reported, [["route boom", "demo/x"]]);
  assert.equal(con.logged.error[0][0], "[demo.dispatch] failed");
  assert.equal(con.logged.error[0][1].message, "route boom");
  const plain = makeOwner({ route() { throw new Error("x"); } }, con);
  assert.strictEqual(plain.api.dispatch({ type: "demo/y" }), undefined);
});

test("controller: logFailure override receives phase, error and action", () => {
  const calls = [];
  const { api } = makeOwner({
    route() { throw new Error("e"); },
    mount() { throw new Error("m"); },
    teardown() { throw new Error("t"); },
    logFailure(phase, error, action) { calls.push([phase, error.message, action && action.type]); }
  });
  api.mount();
  api.dispatch({ type: "demo/z" });
  api.destroy();
  assert.deepEqual(calls, [["mount", "m", undefined], ["dispatch", "e", "demo/z"], ["destroy", "t", undefined]]);
});

test("controller: disposed results answer per action type, warn once, unknown types and prototype keys give undefined", async () => {
  const con = makeConsole();
  const { api } = makeOwner({
    disposedResults: {
      "demo/ack": (action) => ({ ok: false, type: action.type }),
      "demo/promise": () => Promise.resolve("p")
    }
  }, con);
  api.destroy();
  assert.deepEqual(api.dispatch({ type: "demo/ack" }), { ok: false, type: "demo/ack" });
  assert.equal(await api.dispatch({ type: "demo/promise" }), "p");
  assert.strictEqual(api.dispatch({ type: "demo/other" }), undefined);
  assert.strictEqual(api.dispatch({ type: "toString" }), undefined);
  assert.strictEqual(api.dispatch({ type: "__proto__" }), undefined);
  assert.strictEqual(api.dispatch(undefined), undefined);
  assert.deepEqual(con.logged.warn.map((a) => a[0]), ["[demo.dispatch] called after destroy"]);
});

test("controller (nativeMultiSelect style): warnOnDisposedResult:false warns only for types without a result", () => {
  const con = makeConsole();
  const { api } = makeOwner({
    warnOnDisposedResult: false,
    disposedResults: { "demo/ack": () => "ack" }
  }, con);
  api.destroy();
  assert.equal(api.dispatch({ type: "demo/ack" }), "ack");
  assert.deepEqual(con.logged.warn, []);
  assert.strictEqual(api.dispatch({ type: "demo/other" }), undefined);
  assert.strictEqual(api.dispatch({ type: "demo/other" }), undefined);
  assert.deepEqual(con.logged.warn.map((a) => a[0]), ["[demo.dispatch] called after destroy"]);
});

test("controller (nativeMultiSelect style): custom log text and error-state reporting for all three phases", () => {
  const con = makeConsole();
  const { KDB, controllerKit, kitErrors } = makeOwner({}, con);
  const reduceError = controllerKit.createStateWriter(KDB, "demo", (state, action) => Object.assign({}, state, { error: action.payload.errorCode }));
  const owner = controllerKit.createOwnerController({
    _KDB: KDB, name: "demo", guard: kitErrors.createDisposedGuard("demo"), reduce: reduceError,
    mount() { throw new Error("m"); },
    teardown() { throw new Error("t"); },
    route() { throw new Error("r"); },
    readState() { return KDB.state.filters.demo; },
    logFailure(phase, error) { con.error("[demo." + phase + "]", error); },
    onMountError(error) { reduceError({ payload: { errorCode: "MOUNT_FAILED:" + error.message } }); },
    onDispatchError(error) { reduceError({ payload: { errorCode: "DISPATCH_FAILED:" + error.message } }); },
    onDestroyError(error) { reduceError({ payload: { errorCode: "DESTROY_FAILED:" + error.message } }); }
  });
  assert.equal(owner.mount(), false);
  assert.equal(KDB.state.filters.demo.error, "MOUNT_FAILED:m");
  assert.strictEqual(owner.dispatch({ type: "x" }), undefined);
  assert.equal(KDB.state.filters.demo.error, "DISPATCH_FAILED:r");
  owner.destroy();
  assert.equal(KDB.state.filters.demo.error, "DESTROY_FAILED:t");
  assert.deepEqual(con.logged.error.map((a) => a[0]), ["[demo.mount]", "[demo.dispatch]", "[demo.destroy]"]);
  assert.strictEqual(owner.getState(), undefined);
});

test("controller: getState is undefined once disposed; default is a JSON copy; readState overrides", () => {
  const { api, KDB } = makeOwner();
  const copy = api.getState();
  assert.deepEqual(copy, { lifecycle: "idle" });
  assert.notStrictEqual(copy, KDB.state.filters.demo);
  api.destroy();
  assert.strictEqual(api.getState(), undefined);
  const live = makeOwner({ readState() { return KDB_LIVE; } });
  const KDB_LIVE = { live: true };
  assert.strictEqual(live.api.getState(), KDB_LIVE);
  const none = makeOwner();
  none.KDB.state.filters.demo = null;
  assert.strictEqual(none.api.getState(), undefined);
});

test("controller: createStateWriter is a no-op without _KDB.state.filters and writes through the reducer otherwise", () => {
  const kit = loadKit("ownerController.js");
  const KDB = { state: {} };
  const reduce = kit.createStateWriter(KDB, "demo", (state, action) => ({ prev: state, type: action.type }));
  reduce({ type: "a" });
  assert.deepEqual(KDB.state, {});
  KDB.state.filters = {};
  reduce({ type: "a" });
  reduce({ type: "b" });
  assert.deepEqual(KDB.state.filters.demo, { prev: { prev: undefined, type: "a" }, type: "b" });
});

test("prepareOwnerNamespaces: namespaces, optional selectors, initial state only when missing", () => {
  const kit = loadKit("ownerController.js");
  const KDB = {};
  let created = 0;
  kit.prepareOwnerNamespaces(KDB, "demo", { createInitialState: () => { created += 1; return { n: created }; }, domSelectors: { root: "x" } });
  assert.deepEqual(KDB, {
    state: { filters: { demo: { n: 1 } } }, runtime: {}, api: {}, elements: { selectors: { demo: { root: "x" } } }
  });
  kit.prepareOwnerNamespaces(KDB, "demo", { createInitialState: () => { created += 1; return { n: created }; }, domSelectors: { root: "y" } });
  assert.equal(created, 1);
  assert.deepEqual(KDB.elements.selectors.demo, { root: "y" });
  const bare = {};
  kit.prepareOwnerNamespaces(bare, "other", {});
  assert.deepEqual(bare, { state: { filters: {} }, runtime: {}, api: {} });
});

// ---------------------------------------------------------------------------------------------------------------
// tableDataWatcher
// ---------------------------------------------------------------------------------------------------------------

function makeBus() {
  const bus = { handlers: [], unsubscribed: 0 };
  bus.subscribe = (name, handler) => {
    bus.handlers.push({ name, handler });
    return () => { bus.unsubscribed += 1; };
  };
  return bus;
}

test("table matcher: keys and configured names, trimmed and case-insensitive; empty names never match", () => {
  const kit = loadKit("tableDataWatcher.js");
  const isRelevant = kit.createTableNameMatcher(["sicht_bw", "Alle"]);
  const KDB = { config: { tables: { sicht_bw: { name: " Sicht BW Tabelle " }, Alle: {} } } };
  assert.equal(isRelevant(KDB, "SICHT_BW"), true);
  assert.equal(isRelevant(KDB, "  sicht bw tabelle"), true);
  assert.equal(isRelevant(KDB, "alle"), true);
  assert.equal(isRelevant(KDB, "other"), false);
  assert.equal(isRelevant(KDB, ""), false);
  assert.equal(isRelevant(KDB, null), false);
  assert.equal(isRelevant({}, "ALLE"), true);
  assert.equal(isRelevant(null, "alle"), true);
  KDB.config.tables.Alle.name = "renamed";
  assert.equal(isRelevant(KDB, "Renamed"), true);
});

test("watchTableData: dispatches relevant loads with the default payload, ignores the rest, replaces the old subscription", () => {
  const con = makeConsole();
  const kit = loadKit("tableDataWatcher.js", con);
  const bus = makeBus();
  const KDB = { events: bus };
  const runtime = { subscriptions: {} };
  const dispatched = [];
  const spec = {
    runtime, isRelevant: (_KDB, name) => name === "t1", dispatch: (a) => dispatched.push(a), actionType: "demo/tableDataChanged"
  };
  const unsub = kit.watchTableData(KDB, spec);
  assert.equal(typeof unsub, "function");
  assert.strictEqual(runtime.subscriptions.tableDataLoadFinished, unsub);
  assert.equal(bus.handlers[0].name, "tableData:loadFinished");
  bus.handlers[0].handler({ tableName: "t1", rowCount: 4, extra: 1 });
  bus.handlers[0].handler({ tableName: "other", rowCount: 1 });
  bus.handlers[0].handler(undefined);
  assert.deepEqual(dispatched, [{ type: "demo/tableDataChanged", payload: { tableName: "t1", rowCount: 4 } }]);
  kit.watchTableData(KDB, spec);
  assert.equal(bus.unsubscribed, 1);
  assert.equal(bus.handlers.length, 2);
});

test("watchTableData: custom payload, failureLabel isolates handler errors, without label they propagate", () => {
  const con = makeConsole();
  const kit = loadKit("tableDataWatcher.js", con);
  const bus = makeBus();
  const base = {
    runtime: { subscriptions: {} },
    isRelevant: () => true,
    actionType: "demo/changed",
    buildPayload: (tableName, event) => ({ tableName, rowCount: event.rowCount, source: "tableData" })
  };
  const got = [];
  kit.watchTableData({ events: bus }, Object.assign({}, base, { dispatch: (a) => got.push(a) }));
  bus.handlers[0].handler({ tableName: "t", rowCount: 2 });
  assert.deepEqual(got, [{ type: "demo/changed", payload: { tableName: "t", rowCount: 2, source: "tableData" } }]);

  const throwing = () => { throw new Error("dispatch boom"); };
  kit.watchTableData({ events: bus }, Object.assign({}, base, { runtime: { subscriptions: {} }, dispatch: throwing, failureLabel: "demo.tableDataChanged" }));
  assert.doesNotThrow(() => bus.handlers[1].handler({ tableName: "t" }));
  assert.equal(con.logged.error[0][0], "[demo.tableDataChanged] failed");
  kit.watchTableData({ events: bus }, Object.assign({}, base, { runtime: { subscriptions: {} }, dispatch: throwing }));
  assert.throws(() => bus.handlers[2].handler({ tableName: "t" }), /dispatch boom/);
});

test("watchTableData: no event bus -> null stored, previous subscription still released", () => {
  const kit = loadKit("tableDataWatcher.js");
  let released = 0;
  const runtime = { subscriptions: { tableDataLoadFinished: () => { released += 1; } } };
  const spec = { runtime, isRelevant: () => true, dispatch() {}, actionType: "a" };
  assert.strictEqual(kit.watchTableData({}, spec), null);
  assert.equal(released, 1);
  assert.strictEqual(runtime.subscriptions.tableDataLoadFinished, null);
  assert.strictEqual(kit.watchTableData({ events: {} }, spec), null);
  assert.strictEqual(kit.watchTableData(null, spec), null);
});

test("controller (dienststelle style): default logging, disposed table, tableData watch in mount, extra public method", async () => {
  const con = makeConsole();
  const quiet = con;
  const controllerKit = loadKit("ownerController.js", quiet);
  const watcherKit = loadKit("tableDataWatcher.js", quiet);
  const kitErrors = loadGuardKit(quiet);
  const bus = makeBus();
  const KDB = {
    events: bus,
    state: { filters: { dienststelle: { lifecycle: "idle" } } },
    runtime: { dienststelle: { subscriptions: {}, tabMutationRunId: 4, historyReplayHandlerContribution: {} } }
  };
  const runtime = KDB.runtime.dienststelle;
  const guard = kitErrors.createDisposedGuard("dienststelle");
  const reduce = controllerKit.createStateWriter(KDB, "dienststelle", (state, action) => Object.assign({}, state, { last: action.type }));
  const dispatched = [];
  let api;
  const base = controllerKit.createOwnerController({
    _KDB: KDB,
    name: "dienststelle",
    guard,
    reduce,
    mount() {
      reduce({ type: "dienststelle/mountReady", payload: {} });
      watcherKit.watchTableData(KDB, {
        runtime,
        isRelevant: () => true,
        dispatch: (action) => api.dispatch(action),
        actionType: "dienststelle/tableDataChanged",
        buildPayload: (tableName, event) => ({ tableName, rowCount: event.rowCount, source: "tableData" })
      });
    },
    teardown() { runtime.tabMutationRunId = 0; },
    route(action) { dispatched.push(action); return action.type === "dienststelle/historyReplayRequested" ? Promise.resolve(true) : { state: true }; },
    readState() { return KDB.state.filters.dienststelle; },
    destroyAction: "dienststelle/destroy",
    clearsReplayContribution: true,
    disposedResults: {
      "dienststelle/parameterSetRestoreRequested": () => Promise.resolve({ ok: false, appliedScopes: [] }),
      "dienststelle/prepareTabMutation": (action) => Promise.resolve({ ok: false, operationId: (action.payload || {}).operationId || null })
    }
  });
  api = Object.assign({}, base, { getCurrentHierarchySnapshot: () => (guard.isDisposed() ? undefined : "snapshot") });
  assert.equal(api.mount(), true);
  assert.equal(api.mount(), true);
  assert.equal(bus.unsubscribed, 1);
  bus.handlers[1].handler({ tableName: "t", rowCount: 3 });
  assert.deepEqual(dispatched, [{ type: "dienststelle/tableDataChanged", payload: { tableName: "t", rowCount: 3, source: "tableData" } }]);
  assert.equal(api.getCurrentHierarchySnapshot(), "snapshot");
  api.destroy();
  assert.equal(runtime.tabMutationRunId, 0);
  assert.strictEqual(runtime.historyReplayHandlerContribution, null);
  assert.equal(KDB.state.filters.dienststelle.last, "dienststelle/destroy");
  assert.deepEqual(await api.dispatch({ type: "dienststelle/prepareTabMutation", payload: { operationId: "o" } }), { ok: false, operationId: "o" });
  assert.deepEqual(await api.dispatch({ type: "dienststelle/parameterSetRestoreRequested" }), { ok: false, appliedScopes: [] });
  assert.strictEqual(api.dispatch({ type: "dienststelle/syncRequested" }), undefined);
  assert.strictEqual(api.getCurrentHierarchySnapshot(), undefined);
  assert.deepEqual(con.logged.warn.map((a) => a[0]), ["[dienststelle.dispatch] called after destroy"]);
});
