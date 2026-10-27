// Characterisation test for Phase 2 W8 (single source for vis-type and grain rules).
// Run:    node --test tools/tests/w8-vis-rules.test.mjs
// Record: W8_RECORD=1 node --test tools/tests/w8-vis-rules.test.mjs   (rewrites the golden; only on a deliberate contract change)
// The golden was recorded on the code BEFORE the W8 migration. For every vis type x grain it records what each
// copy of the rules answers: widgetVis visTypes, widgetSettings restore + optionMarking, core buildWidgetObject
// and the widgetBindingPlan (end to end through the widgetVis spec builder). Module paths used here are the ones
// that survive the migration (module entry points, not the config files that move).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN = path.join(HERE, "fixtures", "w8-vis-rules.golden.json");
const RECORD = process.env.W8_RECORD === "1";
const QUIET = { error() {}, warn() {}, log() {}, info() {}, debug() {} };

const load = (rel, stubs) => loadAmd(path.join(JS_ROOT, rel), { stubs: Object.assign({ console: QUIET }, stubs || {}) });

const VIS_TYPES = [
  "line", "Line", "LINE", "pie", "Pie", "stackedbar", "StackedBar", "stackedcolumn", "StackedColumn", "list", "List",
  "prognose", "Prognose", "com.ibm.vis.custom.prognoseyear", "com.ibm.vis.custom.prognoseyearlinechart",
  "TopN", "Foo", " pie ", " Line", "", null
];
const GRAINS = [undefined, "inherit", "stichtag", "jahr", "jahrStichtag", "stichtagProJahrH", "stichtagProJahrV", "bogus", "constructor"];
const DROPDOWN_TYPES = ["line", "pie", "stackedbar", "stackedcolumn", "list", "com.ibm.vis.custom.prognoseyear"];
const REAL_GRAINS = GRAINS.filter((grain) => ["stichtag", "jahr", "jahrStichtag", "stichtagProJahrH", "stichtagProJahrV"].includes(grain));
const PLAN_TYPES = ["line", "pie", "stackedbar", "stackedcolumn", "list", "prognose", "Foo"];

const grainKey = (grain) => (grain === undefined ? "<undefined>" : String(grain));
const typeKey = (type) => (type === null ? "<null>" : String(type));
const cell = (type, grain) => `${typeKey(type)}|${grainKey(grain)}`;

function buildKdb() {
  const _KDB = { config: { options: {} }, api: {}, properties: { filterPropObj: {} }, state: { widgets: { settings: { byWidget: {} } } }, runtime: {} };
  load("core/config/registerConfig.js")(_KDB);
  return _KDB;
}

const visTypes = load("dashboard/widgets/widgetVis/visTypes.js");
const buildBindingSpec = load("dashboard/widgets/widgetVis/binding/spec.js").buildBindingSpec;
const buildPlan = load("core/services/widgetBindingPlan/buildPlan.js");
const buildWidgetObject = load("core/utils/buildWidgetObject.js");
const v3Defaults = load("workflows/parameterSet/schema/v3Defaults.js");
const validateWidgetFields = load("workflows/parameterSet/schema/validate/validateWidgetFields.js");
const settingsConfig = load("dashboard/widgets/widgetSettings/config.js");
const selectors = load("dashboard/widgets/widgetSettings/config/selectors.js");
const settingsRestore = load("dashboard/widgets/widgetSettings/restore.js", { document: { querySelector: () => null } });
const optionMarking = load("dashboard/widgets/widgetSettings/view/optionMarking.js", { document: { querySelector: () => null } });

function widgetVisAnswers(type, grain, kdb) {
  const effective = visTypes.resolveEffectiveGrain(type, grain, kdb);
  const overlay = visTypes.resolveGrainOverlay(type, effective, kdb);
  return {
    normalized: visTypes.normalizeVisualizationType(type),
    bucket: visTypes.resolveVisPropBucketKey(type, kdb) ?? null,
    cognosId: visTypes.resolveCognosVisualizationTypeId(type, kdb) ?? null,
    defaultGrain: visTypes.resolveDefaultGrain(type, kdb) ?? null,
    effectiveGrain: effective ?? null,
    overlayKeys: overlay ? Object.keys(overlay).sort() : null,
    kennzahlPack: visTypes.resolveKennzahlPack(type, grain, kdb) ?? null
  };
}

function writebackAnswers(type, grain) {
  const settings = { visType: type, grouping: grain, dimension: "Geschlecht", topNChoice: "5" };
  if (type === null) delete settings.visType;
  const diagnostics = [];
  const widget = buildWidgetObject({ widgetId: "w1", kind: "vis", layout: { x: 1, y: 2, width: 3, height: 4 } }, 0, settings, { derived: { code: "M" } }, null, diagnostics);
  return { type: widget.type, grp: widget.grp ?? null };
}

async function restoreAnswers(type, grain) {
  const kdb = buildKdb();
  const entry = { tab: 0, x: 1, y: 2, w: 3, h: 4, kind: "vis", code: "M" };
  if (type !== null) entry.type = type;
  if (grain !== undefined) entry.grp = grain;
  const result = await settingsRestore.handleParameterSetRestoreBatch(kdb, { runId: 1, widgets: [entry], widgetCorrelation: { "0": { widgetId: "w1" } } });
  const record = kdb.state.widgets.settings.byWidget.w1 || {};
  return { ok: result.ok, visType: record.visType ?? null, grouping: record.grouping ?? null };
}

function fakePanel(widgetId, groupingRows) {
  const attrs = { [selectors.panelRootAttr]: widgetId };
  const rows = groupingRows.map((token) => ({ token, style: {}, getAttribute: (name) => (name === selectors.optionKeyAttr ? token : null) }));
  const groupingDropdown = { querySelector: () => null, querySelectorAll: () => rows };
  const panel = {
    classList: { contains: (name) => name === selectors.panelRootClass },
    querySelector: (selector) => (selector === ".KDB_groupingContainer" ? groupingDropdown : null),
    querySelectorAll: () => [],
    getAttribute: (name) => (name in attrs ? attrs[name] : null),
    setAttribute: (name, value) => { attrs[name] = value; },
    removeAttribute: (name) => { delete attrs[name]; }
  };
  return { panel, attrs, rows };
}

function stampAnswers(type, grain, kdb) {
  const record = { pending: { kind: null }, deferred: {} };
  if (type !== null) record.visType = type;
  if (grain !== undefined) record.grouping = grain;
  kdb.state.widgets.settings.byWidget.w1 = record;
  const { panel, attrs, rows } = fakePanel("w1", ["inherit", "stichtag", "jahr", "jahrStichtag", "stichtagProJahrH", "stichtagProJahrV"]);
  optionMarking.stampPanelVisType(kdb, panel);
  const hidden = rows.filter((row) => row.style.display === "none").map((row) => row.token);
  delete kdb.state.widgets.settings.byWidget.w1;
  return { stampedKey: attrs[selectors.panelVisTypeAttr] ?? null, groupingKept: record.grouping ?? null, hiddenRows: hidden };
}

function planAnswers(type, grain, dimension, kdb) {
  const settings = { visType: type, dimension, topNChoice: null };
  if (grain !== undefined) settings.grouping = grain;
  const spec = buildBindingSpec(kdb, {
    widgetId: "w1", opSeq: 1, reason: "contentCreate",
    metric: { code: "P_A_MOA_01", metricsTable: "Personal_KDB" },
    settings
  });
  const plan = buildPlan(JSON.parse(JSON.stringify(spec)));
  if (!plan || plan.ok === false) {
    return { ok: false, code: (plan && (plan.errorCode || plan.code)) || null };
  }
  return {
    ok: true,
    slots: (plan.slots || []).map((slot) => `${slot.slot || slot.slotName || slot.name}:${(slot.columnIds || []).join(",")}`),
    filters: (plan.localFilters || []).map((filter) => `${filter.kind}|${filter.mode}|${filter.itemId}|${JSON.stringify(filter.values)}`)
  };
}

async function compute() {
  const kdb = buildKdb();
  const out = { widgetVis: {}, writeback: {}, restore: {}, stamp: {}, plan: {}, agreement: {}, roundtrip: {} };
  for (const type of VIS_TYPES) {
    for (const grain of GRAINS) {
      const key = cell(type, grain);
      out.widgetVis[key] = widgetVisAnswers(type, grain, kdb);
      out.writeback[key] = writebackAnswers(type, grain);
      out.restore[key] = await restoreAnswers(type, grain);
      out.stamp[key] = stampAnswers(type, grain, kdb);
      const comparable = (REAL_GRAINS.includes(grain) || grain === "constructor") && grain !== out.widgetVis[key].defaultGrain;
      const vis = out.widgetVis[key].effectiveGrain === grain;
      const wb = out.writeback[key].grp === grain;
      const rs = out.restore[key].grouping === grain;
      const st = out.stamp[key].groupingKept === grain;
      if (comparable && !(vis === wb && wb === rs && rs === st)) {
        out.agreement[key] = { widgetVis: vis, writeback: wb, restore: rs, stamp: st };
      }
    }
  }
  for (const type of PLAN_TYPES) {
    for (const grain of GRAINS) {
      for (const dimension of [null, "Geschlecht"]) {
        out.plan[`${cell(type, grain)}|dim=${dimension}`] = planAnswers(type, grain, dimension, kdb);
      }
    }
  }
  for (const type of DROPDOWN_TYPES) {
    for (const grain of REAL_GRAINS) {
      const settings = { visType: type, grouping: grain, dimension: "none", topNChoice: "none" };
      const diagnostics = [];
      const widget = buildWidgetObject({ widgetId: "w1", kind: "vis", layout: { x: 0, y: 0, width: 1, height: 1 } }, 0, settings, { derived: { code: "M" } }, null, diagnostics);
      const invalid = [];
      validateWidgetFields(widget, v3Defaults.WIDGET_FIELDS.vis, 0, "vis", invalid);
      const restored = await restoreAnswers(widget.type, widget.grp);
      out.roundtrip[cell(type, grain)] = { saved: widget, invalidCount: invalid.length, restoredType: restored.visType, restoredGrouping: restored.grouping };
    }
  }
  return JSON.parse(JSON.stringify(out));
}

const golden = RECORD ? null : JSON.parse(fs.readFileSync(GOLDEN, "utf8"));
const actual = await compute();
if (RECORD) {
  fs.mkdirSync(path.dirname(GOLDEN), { recursive: true });
  fs.writeFileSync(GOLDEN, `${JSON.stringify(actual, null, 1)}\n`);
}

// Deltas of the W8 migration against the golden (internal/phase2/w8-plan.md section 3). None is reachable from the UI:
// the dropdowns only produce the six canonical type values and the five grain values.
//  1. writeback save: the grain gate is one array lookup now. A grouping that is not a grain ("constructor", an
//     Object.prototype key that the old object lookup accepted) is no longer written, and a padded " pie " is trimmed
//     like widgetVis/widgetSettings always did, so its "stichtag" grain is dropped as for "pie".
//  2. stamp: a record grouping that is not allowed for the type is cleared whatever the value; the old code only
//     cleared known grains, so "inherit"/"bogus"/"constructor" stayed in a record (state.js never stores them).
const NON_GRAIN_VALUES = ["inherit", "bogus", "constructor"];
const grainOfKey = (key) => key.slice(key.lastIndexOf("|") + 1);
const PINNED_DELTAS = {
  writeback(expected) {
    for (const [key, value] of Object.entries(expected)) {
      if (grainOfKey(key) === "constructor") value.grp = null;
    }
    expected[" pie |stichtag"].grp = null;
  },
  stamp(expected) {
    for (const [key, value] of Object.entries(expected)) {
      if (NON_GRAIN_VALUES.includes(grainOfKey(key))) value.groupingKept = null;
    }
  },
  agreement(expected) {
    for (const key of Object.keys(expected)) delete expected[key];
  }
};

function expectedSection(section) {
  const expected = structuredClone(golden[section]);
  if (PINNED_DELTAS[section]) PINNED_DELTAS[section](expected);
  return expected;
}

for (const section of ["widgetVis", "writeback", "restore", "stamp", "plan", "agreement", "roundtrip"]) {
  test(`W8 characterisation: ${section} answers per vis type x grain`, { skip: RECORD }, () => {
    const expected = expectedSection(section);
    assert.deepStrictEqual(Object.keys(actual[section]).sort(), Object.keys(expected).sort());
    for (const key of Object.keys(expected)) assert.deepStrictEqual(actual[section][key], expected[key], `${section} ${key}`);
  });
}

test("W8 characterisation: golden covers the full vis type x grain grid", { skip: RECORD }, () => {
  assert.equal(Object.keys(golden.widgetVis).length, VIS_TYPES.length * GRAINS.length);
  assert.equal(Object.keys(golden.plan).length, PLAN_TYPES.length * GRAINS.length * 2);
  assert.equal(Object.keys(golden.roundtrip).length, DROPDOWN_TYPES.length * REAL_GRAINS.length);
});

test("W8 characterisation: settings dropdown lists agree with the rule table", () => {
  const options = settingsConfig.options;
  for (const option of options.visualization) {
    const normalized = visTypes.normalizeVisualizationType(option.value);
    assert.ok(normalized && /^[A-Z]/.test(normalized), `dropdown value ${option.value} normalises to a canonical type`);
    assert.equal(normalized.toLowerCase(), option.key, `dropdown key ${option.key} is the lower-case canonical type`);
  }
  const grainOptions = options.grouping.map((option) => option.value).filter((value) => value !== "inherit");
  assert.deepStrictEqual(grainOptions, REAL_GRAINS);
});

test("W8 characterisation: saved v3 widgets validate and every allowed grain survives save/load", { skip: RECORD }, () => {
  for (const [key, row] of Object.entries(actual.roundtrip)) {
    assert.equal(row.invalidCount, 0, key);
    assert.equal(row.restoredType, row.saved.type, key);
    assert.equal(row.restoredGrouping, row.saved.grp ?? null, key);
  }
});

test("W8 rules: aliases, buckets, default grains and allowed grains describe the same set of types", () => {
  const rules = load("core/config/visualizations/visTypeRules.js");
  const specs = load("core/config/visualizations/bindingSpecsVisTypes.js");
  const grainSpecs = load("core/config/visualizations/bindingSpecsGrain.js");
  const canonicalTypes = new Set(["line", "pie", "stackedbar", "stackedcolumn", "list", "prognose",
    "com.ibm.vis.custom.prognoseyear", "com.ibm.vis.custom.prognoseyearlinechart"].map((alias) => rules.normalizeVisType(alias)));
  assert.deepStrictEqual([...canonicalTypes].sort(), ["Line", "List", "Pie", "Prognose", "StackedBar", "StackedColumn"]);
  const buckets = new Set();
  for (const type of canonicalTypes) {
    const bucket = rules.resolveBucket(type);
    buckets.add(bucket);
    assert.ok(specs.visTypeByBucket[bucket], `visTypeByBucket has ${bucket}`);
    assert.equal(specs.visualizationTypeToBucket[type], bucket);
    const defaultGrain = grainSpecs.grainByBucket[bucket].defaultGrain;
    const selectable = rules.GRAINS.filter((grain) => rules.isAllowedGrain(bucket, grain));
    // The default grain is selectable, except for prognose which offers no grain choice at all.
    assert.ok(selectable.length === 0 || selectable.includes(defaultGrain), `${bucket} default grain ${defaultGrain}`);
    for (const grain of Object.keys(grainSpecs.grainByBucket[bucket].grains || {})) assert.ok(rules.isGrain(grain), `${bucket} overlay ${grain} is a grain`);
  }
  assert.deepStrictEqual([...buckets].sort(), Object.keys(specs.visTypeByBucket).sort());
  assert.deepStrictEqual(Object.keys(grainSpecs.grainByBucket).sort(), Object.keys(specs.visTypeByBucket).sort());
});

test("W8 rules: padded and mixed-case types resolve like their canonical spelling", () => {
  const rules = load("core/config/visualizations/visTypeRules.js");
  assert.equal(rules.resolveBucket(" PIE "), "pie");
  assert.equal(rules.settingsKey(" Com.IBM.Vis.Custom.PrognoseYear "), "prognose");
  assert.equal(rules.settingsKey("Foo"), "Foo");
  assert.equal(rules.isAllowedGrain("pie", "stichtag"), false);
  assert.equal(rules.isAllowedGrain("Line", "stichtag"), true);
  assert.equal(rules.isAllowedGrain("com.ibm.vis.custom.prognoseyearlinechart", "jahr"), false);
  assert.equal(rules.isAllowedGrain("List", "stichtagProJahrH"), false);
  assert.equal(rules.isGrain("constructor"), false);
  assert.equal(rules.supportsDimension("prognose"), false);
  assert.equal(rules.supportsDimension("line"), true);
});

test("W8 rules: the shared tables cannot be mutated by a consumer", () => {
  const rules = load("core/config/visualizations/visTypeRules.js");
  const grainCount = rules.GRAINS.length;
  assert.throws(() => { "use strict"; rules.GRAINS.push("bogus"); }, TypeError);
  assert.equal(rules.GRAINS.length, grainCount);
  assert.equal(Object.isFrozen(rules.GRAINS), true);
  assert.equal(rules.isGrain("bogus"), false);
  assert.equal(rules.canonicalTypeOf, undefined);
  assert.equal(rules.TYPE_TO_BUCKET, undefined);
  assert.equal(rules.settingsKey(null), "");
  const pack = load("core/config/visualizations/buildKennzahlAggregationFilter.js");
  assert.equal(pack.resolveKennzahlPack("Line", "jahr"), "jahr");
  assert.equal(load("dashboard/widgets/widgetVis/config.js").GROUPINGS, undefined);
});
