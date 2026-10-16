// nativeMultiSelect inventory scan: the kennzahlen source is read once per scan (createClaimIndex), not once per descriptor.
// Run: node --test tools/tests/nativeMultiSelect.claimScan.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const quietConsole = { log() {}, info() {}, debug() {}, warn() {}, error() {} };
const inventory = loadAmd(path.join(JS_ROOT, "dashboard/filters/nativeMultiSelect/inventory.js"), { stubs: { console: quietConsole } });

function countingKDB() {
  const counter = { sourceReads: 0 };
  const KDB = {
    properties: {
      get kennzahlenTablesPropObj() {
        counter.sourceReads += 1;
        return { Personal_KDB: {} };
      },
      filterPropObj: {
        Personal_KDB: { filterInstances: { j: { scopeType: "global", itemName: "Jahr", itemId: "[J]", isNative: true, isSingleSelect: "false" } } }
      }
    }
  };
  return { KDB, counter };
}

const descriptor = (n) => ({ itemId: "[J]", itemName: "Jahr", rawScopeId: n % 2 ? "global" : "tabpanel" + n });

test("scan with a prebuilt claim index reads the kennzahlen source once for 100 descriptors", () => {
  const { KDB, counter } = countingKDB();
  const index = inventory.createClaimIndex(KDB);
  assert.equal(counter.sourceReads, 1);
  for (let n = 0; n < 100; n += 1) {
    assert.equal(inventory.isUnownedFilterDescriptor(KDB, descriptor(n), index), true);
  }
  assert.equal(counter.sourceReads, 1);
  assert.equal(inventory.readClaimDefinition(KDB, "global", "Jahr", "[J]", index).status, "ok");
  assert.equal(counter.sourceReads, 1);
});

test("without an index each call reads the source (and builds its own index), results unchanged", () => {
  const { KDB, counter } = countingKDB();
  const withIndex = inventory.readClaimDefinition(KDB, "global", "Jahr", "[J]", inventory.createClaimIndex(KDB));
  const reads = counter.sourceReads;
  const without = inventory.readClaimDefinition(KDB, "global", "Jahr", "[J]");
  assert.deepEqual(without, withIndex);
  assert.equal(counter.sourceReads, reads + 1);
  assert.equal(inventory.isUnownedFilterDescriptor(KDB, descriptor(1)), true);
  assert.equal(counter.sourceReads, reads + 2);
});
