// Tests for _____________KDB3API/KDB3/js/dashboard/tabs/**
// Run: node --test tools/tests/tabs.test.mjs   (Node >= 22, no dependencies)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";

const TABS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../_____________KDB3API/KDB3/js/dashboard/tabs");
const silent = { log() {}, warn() {}, error() {}, info() {} };

function load(rel, stubs) {
  return loadAmd(join(TABS_DIR, rel), { stubs: Object.assign({ console: silent }, stubs || {}) });
}

function listModules(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) { return listModules(full); }
    return entry.name.endsWith(".js") ? [full] : [];
  });
}

test("every tabs module factory runs without throwing", () => {
  const failures = [];
  for (const file of listModules(TABS_DIR)) {
    try {
      loadAmd(file, { stubs: { console: silent } });
    } catch (err) {
      failures.push(relative(TABS_DIR, file) + ": " + err.message);
    }
  }
  assert.deepEqual(failures, []);
});

test("edit icons are disabled only while a tab mutation runs", () => {
  const confirm = load("editUi/confirm.js");
  const idle = { _KDB: { runtime: { tabs: { pendingPromises: { traverse: Promise.resolve() } } } } };
  const busy = { _KDB: { runtime: { tabs: { pendingPromises: { tabMutation: Promise.resolve() } } } } };
  assert.equal(confirm.isTabMutationInFlight(idle._KDB), false);
  assert.equal(confirm.isTabMutationInFlight(undefined), false);
  assert.equal(confirm.isTabMutationInFlight(busy._KDB), true);
});

test("a disabled edit icon click only cancels the event and drops focus", () => {
  const logged = [];
  const icons = load("editUi/icons.js", { console: Object.assign({}, silent, { log: (...args) => logged.push(args) }) });
  const handlers = [];
  const target = () => ({ addEventListener: (type, handler) => handlers.push([type, handler]) });
  icons.bindIconClick({ key: "delete" }, {}, false, target(), target(), 1, "tab1");
  const calls = [];
  const ev = {
    preventDefault: () => calls.push("preventDefault"),
    stopPropagation: () => calls.push("stopPropagation"),
    target: { blur: () => calls.push("blur") }
  };
  assert.equal(handlers.length, 2);
  assert.equal(handlers[0][1](ev), false);
  assert.deepEqual(calls, ["preventDefault", "stopPropagation", "blur"]);
  assert.deepEqual(logged, []);
});

test("parameterSet router: unknown types and disposed acknowledgements", async () => {
  const types = load("config/actionTypes.js");
  const router = load("restore/parameterSetRestore.js");
  assert.equal(router.isParameterSetAction(types.PARAMETER_SET_RESTORE), true);
  assert.equal(router.isParameterSetAction(types.TRAVERSE), false);
  assert.deepEqual(await router.routeParameterSetAction({}, { type: "tabs/nope" }), {
    ok: false,
    diagnostics: [{ code: "TABS_PARAMETER_SET_UNKNOWN_ACTION", message: "unknown tabs parameterSet action type" }]
  });
  assert.deepEqual(await router.disposedResult(types.PARAMETER_SET_RESET, {}), {
    ok: false,
    diagnostics: [{ code: "WRITEBACK_RESTORE_CANCELLED", message: "tabs controller is disposed" }]
  });
  const scope = await router.disposedResult(types.RESOLVE_FILTER_SCOPE_TARGETS, { source: "pdf" });
  assert.equal(scope.ok, false);
  assert.equal(scope.diagnostics[0].code, "TABS_FILTER_SCOPE_TARGETS_NOT_READY");
});

test("destroy restores the original _KDB.utils.readCurrentTab, re-orchestration binds it again", () => {
  const orchestrate = load("__orchestratorTabs.js");
  const original = function readCurrentTab() { return "original"; };
  const _KDB = { utils: { readCurrentTab: original }, config: {}, services: {} };
  const first = orchestrate(_KDB, {});
  assert.notEqual(_KDB.utils.readCurrentTab, original);
  first.destroy();
  assert.equal(_KDB.utils.readCurrentTab, original);

  const second = orchestrate(_KDB, {});
  assert.notEqual(_KDB.utils.readCurrentTab, original);
  const foreign = function foreignReadCurrentTab() { return "foreign"; };
  _KDB.utils.readCurrentTab = foreign;
  second.destroy();
  assert.equal(_KDB.utils.readCurrentTab, foreign);
});

test("hydrate: destroy aborts the button wait at once and reports it to the chrome checks", async () => {
  const doc = { querySelectorAll: () => [], querySelector: () => null };
  const hydrate = load("effects.js", { document: doc });
  const endWaits = [];
  const dispatched = [];
  let disposed = false;
  const _KDB = {
    runtime: {
      tabs: { domRefs: {}, abortControllers: {} },
      cognosHost: { chromeChecks: { beginWait() {}, endWait: (_k, key, info) => endWaits.push([key, info]) } }
    }
  };
  const ctx = { _KDB, dispatch: (action) => dispatched.push(action.payload.phase), isDisposed: () => disposed };
  const startedAt = Date.now();
  const pending = hydrate.applyTabsEffects(ctx, { type: "tabs/hydrateDom" });
  disposed = true;
  _KDB.runtime.tabs.abortControllers.hydrate.abort();
  assert.equal(await pending, false);
  assert.ok(Date.now() - startedAt < 250);
  assert.deepEqual(dispatched, ["pending", "confirmed"]);
  assert.deepEqual(endWaits, [["tabs.primaryTabButtonSelector", { aborted: true, found: false }]]);
  assert.equal(_KDB.runtime.tabs.abortControllers.hydrate, undefined);
});

test("page loading cover: finishWhenReady ends once the inner page exists, finish() cancels the poll", async () => {
  let ready = false;
  const wrapper = { id: "p1", matches: () => false, querySelector: () => (ready ? { id: "inner" } : null) };
  const doc = { getElementById: (id) => (id === "p1" ? wrapper : null) };
  const loading = load("pageLoading.js", { document: doc });
  const calls = [];
  const _KDB = {
    services: { loading: { startLoading: (opts) => { calls.push("start:" + opts.mountEl.id); return "handle"; }, finishLoading: () => calls.push("finish") } },
    runtime: { tabs: { abortControllers: {} } },
    state: { tabs: {} }
  };
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  assert.equal(loading.start(_KDB, { pageId: "p1", finishWhenReady: true }), "handle");
  await sleep(150);
  ready = true;
  await sleep(250);
  assert.deepEqual(calls, ["finish", "start:p1", "finish"]);
  assert.equal(_KDB.runtime.tabs.abortControllers.tabPageLoadingReady, undefined);

  ready = false;
  calls.length = 0;
  loading.start(_KDB, { pageId: "p1", finishWhenReady: true });
  loading.finish(_KDB);
  ready = true;
  await sleep(250);
  assert.deepEqual(calls, ["finish", "start:p1", "finish"]);
});

test("traverse options: key and target indexes", () => {
  const options = load("traverse/traverseOptions.js");
  const normalized = options.normalizeTraverseOptions({ source: "mount" });
  assert.equal(typeof options.buildTraverseKey(normalized), "string");
  assert.equal(options.buildTraverseKey(normalized), options.buildTraverseKey(options.normalizeTraverseOptions({ source: "mount" })));
  const failed = options.buildFailedPayload("TABS_TRAVERSE_TIMEOUT", "timed out");
  assert.equal(failed.errorCode, "TABS_TRAVERSE_TIMEOUT");
});

function makeTabsState(names, visibleCount, activeIndex) {
  const byIndex = {};
  const order = [];
  names.forEach((name, index) => {
    byIndex[String(index)] = {
      index, tabId: "t" + index, pageId: "p" + index, name, role: "dashboard", isHelper: false,
      visible: index < visibleCount, isActive: index === activeIndex, button: { visible: index < visibleCount }, edit: {}
    };
    order.push(index);
  });
  return {
    byIndex, order, activeIndex, activeTabId: "t" + activeIndex, editUi: {},
    limits: { maxUserTabs: names.length, minVisibleUserTabs: 1 }
  };
}

function namesOf(state) {
  return state.order.map((index) => state.byIndex[String(index)].name + (state.byIndex[String(index)].visible ? "" : "(hidden)"));
}

test("tab mutation plans + reducer: delete, duplicate, move and restoreDeleted keep a contiguous visible prefix", () => {
  const plans = load("tabMutation/plans.js");
  const reduce = load("tabMutation/reduce.js");
  const start = makeTabsState(["A", "B", "C", "D"], 3, 1);

  const del = plans.buildDeletePlan(start, { tabId: "t1", baselineNamesByIndex: { 2: "Tab 3" }, operationSeq: 7 });
  assert.equal(del.ok, true);
  assert.match(del.plan.operationId, /^tabmut-\d+-7$/);
  const afterDelete = reduce(start, { plan: del.plan });
  assert.equal(afterDelete.error, null);
  assert.deepEqual(namesOf(afterDelete.state), ["A", "C", "Tab 3(hidden)", "D(hidden)"]);
  assert.equal(afterDelete.state.activeIndex, 1);

  const dup = plans.buildDuplicatePlan(start, { tabId: "t0", operationSeq: 8 });
  const afterDup = reduce(start, { plan: dup.plan });
  assert.deepEqual(namesOf(afterDup.state), ["A", "A", "B", "C"]);

  const move = plans.buildMovePlan(start, { tabId: "t0", targetPosition: 2, operationSeq: 9 });
  const afterMove = reduce(start, { plan: move.plan });
  assert.deepEqual(namesOf(afterMove.state), ["B", "C", "A", "D(hidden)"]);
  assert.equal(plans.buildMovePlan(start, { tabId: "t0", targetPosition: 0, operationSeq: 9 }).errorCode, "TABS_MOVE_SAME_POSITION");

  const restore = plans.buildRestoreDeletedPlan(afterDelete.state, {
    insertTabIdx: 1, tabId: "t1", name: "B", hideSlot: { tabId: "t2" }, filters: {}, operationSeq: 10
  });
  assert.equal(restore.ok, true);
  const afterRestore = reduce(afterDelete.state, { plan: restore.plan });
  assert.equal(afterRestore.error, null);
  assert.deepEqual(namesOf(afterRestore.state), ["A", "B", "C", "D(hidden)"]);
});

test("tab mutation plans: guards", () => {
  const plans = load("tabMutation/plans.js");
  const single = makeTabsState(["A", "B"], 1, 0);
  assert.equal(plans.buildDeletePlan(single, { tabId: "t0" }).errorCode, "TABS_MIN_VISIBLE");
  const unnumbered = makeTabsState(["A", "B", "C"], 2, 0);
  assert.throws(() => plans.buildDuplicatePlan(unnumbered, { tabId: "t0" }), { code: "TABS_MUTATION_RUN_ID_MISSING" });
  const full = makeTabsState(["A", "B"], 2, 0);
  assert.equal(plans.buildDuplicatePlan(full, { tabId: "t0" }).errorCode, "TABS_MAX_VISIBLE");
  assert.equal(plans.buildDeletePlan(full, { tabId: "missing" }).ok, false);
});

test("selectors: scope match by alias and live scope, tab targets", () => {
  const selectors = load("selectors.js");
  const _KDB = { state: { tabs: makeTabsState(["A", "B"], 2, 0) } };
  assert.deepEqual(Object.keys(selectors.readTabTargets(_KDB)), ["0", "1"]);
  assert.equal(selectors.readTabScopeMatch(_KDB, "t1").status, "ok");
  assert.equal(selectors.readTabScopeMatch(_KDB, "").status, "missing");
  const live = { 0: { scopeId: "scopeX" }, 1: { scopeId: "scopeX" } };
  assert.equal(selectors.readTabScopeMatch(_KDB, "scopeX", live).status, "ambiguous");
  assert.deepEqual(selectors.readVisibleTabs(_KDB).map((tab) => tab.name), ["A", "B"]);
});

test("controller: disposed dispatch answers without throwing, rename without a target is a no-op", async () => {
  const orchestrate = load("__orchestratorTabs.js");
  const _KDB = { utils: {}, config: {}, services: {} };
  const controller = orchestrate(_KDB, {});
  assert.equal(controller.dispatch({ type: "tabs/rename", payload: { name: "x" } }), false);
  controller.destroy();
  assert.equal(controller.dispatch({ type: "tabs/add" }), false);
  assert.equal(await controller.dispatch({ type: "tabs/traverse" }), false);
  assert.equal(controller.getState(), undefined);
  assert.equal(controller.mount(), false);
});

test("controller: rename commits pending, asks Cognos, confirms and records the name", async () => {
  const orchestrate = load("__orchestratorTabs.js");
  const renamed = [];
  const facet = { setTabName: (tab, name) => { renamed.push([tab.pageId, name]); return { ok: true, data: name }; } };
  const _KDB = { utils: {}, config: {}, services: { cognosHost: { tabs: facet } }, state: {} };
  _KDB.state.tabs = makeTabsState(["A", "B"], 2, 0);
  const controller = orchestrate(_KDB, {});
  _KDB.state.tabs = Object.assign(makeTabsState(["A", "B"], 2, 0), { lifecycle: "ready", hydration: {}, traversal: {} });
  assert.equal(await controller.dispatch({ type: "tabs/rename", payload: { tabIndex: 1, tabId: "t1", name: " Neu " } }), true);
  assert.deepEqual(renamed, [["p1", "Neu"]]);
  assert.equal(_KDB.state.tabs.byIndex["1"].name, "Neu");
  assert.equal(_KDB.state.tabs.pendingOperation, null);

  facet.setTabName = () => ({ ok: false });
  assert.equal(await controller.dispatch({ type: "tabs/rename", payload: { tabIndex: 0, tabId: "t0", name: "X" } }), false);
  assert.equal(_KDB.state.tabs.byIndex["0"].name, "A");
  assert.equal(_KDB.state.tabs.byIndex["0"].errorCode, "TABS_RENAME_FAILED");
});

const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function withActivation(state) {
  Object.values(state.byIndex).forEach((tab) => { tab.hasBeenActivated = true; });
  return state;
}

function makeMutationHarness({ activated = true, failingOwner = null, syncViewThrows = false } = {}) {
  const doc = { querySelector: () => ({ id: "frame" }), querySelectorAll: () => [], getElementById: () => null };
  const actions = load("tabMutation/actions.js", { document: doc });
  const types = load("config/actionTypes.js");
  const log = { dispatched: [], owners: [], loading: [] };
  const state = makeTabsState(["A", "B", "C", "D"], 3, 1);
  withActivation(state);
  if (!activated) { state.byIndex["2"].hasBeenActivated = false; }
  const runtime = { pendingPromises: {}, abortControllers: {}, baselineNamesByIndex: { 2: "Tab 3" } };
  const ownerApi = (name) => ({
    dispatch: async (action) => {
      log.owners.push(action.type);
      if (name === failingOwner && /prepareTabMutation$/.test(action.type)) { return { ok: false, diagnostics: [{ code: "PREPARE_FAILED" }] }; }
      return { ok: true, rollbackByTabId: {}, historySlice: {} };
    }
  });
  const _KDB = {
    runtime: { tabs: runtime },
    state: { tabs: state },
    services: { loading: { startLoading: () => log.loading.push("start"), finishLoading: () => log.loading.push("finish") } },
    api: {
      widgetBase: { dispatch: async (action) => { log.owners.push(action.type); return { ok: true }; } },
      singleSelect: ownerApi("singleSelect"),
      dienststelle: ownerApi("dienststelle"),
      nativeMultiSelect: ownerApi("nativeMultiSelect"),
      kdbControl: { syncView: () => { if (syncViewThrows) { throw new Error("syncView exploded"); } } }
    }
  };
  const ctx = {
    _KDB,
    adapter: { setTabName: async () => "ok" },
    isDisposed: () => false,
    getRawState: () => _KDB.state.tabs,
    dispatch: (action) => {
      log.dispatched.push(action);
      if (action.type === types.RESOLVE_FILTER_SCOPE_TARGETS) { return Promise.resolve({ ok: true, tabTargets: {} }); }
      if (action.type === types.TRAVERSE) { return Promise.resolve(true); }
      return true;
    }
  };
  return { actions, types, log, ctx, _KDB, runtime };
}

test("tab mutation saga: a failure before the commit rolls the owners back, returns to the original tab and releases everything", async () => {
  const h = makeMutationHarness({ activated: false, failingOwner: "dienststelle" });
  const result = await h.actions.routeTabMutationAction(h.ctx, { type: h.types.DELETE, payload: { tabId: "t2" } });
  assert.equal(result.ok, false);
  assert.equal(result.outcome, "aborted");
  assert.equal(result.phases.prepare.status, "failed");
  assert.deepEqual(h.log.owners.filter((type) => /restoreTabMutationSnapshot$/.test(type)), ["widgetBase/restoreTabMutationSnapshot", "singleSelect/restoreTabMutationSnapshot"]);
  assert.equal(h.log.dispatched.some((action) => action.type === h.types.TAB_MUTATION_APPLY), false);
  const traversals = h.log.dispatched.filter((action) => action.type === h.types.TRAVERSE).map((action) => action.payload.tabIndex);
  assert.equal(traversals.length > 1, true);
  assert.equal(traversals[traversals.length - 1], 1);
  assert.equal(h.runtime.pendingPromises.tabMutation, undefined);
  assert.deepEqual(h.log.loading, ["start", "finish"]);
});

test("tab mutation saga: a successful run commits, releases the lock and finishes the loading frame", async () => {
  const h = makeMutationHarness();
  const result = await h.actions.routeTabMutationAction(h.ctx, { type: h.types.DELETE, payload: { tabId: "t2" } });
  assert.equal(result.ok, true);
  assert.equal(h.log.dispatched.some((action) => action.type === h.types.TAB_MUTATION_APPLY), true);
  assert.equal(h.runtime.pendingPromises.tabMutation, undefined);
  assert.deepEqual(h.log.loading, ["start", "finish"]);
});

test("tab mutation saga: a throwing kdbControl view neither degrades the result nor skips the landing traverse", async () => {
  const h = makeMutationHarness({ syncViewThrows: true });
  const result = await h.actions.routeTabMutationAction(h.ctx, { type: h.types.DELETE, payload: { tabId: "t2" } });
  assert.equal(result.ok, true);
  assert.equal(result.phases.cognosSync.status, "ok");
  const landing = h.log.dispatched.filter((action) => action.type === h.types.TRAVERSE && action.payload.source === "tabsMutation");
  assert.equal(landing.length, 1);
});

test("controller: destroy mid-mutation commits nothing afterwards and releases the lock", async () => {
  const orchestrate = load("__orchestratorTabs.js", { document: { querySelector: () => null, querySelectorAll: () => [], getElementById: () => null } });
  const widgetCalls = [];
  let releaseWidget = null;
  let released = false;
  const _KDB = { utils: {}, config: {}, services: {}, state: {}, api: {} };
  _KDB.api.widgetBase = {
    dispatch: (action) => {
      widgetCalls.push(action.type);
      if (released) { return Promise.resolve({ ok: true }); }
      return new Promise((resolve) => { releaseWidget = () => { released = true; resolve({ ok: true }); }; });
    }
  };
  _KDB.state.tabs = withActivation(makeTabsState(["A", "B", "C", "D"], 3, 1));
  const controller = orchestrate(_KDB, {});
  _KDB.state.tabs = Object.assign(withActivation(makeTabsState(["A", "B", "C", "D"], 3, 1)), { lifecycle: "ready", hydration: {}, traversal: {} });
  const pending = controller.dispatch({ type: "tabs/delete", payload: { tabId: "t2" } });
  await sleepMs(20);
  assert.equal(typeof _KDB.runtime.tabs.pendingPromises.tabMutation.then, "function");
  controller.destroy();
  assert.equal(_KDB.runtime.tabs.pendingPromises.tabMutation, undefined);
  releaseWidget();
  const result = await pending;
  assert.equal(result.ok, false);
  assert.equal(_KDB.state.tabs.lifecycle, "disposed");
  assert.equal(widgetCalls.every((type) => type === "widgetBase/ensureTabWidgetsRouted"), true);
  assert.equal(_KDB.state.tabs.byIndex["2"].name, "C");
});

function makeTraverseHarness({ loading, widgets } = {}) {
  const clicks = [];
  const items = [0, 1].map((index) => ({ getAttribute: () => String(index), click: () => clicks.push(index) }));
  const wrappers = items.map((item) => ({ querySelector: () => item }));
  const doc = { querySelectorAll: () => wrappers, getElementById: (id) => ({ id, matches: () => false, querySelector: () => null }) };
  const traverse = load("traverse/traverse.js", { document: doc });
  const types = load("config/actionTypes.js");
  const dispatched = [];
  const calls = [];
  const state = withActivation(makeTabsState(["A", "B"], 2, 0));
  const runtime = { pendingPromises: {}, abortControllers: {}, domRefs: {}, timers: {} };
  let disposed = false;
  const _KDB = {
    runtime: { tabs: runtime },
    state: { tabs: state },
    services: {
      loading: loading || { startLoading: () => calls.push("start"), finishLoading: () => calls.push("finish") }
    },
    api: widgets ? { widgetBase: widgets } : {}
  };
  const ctx = {
    _KDB,
    adapter: {},
    getRawState: () => state,
    isDisposed: () => disposed,
    dispatch: (action) => { dispatched.push(action.payload); return true; }
  };
  const instance = { _KDB, ctx, guard: { isDisposed: () => disposed } };
  return { traverse, types, dispatched, calls, clicks, runtime, instance, dispose: () => { disposed = true; } };
}

const SINGLE_TAB = { scope: "singleTab", tabIndex: 1, restoreActiveTab: true, restoreTabIndex: 0 };

test("traverse: a cover that fails to start or finish never fails the traversal", async () => {
  const boom = () => { throw new Error("cover exploded"); };
  const h = makeTraverseHarness({ loading: { startLoading: boom, finishLoading: boom } });
  assert.equal(await h.traverse.dispatchTabsTraverse(h.instance, Object.assign({ timeoutMs: 2000 }, SINGLE_TAB)), true);
  assert.equal(h.dispatched[h.dispatched.length - 1].phase, "confirmed");
  assert.deepEqual(h.clicks, [1, 0]);
  assert.equal(h.runtime.pendingPromises.traverse, undefined);
});

test("traverse: a timeout commits TABS_TRAVERSE_TIMEOUT, finishes the cover once and a late continuation stays silent", async () => {
  let releaseWidgets = null;
  const widgets = { dispatch: () => new Promise((resolve) => { releaseWidgets = () => resolve({ ok: true }); }) };
  const h = makeTraverseHarness({ widgets });
  const outcome = await h.traverse.dispatchTabsTraverse(h.instance, Object.assign({ timeoutMs: 400, waitFor: "widgetsRendered" }, SINGLE_TAB));
  assert.equal(outcome, false);
  const last = h.dispatched[h.dispatched.length - 1];
  assert.equal(last.phase, "failed");
  assert.equal(last.errorCode, "TABS_TRAVERSE_TIMEOUT");
  assert.deepEqual(h.calls, ["finish", "start", "finish"]);
  assert.equal(h.runtime.pendingPromises.traverse, undefined);
  assert.equal(h.runtime.abortControllers.traverse, undefined);

  const dispatchedBefore = h.dispatched.length;
  releaseWidgets();
  await sleepMs(50);
  assert.deepEqual(h.clicks, [1]);
  assert.deepEqual(h.calls, ["finish", "start", "finish"]);
  assert.equal(h.dispatched.length, dispatchedBefore);
});

test("traverse: destroy mid-traversal stops clicking, confirms nothing and still finishes the cover", async () => {
  let releaseWidgets = null;
  const widgets = { dispatch: () => new Promise((resolve) => { releaseWidgets = () => resolve({ ok: true }); }) };
  const h = makeTraverseHarness({ widgets });
  const pending = h.traverse.dispatchTabsTraverse(h.instance, Object.assign({ timeoutMs: 5000, waitFor: "widgetsRendered" }, SINGLE_TAB));
  await sleepMs(250);
  h.dispose();
  h.runtime.abortControllers.traverse.abort();
  releaseWidgets();
  await pending.catch(() => {});
  await sleepMs(20);
  assert.equal(h.dispatched.some((payload) => payload.phase === "confirmed"), false);
  assert.deepEqual(h.clicks, [1]);
  assert.deepEqual(h.calls, ["finish", "start", "finish"]);
  assert.equal(h.runtime.pendingPromises.traverse, undefined);
  const dispatchedBefore = h.dispatched.length;
  assert.equal(await h.traverse.dispatchTabsTraverse(h.instance, SINGLE_TAB), false);
  assert.equal(h.dispatched.length, dispatchedBefore);
  assert.deepEqual(h.clicks, [1]);
});

test("rename: a throwing kdbControl view neither fails the rename nor the Cognos round trip", async () => {
  const orchestrate = load("__orchestratorTabs.js");
  const renamed = [];
  const facet = { setTabName: (tab, name) => { renamed.push([tab.pageId, name]); return { ok: true, data: name }; } };
  const _KDB = {
    utils: {}, config: {}, state: {},
    services: { cognosHost: { tabs: facet } },
    api: { kdbControl: { syncView: () => { throw new Error("syncView exploded"); } } }
  };
  _KDB.state.tabs = makeTabsState(["A", "B"], 2, 0);
  const controller = orchestrate(_KDB, {});
  _KDB.state.tabs = Object.assign(makeTabsState(["A", "B"], 2, 0), { lifecycle: "ready", hydration: {}, traversal: {} });
  assert.equal(await controller.dispatch({ type: "tabs/rename", payload: { tabIndex: 1, tabId: "t1", name: "Neu" } }), true);
  assert.equal(_KDB.state.tabs.byIndex["1"].name, "Neu");
  assert.equal(_KDB.state.tabs.byIndex["1"].errorCode == null, true);
  assert.deepEqual(renamed, [["p1", "Neu"]]);
});

test("effects: a failing effect commits TABS_EFFECT_FAILED and the next DOM sync clears the error lifecycle", async () => {
  const effects = load("effects.js");
  const reducer = load("reducer.js");
  const types = load("config/actionTypes.js");
  const committed = [];
  const ctx = {
    _KDB: {},
    getRawState: () => { throw new Error("state unreadable"); },
    dispatch: (action) => committed.push(action)
  };
  assert.equal(await effects.applyTabsEffects(ctx, { type: types.RENAME, payload: { tabIndex: 0, name: "X" } }), false);
  assert.equal(committed.length, 1);
  assert.equal(committed[0].type, types.ERROR);
  assert.equal(committed[0].payload.errorCode, "TABS_EFFECT_FAILED");

  const ready = Object.assign(makeTabsState(["A", "B"], 2, 0), { lifecycle: "ready", hydration: {}, traversal: {}, pendingOperation: null });
  const errored = reducer.reduceTabsAction(ready, committed[0]);
  assert.equal(errored.lifecycle, "error");
  const synced = reducer.reduceTabsAction(errored, { type: types.SYNC_FROM_DOM, payload: { byIndex: ready.byIndex, order: ready.order, activeIndex: 0 } });
  assert.equal(synced.lifecycle, "ready");
  assert.equal(synced.errorCode, null);
});
