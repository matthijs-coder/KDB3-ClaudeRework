// Golden tests for the widgetVis chrome partition: drillthrough specs, year readers, org tree, click binding (WS-M W3).
// Run: node --test tools/tests/widgetVis-drillthrough.test.mjs
// Only loadChrome() knows module paths; the fixtures are the recorded outputs of the foundation code.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const W = "dashboard/widgets/widgetVis/";
const load = (rel, options) => loadAmd(path.join(JS_ROOT, rel), options);

function createLog() {
  const calls = { error: [], warn: [] };
  return { calls, console: { error: (...a) => calls.error.push(a), warn: (...a) => calls.warn.push(a), log() {} } };
}

function fakeDateAt(year, month) {
  return class FakeDate {
    getMonth() { return month; }
    getFullYear() { return year; }
  };
}

function loadChrome(stubs) {
  const options = { stubs: stubs || { console: createLog().console } };
  return {
    assembleHeader: load(W + "effects/assembleDrillthroughSpec.js", options),
    assembleDatapoint: load(W + "effects/assembleDatapointDrillthroughSpec.js", options),
    readJahrYear: load(W + "effects/readDrillthroughJahrYear.js", options),
    readVisYear: load(W + "effects/readDrillthroughVisYear.js", options),
    buildOrgTree: load(W + "effects/buildOrgTreeForDrillthrough.js", options),
    parseHierarchyCell: load(W + "effects/parseHierarchyCellForDrillthrough.js", options),
    cleanupDecorations: load(W + "effects/cleanupDrillthroughDecorations.js", options)
  };
}

function loadClick(stubs) {
  const options = { stubs: stubs || { console: createLog().console } };
  const header = load(W + "effects/bindDrillthroughIconClick.js", options);
  const datapoint = load(W + "effects/bindDatapointDrillthroughIconClick.js", options);
  return { bindHeader: header, bindDatapoint: datapoint };
}

const json = (value) => JSON.parse(JSON.stringify(value));

function sichtApi(value) {
  return { getState: () => value };
}

const SICHT_STATE = { currentSelection: { displayValue: "DEZPV" }, activeSichtValue: "BW" };

const DIENSTSTELLE_SNAPSHOT = {
  resolution: {
    dominantValues: ["[Org].[level02].[Abt 7]", "Plain", null],
    displayValues: ["Abteilung 7", null, "x"]
  }
};

const HIERARCHY_ROWS = [
  { level01: { text: "Land" }, level02: { text: "Stadt", id: "S1" }, level03: "Bezirk" },
  { level01: "Land", level02: { label: "Dorf", use: "[H].[Dorf]" }, level03: "" },
  ["Root", "Child", null, ""],
  null
];

function buildKdb(extra) {
  const widgetVis = { drillthroughService: null, dataQueryFacet: null, filtersFacet: null, visualizationFacet: null };
  const _KDB = {
    state: {
      tabs: { activeTabId: "tab-1" },
      widgets: { vis: { byId: { w1: { derived: { code: "KZ-1", metricsTable: "tbl_metrics", lastAppliedVisType: "line" } } } } }
    },
    runtime: { widgetVis: Object.assign(widgetVis, extra && extra.runtime) },
    api: Object.assign({ widgetSettings: { getState: () => ({ byWidget: { w1: { dimension: "Region", visType: "bar" } } }) } }, extra && extra.api),
    config: { options: {} }
  };
  return _KDB;
}

function readRowsStub(tableName) {
  return () => (tableName ? HIERARCHY_ROWS : []);
}

test("header spec: shape, vis type override, Date rule (Jan/Feb -> year-2, otherwise year-1)", () => {
  const _KDB = buildKdb({
    runtime: { visualizationFacet: { getVisType: () => ({ ok: true, data: "Column" }) } }
  });
  const options = { _KDB, widgetId: "w1", sichtApi: sichtApi(SICHT_STATE), dienststelleApi: { getCurrentHierarchySnapshot: () => DIENSTSTELLE_SNAPSHOT }, tableDataReadRows: readRowsStub(true) };
  const expectedByMonth = { 0: 2024, 1: 2024, 2: 2025, 11: 2025 };
  Object.keys(expectedByMonth).forEach((month) => {
    const chrome = loadChrome({ console: createLog().console, Date: fakeDateAt(2026, Number(month)) });
    const spec = chrome.assembleHeader(options);
    assert.equal(spec.yearContext.defaultYear, expectedByMonth[month]);
  });
  const chrome = loadChrome({ console: createLog().console, Date: fakeDateAt(2026, 5) });
  const spec = json(chrome.assembleHeader(options));
  assert.deepEqual(Object.keys(spec), ["source", "widgetId", "visType", "selectedDimension", "kennzahlCode", "sicht", "orgSelection", "orgTree", "yearContext", "hostEnv"]);
  assert.equal(spec.source, "icon");
  assert.equal(spec.visType, "column");
  assert.equal(spec.selectedDimension, "Region");
  assert.equal(spec.kennzahlCode, "KZ-1");
  assert.equal(spec.sicht, "DEZPV");
  assert.equal(spec.hostEnv, null);
  assert.deepEqual(Object.keys(spec.yearContext), ["highestYearFromVis", "highestYearFromJahrFilter", "defaultYear"]);
  assert.deepEqual(spec.orgSelection, {
    selectedValues: [
      { useValue: "[Org].[level02].[Abt 7]", displayValue: "Abteilung 7", idValue: "Abt 7", level: 2 },
      { useValue: "Plain", displayValue: "Plain", idValue: "Plain", level: null },
      { useValue: "", displayValue: "x", idValue: "x", level: null }
    ]
  });
  assert.equal(spec.orgTree.tableKey, "dienststelle_dezpv_hierarchy");
});

test("header spec: dimension none/default -> null, vis type falls back to settings, kennzahl falls back to ''", () => {
  const chrome = loadChrome();
  const _KDB = buildKdb({ api: { widgetSettings: { getState: () => ({ byWidget: { w1: { dimension: "None", visType: "Pie" } } }) } } });
  _KDB.state.widgets.vis.byId.w1.derived = {};
  const spec = chrome.assembleHeader({ _KDB, widgetId: "w1" });
  assert.equal(spec.selectedDimension, null);
  assert.equal(spec.visType, "pie");
  assert.equal(spec.kennzahlCode, "");
  assert.equal(spec.sicht, "");
  assert.deepEqual(json(spec.orgSelection), { selectedValues: [] });
  assert.equal(spec.orgTree, null);
});

test("datapoint spec: shape and null without categories", () => {
  const chrome = loadChrome();
  const _KDB = buildKdb();
  const base = { _KDB, widgetId: "w1", sichtApi: sichtApi({ activeSichtValue: "BW" }), dienststelleApi: { getCurrentHierarchySnapshot: () => DIENSTSTELLE_SNAPSHOT }, tableDataReadRows: readRowsStub(true) };
  assert.equal(chrome.assembleDatapoint(Object.assign({}, base, { categories: [] })), null);
  assert.equal(chrome.assembleDatapoint(base), null);
  const spec = json(chrome.assembleDatapoint(Object.assign({}, base, { categories: [{ c: 1 }] })));
  assert.deepEqual(Object.keys(spec), ["source", "widgetId", "kennzahlCode", "sicht", "orgSelection", "orgTree", "categories", "hostEnv"]);
  assert.equal(spec.source, "datapoint");
  assert.equal(spec.sicht, "BW");
  assert.equal(spec.orgTree.tableKey, "dienststelle_bw_hierarchy");
  assert.deepEqual(spec.categories, [{ c: 1 }]);
  assert.equal(spec.kennzahlCode, "KZ-1");
});

test("readDrillthroughJahrYear: explicit scope, page result wins, null page falls back to global, facet failure", () => {
  const chrome = loadChrome();
  const calls = [];
  const answers = {
    "tab-1": null,
    "tab-2": { ok: true, data: ["2019 bis 2021", { d: "Jahr 2020" }, "2018"] },
    global: { ok: true, data: ["2018", 2022, "x 1999", "bad"] }
  };
  const filtersFacet = {
    readFilterValues(query) {
      calls.push([query.itemId, query.scopeId]);
      if (query.scopeId === "boom") throw new Error("facet down");
      return answers[query.scopeId] || { ok: false };
    }
  };
  const _KDB = buildKdb({ runtime: { filtersFacet } });
  const jahrColumnId = load("core/config/visualizations/topNHelper.js").resolveTableEntry("tbl_metrics").jahrColumnId;
  assert.equal(chrome.readJahrYear(_KDB, "tbl_metrics"), 2022);
  assert.deepEqual(calls, [[jahrColumnId, "tab-1"], [jahrColumnId, "global"]]);
  assert.equal(chrome.readJahrYear(_KDB, "tbl_metrics", "tab-2"), 2020);
  assert.equal(chrome.readJahrYear(_KDB, "tbl_metrics", "nope"), null);
  assert.equal(chrome.readJahrYear(_KDB, "tbl_metrics", "boom"), null);
  answers["tab-1"] = { ok: true, data: ["2020"] };
  assert.equal(chrome.readJahrYear(_KDB, "tbl_metrics"), 2020);
  assert.equal(chrome.readJahrYear(buildKdb(), "tbl_metrics"), null);
});

test("readDrillthroughVisYear: jahr/year column, max across cells, async and failed outcomes", () => {
  const chrome = loadChrome();
  const rows = { columnNames: ["Name", "Berichtsjahr"], columns: { Name: ["a"], Berichtsjahr: ["2019", { d: "2021 bis 2023" }, "n/a"] } };
  const withFacet = (outcome) => buildKdb({ runtime: { dataQueryFacet: { peekQueryRows: () => outcome } } });
  assert.equal(chrome.readVisYear(withFacet({ ok: true, data: rows }), "w1"), 2021);
  assert.equal(chrome.readVisYear(withFacet({ ok: true, data: { columnNames: ["Name"], columns: { Name: ["2020"] } } }), "w1"), null);
  assert.equal(chrome.readVisYear(withFacet({ ok: false }), "w1"), null);
  assert.equal(chrome.readVisYear(withFacet(Promise.resolve({ ok: true, data: rows })), "w1"), null);
  assert.equal(chrome.readVisYear(buildKdb(), "w1"), null);
  assert.equal(chrome.readVisYear(buildKdb({ runtime: { dataQueryFacet: { peekQueryRows: () => { throw new Error("x"); } } } }), "w1"), null);
});

test("org tree: ids per text, parents, children, levelRank, dataId and textToNodeId aliases", () => {
  const chrome = loadChrome();
  const tree = json(chrome.buildOrgTree({ readRows: (req) => (req[0].tableName === "dienststelle_dezpv_hierarchy" ? HIERARCHY_ROWS : []), sicht: " dezpv " }));
  assert.equal(tree.tableKey, "dienststelle_dezpv_hierarchy");
  assert.deepEqual(tree.textToNodeId, { Land: 1, Stadt: 2, S1: 2, Bezirk: 3, Dorf: 4, Root: 5, Child: 6 });
  assert.deepEqual(tree.idToMember, {
    1: { text: "Land" }, 2: { text: "Stadt", dataId: "S1" }, 3: { text: "Bezirk" }, 4: { text: "Dorf" }, 5: { text: "Root" }, 6: { text: "Child" }
  });
  assert.deepEqual(tree.nodesById[2], { id: 2, parent: [1], children: [3], levelRank: 2 });
  assert.deepEqual(tree.nodesById[1].children, [2, 4]);
  assert.deepEqual(tree.nodesById[6], { id: 6, parent: [5], children: [], levelRank: 1 });
  assert.equal(chrome.buildOrgTree({ sicht: "BW" }), null);
  assert.equal(chrome.buildOrgTree({ readRows: () => [], sicht: "BW" }), null);
  assert.equal(chrome.buildOrgTree({ readRows: (req) => (req[0].tableName === "dienststelle_bw_hierarchy" ? [{ a: "x" }] : []), sicht: "other" }).tableKey, "dienststelle_bw_hierarchy");
});

test("hierarchy cell parser: text keys, source ids from id/use/useValue/u/value", () => {
  const { parseHierarchyCell } = loadChrome();
  assert.deepEqual(parseHierarchyCell("  plain "), { text: "plain", sourceId: null });
  assert.deepEqual(parseHierarchyCell({ text: "T", id: " 7 " }), { text: "T", sourceId: "7" });
  assert.deepEqual(parseHierarchyCell({ label: "L", use: "[a].[b]" }), { text: "L", sourceId: "b" });
  assert.deepEqual(parseHierarchyCell({ d: "D", useValue: "[z]" }), { text: "D", sourceId: "z" });
  assert.deepEqual(parseHierarchyCell({ value: "V" }), { text: "V", sourceId: null });
  assert.equal(parseHierarchyCell({ text: "  " }), null);
  assert.equal(parseHierarchyCell(null), null);
});

test("cleanupDrillthroughDecorations: removes drillthrough listeners/timers/icons and resets the bucket", () => {
  const { cleanupDecorations } = loadChrome();
  const removed = [];
  const makeIcon = (name) => ({ parentNode: { removeChild: (el) => removed.push(name) }, name });
  const disposed = [];
  const runtime = {
    listeners: { drillthroughIconClick: () => disposed.push("icon"), drillthroughSelections: () => disposed.push("sel"), canvasMaximizeClick: () => disposed.push("max") },
    timers: { drillthroughRetry: 0, focusCheck: null },
    domRefs: { drillthroughIconEl: makeIcon("header"), datapointDrillthroughIconEl: makeIcon("datapoint") },
    drillthrough: { installed: true, lastSelectionEvent: {}, pendingSelectionEvents: [1], captureActive: true }
  };
  const diagnostics = {};
  cleanupDecorations(runtime, diagnostics);
  assert.deepEqual(disposed.sort(), ["icon", "sel"]);
  assert.deepEqual(Object.keys(runtime.listeners), ["canvasMaximizeClick"]);
  assert.deepEqual(Object.keys(runtime.timers), ["focusCheck"]);
  assert.deepEqual(removed, ["header", "datapoint"]);
  assert.equal(runtime.domRefs.drillthroughIconEl, null);
  assert.equal(runtime.domRefs.datapointDrillthroughIconEl, null);
  assert.deepEqual(runtime.drillthrough, { installed: false, lastSelectionEvent: null, pendingSelectionEvents: [], captureActive: false });
  assert.deepEqual(diagnostics, {
    drillthroughIconRemoved: true,
    datapointDrillthroughIconRemoved: true,
    drillthrough: { listenersRemoved: 2, timersCleared: 1, runtimeReset: true }
  });
});

function fakeAnchor() {
  const listeners = [];
  return {
    listeners,
    addEventListener(type, fn, capture) { listeners.push({ type, fn, capture }); },
    removeEventListener(type, fn, capture) {
      const index = listeners.findIndex((l) => l.fn === fn && l.type === type && l.capture === capture);
      if (index !== -1) listeners.splice(index, 1);
    }
  };
}

function fakeEvent() {
  const event = { prevented: 0, stopped: 0, preventDefault() { event.prevented += 1; }, stopPropagation() { event.stopped += 1; } };
  return event;
}

function errorMessages(log) {
  return log.calls.error.map((args) => String(args[0]));
}

test("header click: capture phase, replaces the previous listener, opens the drillthrough, logs a failed spec", () => {
  const log = createLog();
  const { bindHeader } = loadClick({ console: log.console });
  const opened = [];
  const service = { openDrillthrough: (spec) => { opened.push(spec); return { ok: true }; } };
  const runtime = { listeners: {} };
  const anchor = fakeAnchor();
  const _KDB = buildKdb();
  const common = { _KDB, widgetId: "w1", runtime, drillthroughService: service, sichtApi: sichtApi(SICHT_STATE), dienststelleApi: null, tableDataReadRows: null };
  const dispose = bindHeader(Object.assign({ anchorEl: anchor }, common));
  assert.equal(typeof dispose, "function");
  assert.equal(typeof runtime.listeners.drillthroughIconClick, "function");
  assert.equal(anchor.listeners.length, 1);
  assert.equal(anchor.listeners[0].type, "click");
  assert.equal(anchor.listeners[0].capture, true);
  const event = fakeEvent();
  anchor.listeners[0].fn(event);
  assert.deepEqual([event.prevented, event.stopped], [1, 1]);
  assert.equal(opened.length, 1);
  assert.equal(opened[0].source, "icon");
  bindHeader(Object.assign({ anchorEl: anchor }, common));
  assert.equal(anchor.listeners.length, 1);
  const failing = Object.assign({}, common, { sichtApi: { getState: () => { throw new Error("sicht down"); } } });
  bindHeader(Object.assign({ anchorEl: anchor }, failing));
  anchor.listeners[0].fn(fakeEvent());
  assert.equal(opened.length, 1);
  assert.ok(errorMessages(log).some((m) => m.indexOf("spec assembly failed") !== -1));
  const failingService = { openDrillthrough: () => ({ ok: false, errorCode: "NOPE" }) };
  log.calls.error.length = 0;
  bindHeader(Object.assign({ anchorEl: anchor }, common, { drillthroughService: failingService }));
  anchor.listeners[0].fn(fakeEvent());
  assert.equal(log.calls.error.length, 1);
  assert.equal(log.calls.error[0][1], "NOPE");
  runtime.listeners.drillthroughIconClick();
  assert.equal(anchor.listeners.length, 0);
});

test("datapoint click: silent without categories or spec, opens with the peeked categories, no anchor is a noop", () => {
  const log = createLog();
  const { bindDatapoint } = loadClick({ console: log.console });
  const opened = [];
  const service = { openDrillthrough: (spec) => { opened.push(spec); return { ok: true }; } };
  const runtime = { listeners: {} };
  const anchor = fakeAnchor();
  const peek = { value: { ok: true, data: { categories: [] } } };
  const _KDB = buildKdb({ runtime: { visualizationFacet: { getSelections: () => peek.value } } });
  const options = { _KDB, widgetId: "w1", runtime, anchorEl: anchor, drillthroughService: service, sichtApi: sichtApi(SICHT_STATE), dienststelleApi: null, tableDataReadRows: null };
  bindDatapoint(options);
  assert.equal(typeof runtime.listeners.drillthroughDatapointClick, "function");
  const event = fakeEvent();
  anchor.listeners[0].fn(event);
  assert.deepEqual([event.prevented, event.stopped], [1, 1]);
  assert.equal(opened.length, 0);
  assert.equal(log.calls.error.length, 0);
  peek.value = { ok: true, data: { categories: [{ c: 1 }] } };
  anchor.listeners[0].fn(fakeEvent());
  assert.equal(opened.length, 1);
  assert.equal(opened[0].source, "datapoint");
  assert.deepEqual(json(opened[0].categories), [{ c: 1 }]);
  const noAnchor = bindDatapoint(Object.assign({}, options, { anchorEl: null }));
  assert.equal(typeof noAnchor, "function");
  assert.equal(anchor.listeners.length, 0);
});
