// Pending oracle for Phase 2 W7b: outputs of dashboard/filters/dienststelle/restore/hierarchyIndex.js over the shared
// org-tree corpus, recorded on the pre-W7 code. The index is a different product from the org tree (full unique names
// with display/leaf aliases, not parent/child nodes); W7b may only swap its bracket-leaf helper for the org-tree owner
// if this test still passes, or has to record the delta (see internal/phase2/w7-plan.md, section "Dienststelle mapping").
// Run: node --test tools/tests/org-tree-dienststelle.oracle.test.mjs
// Re-record (review the diff!): RECORD=1 node tools/tests/org-tree-dienststelle.oracle.test.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";
import { CELLS, ROW_SETS, jsonSafe } from "./lib/org-tree-corpus.mjs";

const GOLDEN_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/org-tree-dienststelle.oracle.json");
const RECORD = process.env.RECORD === "1";
const golden = RECORD ? {} : JSON.parse(readFileSync(GOLDEN_FILE, "utf8"));
const hierarchy = loadAmd(path.join(JS_ROOT, "dashboard/filters/dienststelle/restore/hierarchyIndex.js"));

after(() => {
  if (RECORD) {
    const lines = Object.keys(golden).map((key) => "  " + JSON.stringify(key) + ": " + JSON.stringify(golden[key]));
    writeFileSync(GOLDEN_FILE, "{\n" + lines.join(",\n") + "\n}\n");
  }
});

function check(name, actual) {
  const value = jsonSafe(actual);
  if (RECORD) {
    golden[name] = value;
    return;
  }
  assert.ok(Object.prototype.hasOwnProperty.call(golden, name), "missing oracle " + name);
  assert.deepStrictEqual(value, golden[name], name);
}

function probesOf(index) {
  const probes = ["", "unknown", null, undefined, 42];
  Object.keys(index.members).forEach((key) => probes.push(key));
  Object.keys(index.byLeaf).forEach((key) => probes.push(key));
  Object.keys(index.byDisplay).forEach((key) => probes.push(key));
  return probes.filter((probe, i) => probes.indexOf(probe) === i);
}

function record(prefix, rows) {
  const index = hierarchy.buildHierarchyIndex(rows);
  check(prefix + ":index", index);
  check(prefix + ":resolve", probesOf(index).map((probe) => [probe, hierarchy.hasUseValue(index, probe), hierarchy.resolveRestorePair(index, probe)]));
}

for (const [name, cell] of CELLS) {
  test("dienststelle index, single cell: " + name, () => {
    record("cell:" + name, [{ c: cell }]);
  });
}

for (const [name, rows] of ROW_SETS) {
  test("dienststelle index, row set: " + name, () => {
    record("rows:" + name, rows);
  });
}

test("dienststelle index: non-array input and null index", () => {
  check("input:null", hierarchy.buildHierarchyIndex(null));
  check("input:object", hierarchy.buildHierarchyIndex({ a: 1 }));
  check("nullIndex", [hierarchy.hasUseValue(null, "x"), hierarchy.resolveRestorePair(null, "x")]);
  assert.deepStrictEqual(Object.keys(hierarchy).sort(), ["buildHierarchyIndex", "hasUseValue", "resolveRestorePair"]);
});
