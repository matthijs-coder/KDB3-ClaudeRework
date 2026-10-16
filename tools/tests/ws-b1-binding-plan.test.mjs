// Golden tests for core/services/widgetBindingPlan (WS-B1).
// Run:    node --test tools/tests/ws-b1-binding-plan.test.mjs
// Record: WS_B_RECORD=1 node --test tools/tests/ws-b1-binding-plan.test.mjs   (rewrites the snapshot; do this only on a deliberate contract change)
// The snapshot (ws-b1-binding-plan.snapshot.json) was recorded on the unrefactored code. `legacyError` keys are ignored on both sides.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const JS_ROOT = path.resolve(HERE, "../../_____________KDB3API/KDB3/js");
const SNAPSHOT_FILE = path.join(HERE, "ws-b1-binding-plan.snapshot.json");
const RECORD = process.env.WS_B_RECORD === "1";

const quiet = { error() {}, warn() {}, log() {}, info() {}, debug() {} };
const buildPlan = loadAmd(path.join(JS_ROOT, "core/services/widgetBindingPlan/buildPlan.js"), { stubs: { console: quiet } });
const normalizeDefaultValue = loadAmd(path.join(JS_ROOT, "core/services/widgetBindingPlan/defaults/normalizeDefaultValue.js"));
const visTypes = loadAmd(path.join(JS_ROOT, "dashboard/widgets/widgetVis/config/visualizations/bindingSpecsVisTypes.js"));
const topNHelperConfig = loadAmd(path.join(JS_ROOT, "core/config/visualizations/topNHelper.js"));

const clone = (value) => structuredClone(value);
const VIS_TABLE = "Personal_KDB";
const TM1 = "[Personal_KDB_TM1]";
const GESCHLECHT = `${TM1}.[Geschlecht].[Geschlecht].[Geschlecht]`;
const EMPTY_ITEM = `${TM1}.[KDB Kennzahlen].[KDB Kennzahlen].[KDB Kennzahlen]`;
const AGG_ITEM = `${TM1}.[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]`;
const ORG_ITEM = `${TM1}.[Organisation].[Organisation].[Organisation]`;

function visTypeConfigOf(bucket) {
  return clone(visTypes.visTypeByBucket[bucket].byKennzahlenTable[VIS_TABLE]);
}

function baseConfig() {
  return {
    filterPropObj: {
      Personal_KDB_TM1: { itemId: ORG_ITEM },
      Dienststelle_TM1: { itemId: "[Dienststelle_TM1].[Organisation].[Organisation].[Organisation]" },
    },
    parameterMappingObj: {
      AggregationstypId_widget_localfilter_KID: AGG_ITEM,
      Geschlecht_widget_localfilter_KID: GESCHLECHT,
    },
    topNOptions: { "top-5": 5, "top-10": 10, "Top-3": { n: 3, value: "top-3", key: "top-3" } },
    emptyDataFilter: { itemId: EMPTY_ITEM },
  };
}

function dataTableConfig() {
  return {
    dimensions: {
      Geschlecht: { itemId: GESCHLECHT, exclude: ["Gesamt"] },
      Alter: { itemId: `${TM1}.[Alter].[Alter].[Alter]`, include: ["A", { d: "B", u: "b" }], exclude: { itemId: `${TM1}.[Alter].[Alter].[Alter]`, values: ["Z"] } },
      Eintritt: { itemId: `${TM1}.[Eintritt].[Eintritt].[Eintritt]`, include: ["E1"], reverse: ["E9"] },
      Ohne: {},
    },
    sorting: {
      [GESCHLECHT]: { order: "descending", priority: 1 },
      [`${TM1}.[Jahr_flach].[Jahr_flach].[Jahr]`]: "ascending",
    },
  };
}

function visSpec(bucket, overrides = {}) {
  const visualizationType = bucket === "pie" ? "pie" : bucket;
  const spec = {
    reason: "contentCreate",
    targetKind: "vis",
    widgetId: "w1",
    ownerWidgetId: null,
    opSeq: 7,
    dataConfig: {
      kennzahlCode: "P_A_MOA_01",
      kennzahlenTable: VIS_TABLE,
      datasourceName: VIS_TABLE,
      datasourceId: "ds1",
      visualizationType,
      cognosVisualizationTypeId: visTypes.visTypeByBucket[bucket].cognosVisualizationTypeId,
      visPropBucketKey: bucket,
      visTypeConfig: visTypeConfigOf(bucket),
      dataTableConfig: dataTableConfig(),
      kennzahlDefaults: { formatType: "number", jahrCaption: "Anzahl im Zeitraum" },
      dimension: null,
      topN: null,
    },
    hierarchySnapshot: null,
    helperTableResult: null,
    emptyIntent: { enabled: false, reason: null, itemId: null, value: null },
    resetIntent: { enabled: false, scope: null, clearAllSlots: false, clearAllLocalFilters: false, reason: null },
    config: baseConfig(),
  };
  return applyOverrides(spec, overrides);
}

function applyOverrides(spec, overrides) {
  for (const [key, value] of Object.entries(overrides)) {
    if (key === "dataConfig") Object.assign(spec.dataConfig, value);
    else if (key === "config") Object.assign(spec.config, value);
    else spec[key] = value;
  }
  return spec;
}

function mutate(spec, fn) {
  fn(spec);
  return spec;
}

const hierarchySnapshot = (confirmed, extra = {}) => ({
  hierarchyItemId: ORG_ITEM,
  activeDownstreamName: "Personal_KDB_TM1",
  resolution: {
    hasConfirmedSelection: confirmed,
    downstreamValues: ["#101 | Amt A", "  #102 | Amt B  ", ""],
    displayValues: ["Amt A", "Amt B", ""],
    ...extra,
  },
});

const helperOk = () => ({ ok: true, topNResultValues: ["m", { display: "w", use: "W" }, "", null], topNExcludeItemId: GESCHLECHT });

function helperSpec(reason, overrides = {}) {
  const table = topNHelperConfig.resolveTableEntry(VIS_TABLE);
  const itemId = GESCHLECHT;
  const widgetFilter = {
    AggregationstypId: { include: ["Stichtag"] },
    [table.jahrColumnId]: { include: ["2025"] },
    [table.monatColumnId]: { include: ["JAN"] },
  };
  const resetReason = reason === "cleanup" ? "postResolution" : "topNHelperPreApply";
  const spec = {
    reason,
    targetKind: "topNHelper",
    widgetId: "helper1",
    ownerWidgetId: "w1",
    opSeq: 11,
    dataConfig: {
      kennzahlCode: "P_A_MOA_01",
      kennzahlenTable: VIS_TABLE,
      datasourceId: "ds1",
      datasourceName: VIS_TABLE,
      visualizationType: "TopN",
      cognosVisualizationTypeId: "List",
      visPropBucketKey: "List",
      visTypeConfig: {
        values: "",
        categories: "",
        series: "",
        color: "",
        repeatHorizontal: "",
        repeatVertical: "",
        grid_cols: [itemId, table.valueColumnId],
        dimensionSelectionAffects: "disabled",
        widgetFilter,
      },
      dataTableConfig: { datasourceName: VIS_TABLE, dimensions: { Geschlecht: { itemId, exclude: { itemId, values: ["Gesamt", "ALLE", "^"] } } }, sorting: {} },
      dimension: "Geschlecht",
      topN: "top-5",
    },
    hierarchySnapshot: null,
    helperTableResult: null,
    resetIntent: { enabled: true, scope: "helperTarget", clearAllSlots: true, clearAllLocalFilters: true, reason: resetReason },
    emptyIntent: { enabled: false, reason: null, itemId: null, value: null },
    config: baseConfig(),
  };
  return applyOverrides(spec, overrides);
}

const FIXTURES = {
  "vis-line-default": () => visSpec("Line"),
  "vis-line-dimension": () => visSpec("Line", { dataConfig: { dimension: "Geschlecht", visPropBucketKey: "Line", grouping: "stichtag" } }),
  "vis-line-grain-jahr": () => visSpec("Line", { dataConfig: { grouping: "jahr" } }),
  "vis-line-grain-jahrstichtag": () => visSpec("Line", { dataConfig: { grouping: "jahrStichtag" } }),
  "vis-line-extra-filter": () => visSpec("Line", { dataConfig: { kennzahlDefaults: { jahrCaption: "Summe", extraFilter: { Jahr: { exclude: ["2025"] } } } } }),
  "vis-list-default": () => visSpec("List"),
  "vis-list-dimension": () => visSpec("List", { dataConfig: { dimension: "Geschlecht" } }),
  "vis-list-dimension-multi-rules": () => visSpec("List", { dataConfig: { dimension: "Alter" } }),
  "vis-list-dimension-include-reverse": () => visSpec("List", { dataConfig: { dimension: "Eintritt" } }),
  "vis-list-sorting-array-order": () => visSpec("List", {
    dataConfig: {
      dimension: "Geschlecht",
      dataTableConfig: {
        ...dataTableConfig(),
        sorting: {
          [GESCHLECHT]: { order: ["captionAscending", "x"], priority: 2 },
          [`${TM1}.[Monat_flach].[Monat_flach].[Monat]`]: ["a", "b"],
          [`${TM1}.[Jahr_flach].[Jahr_flach].[Jahr]`]: " descending ",
        },
      },
    },
  }),
  "vis-list-dimension-no-itemid": () => visSpec("List", { dataConfig: { dimension: "Ohne" } }),
  "vis-list-grain-jahr": () => visSpec("List", { dataConfig: { grouping: "jahr", dimension: "Geschlecht" } }),
  "vis-pie-geschlecht": () => visSpec("pie", {
    dataConfig: { dimension: "Geschlecht" },
  }),
  "vis-pie-no-param-mapping": () => visSpec("pie", { config: { ...baseConfig(), parameterMappingObj: { AggregationstypId_widget_localfilter_KID: AGG_ITEM } } }),
  "vis-stackedbar-dimension": () => visSpec("StackedBar", { dataConfig: { dimension: "Geschlecht" } }),
  "vis-stackedcolumn-default": () => visSpec("StackedColumn"),
  "vis-prognose-stichtag": () => visSpec("com.ibm.vis.custom.prognoseyearlinechart", {
    dataConfig: { visualizationType: "Prognose", dimension: "Geschlecht" },
  }),
  "topn-line-dimension-helper-ok": () => visSpec("Line", {
    reason: "topn",
    dataConfig: { dimension: "Geschlecht", topN: "top-5" },
    helperTableResult: helperOk(),
  }),
  "topn-list-case-insensitive-option": () => visSpec("List", {
    reason: "topn",
    dataConfig: { dimension: "Geschlecht", topN: " TOP 3 " },
    helperTableResult: helperOk(),
  }),
  "topn-helper-failed": () => visSpec("Line", {
    reason: "topn",
    dataConfig: { dimension: "Geschlecht", topN: "top-5" },
    helperTableResult: { ok: false, error: "x" },
  }),
  "topn-helper-missing": () => visSpec("Line", { reason: "topn", dataConfig: { dimension: "Geschlecht", topN: "top-5" } }),
  "topn-helper-empty-values": () => visSpec("Line", {
    reason: "topn",
    dataConfig: { dimension: "Geschlecht", topN: "top-5" },
    helperTableResult: { ok: true, topNResultValues: ["", null], topNExcludeItemId: GESCHLECHT },
  }),
  "topn-unknown": () => visSpec("Line", { dataConfig: { dimension: "Geschlecht", topN: "top-99" } }),
  "topn-default-without-dimension": () => visSpec("Line", { dataConfig: { dimension: null, topN: "top-5" }, helperTableResult: helperOk() }),
  "topn-sentinel-default": () => visSpec("Line", { dataConfig: { dimension: "Geschlecht", topN: "default" } }),
  "hierarchy-list-confirmed": () => visSpec("List", {
    reason: "hierarchy",
    dataConfig: { dimension: "Geschlecht" },
    hierarchySnapshot: hierarchySnapshot(true),
  }),
  "hierarchy-line-confirmed-rewrite-token": () => visSpec("Line", {
    reason: "hierarchyfilter",
    hierarchySnapshot: {
      hierarchyItemId: "[Dienststelle_TM1].[Organisation].[Organisation].[Organisation]",
      activeDownstreamName: "Dienststelle_TM1",
      resolution: { hasConfirmedSelection: true, dominantValues: ["#5 | X | #6 | Y", "plain"] },
    },
  }),
  "hierarchy-list-not-confirmed": () => visSpec("List", { hierarchySnapshot: hierarchySnapshot(false) }),
  "hierarchy-list-no-values": () => visSpec("List", { hierarchySnapshot: hierarchySnapshot(true, { downstreamValues: [], displayValues: [] }) }),
  "hierarchy-list-no-source": () => visSpec("List", {
    hierarchySnapshot: { ...hierarchySnapshot(true), activeDownstreamName: "unknown" },
    config: { ...baseConfig(), filterPropObj: { Other_TM1: { itemId: "[Other_TM1].[x]" } } },
  }),
  "hierarchy-pie-slot-policy": () => visSpec("pie", {
    dataConfig: { dimension: "Geschlecht" },
    hierarchySnapshot: hierarchySnapshot(true),
  }),
  "hierarchy-stackedbar-no-policy": () => visSpec("StackedBar", { hierarchySnapshot: hierarchySnapshot(true) }),
  "intent-empty-forceempty": () => visSpec("Line", { reason: "cleanup", emptyIntent: { enabled: true, reason: "noData", itemId: null, value: "1" } }),
  "intent-empty-config-item": () => visSpec("List", { emptyIntent: { enabled: true, reason: "noData", value: "" } }),
  "intent-empty-missing-item": () => visSpec("Line", { emptyIntent: { enabled: true, reason: "noData" }, config: { ...baseConfig(), emptyDataFilter: {} } }),
  "intent-empty-invalid-value": () => visSpec("Line", { emptyIntent: { enabled: true, itemId: EMPTY_ITEM, value: "0" } }),
  "intent-reset-settings-delete": () => visSpec("Line", {
    reason: "cleanup",
    resetIntent: { enabled: true, scope: "visTarget", clearAllSlots: true, clearAllLocalFilters: true, reason: "settingsDelete" },
  }),
  "intent-reset-param-set-reset": () => visSpec("Line", {
    reason: "parameterSetReset",
    resetIntent: { enabled: true, scope: "visTarget", clearAllSlots: true, clearAllLocalFilters: true, reason: "parameterSetReset" },
  }),
  "intent-reset-defaults": () => visSpec("List", { reason: "cleanup", resetIntent: { enabled: true } }),
  "helper-pre-apply-top5": () => helperSpec("topN"),
  "helper-pre-apply-top10-hierarchy": () => helperSpec("topN", {
    dataConfig: { topN: "top-10" },
    hierarchySnapshot: hierarchySnapshot(true, { hostDisplayValues: ["Host A", "", null] }),
  }),
  "helper-pre-apply-unknown-topn": () => helperSpec("topN", { dataConfig: { topN: "top-77" } }),
  "helper-cleanup": () => helperSpec("cleanup", { dataConfig: { topN: null } }),
  "failure-invalid-target-kind": () => visSpec("Line", { targetKind: "nope" }),
  "failure-missing-data-config": () => mutate(visSpec("Line"), (spec) => { spec.dataConfig = null; }),
  "failure-missing-datasource": () => visSpec("Line", { dataConfig: { datasourceId: "" } }),
  "failure-missing-vis-config": () => visSpec("Line", { dataConfig: { visTypeConfig: null } }),
  "failure-missing-config-snapshots": () => mutate(visSpec("Line"), (spec) => { spec.config = { filterPropObj: {} }; }),
  "failure-required-slot-empty": () => visSpec("Line", { dataConfig: { visTypeConfig: { ...visTypeConfigOf("Line"), series: "", dimensionSelectionAffects: "series" } } }),
  "failure-dimension-missing-affects": () => visSpec("List", { dataConfig: { dimension: "Geschlecht", visTypeConfig: { ...visTypeConfigOf("List"), dimensionSelectionAffects: "" } } }),
  "failure-null-spec": () => null,
  "failure-non-object-spec": () => "spec",
  "failure-internal-throw": () => {
    const visTypeConfig = {};
    Object.defineProperty(visTypeConfig, "values", { enumerable: false, get() { throw new Error("boom"); } });
    return visSpec("Line", { dataConfig: { visTypeConfig } });
  },
};

function strip(value) {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value)) {
      if (key !== "legacyError") out[key] = strip(value[key]);
    }
    return out;
  }
  return value;
}

// JSON-faithful encoding that keeps `undefined` visible (consumers may check `"key" in obj`).
function encode(value) {
  if (value === undefined) return "__undefined__";
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value)) out[key] = encode(value[key]);
    return out;
  }
  return value;
}

function collectObjects(value, label, seen, shared) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) {
    shared.push(`${label} (also at ${seen.get(value)})`);
    return;
  }
  seen.set(value, label);
  for (const key of Object.keys(value)) collectObjects(value[key], `${label}.${key}`, seen, shared);
}

function sharedReferences(result, spec) {
  const specObjects = new Map();
  collectObjects(spec, "spec", specObjects, []);
  const seen = new Map();
  const shared = [];
  collectObjects(result, "result", seen, shared);
  for (const [object, label] of seen) {
    if (specObjects.has(object)) shared.push(`${label} (is ${specObjects.get(object)})`);
  }
  return shared;
}

const recorded = {};
const snapshot = RECORD || !fs.existsSync(SNAPSHOT_FILE) ? {} : JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf8"));

for (const [name, make] of Object.entries(FIXTURES)) {
  test(`buildPlan golden: ${name}`, () => {
    const spec = make();
    const specBefore = spec && typeof spec === "object" ? clone(spec) : spec;
    const result = buildPlan(spec);
    const actual = encode(strip(result));

    if (spec && typeof spec === "object") {
      assert.deepStrictEqual(spec, specBefore, "buildPlan must not mutate the spec");
    }
    assert.deepStrictEqual(sharedReferences(result, spec), [], "result must not share object references with the spec or between its own fields");

    if (RECORD) {
      recorded[name] = encode(result);
      return;
    }
    assert.ok(Object.prototype.hasOwnProperty.call(snapshot, name), `snapshot missing for ${name}; record with WS_B_RECORD=1`);
    const expected = encode(strip(snapshot[name]));
    assert.deepStrictEqual(actual, expected);
    assert.equal(JSON.stringify(actual), JSON.stringify(expected), "key order must match the snapshot");
  });
}

test("fixture count and snapshot coverage", () => {
  assert.ok(Object.keys(FIXTURES).length >= 20);
  if (!RECORD) assert.deepStrictEqual(Object.keys(snapshot).sort(), Object.keys(FIXTURES).sort());
});

test("plan results are independent across calls", () => {
  const specA = FIXTURES["vis-line-dimension"]();
  const first = buildPlan(specA);
  const warningCount = first.diagnostics.warnings.length;
  const second = buildPlan(FIXTURES["vis-line-dimension"]());
  first.managedFilterItemIds.push("mutated");
  first.diagnostics.warnings.push({ code: "X" });
  first.emptyIntent.enabled = true;
  assert.deepStrictEqual(second.managedFilterItemIds.includes("mutated"), false);
  assert.equal(second.diagnostics.warnings.length, warningCount);
  assert.equal(second.emptyIntent.enabled, false);
  assert.notStrictEqual(second.diagnostics.emptyIntent, second.emptyIntent);
});

test("failure results do not share default intents across calls", () => {
  const first = buildPlan(null);
  const second = buildPlan(null);
  assert.notStrictEqual(first.emptyIntent, second.emptyIntent);
  assert.notStrictEqual(first.resetIntent, second.resetIntent);
  first.emptyIntent.enabled = true;
  first.resetIntent.clearAllSlots = true;
  assert.equal(buildPlan(null).emptyIntent.enabled, false);
  assert.equal(buildPlan(null).resetIntent.clearAllSlots, false);
});

test("normalizeDefaultValue", () => {
  for (const input of [null, undefined, "", "   ", "default", "DEFAULT", "none", " None "]) assert.equal(normalizeDefaultValue(input), null);
  assert.equal(normalizeDefaultValue(" x "), "x");
  assert.equal(normalizeDefaultValue(5), 5);
  assert.equal(normalizeDefaultValue(0), 0);
  const object = {};
  assert.equal(normalizeDefaultValue(object), object);
});

if (RECORD) {
  test("write snapshot", () => {
    fs.writeFileSync(SNAPSHOT_FILE, `${JSON.stringify(recorded, null, 2)}\n`);
  });
}
