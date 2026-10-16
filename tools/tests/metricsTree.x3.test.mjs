// P2-X3: which Cognos property metricsTree/catalog.js reads for the tree source configuration.
// The saved value comes from the real paste source __savedProperties/kennzahlenTreePropId.js, unwrapped like
// core/properties/loadProperties (single wrapper key = property id). Run: node --test tools/tests/metricsTree.x3.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const catalog = loadAmd(path.join(JS_ROOT, "dashboard/metricsTree/catalog.js"));
const SAVED_PATH = path.resolve(JS_ROOT, "../../__savedProperties/kennzahlenTreePropId.js");

function readSavedTreeProperty() {
  const source = readFileSync(SAVED_PATH, "utf8");
  const raw = new Function(source + "\nreturn kennzahlenTreePropId;")();
  const parsed = JSON.parse(raw);
  assert.deepStrictEqual(Object.keys(parsed), ["kennzahlenTreePropId"]);
  return parsed.kennzahlenTreePropId;
}

function row(values) {
  const out = {};
  Object.keys(values).forEach(function (key) { out[key] = { display: values[key] }; });
  return out;
}

const ROWS = [
  row({ "Kennzahlen - Name": "K1", KURZTEXT: "Eins", Gruppe1: "A", Gruppe2: "B", Gruppe3: "C", FREIGABE: "1" }),
  row({ "Kennzahlen - Name": "K2", KURZTEXT: "Zwei", Gruppe1: "A", Gruppe2: "D", Gruppe3: "", FREIGABE: "1" })
];

function build(properties) {
  const input = { sourceKey: "personal_kdb", tableName: "Personal_KDB", rows: ROWS, tableConfigObject: {}, isSuperUserAllowed: false };
  const result = catalog.buildMetricsTreeSources({ properties: properties }, input);
  return result.bySource.personal_kdb;
}

function groupTexts(entry) {
  return entry.nodes.filter(function (node) { return node.li_attr; }).map(function (node) { return node.text; });
}

const DEFAULT_GROUPS = ["A", "B", "C", "D"];

test("saved fixture has the shape the catalog parser handles", () => {
  const saved = readSavedTreeProperty();
  assert.deepStrictEqual(saved.Personal_KDB.pathColumnNamesArr, ["Gruppe1", "Gruppe2", "Gruppe3"]);
});

test("absent tree property builds the default-path-column tree with an empty treeConfig", () => {
  const entry = build({});
  assert.deepStrictEqual(entry.treeConfig, {});
  assert.deepStrictEqual(groupTexts(entry), DEFAULT_GROUPS);
  assert.equal(entry.hasRenderableData, true);
});

test("unusable tree property values fall back to the default path columns", () => {
  [null, "-", "text", 7, [], {}, { Other: { pathColumnNamesArr: ["Gruppe2"] } }, { Personal_KDB: {} },
    { Personal_KDB: { pathColumnNamesArr: [] } }, { Personal_KDB: { pathColumnNamesArr: "Gruppe2" } }].forEach(function (value) {
    const entry = build({ kennzahlenTreePropObj: value });
    assert.deepStrictEqual(groupTexts(entry), DEFAULT_GROUPS, JSON.stringify(value));
  });
});

test("kennzahlenTreePropObj with the saved shape is the treeConfig of the source (matched by table name)", () => {
  const saved = readSavedTreeProperty();
  const entry = build({ kennzahlenTreePropObj: saved });
  assert.deepStrictEqual(entry.treeConfig, saved.Personal_KDB);
  assert.deepStrictEqual(groupTexts(entry), DEFAULT_GROUPS);
});

test("entry under the source key wins over the entry under the table name", () => {
  const entry = build({ kennzahlenTreePropObj: {
    personal_kdb: { pathColumnNamesArr: ["Gruppe1"] },
    Personal_KDB: { pathColumnNamesArr: ["Gruppe2"] }
  } });
  assert.deepStrictEqual(groupTexts(entry), ["A"]);
});

test("custom pathColumnNamesArr under kennzahlenTreePropObj is honoured", () => {
  const entry = build({ kennzahlenTreePropObj: { Personal_KDB: { pathColumnNamesArr: ["Gruppe2"] } } });
  assert.deepStrictEqual(groupTexts(entry), ["B", "D"]);
  assert.deepStrictEqual(entry.nodes.filter((n) => !n.li_attr).map((n) => n.parent), ["group:personal_kdb:B", "group:personal_kdb:D"]);
});

test("the old name metricsTreePropObj is no longer read", () => {
  const entry = build({ metricsTreePropObj: { Personal_KDB: { pathColumnNamesArr: ["Gruppe2"] } } });
  assert.deepStrictEqual(entry.treeConfig, {});
  assert.deepStrictEqual(groupTexts(entry), DEFAULT_GROUPS);
});
