// API tests for core/utils/orgTree (Phase 2 W7): table keys, bracket/level helpers, readOrgTree, published exports.
// Run: node --test tools/tests/org-tree-owner.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";
import { BW_ROWS, DEZPV_ROWS } from "./lib/org-tree-corpus.mjs";

const load = (rel) => loadAmd(path.join(JS_ROOT, "core/utils/orgTree", rel), { stubs: { console: { error() {}, log() {} } } });
const table = load("hierarchyTable.js");
const cell = load("hierarchyCell.js");
const tree = load("buildOrgTree.js");

test("published exports", () => {
  assert.deepStrictEqual(Object.keys(table), ["HIERARCHY_TABLE_KEYS", "normalizeSicht", "hierarchyTableKey"]);
  assert.deepStrictEqual(Object.keys(cell), ["parseHierarchyCell", "extractLastBracketToken", "parseLevelNumber"]);
  assert.deepStrictEqual(Object.keys(tree), ["buildOrgTreeFromRows", "readOrgTree"]);
});

test("hierarchyTable: DEZPV after upper-case and trim, everything else BW", () => {
  assert.deepStrictEqual(table.HIERARCHY_TABLE_KEYS, { BW: "dienststelle_bw_hierarchy", DEZPV: "dienststelle_dezpv_hierarchy" });
  assert.equal(table.normalizeSicht("  dezpv "), "DEZPV");
  assert.equal(table.normalizeSicht(null), "");
  for (const [sicht, key] of [["DEZPV", "DEZPV"], [" dezpv", "DEZPV"], ["BW", "BW"], ["", "BW"], [undefined, "BW"], ["x", "BW"]]) {
    assert.equal(table.hierarchyTableKey(sicht), table.HIERARCHY_TABLE_KEYS[key], String(sicht));
  }
});

test("extractLastBracketToken and parseLevelNumber", () => {
  assert.equal(cell.extractLastBracketToken("[Org].[level02].[Abt 7]"), "Abt 7");
  assert.equal(cell.extractLastBracketToken("  [a]  "), "a");
  assert.equal(cell.extractLastBracketToken("[ ]"), "");
  assert.equal(cell.extractLastBracketToken("none"), "");
  assert.equal(cell.extractLastBracketToken(null), "");
  assert.equal(cell.extractLastBracketToken("[a]\n[b]"), "a");
  assert.equal(cell.parseLevelNumber("[Org].[level02].[x]"), 2);
  assert.equal(cell.parseLevelNumber("LEVEL000"), 0);
  assert.equal(cell.parseLevelNumber("[Org].[x]"), null);
  assert.equal(cell.parseLevelNumber(undefined), null);
});

test("readOrgTree: table per sicht, request shape, null without reader or rows, sicht echoed as given", () => {
  const seen = [];
  const read = (descriptors) => {
    seen.push(descriptors);
    return descriptors[0].tableName === "dienststelle_dezpv_hierarchy" ? DEZPV_ROWS : BW_ROWS;
  };
  const dezpv = tree.readOrgTree({ readRows: read, sicht: " dezpv " });
  assert.equal(dezpv.tableKey, "dienststelle_dezpv_hierarchy");
  assert.equal(dezpv.sicht, " dezpv ");
  assert.equal(dezpv.idToMember[1].text, "DS_KAV|ALLE");
  assert.deepStrictEqual(seen, [[{ tableName: "dienststelle_dezpv_hierarchy" }]]);
  assert.equal(tree.readOrgTree({ readRows: read, sicht: "BW" }).tableKey, "dienststelle_bw_hierarchy");
  assert.equal(tree.readOrgTree(), null);
  assert.equal(tree.readOrgTree({ sicht: "BW" }), null);
  assert.equal(tree.readOrgTree({ readRows: () => [], sicht: "BW" }), null);
  assert.equal(tree.readOrgTree({ readRows: () => ({}), sicht: "BW" }), null);
  assert.throws(() => tree.readOrgTree({ readRows: () => { throw new Error("boom"); } }), /boom/);
});

test("buildOrgTreeFromRows: empty tree for non-array input, echoes sicht and table key", () => {
  assert.deepStrictEqual(tree.buildOrgTreeFromRows(null, "BW", "k"), { sicht: "BW", tableKey: "k", nodesById: {}, idToMember: {}, textToNodeId: {} });
});
