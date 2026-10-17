// Golden test for WS-C writeback: source-format detection, bridge input normalisation, v2 -> v3 mapping
// (writebackMap.toV3 including schema normalize/validate) and the pure v3 widget serializer.
// Run: node --test tools/tests/ws-c-writeback-map.test.mjs   (WSC_RECORD=1 rewrites the golden file)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT, REPO_ROOT } from "../lib/amd-graph.mjs";

const WB = path.join(JS_ROOT, "workflows/parameterSet");
const GOLDEN = path.join(path.dirname(fileURLToPath(import.meta.url)), "ws-c-writeback-map.golden.json");
const RECORD = process.env.WSC_RECORD === "1";

const silentConsole = { log() {}, info() {}, warn() {}, error() {}, debug() {} };
const load = (rel) => loadAmd(path.join(WB, rel), { stubs: { console: silentConsole } });

const errorCodes = load("schema/errorCodes.js");
const detectSourceFormat = load("schema/detectSourceFormat.js");
const normalizeBridgeSetInput = load("bridge/normalizeBridgeSetInput.js");
const createWritebackMapService = load("map/createWritebackMapService.js");
const buildWidgetObject = loadAmd(path.join(WB, "get/collectors/buildWidgetObject.js"), { stubs: { console: silentConsole } });

function readFilterPropObj() {
  const src = fs.readFileSync(path.join(REPO_ROOT, "_____________KDB3API/__savedProperties/filterPropId.js"), "utf8");
  const context = vm.createContext({});
  vm.runInContext(`${src};globalThis.__out=filterPropId;`, context);
  return JSON.parse(context.__out).filterPropId;
}

const fakeKdb = () => ({ properties: { filterPropObj: readFilterPropObj() } });
const clone = (value) => JSON.parse(JSON.stringify(value));

// ---------------------------------------------------------------- fixtures

const PKG = "Personal_KDB";
const kid = (table, level) => `[Personal_KDB_TM1].[${table}].[${table}].[${level || table}]`;
const useOf = (table, level) => `${kid(table, level)}->:[TMR].[${table}].[${table}]`;

const row = (d, u) => (u === undefined ? { d } : { d, u });

function v2Widgets() {
  const style = (left, top, width, height) => ({ left, top, width, height });
  const vis = (type, code, tabIndex, extra) => Object.assign({
    widgetType: "widget.live",
    data: { code },
    visualType: type,
    tab: { index: tabIndex },
    style: style("10px", "20px", "300px", "200px"),
    selectedOptions: { dimension: "Geschlecht", topN: "5", backgroundColor: "#ABCDEF" },
  }, extra || {});
  return {
    w1: vis("Line", "M_LINE", "0"),
    w2: vis("Pie", "M_PIE", 0, { selectedOptions: { dimension: "none", topN: "none", backgroundColor: "#ffffff" } }),
    w3: vis("StackedBar", "M_SBAR", 1, { style: style("1cm", "2cm", "10cm", "5cm") }),
    w4: vis("StackedColumn", "M_SCOL", 1, { style: style(5, 6, 700, 400) }),
    w5: vis("List", "M_LIST", 0),
    w6: vis("com.ibm.vis.custom.prognoseyearlinechart", "M_PROG", 0, { widgetType: "widget.vis" }),
    w7: {
      widgetType: "widget.text",
      widgetTitle: "Kommentar",
      tab: { index: 0 },
      style: style("0px", "300px", "400px", "80px"),
      selectedOptions: { fontSize: "14px", backgroundColor: "#ffeecc", restyle: "KDB_widgetHeader_custom" },
    },
    w8: {
      widgetType: "widget.text",
      widgetTitle: "Default text",
      tab: { index: 1 },
      style: style("0px", "0px", "100px", "50px"),
      selectedOptions: { fontSize: "automatic", backgroundColor: "#ffffff", restyle: "KDB_widgetHeader_defaultStyle" },
    },
    w9: { widgetType: "widget.dataTable", tab: { index: 0 }, style: style("0px", "0px", "10px", "10px") },
    w10: { widgetType: "widget.chartXYZ", tab: { index: 0 }, style: style("0px", "0px", "10px", "10px") },
    w11: vis("Line", "M_LOCAL", 0, { localFilters: { x: 1 } }),
    w12: vis("Line", "M_NOTAB", undefined, { tab: {} }),
    w13: vis("Line", "M_BADSTYLE", 0, { style: style("10px", "20px", undefined, "200px") }),
    w14: vis("Line", "KDB_CB_HeaderDraggable", 0, { data: { code: "KDB_CB_HeaderDraggable" } }),
    w15: { widgetType: "widget.live", widgetTitle: "WritebackTabel", tab: { index: 0 }, style: style("0px", "0px", "1px", "1px") },
    w16: { widgetType: "widget.live", data: {}, visualType: "Line", tab: { index: 0 }, style: style("0px", "0px", "10px", "10px") },
  };
}

function v2SamePackage() {
  return {
    configuration: {
      dashboardWidth: "30cm",
      dashboardHeight: "1200px",
      dashboardColor: "#eeeeee",
      dashboardSettingIcons: true,
      controlBackgroundColor: "#111111",
      controlButtonColor: "#222222",
      controlActionButton: "#333333",
      visualizationWidth: "10cm",
      visualizationHeight: "250px",
      visualizationBackgroundColor: "#abcdef",
      textWidth: "80mm",
      textHeight: "100px",
      textBackgroundColor: "#ffeecc",
    },
    topHeader: { turnedOn: true, text: "Kennzahlen", icon: "wappen.png" },
    bottomFooter: { turnedOn: false },
    tabs: {
      0: {
        name: "Uebersicht",
        visible: true,
        pageContextFilterObjArr: [
          { [kid("Geschlecht")]: { itemName: "Geschlecht", valuesArray: [row("Weiblich", useOf("Geschlecht"))] } },
          { [kid("Jahr")]: { itemName: "Jahr", valuesArray: [row("2022", useOf("Jahr")), row("2023", useOf("Jahr"))] } },
          { "Dienststelle_BW": { itemName: "Dienststelle_BW", valuesArray: [row("MAG"), row("Unbekannte Dienststelle")] } },
          { "Mystery": { itemName: "Mystery", valuesArray: [row("x")] } },
          { "Leer": { itemName: "Berufsfamilie", valuesArray: [] } },
        ],
      },
      1: { name: "Verborgen", visible: false, pageContextFilterObjArr: [] },
      2: { name: "", visible: true },
      3: { name: "Weitere" },
    },
    globalFiltersObj: {
      [PKG]: {
        sicht: { name: "Sicht", valuesArray: [row("BW")] },
        dstl: { name: "Dienststelle_BW", valuesArray: [row("MAG"), row("MAG"), row("Unbekannte Dienststelle")] },
        sel: { name: "Berufsfamilie", valuesArray: [row("Technik"), row("Verwaltung")] },
        pcf: { name: "Jahr", valuesArray: [row("2024", useOf("Jahr"))] },
        unsupported: { name: "Mystery", valuesArray: [row("x")] },
        nameless: { valuesArray: [row("y")] },
      },
    },
    widgets: v2Widgets(),
  };
}

function v2Canvas() {
  return {
    canvas: { width: 1280, height: 720 },
    configuration: { dashboardColor: "  ", dashboardSettingIcons: false, textWidth: "bogus" },
    topHeader: { turnedOn: false, text: "", icon: "default.png" },
    tabs: { 0: { name: "Eins" } },
    widgets: {
      a: { widgetType: "text", widgetTitle: "Titel", tab: { index: 0 }, style: { left: 1.4, top: 2.6, width: 3, height: 4 } },
      b: { widgetType: "vis", data: { code: "M_VIS" }, visualType: "Line", tab: { index: "0" }, style: { left: "1in", top: "2pt", width: "3mm", height: "4cm" } },
    },
  };
}

function v2NoFilters() {
  return { configuration: { dashboardWidth: "1000px", dashboardHeight: "800px" } };
}

function v2CrossPackage() {
  const foreign = "Other_Package";
  const foreignKid = (table, level) => `[Other_TM1].[${table}].[${table}].[${level || table}]`;
  const foreignUse = (table) => `${foreignKid(table)}->:[OTM].[${table}].[${table}]`;
  const sourceKid = "[Other_Package_TM1].[Dienststelle].[Dienststelle_BW]";
  return {
    configuration: { dashboardWidth: "1000px", dashboardHeight: "800px" },
    tabs: {
      0: {
        name: "Tab A",
        pageContextFilterObjArr: [
          { [foreignKid("Geschlecht")]: { itemName: foreignKid("Geschlecht"), valuesArray: [row("Maennlich", foreignUse("Geschlecht"))] } },
          { [foreignKid("Neuer Filter")]: { itemName: "Neuer Filter", valuesArray: [row("v1", foreignUse("Neuer Filter"))] } },
        ],
      },
    },
    globalFiltersObj: {
      [foreign]: {
        [foreignKid("Berufsfamilie")]: { name: "Berufsfamilie", valuesArray: [row("Technik", foreignUse("Berufsfamilie"))] },
        [foreignKid("Jahr")]: { name: "Jahr", valuesArray: [row("2023", foreignUse("Jahr"))] },
        [sourceKid]: { name: "Dienststelle_BW", valuesArray: [row("MAG")] },
        "Sicht": { name: "Sicht", valuesArray: [row("BW")] },
      },
    },
    widgets: {
      cw: {
        widgetType: "widget.live",
        data: { code: "M_CROSS" },
        visualType: "Line",
        tab: { index: 0 },
        style: { left: "0px", top: "0px", width: "100px", height: "100px" },
        selectedOptions: { dimension: foreignKid("Geschlecht"), topN: "none" },
      },
    },
  };
}

function v3Valid() {
  return {
    v: 3,
    pkg: PKG,
    canv: { w: 1000, h: 800 },
    sett: { dash: { bg: "#eeeeee", hidWs: 1 }, panel: { bg: "#111111" }, newwg: { vis: { w: 400, h: 300 } } },
    head: { on: 1, title: "Titel", icon: "wappen" },
    foot: { on: 0 },
    filt: {
      sicht: "BW",
      dstl: { key: "Dienststelle_BW", glob: ["MAG"], byTab: { 0: ["MAG"] } },
      sels: [{ key: "Geschlecht", vals: ["Weiblich"] }, { key: "Berufsfamilie", vals: ["Technik"], tab: 0 }],
      pcfs: [{ nm: "Jahr", vals: [{ d: "2023", u: useOf("Jahr") }], tab: 0 }],
    },
    tabs: [{ name: "Eins" }, { name: "Zwei", hide: 1 }],
    wgts: [
      { tab: 0, x: 0, y: 0, w: 100, h: 100, kind: "vis", code: "M1", type: "line", grp: "jahr", vals: 1 },
      { tab: 1, x: 5, y: 5, w: 50, h: 50, kind: "txt", text: "Hallo", fsize: 12 },
    ],
  };
}

const v3Unnormalized = () => Object.assign(v3Valid(), { pkg: `  ${PKG}  `, head: { on: 1, icon: "stadt-wien" } });
const v3InvalidTabs = () => Object.assign(v3Valid(), { tabs: [] });
const v3BadWidget = () => Object.assign(v3Valid(), { wgts: [{ tab: 9, x: 0, y: 0, w: 1, h: 1, kind: "vis", code: "M1", type: "line", bogus: 1 }] });
const v3UnknownKey = () => Object.assign(v3Valid(), { extra: true });
const v3ReservedKind = () => Object.assign(v3Valid(), { wgts: [{ tab: 0, x: 0, y: 0, w: 1, h: 1, kind: "tbl" }] });

// ---------------------------------------------------------------- runners

// Engine-specific message text (JSON.parse, TypeError) is redacted so the golden does not depend on the Node version.
function describeError(error) {
  const diagnostic = error && error.diagnostic ? JSON.parse(JSON.stringify(error.diagnostic)) : null;
  if (diagnostic && diagnostic.details && typeof diagnostic.details.error === "string") diagnostic.details.error = "<engine message>";
  const isCoded = Boolean(diagnostic);
  return {
    name: error && error.name,
    message: isCoded ? error.message : "<engine message>",
    code: isCoded ? diagnostic.code : null,
    diagnostic,
  };
}

function runToV3(raw) {
  const service = createWritebackMapService({ _KDB: fakeKdb() });
  const diagnostics = [];
  try {
    const v3 = service.toV3(raw, { diagnostics });
    return { ok: true, v3, diagnostics };
  } catch (error) {
    return { ok: false, error: describeError(error), diagnostics };
  }
}

function runNormalize(raw, status) {
  try {
    return { ok: true, result: normalizeBridgeSetInput(raw, status) };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

const DETECT_CASES = {
  v3Object: v3Valid(),
  v3String: JSON.stringify(v3Valid()),
  v3OneElementArray: [v3Valid()],
  v2ConfigurationOnly: { configuration: {} },
  v2GlobalFilters: { globalFiltersObj: {} },
  v2Widgets: { widgets: {} },
  v2TopHeader: { topHeader: {} },
  v2BottomFooter: { bottomFooter: {} },
  v2TabsArray: { tabs: [] },
  v2TabsObjectOnly: { tabs: {} },
  v2ObjectString: JSON.stringify({ configuration: { a: 1 } }),
  v2OneElementArray: [{ widgets: {} }],
  v2OneElementArrayString: JSON.stringify([{ globalFiltersObj: {} }]),
  twoElementArray: [{ widgets: {} }, { widgets: {} }],
  emptyArray: [],
  invalidJson: "{not json",
  emptyString: "",
  nullInput: null,
  undefinedInput: undefined,
  numberInput: 7,
  emptyObject: {},
  versionTwo: { v: 2 },
  versionThree: { v: 3 },
  versionThreeString: '{"v":3}',
  markerArrays: { configuration: [], widgets: [], globalFiltersObj: "x" },
  nestedArrayElement: [[{ widgets: {} }]],
};

const NORMALIZE_CASES = {
  v3Object: [v3Valid(), "notDefaultParamSet"],
  v3String: [JSON.stringify(v3Valid()), "default"],
  v3OneElementArray: [[v3Valid()], "defaultParamSet"],
  v3StringInArray: [[JSON.stringify(v3Valid())], "notDefaultParamSet"],
  v2Object: [v2NoFilters(), "notDefaultParamSet"],
  v2String: [JSON.stringify(v2NoFilters()), "notDefaultParamSet"],
  v2ArrayInString: [JSON.stringify([v2NoFilters()]), "notDefaultParamSet"],
  twoElementArray: [[v2NoFilters(), v2NoFilters()], "notDefaultParamSet"],
  emptyString: ["", "notDefaultParamSet"],
  nullInput: [null, "default"],
  undefinedInput: [undefined, "default"],
  emptyArray: [[], "notDefaultParamSet"],
  invalidJson: ["{broken", "notDefaultParamSet"],
  jsonNull: ["null", "notDefaultParamSet"],
  jsonNumber: ["42", "notDefaultParamSet"],
  emptyObject: [{}, "notDefaultParamSet"],
};

const TO_V3_CASES = {
  v2SamePackage: () => v2SamePackage(),
  v2SamePackageString: () => JSON.stringify(v2SamePackage()),
  v2SamePackageArray: () => [v2SamePackage()],
  v2Canvas: () => v2Canvas(),
  v2NoFilters: () => v2NoFilters(),
  v2CrossPackage: () => v2CrossPackage(),
  v3Valid: () => v3Valid(),
  v3ValidString: () => JSON.stringify(v3Valid()),
  v3Unnormalized: () => v3Unnormalized(),
  v3InvalidTabs: () => v3InvalidTabs(),
  v3BadWidget: () => v3BadWidget(),
  v3UnknownKey: () => v3UnknownKey(),
  v3ReservedKind: () => v3ReservedKind(),
  unknownObject: () => ({ foo: "bar" }),
  unknownString: () => "{nope",
  nullInput: () => null,
  twoElementArray: () => [v2NoFilters(), v2NoFilters()],
  v2StringInvalidJsonInner: () => "[",
};

const VIS_TYPES = [
  "line", "Line", "pie", "Pie", "stackedbar", "StackedBar", "stackedcolumn", "StackedColumn",
  "list", "List", "prognose", "Prognose", "com.ibm.vis.custom.prognoseyear", "com.ibm.vis.custom.prognoseyearlinechart",
  "bar", null,
];
const GRAINS = ["stichtag", "jahr", "jahrStichtag", "stichtagProJahrH", "stichtagProJahrV", "bogus", undefined];

function visFrame(extra) {
  return Object.assign({ widgetId: "wv", kind: "vis", layout: { x: 1, y: 2, width: 300, height: 200 }, colour: "#123456" }, extra || {});
}

function buildOne(frame, tabIdx, settings, visRecord, textRecord) {
  const diagnostics = [];
  let widget;
  try {
    widget = buildWidgetObject(frame, tabIdx, settings, visRecord, textRecord, diagnostics);
  } catch (error) {
    return { threw: describeError(error), diagnostics };
  }
  return { widget, diagnostics };
}

function runBuildWidgetCases() {
  const out = {};
  const derived = { derived: { code: " M_CODE " } };
  for (const type of VIS_TYPES) {
    for (const grain of GRAINS) {
      const settings = {
        visType: type, dimension: "Geschlecht", topNChoice: "5", showValues: true, grouping: grain,
        iterator: false, zoom: true, valueCaption: false, colour: "#FFFFFF",
      };
      out[`vis|${type}|${grain}`] = buildOne(visFrame(), 2, settings, derived, null);
    }
  }
  out["vis|defaults"] = buildOne(visFrame({ colour: "#ffffff" }), 0, {}, derived, null);
  out["vis|noSettings"] = buildOne(visFrame(), 0, null, derived, null);
  out["vis|noMetric"] = buildOne(visFrame(), 0, {}, { derived: { code: "  " } }, null);
  out["vis|noVisRecord"] = buildOne(visFrame(), 0, {}, null, null);
  out["vis|noneDimension"] = buildOne(visFrame(), 0, { dimension: "none", topNChoice: "none", visType: "line" }, derived, null);
  out["vis|colourDefaultUpper"] = buildOne(visFrame({ colour: "#FFFFFF" }), 0, { colour: "#FFFFFF" }, derived, null);
  out["vis|nanLayout"] = buildOne(visFrame({ layout: { x: NaN, y: 0, width: 1, height: 1 } }), 0, {}, derived, null);
  out["vis|badTab"] = buildOne(visFrame(), Infinity, {}, derived, null);
  out["vis|noLayout"] = buildOne({ widgetId: "wn", kind: "vis" }, 0, {}, derived, null);
  const text = { content: { text: "Beschreibung" } };
  out["txt|full"] = buildOne({ widgetId: "wt", kind: "text", layout: { x: 3, y: 4, width: 50, height: 20 }, colour: "#aabbcc" }, 1,
    { fontSize: "14px", colour: "#ddeeff", restyle: "KDB_widgetHeader_custom" }, null, text);
  out["txt|defaults"] = buildOne({ widgetId: "wt", kind: "text", layout: { x: 3, y: 4, width: 50, height: 20 }, colour: "#ffffff" }, 1,
    { fontSize: "automatic", restyle: "KDB_widgetHeader_defaultStyle" }, null, text);
  out["txt|frameColour"] = buildOne({ widgetId: "wt", kind: "text", layout: { x: 0, y: 0, width: 1, height: 1 }, colour: "#aabbcc" }, 0, {}, null, text);
  out["txt|noRecords"] = buildOne({ widgetId: "wt", kind: "text", layout: { x: 0, y: 0, width: 1, height: 1 } }, 0, null, null, null);
  out["txt|nonStringText"] = buildOne({ widgetId: "wt", kind: "text", layout: { x: 0, y: 0, width: 1, height: 1 } }, 0, {}, null, { content: { text: 5 } });
  out["txt|nanLayout"] = buildOne({ widgetId: "wt", kind: "text", layout: { x: 0, y: "a", width: 1, height: 1 } }, 0, {}, null, text);
  out["invalid|nullFrame"] = buildOne(null, 0, {}, null, null);
  return out;
}

function runAll() {
  const detect = {};
  for (const [name, raw] of Object.entries(DETECT_CASES)) detect[name] = detectSourceFormat(raw);
  const normalize = {};
  for (const [name, [raw, status]] of Object.entries(NORMALIZE_CASES)) normalize[name] = runNormalize(raw, status);
  const toV3 = {};
  for (const [name, make] of Object.entries(TO_V3_CASES)) toV3[name] = runToV3(make());
  return { errorCodes: Object.keys(errorCodes.codes), detect, normalize, toV3, buildWidget: runBuildWidgetCases() };
}

function collectDiagnosticCodes(results) {
  const codes = new Set();
  const visit = (value) => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") {
      if (typeof value.code === "string" && value.code.startsWith("WRITEBACK_")) codes.add(value.code);
      Object.values(value).forEach(visit);
    }
  };
  visit(results);
  return codes;
}

// ---------------------------------------------------------------- tests

const actual = JSON.parse(JSON.stringify(runAll()));

if (RECORD) {
  fs.writeFileSync(GOLDEN, `${JSON.stringify(actual, null, 2)}\n`);
}

test("golden: detect / normalize / toV3 / buildWidgetObject output is unchanged", () => {
  const golden = JSON.parse(fs.readFileSync(GOLDEN, "utf8"));
  assert.deepStrictEqual(actual.errorCodes, golden.errorCodes, "error code names");
  assert.deepStrictEqual(actual.detect, golden.detect, "detectSourceFormat");
  assert.deepStrictEqual(actual.normalize, golden.normalize, "normalizeBridgeSetInput");
  for (const name of Object.keys(golden.toV3)) assert.deepStrictEqual(actual.toV3[name], golden.toV3[name], `toV3 ${name}`);
  for (const name of Object.keys(golden.buildWidget)) assert.deepStrictEqual(actual.buildWidget[name], golden.buildWidget[name], `buildWidgetObject ${name}`);
  assert.deepStrictEqual(Object.keys(actual.toV3), Object.keys(golden.toV3));
  assert.deepStrictEqual(Object.keys(actual.buildWidget), Object.keys(golden.buildWidget));
});

test("coverage guard: golden exercises every v3 section and the mapper diagnostic codes", () => {
  const golden = JSON.parse(fs.readFileSync(GOLDEN, "utf8"));
  const same = golden.toV3.v2SamePackage.v3;
  for (const key of ["canv", "sett", "head", "foot", "tabs", "wgts"]) assert.ok(same[key], `v2SamePackage.v3.${key}`);
  assert.ok(same.filt.sicht, "filt.sicht");
  assert.ok(same.filt.dstl.glob.length > 0, "filt.dstl.glob");
  assert.ok(Object.keys(same.filt.dstl.byTab).length > 0, "filt.dstl.byTab");
  assert.ok(same.filt.sels.length > 0, "filt.sels");
  assert.ok(same.filt.pcfs.length > 0, "filt.pcfs");
  assert.ok(same.wgts.some((widget) => widget.kind === "vis"), "vis widget");
  assert.ok(same.wgts.some((widget) => widget.kind === "txt"), "txt widget");

  const codes = collectDiagnosticCodes({ toV3: golden.toV3, buildWidget: golden.buildWidget });
  for (const code of [
    "WRITEBACK_FILTER_KIND_UNSUPPORTED",
    "WRITEBACK_WIDGET_KIND_UNSUPPORTED",
    "WRITEBACK_WIDGET_LOCALFILTER_UNSUPPORTED",
    "WRITEBACK_MAPPING_TOKEN_UNRESOLVED",
    "WRITEBACK_DIENSTSTELLE_BW_LABEL_UNMAPPED",
    "WRITEBACK_SKIPPED_BY_DESIGN",
    "WRITEBACK_INVALID_V3_PAYLOAD",
    "WRITEBACK_UNSUPPORTED_LEGACY_FORMAT",
    "WRITEBACK_WIDGET_RESTORE_FAILED",
  ]) assert.ok(codes.has(code), `golden contains ${code}`);
  // WRITEBACK_DIENSTSTELLE_BW_LABEL_MAPPED is emitted by the dienststelle owner on restore, never by the mapper.
  assert.equal(errorCodes.codes.WRITEBACK_DIENSTSTELLE_BW_LABEL_MAPPED, "WRITEBACK_DIENSTSTELLE_BW_LABEL_MAPPED");
  assert.equal(golden.toV3.v3Valid.ok, true);
  assert.equal(golden.toV3.v2CrossPackage.ok, true);
});

test("map service rejects calls after destroy with WRITEBACK_RESTORE_CANCELLED", () => {
  const service = createWritebackMapService({ _KDB: fakeKdb() });
  service.destroy();
  assert.throws(() => service.toV3(v3Valid(), { diagnostics: [] }), (error) => error.diagnostic.code === "WRITEBACK_RESTORE_CANCELLED");
});

test("error codes: the frozen table keeps its names", () => {
  const golden = JSON.parse(fs.readFileSync(GOLDEN, "utf8"));
  assert.deepStrictEqual(actual.errorCodes, golden.errorCodes);
  for (const name of Object.keys(errorCodes.codes)) assert.equal(errorCodes.codes[name], name);
});

test("toV3 does not mutate its input", () => {
  const input = v2CrossPackage();
  const snapshot = clone(input);
  runToV3(input);
  assert.deepStrictEqual(input, snapshot);
});
