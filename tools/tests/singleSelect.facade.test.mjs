// The cheap read facade of singleSelect (singleSelect/selectors.js) against the clone based reads it replaces for
// sicht and specialSingleSelect. The oracle is the pre-facade pipeline: readSingleSelectState() followed by the
// filtering specialSingleSelect/instances.js did on the clone.
// Run: node --test tools/tests/singleSelect.facade.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const SS = path.join(JS_ROOT, "dashboard/filters/singleSelect");
const stateSelectors = loadAmd(path.join(SS, "state/selectors.js"));
const facade = loadAmd(path.join(SS, "selectors.js"));

function instance(id, overrides) {
  return Object.assign({
    filterInstanceId: id, scopeType: "global", scopeId: "global", filterLabel: id, itemName: id, itemId: "[" + id + "]",
    semanticInstanceKey: id, filterType: "specialSingleSelect", selectionOwner: "singleSelect", status: "active",
    hostStatus: "present", condition: "personengruppe", identityQuality: "exact",
    currentSelection: { displayValue: "A", useValue: "a", displaySource: "host" },
    pendingSelection: { displayValue: "B", useValue: "b" },
    timestamps: { seenAt: 1 }
  }, overrides || {});
}

function makeKDB() {
  return {
    state: {
      filters: {
        singleSelect: {
          lifecycle: "ready",
          inventory: { generation: 4, freshness: "fresh", reconciledAt: 10, errorCode: null },
          instancesById: {
            z1: instance("z1"),
            a1: instance("a1", { currentSelection: null, pendingSelection: undefined }),
            s1: instance("s1", { filterType: "sicht", selectionOwner: "sicht" }),
            g1: instance("g1", { filterType: "singleSelect", condition: undefined }),
            m1: instance("m1", { status: "missing" }),
            h1: instance("h1", { hostStatus: "absent" }),
            o1: instance("o1", { selectionOwner: "sicht" }),
            gone: null,
            c1: instance("c1", { scopeType: "pageContext", scopeId: "tab1" })
          },
          meta: {}, lastInteraction: null, lastDiagnostics: []
        }
      }
    }
  };
}

const SPECIAL_QUERY = { status: "active", hostStatus: "present", filterType: "specialSingleSelect", selectionOwner: "singleSelect" };

function oracleLive(KDB) {
  const state = stateSelectors.readSingleSelectState(KDB) || {};
  return Object.keys(state.instancesById || {}).sort().map((id) => state.instancesById[id])
    .filter((entry) => entry && entry.status === "active" && entry.hostStatus === "present" &&
      entry.filterType === "specialSingleSelect" && entry.selectionOwner === "singleSelect");
}

test("readLiveInstances equals the filtered clone of readSingleSelectState (same records, same order)", () => {
  const KDB = makeKDB();
  const live = facade.readLiveInstances(KDB, SPECIAL_QUERY);
  assert.deepEqual(live.map((entry) => entry.filterInstanceId), ["a1", "c1", "z1"]);
  assert.deepEqual(live, oracleLive(KDB));
});

test("readLiveInstances returns copies: instances, selections and timestamps are not the stored objects", () => {
  const KDB = makeKDB();
  const stored = KDB.state.filters.singleSelect.instancesById;
  const live = facade.readLiveInstances(KDB, SPECIAL_QUERY);
  const z1 = live.find((entry) => entry.filterInstanceId === "z1");
  assert.notStrictEqual(z1, stored.z1);
  assert.notStrictEqual(z1.currentSelection, stored.z1.currentSelection);
  assert.notStrictEqual(z1.timestamps, stored.z1.timestamps);
  z1.currentSelection.displayValue = "mutated";
  assert.equal(stored.z1.currentSelection.displayValue, "A");
  const a1 = live.find((entry) => entry.filterInstanceId === "a1");
  assert.equal("pendingSelection" in a1, true);
  assert.equal(a1.pendingSelection, null);
});

test("readLiveInstances: each query key narrows, an empty query returns every record, no state gives an empty list", () => {
  const KDB = makeKDB();
  assert.deepEqual(facade.readLiveInstances(KDB, { filterType: "sicht" }).map((e) => e.filterInstanceId), ["s1"]);
  assert.deepEqual(facade.readLiveInstances(KDB, { status: "missing" }).map((e) => e.filterInstanceId), ["m1"]);
  assert.deepEqual(facade.readLiveInstances(KDB, { hostStatus: "absent" }).map((e) => e.filterInstanceId), ["h1"]);
  assert.deepEqual(facade.readLiveInstances(KDB, { selectionOwner: "sicht" }).map((e) => e.filterInstanceId), ["o1", "s1"]);
  assert.equal(facade.readLiveInstances(KDB).length, 8);
  assert.equal(facade.readLiveInstances(KDB, {}).length, 8);
  assert.deepEqual(facade.readLiveInstances({}, SPECIAL_QUERY), []);
  assert.deepEqual(facade.readLiveInstances({ state: { filters: {} } }, SPECIAL_QUERY), []);
});

test("readInventoryStatus equals the cloned inventory of readSingleSelectState and is null without one", () => {
  const KDB = makeKDB();
  assert.deepEqual(facade.readInventoryStatus(KDB), stateSelectors.readSingleSelectState(KDB).inventory);
  const copy = facade.readInventoryStatus(KDB);
  assert.notStrictEqual(copy, KDB.state.filters.singleSelect.inventory);
  assert.strictEqual(facade.readInventoryStatus({}), null);
  assert.strictEqual(facade.readInventoryStatus({ state: { filters: { singleSelect: {} } } }), null);
  assert.strictEqual(stateSelectors.readSingleSelectState({ state: { filters: { singleSelect: {} } } }).inventory, null);
});

test("generation and projected instance reads answer like the state selectors", () => {
  const KDB = makeKDB();
  assert.equal(facade.readInventoryGeneration(KDB), stateSelectors.readInventoryGeneration(KDB));
  assert.deepEqual(facade.readFilterInstance(KDB, "z1"), stateSelectors.readFilterInstance(KDB, "z1"));
  assert.deepEqual(facade.readFilterInstances(KDB, { scopeType: "global" }), stateSelectors.readFilterInstances(KDB, { scopeType: "global" }));
  assert.equal(facade.readFilterInstance(KDB, "z1").filterInstanceId, "z1");
  assert.deepEqual(Object.keys(facade).sort(), [
    "readFilterInstance", "readFilterInstances", "readInventoryGeneration", "readInventoryStatus", "readLiveInstances"
  ]);
  assert.equal(facade.readInventoryGeneration(makeKDB()), 4);
});
