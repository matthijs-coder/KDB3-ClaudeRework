// Golden tests for the org-tree / hierarchy-cell parsers (Phase 2 W7). Recorded on the pre-W7 code, where the
// core drillthrough copy and the widgetVis copy were separate; both labels must keep answering identically.
// Run: node --test tools/tests/org-tree.golden.test.mjs
// Re-record (review the diff!): RECORD=1 node tools/tests/org-tree.golden.test.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";
import { CELLS, ROW_SETS, NON_ARRAY_ROWS, SICHTS, jsonSafe } from "./lib/org-tree-corpus.mjs";

const GOLDEN_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/org-tree.golden.json");
const RECORD = process.env.RECORD === "1";
const golden = RECORD ? {} : JSON.parse(readFileSync(GOLDEN_FILE, "utf8"));
const BW_KEY = "dienststelle_bw_hierarchy";
const DEZPV_KEY = "dienststelle_dezpv_hierarchy";

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
  assert.ok(Object.prototype.hasOwnProperty.call(golden, name), "missing golden " + name);
  assert.deepStrictEqual(value, golden[name], name);
}

function loadImpls() {
  const errors = [];
  const options = { stubs: { console: { error: (...args) => errors.push(args), log() {}, warn() {} } } };
  const owner = (rel) => loadAmd(path.join(JS_ROOT, "core/utils/orgTree", rel), options);
  const vis = loadAmd(path.join(JS_ROOT, "dashboard/widgets/widgetVis/drillthrough/orgTree.js"), options);
  return {
    errors,
    coreParse: owner("hierarchyCell.js").parseHierarchyCell,
    coreBuild: owner("buildOrgTree.js").buildOrgTreeFromRows,
    visParse: vis.parseHierarchyCell,
    visBuild: vis.buildOrgTree
  };
}

const readerOf = (rows, seen) => (descriptors) => {
  if (seen) seen.push(descriptors);
  return rows;
};

for (const [name, cell] of CELLS) {
  test("cell parse: " + name, () => {
    const impl = loadImpls();
    const fromCore = impl.coreParse(cell);
    const fromVis = impl.visParse(cell);
    assert.deepStrictEqual(jsonSafe(fromCore), jsonSafe(fromVis), "core and widgetVis agree");
    check("cell:" + name, fromCore);
  });
}

for (const [name, rows] of ROW_SETS) {
  test("tree build: " + name, () => {
    const impl = loadImpls();
    const key = name.indexOf("dezpv") !== -1 ? DEZPV_KEY : BW_KEY;
    const sicht = key === DEZPV_KEY ? "DEZPV" : "BW";
    const fromCore = impl.coreBuild(rows, sicht, key);
    const fromVis = impl.visBuild({ readRows: readerOf(rows), sicht: sicht });
    if (rows.length) {
      assert.deepStrictEqual(jsonSafe(fromCore), jsonSafe(fromVis), "core and widgetVis agree");
    } else {
      assert.equal(fromVis, null);
    }
    check("tree:" + name, fromCore);
    check("treeVis:" + name, fromVis);
  });
}

test("tree build: non-array rows (core returns an empty tree, widgetVis returns null)", () => {
  const impl = loadImpls();
  for (const [name, value] of NON_ARRAY_ROWS) {
    check("nonArray:core:" + name, impl.coreBuild(value, "BW", BW_KEY));
    check("nonArray:vis:" + name, impl.visBuild({ readRows: readerOf(value), sicht: "BW" }));
  }
});

test("widgetVis buildOrgTree: sicht to table key, tree sicht echo, reader requests", () => {
  const impl = loadImpls();
  const rows = ROW_SETS[0][1];
  for (const [name, sicht] of SICHTS) {
    const seen = [];
    const tree = impl.visBuild({ readRows: readerOf(rows, seen), sicht: sicht });
    check("sicht:" + name, { tableKey: tree && tree.tableKey, sicht: tree && tree.sicht, requests: seen });
  }
  check("options:none", impl.visBuild());
  check("options:noReader", impl.visBuild({ sicht: "BW" }));
  check("options:readerNotFunction", impl.visBuild({ sicht: "BW", readRows: [] }));
  assert.deepStrictEqual(impl.errors, []);
});

test("widgetVis buildOrgTree: a throwing reader gives null and one console.error", () => {
  const impl = loadImpls();
  const result = impl.visBuild({ readRows: () => { throw new Error("read failed"); }, sicht: "BW" });
  assert.equal(result, null);
  assert.equal(impl.errors.length, 1);
  assert.equal(impl.errors[0][0], "[widgetVis.buildOrgTree]");
});

test("shape of the returned tree and node objects", () => {
  const impl = loadImpls();
  const tree = impl.coreBuild(ROW_SETS[0][1], "BW", BW_KEY);
  assert.deepStrictEqual(Object.keys(tree), ["sicht", "tableKey", "nodesById", "idToMember", "textToNodeId"]);
  assert.deepStrictEqual(Object.keys(tree.nodesById[1]), ["id", "parent", "children", "levelRank"]);
});

const noPrototype = () => ({ text: Object.create(null) });
const PATHOLOGICAL_ROWS = [{ level00: "Root", level01: noPrototype(), level02: "Leaf" }];

test("pathological cell (object without toString): how each copy fails", () => {
  const impl = loadImpls();
  assert.equal(impl.coreParse(noPrototype()), null);
  assert.equal(impl.errors.length, 1);
  assert.throws(() => impl.visParse(noPrototype()), TypeError);
  assert.equal(impl.visBuild({ readRows: readerOf(PATHOLOGICAL_ROWS), sicht: "BW" }), null);
  const tree = impl.coreBuild(PATHOLOGICAL_ROWS, "BW", BW_KEY);
  assert.deepStrictEqual(Object.keys(tree.textToNodeId), ["Root", "Leaf"]);
});
