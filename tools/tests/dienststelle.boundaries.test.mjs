// dienststelle foreign reads and foreign action literals (Phase 2 W5): the tabs API, the filterDock selector and the
// exported action-type constants replace reads of other modules' runtime and string literals.
// Run: node --test tools/tests/dienststelle.boundaries.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const FILTERS = path.join(JS_ROOT, "dashboard/filters");
const quietConsole = { log() {}, info() {}, debug() {}, warn() {}, error() {} };
const load = (rel, extra) => loadAmd(path.join(FILTERS, rel), Object.assign({ stubs: { console: quietConsole } }, extra || {}));

function loadRoute() {
  return load("dienststelle/effects/dispatchRoute.js", {
    modules: {
      "../view/syncView.js": { syncViewFromState() {} },
      "../view/dockNames.js": { syncFilterDockNames() {} },
      "../history.js": { pushDienststelleHistoryStep: (_KDB, _old, result) => result }
    }
  }).routeDienststelleDispatch;
}

async function tableDataChanged(KDB) {
  const route = loadRoute();
  const reconcileCalls = [];
  const reconcile = (_KDB, _dispatchInternal, context) => {
    reconcileCalls.push(context);
    return Promise.resolve({ resolution: null });
  };
  const state = load("dienststelle/state.js");
  await route({ _KDB: KDB }, () => {}, reconcile, { type: state.ACTIONS.TABLE_DATA_CHANGED, payload: {} });
  return reconcileCalls;
}

function kdbWith(extra) {
  return Object.assign({
    state: { filters: { dienststelle: { activeSichtValue: "BW", activeFilterKey: "Dienststelle_BW", byFilter: {} } } },
    runtime: { dienststelle: { timers: {}, subscriptions: {} } },
    api: {},
    config: { tables: {} }
  }, extra);
}

test("route: a running tab mutation is read from api.tabs.isMutationRunning, not from the tabs runtime", async () => {
  const calls = [];
  let running = true;
  const KDB = kdbWith({
    api: { tabs: { isMutationRunning() { calls.push("isMutationRunning"); return running; } } }
  });
  KDB.runtime.tabs = { pendingPromises: { tabMutation: null } };
  assert.deepEqual(await tableDataChanged(KDB), []);
  running = false;
  KDB.runtime.tabs.pendingPromises.tabMutation = {};
  const reconciles = await tableDataChanged(KDB);
  assert.equal(reconciles.length, 1);
  assert.equal(reconciles[0].source, "tableData");
  assert.deepEqual(calls, ["isMutationRunning", "isMutationRunning"]);
});

test("route: without api.tabs the kit read of the same tabMutation key answers", async () => {
  const KDB = kdbWith({});
  KDB.runtime.tabs = { pendingPromises: { tabMutation: {} } };
  assert.deepEqual(await tableDataChanged(KDB), []);
  KDB.runtime.tabs.pendingPromises.tabMutation = null;
  assert.equal((await tableDataChanged(KDB)).length, 1);
  KDB.runtime.tabs.pendingPromises = { traverse: {} };
  assert.equal((await tableDataChanged(KDB)).length, 1);
});

test("filterDom: the overlay wrapper comes from the filterDock selector readActiveFilterEl, not from the dock runtime", () => {
  const config = load("dienststelle/config.js");
  const wrapperClass = config.DOM_SELECTORS.filterItemWrapperClass;
  const overlayWrapper = { name: "overlay" };
  const otherWrapper = { name: "other" };
  const activeEl = {
    isConnected: true,
    closest: (selector) => (selector === "." + wrapperClass ? overlayWrapper : {}),
    getAttribute: () => "Dienststelle_BW",
    querySelectorAll: () => []
  };
  const matches = [{ closest: () => otherWrapper }, { closest: () => overlayWrapper }];
  const document = {
    querySelector: () => ({ querySelectorAll: () => matches })
  };
  const filterDom = load("dienststelle/view/filterDom.js", { stubs: { console: quietConsole, document } });
  const KDB = { runtime: { filterDock: { domRefs: { activeFilterEl: activeEl } } } };
  assert.strictEqual(filterDom.resolveUniqueOtherDockFilterWrapper(KDB, "Dienststelle_BW"), overlayWrapper);
  assert.strictEqual(filterDom.resolveUniqueOtherDockFilterWrapper({ runtime: { filterDock: { domRefs: {} } } }, "Dienststelle_BW"), null);
  assert.strictEqual(filterDom.resolveUniqueOtherDockFilterWrapper({}, "Dienststelle_BW"), null);
  const detached = Object.assign({}, activeEl, { isConnected: false });
  assert.strictEqual(
    filterDom.resolveUniqueOtherDockFilterWrapper({ runtime: { filterDock: { domRefs: { activeFilterEl: detached } } } }, "Dienststelle_BW"),
    null
  );
});
