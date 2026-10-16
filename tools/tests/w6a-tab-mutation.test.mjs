// Characterisation tests for the tab mutation saga (tabs) running over the widgetBase slot-stock handlers (Phase 2 W6a).
// Real: tabs saga, plans, reducer, history step builders and replay handler, widgetBase prepare/apply/rollback handlers
// and serializer. Fake: filter owners (own snapshot store), widgetBase widget placement (placeEntries), launchpad,
// widget owners, history service. The golden fixture was recorded on the code before the slot-stock relocation.
// Run: node --test tools/tests/w6a-tab-mutation.test.mjs   (W6A_RECORD=1 rewrites the fixture)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";
import { loadWidgetBaseTabMutationHandlers, readSnapshotStores } from "./lib/w6a-slot-stock-adapter.mjs";

const TABS = path.join(JS_ROOT, "dashboard/tabs");
const BASE = path.join(JS_ROOT, "dashboard/widgets/widgetBase");
const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/w6a-tab-mutation.golden.json");
const consoleStub = { error() {}, warn() {}, info() {}, log() {} };
const documentStub = { getElementById: () => null, querySelector: () => ({ id: "frame" }), querySelectorAll: () => [] };
const tabsLoad = (rel) => loadAmd(path.join(TABS, rel), { stubs: { document: documentStub, console: consoleStub } });
const baseLoad = (rel) => loadAmd(path.join(BASE, rel), { stubs: { document: documentStub, console: consoleStub } });

const mutationActions = tabsLoad("tabMutation/actions.js");
const tabsTypes = tabsLoad("config/actionTypes.js");
const tabsReducer = tabsLoad("reducer.js");
const tabsHistory = tabsLoad("history.js");
const widgetSelectors = baseLoad("state/selectors.js");
const widgetActionTypes = baseLoad("state.js").ACTION_TYPES;

const OWNER_RUNTIME_KEYS = ["singleSelect", "dienststelle", "nativeMultiSelect"];

function makeTabsState() {
  const byIndex = {};
  const order = [];
  ["A", "B", "C", "D"].forEach((name, index) => {
    byIndex[String(index)] = {
      index, tabId: "t" + index, pageId: "p" + index, name, role: "dashboard", isHelper: false, hasBeenActivated: true,
      visible: index < 3, isActive: index === 1, button: { visible: index < 3 }, edit: {}
    };
    order.push(index);
  });
  return {
    byIndex, order, activeIndex: 1, activeTabId: "t1", currentTabId: "t1", editUi: {}, lifecycle: "ready", hydration: {}, traversal: {},
    limits: { maxUserTabs: 4, minVisibleUserTabs: 1 }
  };
}

// Every tab holds the same shell stock (2 vis, 1 text) so that any rebuild destination has enough shells.
function makeFrames(extra) {
  const frames = [];
  ["t0", "t1", "t2", "t3"].forEach((tabId, index) => {
    const layout = { x: 10 * index, y: 20, width: 300, height: 200 };
    frames.push({ widgetId: "v" + index + "a", tabId, kind: "vis", placement: "onCanvas", layout });
    frames.push({ widgetId: "v" + index + "b", tabId, kind: "vis", placement: "onCanvas", layout });
    frames.push({ widgetId: "x" + index, tabId, kind: "text", placement: "onCanvas", layout });
  });
  frames.push({ widgetId: "helper", tabId: "t0", kind: "topN", role: "topNHelper", placement: "onCanvas", layout: { x: 0, y: 0, width: 1, height: 1 } });
  return frames.concat(extra || []);
}

function widgetVisState() {
  const byId = {};
  [0, 1, 2, 3].forEach((index) => {
    byId["v" + index + "a"] = { derived: { code: "M" + index + "a" } };
    byId["v" + index + "b"] = { derived: { code: "M" + index + "b" } };
  });
  return { byId };
}

function normalize(value) {
  return JSON.parse(JSON.stringify(value, (key, item) => (key === "timestamp" ? undefined : item)).replace(/tabmut-\d+-/g, "tabmut-T-"));
}

function makeWorld(options) {
  const opts = options || {};
  const log = [];
  const placeLog = [];
  const history = [];
  const byId = {};
  makeFrames(opts.frames).forEach((frame) => { byId[frame.widgetId] = frame; });
  const KDB = {
    state: { tabs: makeTabsState(), widgets: { base: { byId } } },
    runtime: {
      tabs: { pendingPromises: {}, abortControllers: {}, baselineNamesByIndex: { 3: "Tab 4" } },
      widgetBase: { routedTabIds: { t0: true, t1: true, t2: true, t3: true } },
      singleSelect: { tabMutationSnapshots: {} },
      dienststelle: { tabMutationSnapshots: {} },
      nativeMultiSelect: { tabMutationSnapshots: {} }
    },
    services: {
      loading: { startLoading() {}, finishLoading() {} },
      history: {
        pushCommittedStep(step) {
          if (opts.historyThrows) { throw new Error("history exploded"); }
          history.push(normalize(step));
          return true;
        }
      }
    },
    events: { emit() {}, subscribe() {} },
    elements: {},
    api: {}
  };
  const placement = {
    async rebuildSlotFromEntries(_context, tabId, rows, deps) {
      placeLog.push({ tabId, rows: rows.map((row) => row.sourceWidgetId), reason: deps.placeOptions.reason, guardKind: deps.placeOptions.guard.kind, parked: deps.parked.length });
      if ((opts.failPlaceTabs || []).indexOf(tabId) >= 0 && rows.length > 0 && deps.placeOptions.reason !== "rollback") {
        return { ok: false, structural: true, created: [], degradedEntries: [], message: "Destination page is not inside its tab wrapper." };
      }
      return {
        ok: true, degradedEntries: [],
        created: rows.map((row) => ({ sourceWidgetId: row.sourceWidgetId, widgetId: "n-" + tabId + "-" + row.sourceWidgetId }))
      };
    },
    async placeSerializedWidgetEntry() { return { ok: true }; }
  };
  const handlers = loadWidgetBaseTabMutationHandlers({ placement, documentStub, consoleStub });
  const widgetContext = {
    _KDB: KDB,
    selectors: widgetSelectors,
    actionTypes: widgetActionTypes,
    dispatch: async (action) => { log.push(["widgetBase.internal", action.type, action.widgetId, action.payload && action.payload.reason]); return { ok: true }; },
    dispatchInternal: (action) => { log.push(["widgetBase.frame", action.type, action.payload && action.payload.widgetId]); },
    ensureOpSeq: () => 1,
    isStaleOpSeq: () => false,
    isLaunchpadReady: () => true
  };
  KDB.api.widgetBase = {
    async dispatch(action) {
      log.push(["widgetBase", action.type, action.payload.runId]);
      if (action.type === "widgetBase/ensureTabWidgetsRouted") { return { ok: true }; }
      const handler = handlers[action.type];
      return handler(widgetContext, action);
    }
  };
  KDB.api.launchpad = { dispatch: async () => ({ ok: true, widgets: [] }) };
  KDB.api.widgetSettings = { getState: () => ({ byWidget: {} }), dispatch: async (action) => { log.push(["widgetSettings", action.type, Object.keys(action.payload.widgetCorrelation || {}).length]); return { ok: true }; } };
  KDB.api.widgetVis = { getState: () => widgetVisState(), dispatch: async (action) => { log.push(["widgetVis", action.type, Object.keys(action.payload.widgetCorrelation || {}).length]); return { ok: true }; } };
  KDB.api.widgetText = { getState: () => ({ byId: {} }), dispatch: async (action) => { log.push(["widgetText", action.type, Object.keys(action.payload.widgetCorrelation || {}).length]); return { ok: true }; } };
  KDB.api.kdbControl = { syncView() {} };
  OWNER_RUNTIME_KEYS.forEach((name) => {
    KDB.api[name] = {
      async dispatch(action) {
        const type = action.type.split("/")[1];
        const payload = action.payload;
        log.push([name, action.type, payload.runId]);
        const store = KDB.runtime[name].tabMutationSnapshots;
        if (type === "prepareTabMutation") {
          if (opts.failPrepare === name) { return { ok: false, diagnostics: [{ code: "FILTER_PREPARE_FAILED", owner: name }] }; }
          store[payload.operationId] = { runId: payload.runId };
          return { ok: true, historySlice: { owner: name } };
        }
        if (type === "applyTabMutation" && opts.failApply === name) { return { ok: false, diagnostics: [{ code: "FILTER_APPLY_FAILED", owner: name }] }; }
        if (type === "restoreTabMutationSnapshot") { delete store[payload.operationId]; }
        return { ok: true };
      }
    };
  });
  const ctx = {
    _KDB: KDB,
    adapter: { setTabName: async () => "ok" },
    isDisposed: () => false,
    getRawState: () => KDB.state.tabs,
    dispatch(action) {
      if (action.type === tabsTypes.RESOLVE_FILTER_SCOPE_TARGETS) { return Promise.resolve({ ok: true, tabTargets: { 0: { scopeId: "s0" }, 1: { scopeId: "s1" } } }); }
      if (action.type === tabsTypes.TRAVERSE) { return Promise.resolve(true); }
      if (action.type === tabsTypes.TAB_MUTATION_APPLY && opts.commitFails) { KDB.runtime.tabs.lastTabMutationError = "TABS_MUTATION_POSTCONDITION_FAILED"; return false; }
      return tabsReducer.commitTabsState(KDB, action);
    }
  };
  KDB.api.tabs = { dispatch: (action) => (mutationActions.isTabMutationAction(action.type) ? mutationActions.routeTabMutationAction(ctx, action) : Promise.resolve(true)) };
  return { KDB, ctx, log, placeLog, history };
}

function tabNames(KDB) {
  const state = KDB.state.tabs;
  return state.order.map((index) => state.byIndex[String(index)].name + (state.byIndex[String(index)].visible ? "" : "(hidden)"));
}

function summarise(world, result) {
  const stores = readSnapshotStores(world.KDB, OWNER_RUNTIME_KEYS);
  return normalize({
    result: result && {
      ok: result.ok, outcome: result.outcome, phases: Object.keys(result.phases || {}).map((key) => [key, result.phases[key].status]),
      diagnostics: (result.diagnostics || []).map((entry) => [entry.phase, entry.code, entry.owner || null]),
      conflict: result.ok === false && result.phases === undefined ? result : undefined
    },
    tabs: tabNames(world.KDB),
    ownerCalls: world.log,
    placements: world.placeLog,
    history: world.history,
    snapshotStores: stores,
    lock: Object.keys(world.KDB.runtime.tabs.pendingPromises)
  });
}

async function run(world, type, payload) {
  const result = await world.KDB.api.tabs.dispatch({ type, payload });
  return result;
}

async function replay(world, step, side) {
  const handler = tabsHistory.createTabsHistoryReplayHandler();
  const target = side === "undo" ? step.old : step.new;
  return handler.apply(world.KDB, target, step);
}

const SCENARIOS = {
  "delete tab B": async (world) => run(world, "tabs/delete", { tabId: "t1" }),
  "duplicate tab A": async (world) => run(world, "tabs/duplicate", { tabId: "t0" }),
  "move tab A to position 2": async (world) => run(world, "tabs/move", { tabId: "t0", targetPosition: 2 }),
  "delete tab B, undo, redo": async (world) => {
    await run(world, "tabs/delete", { tabId: "t1" });
    const step = world.history[0];
    world.log.push(["undo", await replay(world, step, "undo")]);
    world.log.push(["redo", await replay(world, step, "redo")]);
  },
  "duplicate tab A, undo, redo": async (world) => {
    await run(world, "tabs/duplicate", { tabId: "t0" });
    const step = world.history[0];
    world.log.push(["undo", await replay(world, step, "undo")]);
    world.log.push(["redo", await replay(world, step, "redo")]);
  },
  "move tab A to position 2, undo, redo": async (world) => {
    await run(world, "tabs/move", { tabId: "t0", targetPosition: 2 });
    const step = world.history[0];
    world.log.push(["undo", await replay(world, step, "undo")]);
    world.log.push(["redo", await replay(world, step, "redo")]);
  },
  "delete fails: widgetBase prepare (unsupported datatable widget)": {
    options: { frames: [{ widgetId: "dt", tabId: "t1", kind: "datatable", placement: "onCanvas", layout: { x: 0, y: 0, width: 1, height: 1 } }] },
    run: async (world) => run(world, "tabs/delete", { tabId: "t1" })
  },
  "delete fails: singleSelect prepare": {
    options: { failPrepare: "singleSelect" }, run: async (world) => run(world, "tabs/delete", { tabId: "t1" })
  },
  "delete fails: nativeMultiSelect filter apply": {
    options: { failApply: "nativeMultiSelect" }, run: async (world) => run(world, "tabs/delete", { tabId: "t1" })
  },
  "duplicate fails: widget apply (structural placement failure)": {
    options: { failPlaceTabs: ["t1"] }, run: async (world) => run(world, "tabs/duplicate", { tabId: "t0" })
  },
  "move fails: widget apply (structural placement failure)": {
    options: { failPlaceTabs: ["t0"] }, run: async (world) => run(world, "tabs/move", { tabId: "t0", targetPosition: 2 })
  },
  "delete fails: commit": {
    options: { commitFails: true }, run: async (world) => run(world, "tabs/delete", { tabId: "t1" })
  },
  "delete: history push throws after the commit": {
    options: { historyThrows: true },
    run: async (world) => { try { await run(world, "tabs/delete", { tabId: "t1" }); } catch (err) { world.log.push(["threw", err.message]); } }
  },
  "second mutation while one runs is refused": async (world) => {
    const first = run(world, "tabs/delete", { tabId: "t1" });
    world.log.push(["second", (await run(world, "tabs/delete", { tabId: "t0" })).phases.plan.diagnostics[0].code]);
    await first;
  }
};

async function runScenario(name) {
  const spec = SCENARIOS[name];
  const world = makeWorld(typeof spec === "function" ? {} : spec.options);
  const body = typeof spec === "function" ? spec : spec.run;
  const result = await body(world);
  return summarise(world, result);
}

if (process.env.W6A_RECORD === "1") {
  const recorded = {};
  for (const name of Object.keys(SCENARIOS)) { recorded[name] = await runScenario(name); }
  const lines = Object.keys(recorded).map((name) => {
    const fields = Object.keys(recorded[name]).map((field) => "    " + JSON.stringify(field) + ": " + JSON.stringify(recorded[name][field]));
    return "  " + JSON.stringify(name) + ": {\n" + fields.join(",\n") + "\n  }";
  });
  writeFileSync(FIXTURE, "{\n" + lines.join(",\n") + "\n}\n");
} else {
  const golden = JSON.parse(readFileSync(FIXTURE, "utf8"));
  for (const name of Object.keys(SCENARIOS)) {
    test("snapshots of the operation are released after every outcome: " + name, async () => {
      const summary = await runScenario(name);
      assert.deepStrictEqual(summary.snapshotStores, { widgetBase: [], singleSelect: [], dienststelle: [], nativeMultiSelect: [] });
    });
    test("tab mutation saga over slot stock: " + name, async () => {
      assert.deepStrictEqual(await runScenario(name), golden[name]);
    });
  }
}
