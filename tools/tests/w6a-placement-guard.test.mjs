// The run-id closures the slot-stock engine hands to the REAL widgetBase placement (placeEntries): guard.isCurrent and
// deps.isStale replaced the old direct read of runtime.widgetBase.tabMutationRunId (Phase 2 W6a).
// The launchpad has no parked shell, so a row that is placed shows up as one degraded entry and one launchpad read.
// Run: node --test tools/tests/w6a-placement-guard.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const consoleStub = { error() {}, warn() {}, info() {}, log() {} };
const wrapper = { querySelector: () => ({ id: "page" }) };
const documentStub = { getElementById: (id) => (id === "t1" ? wrapper : null), querySelector: () => null, querySelectorAll: () => [] };
const load = (rel) => loadAmd(path.join(JS_ROOT, rel), { stubs: { document: documentStub, console: consoleStub } });

const engine = load("dashboard/tabs/tabMutation/slotStock/index.js");
const apply = load("dashboard/tabs/tabMutation/slotStock/apply.js");
const placeEntries = load("dashboard/widgets/widgetBase/slotStock/placeEntries.js");
const port = load("dashboard/widgets/widgetBase/slotStock/port.js");
const selectors = load("dashboard/widgets/widgetBase/state/selectors.js");
const actionTypes = load("dashboard/widgets/widgetBase/state.js").ACTION_TYPES;
const ledger = engine.ledger;

function makeWorld(runId) {
  const launchpadReads = [];
  const _KDB = {
    state: { widgets: { base: { byId: {} } } },
    runtime: { tabs: { pendingPromises: {} }, widgetBase: { routedTabIds: { t1: true } } },
    elements: { selectors: { page: { exactPageRootSelector: "#page" } } },
    api: {
      tabs: { dispatch: async () => true },
      launchpad: { dispatch: async (action) => { launchpadReads.push(action.payload.tabId); return { ok: true, widgets: [] }; } }
    }
  };
  const context = {
    _KDB, selectors, actionTypes, dispatch: async () => ({ ok: true }), dispatchInternal() {}, ensureOpSeq: () => 1, isStaleOpSeq: () => false,
    isLaunchpadReady: () => true
  };
  ledger.guardRun(_KDB, { runId }, "widgetBase");
  return { _KDB, context, launchpadReads, port: port.createSlotStockPort(context) };
}

const row = { sourceWidgetId: "v1", entry: { kind: "vis", tab: 0, x: 1, y: 2, w: 300, h: 200 } };

function rebuild(world, runId, rows) {
  const options = apply.buildPlaceOptions(world._KDB, { runId }, "tabMove");
  return apply.rebuildDestination(world._KDB, world.port, { slotMoves: [], insertSlot: { tabId: "t1", index: 1 } }, "t1", rows, [], options, runId);
}

test("the current run proceeds into the real placement of each row", async () => {
  const world = makeWorld(5);
  const result = await rebuild(world, 5, [row]);
  assert.equal(result.ok, true);
  assert.equal(result.superseded, undefined);
  assert.deepEqual(world.launchpadReads, ["t1"]);
  assert.equal(result.degradedEntries.length, 1);
  assert.equal(result.degradedEntries[0].sourceWidgetId, "v1");
});

test("a run whose id was bumped is superseded before the first row, exactly as the old runtime comparison", async () => {
  const world = makeWorld(5);
  ledger.guardRun(world._KDB, { runId: 6 }, "widgetBase");
  const result = await rebuild(world, 5, [row]);
  assert.deepEqual(result, { ok: false, superseded: true, structural: true, created: [], degradedEntries: [] });
  assert.deepEqual(world.launchpadReads, []);
});

test("a ledger reset (tabs destroy) supersedes the run at the next placement guard", async () => {
  const world = makeWorld(5);
  const pending = rebuild(world, 5, [row]);
  ledger.reset(world._KDB);
  const result = await pending;
  assert.deepEqual(result, { ok: false, superseded: true, structural: true, created: [], degradedEntries: [] });
});

test("placeSerializedWidgetEntry with a tab mutation guard reports TABS_MUTATION_CANCELLED when the run is not current", async () => {
  const world = makeWorld(5);
  const options = apply.buildPlaceOptions(world._KDB, { runId: 5 }, "tabMove");
  ledger.guardRun(world._KDB, { runId: 7 }, "widgetBase");
  const result = await placeEntries.placeSerializedWidgetEntry(world.context, row.entry, "t1", options);
  assert.equal(result.ok, false);
  assert.equal(result.superseded, true);
  assert.deepEqual(result.diagnostics, [{ code: "TABS_MUTATION_CANCELLED", message: "placement run superseded" }]);
});

test("an empty destination only parks and ignores staleness checks", async () => {
  const world = makeWorld(5);
  ledger.guardRun(world._KDB, { runId: 6 }, "widgetBase");
  const result = await rebuild(world, 5, []);
  assert.deepEqual(result, { ok: true, created: [], degradedEntries: [] });
});

test("the parameterSet guard still compares with runtime.widgetBase.parameterSetRunId", async () => {
  const world = makeWorld(5);
  world._KDB.runtime.widgetBase.parameterSetRunId = 4;
  const stale = await placeEntries.placeSerializedWidgetEntry(world.context, row.entry, "t1", { guard: { kind: "parameterSetRunId", runId: 3 } });
  assert.equal(stale.superseded, true);
  assert.equal(stale.diagnostics[0].code, "WRITEBACK_RESTORE_CANCELLED");
  const current = await placeEntries.placeSerializedWidgetEntry(world.context, row.entry, "t1", { guard: { kind: "parameterSetRunId", runId: 4 } });
  assert.equal(current.superseded, undefined);
});
