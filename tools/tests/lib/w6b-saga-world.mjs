// The W6a saga world (real tabs saga, plans, reducer, history; real widgetBase slot-stock handlers over a fake placement)
// with the REAL filter owners (singleSelect, nativeMultiSelect, dienststelle) behind api.<owner> instead of the fake owners.
// Each owner keeps its own fake host (lib/w6b-filter-hosts.mjs); the saga's tab targets are translated to the owner's
// scope ids by the proxy in api.<owner>.dispatch. runtime.<owner> of the world IS the owner's runtime, so the saga's
// snapshot release works on the real ledgers.
import path from "node:path";
import { loadAmd } from "../../lib/amd-loader.mjs";
import { JS_ROOT } from "../../lib/amd-graph.mjs";
import { loadWidgetBaseTabMutationHandlers, readSnapshotStores } from "./w6a-slot-stock-adapter.mjs";
import { OWNER_BOOTS } from "./w6b-filter-hosts.mjs";

const TABS = path.join(JS_ROOT, "dashboard/tabs");
const BASE = path.join(JS_ROOT, "dashboard/widgets/widgetBase");
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

export function makeWorld(options) {
  const opts = options || {};
  const log = [];
  const placeLog = [];
  const history = [];
  const loading = [];
  const byId = {};
  makeFrames(opts.frames).forEach((frame) => { byId[frame.widgetId] = frame; });
  const KDB = {
    state: { tabs: makeTabsState(), widgets: { base: { byId }, settings: { lifecycle: "ready", byWidget: {} } } },
    runtime: {
      tabs: { pendingPromises: {}, abortControllers: {}, baselineNamesByIndex: { 3: "Tab 4" } },
      widgetBase: { routedTabIds: { t0: true, t1: true, t2: true, t3: true } },
      singleSelect: { tabMutationSnapshots: {} },
      dienststelle: { tabMutationSnapshots: {} },
      nativeMultiSelect: { tabMutationSnapshots: {} }
    },
    services: {
      loading: { startLoading() { loading.push("start"); }, finishLoading() { loading.push("finish"); } },
      history: {
        pushCommittedStep(step) {
          if (opts.historyThrows) { throw new Error("history exploded"); }
          history.push(normalize(step));
          if (opts.afterHistory) { opts.afterHistory(KDB); }
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
  KDB.api.widgetSettings = { dispatch: async (action) => { log.push(["widgetSettings", action.type, Object.keys(action.payload.widgetCorrelation || {}).length]); return { ok: true }; } };
  KDB.api.widgetVis = { getState: () => widgetVisState(), dispatch: async (action) => { log.push(["widgetVis", action.type, Object.keys(action.payload.widgetCorrelation || {}).length]); return { ok: true }; } };
  KDB.api.widgetText = { getState: () => ({ byId: {} }), dispatch: async (action) => { log.push(["widgetText", action.type, Object.keys(action.payload.widgetCorrelation || {}).length]); return { ok: true }; } };
  KDB.api.kdbControl = { syncView() {} };
  const real = {};
  OWNER_RUNTIME_KEYS.forEach((name) => {
    const handle = OWNER_BOOTS[name]({ tabCount: 4 });
    handle.control.failWrites = opts.failWrites === name;
    handle.control.throwWrites = opts.throwWrites === name;
    real[name] = handle;
    KDB.runtime[name] = handle.KDB.runtime[name];
    KDB.api[name] = {
      async dispatch(action) {
        log.push([name, action.type, action.payload.runId]);
        const payload = Object.assign({}, action.payload, { tabIdxToScopeId: handle.targets });
        return handle.api.dispatch({ type: action.type, payload: payload });
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
  return { KDB, ctx, log, placeLog, history, loading, real };
}


export { OWNER_RUNTIME_KEYS, readSnapshotStores, tabsHistory, normalize };

export async function run(world, type, payload) {
  return world.KDB.api.tabs.dispatch({ type: type, payload: payload });
}

export async function replay(world, step, side) {
  const handler = tabsHistory.createTabsHistoryReplayHandler();
  const target = side === "undo" ? step.old : step.new;
  return handler.apply(world.KDB, target, step);
}

export function tabNames(KDB) {
  const state = KDB.state.tabs;
  return state.order.map((index) => state.byIndex[String(index)].name + (state.byIndex[String(index)].visible ? "" : "(hidden)"));
}
