// Golden tests for dashboard/metricsTree (catalog build + resolveMetricByCode).
// Run: node --test tools/tests/metricsTree.test.mjs. Regenerate the golden file: UPDATE_GOLDEN=1 node --test tools/tests/metricsTree.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const GOLDEN_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "fixtures/metricsTree.golden.json");
const MT = path.join(JS_ROOT, "dashboard/metricsTree");

const buildMetricsTreeSources = loadAmd(path.join(MT, "state/buildMetricsTreeSources.js"));
const oldResolve = loadAmd(path.join(MT, "state/resolveMetricByCode.js")).resolveMetricByCode;

function cell(display) {
  return { display: display };
}

function row(values) {
  const out = {};
  Object.keys(values).forEach(function (key) { out[key] = cell(values[key]); });
  return out;
}

const ROWS_DEFAULT = [
  row({ "Kennzahlen - Name": "X1", KURZTEXT: "Kurz eins", LANGTEXT: "X1: Lang eins", PFAD: "Alpha/Beta", Gruppe1: "A", Gruppe2: "B", FREIGABE: "1", URL: "http://u/1" }),
  row({ "Kennzahlen - Name": "X1", KURZTEXT: "Duplicate", LANGTEXT: "", PFAD: "Alpha/Beta", Gruppe1: "A", Gruppe2: "B", FREIGABE: "1", URL: "http://u/dup" }),
  row({ "Kennzahlen - Name": "  X9 ", KURZTEXT: "Spaces", LANGTEXT: "", PFAD: "Alpha", Gruppe1: "A", Gruppe2: "", FREIGABE: "1", URL: "" }),
  row({ "Kennzahlen - Name": "", KURZTEXT: "No code kurz", LANGTEXT: "", PFAD: "", Gruppe1: "", Gruppe2: "", FREIGABE: "", URL: "" }),
  row({ "Kennzahlen - Name": "", KURZTEXT: "", LANGTEXT: "Only: langtext", PFAD: "", Gruppe1: "C", Gruppe2: "", FREIGABE: "", URL: "" }),
  row({ "Kennzahlen - Name": "", KURZTEXT: "", LANGTEXT: "", PFAD: "", Gruppe1: "", Gruppe2: "", FREIGABE: "", URL: "" }),
  row({ "Kennzahlen - Name": "BETA1", KURZTEXT: "Beta metric", LANGTEXT: "", PFAD: "Alpha/Beta", Gruppe1: "A", Gruppe2: "B", FREIGABE: "0", URL: "" }),
  row({ "Kennzahlen - Name": "AMP", KURZTEXT: "A&B <x>", LANGTEXT: "", PFAD: "A&B/<x>", Gruppe1: "A&B", Gruppe2: "<x>", FREIGABE: "1", URL: "" })
];

const ROWS_CONFIGURED = [
  row({ MyCode: "M1", MyText: "Mapped one", Hard: "Hardcoded one", Rel: "1", LANGTEXT: "", Gruppe1: "G" }),
  row({ MyCode: "M2", MyText: "Mapped two", Hard: "", Rel: "0", LANGTEXT: "", Gruppe1: "G" }),
  row({ MyCode: "X1", MyText: "Other source X1", Hard: "", Rel: "1", LANGTEXT: "", Gruppe1: "H" })
];

const CONFIG_PROPERTIES = {
  metricsTablesPropObj: {
    tblA: { code: "MyCode", kurztext: "MyText", freigabe: "Rel", hardcoded: "Hard" },
    tblB: { code: "MyCode", kurztext: "MyText", freigabe: "Rel" }
  },
  metricsTreePropObj: { tblA: { pathColumnNamesArr: ["Gruppe1"] } }
};

const SCENARIOS = {
  defaultNormal: { properties: {}, input: { sourceKey: "personal_kdb", tableName: "Personal", rows: ROWS_DEFAULT, tableConfigObject: {}, isSuperUserAllowed: false } },
  defaultSuper: { properties: {}, input: { sourceKey: "personal_kdb", tableName: "Personal", rows: ROWS_DEFAULT, tableConfigObject: {}, isSuperUserAllowed: true } },
  configured: { properties: CONFIG_PROPERTIES, input: { rows: ROWS_CONFIGURED, isSuperUserAllowed: false } },
  configuredSuper: { properties: CONFIG_PROPERTIES, input: { rows: ROWS_CONFIGURED, isSuperUserAllowed: true } },
  noRows: { properties: {}, input: { sourceKey: "personal_kdb", rows: [] } },
  invalidInput: { properties: {}, input: null }
};

const CODES = ["", "X1", " X1 ", "X9", "  X9 ", "missing", "BETA1", "M1", "M2", "AMP", "kennzahl_3", "kennzahl_5", "No code kurz", "Only: langtext", null, undefined];

function buildAll(buildSources) {
  const out = {};
  Object.keys(SCENARIOS).forEach(function (name) {
    const scenario = SCENARIOS[name];
    out[name] = buildSources({ properties: scenario.properties }, scenario.input);
  });
  return out;
}

function readyState(sources) {
  return { lifecycle: "ready", bySource: sources.bySource, sourceOrder: sources.sourceOrder, hasRenderableData: sources.hasRenderableData };
}

function resolveAll(resolveMetric, sourcesByScenario) {
  const out = {};
  ["defaultSuper", "configuredSuper"].forEach(function (name) {
    const state = readyState(sourcesByScenario[name]);
    out[name] = CODES.map(function (code) { return resolveMetric({ state: { metricsTree: state } }, code); });
  });
  out.loading = CODES.map(function (code) {
    return resolveMetric({ state: { metricsTree: Object.assign(readyState(sourcesByScenario.defaultSuper), { lifecycle: "loading" }) } }, code);
  });
  out.noState = [resolveMetric({}, "X1"), resolveMetric({ state: {} }, "X1")];
  return out;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function readGolden() {
  return JSON.parse(readFileSync(GOLDEN_PATH, "utf8"));
}

function checkGolden(actual) {
  if (process.env.UPDATE_GOLDEN === "1") {
    writeFileSync(GOLDEN_PATH, JSON.stringify(actual, null, 2) + "\n");
  }
  return readGolden();
}

test("buildMetricsTreeSources + resolveMetricByCode match the golden output", () => {
  const sources = buildAll(buildMetricsTreeSources);
  const actual = { sources: plain(sources), resolved: plain(resolveAll(oldResolve, sources)) };
  assert.deepStrictEqual(actual, checkGolden(actual));
});
