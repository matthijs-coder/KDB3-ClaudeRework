// Prognose hides Dimension and TopN: visTypeRules.supportsDimension, last-mile bind defaults,
// finalize/restore commits to Ohne, and the data-kdb-dimension stamp.
// Run: node --test tools/tests/prognose-dimension.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const QUIET = { error() {}, warn() {}, log() {}, info() {}, debug() {} };
const load = (rel, options) => loadAmd(path.join(JS_ROOT, rel), Object.assign({ stubs: { console: QUIET } }, options || {}));
const PROGNOSE_ALIASES = ["prognose", "Prognose", "com.ibm.vis.custom.prognoseyear", "com.ibm.vis.custom.prognoseyearlinechart"];
const SUPPORTED_TYPES = ["line", "Line", "pie", "list", "stackedbar", "stackedcolumn"];
const METRIC = { code: "P_A_MOA_01", display: "Kennzahl 1", metricsTable: "Personal_KDB" };

function buildKdb(extra) {
  const _KDB = Object.assign({
    config: { options: {} },
    api: {},
    properties: { filterPropObj: {} },
    state: { widgets: { settings: { byWidget: {} }, vis: { byId: {} } } },
    runtime: {}
  }, extra || {});
  load("core/config/registerConfig.js")(_KDB);
  return _KDB;
}

test("supportsDimension is false for every Prognose alias and true for line/pie/list", () => {
  const rules = load("core/config/visualizations/visTypeRules.js");
  for (const alias of PROGNOSE_ALIASES) {
    assert.equal(rules.supportsDimension(alias), false, alias);
  }
  for (const type of SUPPORTED_TYPES) {
    assert.equal(rules.supportsDimension(type), true, type);
  }
  assert.equal(rules.supportsDimension(null), true);
  assert.equal(rules.supportsDimension(""), true);
});

test("widgetVis settings: Prognose + dim + top-5 binds none; Line keeps them", async () => {
  const pipelineInputs = [];
  const settingsApi = load("dashboard/widgets/widgetVis/settings.js", {
    modules: {
      "./binding/pipeline.js": {
        runBindingPipeline: async (_context, input) => {
          pipelineInputs.push(input);
          return { ok: true, derived: { code: "K" }, status: "success" };
        }
      },
      "../widgetSettings/selectors.js": {
        startWidgetRenderLoading: () => {},
        resolveWidgetEl: () => ({ nodeType: 1, id: "el" })
      }
    }
  });
  const _KDB = buildKdb({ services: { loading: { finishLoading: () => {} } } });
  _KDB.runtime.widgetVis = { byId: { w1: { opSeq: 1 } } };
  _KDB.state.widgets.vis.byId.w1 = { derived: { code: "K", metricsTable: "Personal_KDB" } };
  const context = {
    _KDB,
    dispatchInternal: () => {},
    readMetric: () => METRIC,
    isDisposed: false
  };
  const snapshot = { dimension: "Geschlecht", visType: "Line", topNChoice: "top-5" };
  await settingsApi.handleApplySetting(context, {
    type: "widgetVis/applyVisType",
    widgetId: "w1",
    opSeq: 2,
    payload: { settingsSnapshot: snapshot, nextValue: "Prognose", source: "user" }
  });
  assert.equal(pipelineInputs.length, 1);
  assert.deepEqual(pipelineInputs[0].settings, { dimension: "none", visType: "Prognose", topNChoice: "none" });

  pipelineInputs.length = 0;
  await settingsApi.handleApplySetting(context, {
    type: "widgetVis/applyVisType",
    widgetId: "w1",
    opSeq: 3,
    payload: { settingsSnapshot: snapshot, nextValue: "Line", source: "user" }
  });
  assert.deepEqual(pipelineInputs[0].settings, { dimension: "Geschlecht", visType: "Line", topNChoice: "top-5" });

  pipelineInputs.length = 0;
  await settingsApi.handleApplyStartupSettings(context, {
    type: "widgetVis/applyStartupSettings",
    widgetId: "w1",
    opSeq: 4,
    payload: {
      source: "startup",
      settingsSnapshot: { dimension: "Geschlecht", visType: "Prognose", topNChoice: "top-5" }
    }
  });
  assert.deepEqual(pipelineInputs[0].settings, { dimension: "none", visType: "Prognose", topNChoice: "none" });
});

test("finalize commits dimension and topN none after a vis-type switch to Prognose", async () => {
  const commits = [];
  const stamps = [];
  const finalize = load("dashboard/widgets/widgetSettings/intent/finalize.js", {
    modules: {
      "../state.js": {
        commitWidgetSettingValue: (_KDB, widgetId, kind, value, report) => {
          commits.push({ widgetId, kind, value, nextValue: report && report.nextValue });
          return true;
        },
        ensureWidgetSettingsByWidget: () => ({ pending: { kind: null }, deferred: {} })
      },
      "../view/optionMarking.js": {
        stampPanelVisType: (_KDB, widgetId) => stamps.push(["stamp", widgetId]),
        markFocusDimensionAndTopNFromRecord: (_KDB, widgetId) => stamps.push(["markFocus", widgetId]),
        markShowValuesPending: () => {},
        markTopNPending: () => {},
        revertShowValuesDropdownFromState: () => {},
        revertTopNDropdownFromState: () => {}
      }
    }
  });
  const plannedPrognose = {
    target: "widgetVis",
    kind: "visualization",
    widgetId: "w1",
    optionKey: "prognose",
    optionValue: "com.ibm.vis.custom.prognoseyear"
  };
  const result = await finalize.finalizeVisIntentResult({}, plannedPrognose, {
    ok: true,
    status: "success",
    reportToSettings: { nextValue: "com.ibm.vis.custom.prognoseyear" }
  });
  assert.equal(result.clearUnavailableControlsCommitted, true);
  assert.deepEqual(commits.map((c) => [c.kind, c.value]), [
    ["visualization", "com.ibm.vis.custom.prognoseyear"],
    ["dimension", "none"],
    ["topN", "none"]
  ]);
  assert.deepEqual(stamps, [["stamp", "w1"], ["markFocus", "w1"]]);

  commits.length = 0;
  stamps.length = 0;
  const lineResult = await finalize.finalizeVisIntentResult({}, {
    target: "widgetVis",
    kind: "visualization",
    widgetId: "w1",
    optionKey: "line",
    optionValue: "line"
  }, { ok: true, status: "success", reportToSettings: { nextValue: "line" } });
  assert.equal(lineResult.clearUnavailableControlsCommitted, undefined);
  assert.deepEqual(commits.map((c) => [c.kind, c.value]), [["visualization", "line"]]);
  assert.deepEqual(stamps, [["stamp", "w1"]]);
});

test("restore of a Prognose entry with dim+topn commits none; Line keeps them", async () => {
  const restore = load("dashboard/widgets/widgetSettings/restore.js", {
    stubs: { console: QUIET, document: { querySelector: () => null } }
  });
  const prognoseKdb = buildKdb();
  const prognoseResult = await restore.handleParameterSetRestoreBatch(prognoseKdb, {
    runId: 1,
    widgets: [{ tab: 0, x: 1, y: 2, w: 3, h: 4, kind: "vis", code: "M", type: "Prognose", dim: "Geschlecht", topn: "top-5" }],
    widgetCorrelation: { "0": { widgetId: "w1" } }
  });
  assert.equal(prognoseResult.ok, true);
  const prognoseRecord = prognoseKdb.state.widgets.settings.byWidget.w1;
  assert.equal(prognoseRecord.visType, "Prognose");
  assert.equal(prognoseRecord.dimension, "none");
  assert.equal(prognoseRecord.topNChoice, "none");

  const lineKdb = buildKdb();
  const lineResult = await restore.handleParameterSetRestoreBatch(lineKdb, {
    runId: 1,
    widgets: [{ tab: 0, x: 1, y: 2, w: 3, h: 4, kind: "vis", code: "M", type: "line", dim: "Geschlecht", topn: "top-5" }],
    widgetCorrelation: { "0": { widgetId: "w1" } }
  });
  assert.equal(lineResult.ok, true);
  const lineRecord = lineKdb.state.widgets.settings.byWidget.w1;
  assert.equal(lineRecord.visType, "line");
  assert.equal(lineRecord.dimension, "Geschlecht");
  assert.equal(lineRecord.topNChoice, "top-5");
});

test("stampPanelState sets data-kdb-dimension=off for Prognose and removes it for Line", () => {
  const selectors = load("dashboard/widgets/widgetSettings/config/selectors.js");
  const focusAttrs = {};
  const focusPanel = {
    setAttribute: (name, value) => { focusAttrs[name] = value; },
    removeAttribute: (name) => { delete focusAttrs[name]; }
  };
  const optionMarking = load("dashboard/widgets/widgetSettings/view/optionMarking.js", {
    stubs: {
      console: QUIET,
      document: { querySelector: (sel) => (sel === selectors.byAttr(selectors.focusPanelRootAttr, "w1") ? focusPanel : null) }
    }
  });
  const attrs = {};
  const panel = {
    classList: { contains: (name) => name === selectors.panelRootClass },
    querySelector: () => null,
    querySelectorAll: () => [],
    getAttribute: (name) => (name in attrs ? attrs[name] : null),
    setAttribute: (name, value) => { attrs[name] = value; },
    removeAttribute: (name) => { delete attrs[name]; }
  };
  const _KDB = buildKdb();
  _KDB.state.widgets.settings.byWidget.w1 = { visType: "Prognose", dimension: "Geschlecht", topNChoice: "top-5", pending: { kind: null }, deferred: {} };
  panel.setAttribute(selectors.panelRootAttr, "w1");
  optionMarking.stampPanelVisType(_KDB, panel);
  assert.equal(attrs[selectors.panelVisTypeAttr], "prognose");
  assert.equal(attrs[selectors.panelDimensionAttr], "off");
  assert.equal(focusAttrs[selectors.panelVisTypeAttr], "prognose");
  assert.equal(focusAttrs[selectors.panelDimensionAttr], "off");

  _KDB.state.widgets.settings.byWidget.w1.visType = "line";
  optionMarking.stampPanelVisType(_KDB, panel);
  assert.equal(attrs[selectors.panelVisTypeAttr], "line");
  assert.equal(attrs[selectors.panelDimensionAttr], undefined);
  assert.equal(focusAttrs[selectors.panelVisTypeAttr], "line");
  assert.equal(focusAttrs[selectors.panelDimensionAttr], undefined);
});

test("CSS hides dimension and TopN on the stamped attribute, not a vis-type name", () => {
  const settingsCss = fs.readFileSync(path.join(JS_ROOT, "../../css/widgets/widgetSettings.css"), "utf8");
  const visCss = fs.readFileSync(path.join(JS_ROOT, "../../css/widgets/widgetVis.css"), "utf8");
  assert.match(settingsCss, /\[data-kdb-dimension="off"\][^{]+KDB_dimensionsButton/);
  assert.match(settingsCss, /\[data-kdb-dimension="off"\][^{]+KDB_topNButton/);
  assert.match(visCss, /\[data-kdb-dimension="off"\][^{]+KDB_dimensionsButton/);
  assert.match(visCss, /\[data-kdb-dimension="off"\][^{]+KDB_topNButton/);
  assert.equal(selectorsAttrInVisTypeRule(settingsCss, "KDB_dimensionsButton"), false);
  assert.equal(selectorsAttrInVisTypeRule(visCss, "KDB_topNButton"), false);
});

function selectorsAttrInVisTypeRule(css, className) {
  const re = new RegExp("\\[data-kdb-vis-type=[^\\]]+\\][^\\{]*" + className);
  return re.test(css);
}
