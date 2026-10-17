// Golden tests for core/services/tableData (WS-B3).
// Run: node --test tools/tests/ws-b3-table-data.test.mjs
// Scenario traces are compared with tools/tests/ws-b3-table-data.snapshot.json (recorded on the unchanged code).
// Set UPDATE_SNAPSHOT=1 to rewrite the snapshot file.
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVICE_DIR = path.resolve(HERE, "../../_____________KDB3API/KDB3/js/core/services/tableData");
const SNAPSHOT_FILE = path.join(HERE, "ws-b3-table-data.snapshot.json");

const FILES = {
  orchestrator: "index.js",
  eventNames: "events/eventNames.js",
  shapeTableRows: "shapeTableRows.js",
  normalizeTableInputs: "tableInputs.js",
};

const loadService = (file, stubs) => loadAmd(path.join(SERVICE_DIR, file), { stubs });
const settle = () => new Promise((resolve) => setImmediate(resolve));

const DISPOSED_MESSAGE = "tableDataService disposed";
const ITEM_MESSAGE = "tableDataService input item must include tableName or widgetId.";
const ARRAY_MESSAGE = "tableDataService input must be an array.";

function columnar(rows) {
  return {
    columnNames: ["Jahr", "Wert"],
    rowCount: rows.length,
    columns: {
      Jahr: rows.map(([year]) => ({ d: String(year), u: year })),
      Wert: rows.map(([, value]) => ({ d: String(value), u: value })),
    },
  };
}

const SAMPLE = columnar([[2024, 1], [2025, 2]]);
const SHAPED = [
  { Jahr: { display: "2024", use: 2024 }, Wert: { display: "1", use: 1 } },
  { Jahr: { display: "2025", use: 2025 }, Wert: { display: "2", use: 2 } },
];
const EMPTY = { columnNames: [], rowCount: 0, columns: {} };

const PARK_ONLY = { T3: { name: "Park", parkFilter: { itemId: "[P]", body: { kind: "park" } } } };

function makeEnv({ queryHandlers = {}, tables, widgets } = {}) {
  const calls = [];
  const events = [];
  const toasts = [];
  const consoleLines = [];
  const descriptors = widgets || [
    { widgetId: "wT1", isLiveWidget: true, visType: "List", visTitle: "Tabelle 1" },
    { widgetId: "wT3", isLiveWidget: true, visType: "List", visTitle: "Park" },
    { widgetId: "wT4", isLiveWidget: true, visType: "List", visTitle: "Boot fail" },
    { widgetId: "wH", isLiveWidget: true, visType: "Hierarchy", visTitle: "Hier" },
    { widgetId: "wChart", isLiveWidget: true, visType: "Line", visTitle: "Chart" },
  ];
  const queryCounts = {};
  const KDB = {
    runtime: {},
    state: {},
    config: {
      tables: tables || {
        T1: { name: "Tabelle 1", load: true },
        T2: { name: "Missing" },
        T3: { name: "Park", parkFilter: { itemId: "[P]", body: { kind: "park" } } },
      },
    },
    events: { emit: (name, payload) => events.push({ name, payload }) },
    services: {
      message: { notify: (message) => toasts.push(message) },
      cognosHost: {
        canvas: {
          listCanvasWidgets: async (options) => {
            calls.push({ fn: "listCanvasWidgets", options });
            return { ok: true, data: descriptors };
          },
        },
        dataQuery: {
          readQueryRows: async (widgetId, options) => {
            queryCounts[widgetId] = (queryCounts[widgetId] || 0) + 1;
            calls.push({ fn: "readQueryRows", widgetId, budgetMs: options.budgetMs, intervalMs: options.intervalMs });
            const handler = queryHandlers[widgetId];
            return handler ? handler(options, queryCounts[widgetId]) : { ok: true, data: SAMPLE };
          },
        },
        visualization: {
          removeLocalFilter: async (widgetId, filter, options) => {
            calls.push({ fn: "removeLocalFilter", widgetId, itemId: filter.itemId, hasSignal: !!(options && options.signal) });
            return { ok: true };
          },
          addOrReplaceLocalFilter: async (widgetId, itemId, body) => {
            calls.push({ fn: "addOrReplaceLocalFilter", widgetId, itemId, body });
            return { ok: true };
          },
        },
        widgets: {
          renderWidget: async (widgetId, options) => {
            calls.push({ fn: "renderWidget", widgetId, hasSignal: !!(options && options.signal) });
            return { ok: true };
          },
        },
      },
    },
  };
  const fakeConsole = {
    error: (...args) => consoleLines.push({ level: "error", text: String(args[0]) }),
    warn: (...args) => consoleLines.push({ level: "warn", text: String(args[0]) }),
    log: () => {},
    info: () => {},
  };
  const register = loadService(FILES.orchestrator, { console: fakeConsole });
  const service = register(KDB);
  return { KDB, service, calls, events, toasts, consoleLines, queryCounts };
}

function abortableQuery(options) {
  return new Promise((resolve) => {
    options.signal.addEventListener("abort", () => resolve({ outcome: "aborted" }));
  });
}

function snapshotState(KDB) {
  const copy = JSON.parse(JSON.stringify(KDB.state.tableData));
  for (const entry of Object.values(copy)) {
    if (typeof entry.lastLoadedAt === "number") entry.lastLoadedAt = "<ts>";
  }
  return copy;
}

async function rejection(promise) {
  try {
    await promise;
  } catch (error) {
    return { message: error && error.message };
  }
  return { message: "<resolved>" };
}

// ------------------------------------------------------------------ pure functions

const PICK_CASES = {
  default: undefined,
  use: ["use"],
  display: ["display"],
  labelMapping: [{ label: "display" }],
  shortKeys: ["d", "u"],
  mapped: [{ shown: "display", raw: "use" }],
  unknownKey: ["display", "bogus"],
  empty: [],
};

test("shapeTableRows: columnar source, row and column shapes, every pick", () => {
  const shapeTableRows = loadService(FILES.shapeTableRows, { console: { error() {} } });
  const result = {};
  for (const [name, pick] of Object.entries(PICK_CASES)) {
    result[name] = {
      row: shapeTableRows(SAMPLE, "row", pick),
      column: shapeTableRows(SAMPLE, "column", pick),
    };
  }
  assert.deepEqual(result.default.row, [
    { Jahr: { display: "2024", use: 2024 }, Wert: { display: "1", use: 1 } },
    { Jahr: { display: "2025", use: 2025 }, Wert: { display: "2", use: 2 } },
  ]);
  assert.deepEqual(result.use.row, [
    { Jahr: { use: 2024 }, Wert: { use: 1 } },
    { Jahr: { use: 2025 }, Wert: { use: 2 } },
  ]);
  assert.deepEqual(result.labelMapping.column, {
    columnNames: ["Jahr", "Wert"],
    rowCount: 2,
    columns: { Jahr: [{ label: "2024" }, { label: "2025" }], Wert: [{ label: "1" }, { label: "2" }] },
  });
  assert.deepEqual(result.unknownKey.row[0].Jahr, { display: "2024" });
  assert.deepEqual(result.empty.row, result.default.row);
  assert.deepEqual(shapeTableRows(SAMPLE, undefined, ["use"]), result.use.row);
  assert.equal(shapeTableRows(null, "row"), null);
  assert.equal(shapeTableRows(undefined, "row"), undefined);
  assert.deepEqual(shapeTableRows({ other: 1 }, "row"), []);
  assert.deepEqual(shapeTableRows({ other: 1 }, "column"), { columnNames: [], rowCount: 0, columns: {} });
  return snapshotPart("shapeColumnar", result);
});

test("shapeTableRows: row-array source, primitive cells, sparse rows", () => {
  const shapeTableRows = loadService(FILES.shapeTableRows, { console: { error() {} } });
  const rows = [{ a: "x", b: 1 }, { a: "y", c: { d: "D", u: "U" } }, null];
  const result = {
    rowShape: shapeTableRows(rows, "row", ["use"]),
    columnShape: shapeTableRows(rows, "column", ["display", "use"]),
    emptyArray: shapeTableRows([], "row"),
    emptyArrayColumn: shapeTableRows([], "column"),
    nullCells: shapeTableRows([{ a: null, b: undefined }], "row", ["display"]),
    nestedCell: shapeTableRows([{ a: [1, 2] }], "row", ["use"]),
  };
  assert.deepEqual(result.rowShape[0], { a: { use: "x" }, b: { use: 1 }, c: {} });
  assert.deepEqual(result.rowShape[1].c, { use: "U" });
  assert.deepEqual(result.emptyArray, []);
  assert.deepEqual(result.emptyArrayColumn, { columnNames: [], rowCount: 0, columns: {} });
  assert.deepEqual(result.nullCells, [{ a: {}, b: {} }]);
  return snapshotPart("shapeRowArray", result);
});

test("normalizeTableInputs: defaults, aliases, validation messages", () => {
  const mod = loadService(FILES.normalizeTableInputs);
  const normalize = mod.normalizeTableInputs || mod;
  const result = {
    tableName: normalize([{ tableName: " T1 ", title: " Tab ", role: "r", shape: "COLUMN", pick: ["use"], isCoreTable: true }]),
    widgetId: normalize([{ widgetId: "w1", name: "Named" }]),
    both: normalize([{ tableName: "T1", widgetId: "w1" }]),
    defaults: normalize([{ tableName: "T1", pick: ["display", "use", "display"] }, { tableName: "T2", pick: ["bogus"], shape: "weird" }]),
    mapping: normalize([{ tableName: "T1", pick: [{ shown: "display" }, { label: "bogus" }, "d", 3, null, ["use"]] }]),
    empty: normalize([]),
  };
  assert.deepEqual(result.tableName[0], {
    tableHandle: "T1", tableName: "T1", title: "Tab", widgetId: null, role: "r", shape: "column", pick: ["use"], isCoreTable: true,
  });
  assert.deepEqual(result.widgetId[0], {
    tableHandle: "w1", tableName: null, title: "Named", widgetId: "w1", role: null, shape: "row", pick: ["display", "use"],
  });
  assert.equal(result.both[0].tableHandle, "T1");
  assert.equal(result.both[0].widgetId, "w1");
  assert.deepEqual(result.defaults[0].pick, ["display", "use"]);
  assert.deepEqual(result.defaults[1].pick, ["display", "use"]);
  assert.equal(result.defaults[1].shape, "row");
  assert.deepEqual(result.empty, []);
  const errors = {};
  for (const [name, value] of Object.entries({ notArray: "x", nullInput: null, emptyItem: [{}], blankName: [{ tableName: "  " }], blankWidget: [{ widgetId: "" }], primitive: ["x"], nested: [[]] })) {
    try {
      normalize(value);
      errors[name] = "<no error>";
    } catch (error) {
      errors[name] = error.message;
    }
  }
  assert.equal(errors.notArray, ARRAY_MESSAGE);
  assert.equal(errors.nullInput, ARRAY_MESSAGE);
  for (const name of ["emptyItem", "blankName", "blankWidget", "primitive", "nested"]) assert.equal(errors[name], ITEM_MESSAGE, name);
  return snapshotPart("normalizeInputs", { result, errors });
});

test("event names are frozen", () => {
  assert.deepEqual(loadService(FILES.eventNames), { LOAD_FINISHED: "tableData:loadFinished", LOAD_FAILED: "tableData:loadFailed" });
});

// ------------------------------------------------------------------ service level

test("service: public surface and boot", async () => {
  const env = makeEnv();
  assert.deepEqual(
    Object.keys(env.service).sort(),
    ["abortTable", "destroy", "ensureFreshRows", "loadTable", "loadTables", "readPendingLoad", "readRows", "readTableState", "registerConfiguredLoads", "reloadTable", "waitForRows"],
  );
  assert.equal(env.KDB.services.tableData, env.service);
  assert.deepEqual(Object.keys(env.KDB.runtime.tableData).filter((key) => key.endsWith("Facet")).sort(), ["canvasFacet", "dataQueryFacet", "visualizationFacet", "widgetsFacet"]);
  assert.equal(env.KDB.runtime.tableData.canvasFacet, env.KDB.services.cognosHost.canvas);
  assert.equal(env.KDB.runtime.tableData.dataQueryFacet, env.KDB.services.cognosHost.dataQuery);
  assert.equal(env.KDB.runtime.tableData.visualizationFacet, env.KDB.services.cognosHost.visualization);
  assert.equal(env.KDB.runtime.tableData.widgetsFacet, env.KDB.services.cognosHost.widgets);
  assert.deepEqual(env.KDB.state.tableData.T1 && env.KDB.state.tableData.T1.lifecycle, "loading");

  const rows = await env.service.waitForRows([{ tableName: "T1", isCoreTable: true }]);
  assert.deepEqual(rows, SHAPED);
  const state = env.service.readTableState([{ tableName: "T1" }]);
  assert.equal(state.lifecycle, "ready");
  assert.equal(state.freshness, "fresh");
  assert.equal(state.rowCount, 2);
  assert.equal(state.widgetId, "wT1");
  assert.equal(state.isCoreTable, true);
  assert.equal(state.title, "Tabelle 1");
  assert.deepEqual(env.service.readRows([{ tableName: "T1" }])[1], { Jahr: { display: "2025", use: 2025 }, Wert: { display: "2", use: 2 } });
  assert.deepEqual(env.events, [{ name: "tableData:loadFinished", payload: { tableName: "T1", rowCount: 2 } }]);
  assert.deepEqual(env.calls.filter((call) => call.fn === "readQueryRows"), [{ fn: "readQueryRows", widgetId: "wT1", budgetMs: 60000, intervalMs: 100 }]);
  assert.deepEqual(env.calls.filter((call) => call.fn === "listCanvasWidgets"), [{ fn: "listCanvasWidgets", options: { waitUntilReady: true } }]);
  return snapshotPart("boot", { rows, state: snapshotState(env.KDB), events: env.events, calls: env.calls, toasts: env.toasts });
});

test("service: reads, ensureFresh, reload, widgetId handles, multi-input", async () => {
  const env = makeEnv();
  const { service } = env;
  await service.waitForRows([{ tableName: "T1", isCoreTable: true }]);
  const trace = {};

  trace.readColumn = service.readRows([{ tableName: "T1", shape: "column", pick: ["use"] }]);
  trace.readLabel = service.readRows([{ tableName: "T1", pick: [{ label: "display" }] }]);
  trace.readUnknown = service.readRows([{ tableName: "Nope" }]);
  trace.statePending = service.readPendingLoad([{ tableName: "T1" }]);
  assert.equal(trace.statePending, null);
  trace.pendingMulti = service.readPendingLoad([{ tableName: "T1" }, { tableName: "T2" }]);
  assert.equal(trace.pendingMulti, null);
  trace.stateUnknown = service.readTableState([{ tableName: "Nope" }]);
  assert.equal(trace.stateUnknown, undefined);

  const before = env.queryCounts.wT1;
  trace.ensureFresh = await service.ensureFreshRows([{ tableName: "T1" }]);
  assert.equal(env.queryCounts.wT1, before, "fresh entry is not re-read");
  trace.load = await service.loadTable([{ tableName: "T1", shape: "column", pick: ["use"] }]);
  assert.equal(env.queryCounts.wT1, before, "loadTable on a fresh entry is not re-read");
  trace.reload = await service.reloadTable([{ tableName: "T1" }]);
  assert.equal(env.queryCounts.wT1, before + 1);

  const pendingReload = service.reloadTable([{ tableName: "T1" }]);
  const pending = service.readPendingLoad([{ tableName: "T1" }]);
  assert.equal(typeof pending.then, "function");
  assert.equal(service.readTableState([{ tableName: "T1" }]).lifecycle, "loading");
  assert.equal(service.readTableState([{ tableName: "T1" }]).freshness, "stale");
  assert.equal(service.readRows([{ tableName: "T1" }]), undefined, "rows are hidden while loading");
  const pendingRows = await service.waitForRows([{ tableName: "T1", shape: "column", pick: ["use"] }]);
  await pendingReload;
  trace.waitWhilePending = pendingRows;

  trace.byWidgetId = await service.waitForRows([{ widgetId: "wH", title: "Hier" }]);
  trace.byWidgetIdState = service.readTableState([{ widgetId: "wH" }]);
  trace.chartTitle = await service.loadTable([{ tableName: "Chart" }]);
  trace.chartTitleState = service.readTableState([{ tableName: "Chart" }]);

  const multi = await service.waitForRows([{ tableName: "T1" }, { tableName: "T2" }]);
  assert.equal(Array.isArray(multi), true);
  assert.equal(multi.length, 2);
  assert.equal(multi[1], null);
  trace.multi = multi;
  trace.multiRead = service.readRows([{ tableName: "T1" }, { tableName: "T2" }]);
  assert.equal(trace.multiRead.length, 2);
  trace.multiState = service.readTableState([{ tableName: "T1" }, { tableName: "T2" }]).map((entry) => entry && entry.lifecycle);
  trace.multiAbort = await service.abortTable([{ tableName: "T1" }, { tableName: "T2" }]);
  assert.equal(trace.multiAbort, undefined);
  trace.multiLoad = (await service.loadTable([{ tableName: "T1" }, { tableName: "T2" }, { tableName: "T1", shape: "column" }])).length;

  const t2 = service.readTableState([{ tableName: "T2" }]);
  assert.equal(t2.lifecycle, "ready");
  assert.equal(t2.rowCount, 0);
  assert.equal(t2.hasData, false);
  assert.equal(t2.widgetId, null);
  const whole = service.readTableState();
  assert.deepEqual(Object.keys(whole), Object.keys(env.KDB.state.tableData));
  assert.notEqual(whole, env.KDB.state.tableData);
  assert.deepEqual(JSON.parse(JSON.stringify(service.readTableState(null))), JSON.parse(JSON.stringify(whole)));
  trace.keys = Object.keys(whole).sort();
  trace.state = snapshotState(env.KDB);
  trace.events = env.events;
  trace.calls = env.calls;
  return snapshotPart("reads", trace);
});

test("service: configured loads", async () => {
  const env = makeEnv({ tables: { A: { name: "Tabelle 1", load: true, shape: "column", pick: ["use"] }, B: { name: "Park", load: false }, C: { name: "Chart", load: true } } });
  await env.service.waitForRows([{ tableName: "A", isCoreTable: true }]);
  const keys = await env.service.registerConfiguredLoads();
  const keysExplicit = await env.service.registerConfiguredLoads({ B: { name: "Boot fail", load: true } });
  await env.service.waitForRows([{ tableName: "B", isCoreTable: true }]);
  assert.deepEqual(keys, ["A", "C"]);
  assert.deepEqual(keysExplicit, ["B"]);
  const stateA = env.service.readTableState([{ tableName: "A" }]);
  assert.deepEqual(stateA.pick, ["use"]);
  assert.equal(stateA.shape, "column");
  assert.equal(env.service.readTableState([{ tableName: "C" }]).rowCount, 0);
  return snapshotPart("configuredLoads", { keys, keysExplicit, state: snapshotState(env.KDB), events: env.events });
});

test("service: failed load rejects, emits once, toasts once per message", async () => {
  let failing = true;
  const env = makeEnv({ queryHandlers: { wT1: () => (failing ? { ok: false, errorCode: "E" } : { ok: true, data: SAMPLE }) } });
  const { service } = env;
  const trace = {};
  trace.boot = await rejection(service.waitForRows([{ tableName: "T1", isCoreTable: true }]));
  assert.equal(trace.boot.message, "E");
  assert.equal(env.toasts.length, 1);
  assert.deepEqual(env.toasts[0], { severity: "error", message: "Tabellendaten konnten nicht geladen werden: Tabelle 1" });
  assert.deepEqual(env.events.map((event) => event.name), ["tableData:loadFailed"]);
  assert.deepEqual(env.events[0].payload, { tableName: "T1", errorCode: "TABLE_DATA_LOAD_FAILED", errorMessage: "E" });
  const state = service.readTableState([{ tableName: "T1" }]);
  assert.equal(state.lifecycle, "error");
  assert.equal(state.freshness, "stale");
  assert.equal(state.errorCode, "TABLE_DATA_LOAD_FAILED");
  assert.equal(state.errorMessage, "E");
  assert.equal(service.readRows([{ tableName: "T1" }]), undefined);

  trace.second = await rejection(service.reloadTable([{ tableName: "T1" }]));
  assert.equal(env.toasts.length, 1, "same failure does not toast again");
  assert.equal(env.events.length, 2);

  failing = false;
  trace.recovered = await service.reloadTable([{ tableName: "T1" }]);
  assert.deepEqual(trace.recovered, SHAPED);
  assert.equal(service.readTableState([{ tableName: "T1" }]).errorMessage, null);
  failing = true;
  trace.third = await rejection(service.reloadTable([{ tableName: "T1" }]));
  assert.equal(env.toasts.length, 2, "a failure after a success toasts again");

  const noFacet = makeEnv();
  noFacet.KDB.runtime.tableData.dataQueryFacet = null;
  trace.noFacet = await rejection(noFacet.service.reloadTable([{ tableName: "T1" }]));
  assert.equal(trace.noFacet.message, "dataQueryFacet missing");
  const thrown = makeEnv({ queryHandlers: { wT1: () => { throw new Error("boom"); } } });
  trace.thrown = await rejection(thrown.service.reloadTable([{ tableName: "T1" }]));
  assert.equal(trace.thrown.message, "boom");
  const noMessage = makeEnv({ queryHandlers: { wT1: () => ({ ok: false }) } });
  trace.noCode = await rejection(noMessage.service.reloadTable([{ tableName: "T1" }]));
  assert.equal(trace.noCode.message, "DATAQUERY_READ_FAILED");

  trace.state = snapshotState(env.KDB);
  trace.events = env.events;
  trace.toasts = env.toasts;
  return snapshotPart("failures", trace);
});

test("service: abort resolves null without rejecting or emitting", async () => {
  const env = makeEnv({ queryHandlers: { wT1: (options, count) => (count === 1 || count === 4 ? { ok: true, data: SAMPLE } : abortableQuery(options)) } });
  const { service } = env;
  await service.waitForRows([{ tableName: "T1", isCoreTable: true }]);
  env.events.length = 0;

  const loading = service.reloadTable([{ tableName: "T1" }]);
  await settle();
  assert.equal(await service.abortTable([{ tableName: "T1" }]), undefined);
  assert.equal(await loading, null);
  assert.equal(service.readPendingLoad([{ tableName: "T1" }]), null);

  const first = service.reloadTable([{ tableName: "T1" }]);
  await settle();
  const second = service.reloadTable([{ tableName: "T1" }]);
  assert.equal(await first, null, "reload aborts the load in flight");
  assert.deepEqual(await second, SHAPED, "the superseding load completes");
  assert.equal(service.readTableState([{ tableName: "T1" }]).lifecycle, "ready");
  assert.deepEqual(env.events, [{ name: "tableData:loadFinished", payload: { tableName: "T1", rowCount: 2 } }]);
  assert.equal(env.toasts.length, 0);
  assert.deepEqual(Object.keys(env.KDB.runtime.tableData.pendingLoads), []);
  assert.deepEqual(Object.keys(env.KDB.runtime.tableData.abortControllers), []);
  return snapshotPart("abort", { state: snapshotState(env.KDB), calls: env.calls });
});

test("service: a superseded load settling does not release the newer load", async () => {
  const env = makeEnv({ queryHandlers: { wT1: (options, count) => (count === 1 ? { ok: true, data: SAMPLE } : abortableQuery(options)) } });
  const { service, KDB } = env;
  await service.waitForRows([{ tableName: "T1", isCoreTable: true }]);
  const first = service.reloadTable([{ tableName: "T1" }]);
  await settle();
  const second = service.reloadTable([{ tableName: "T1" }]);
  assert.equal(await first, null);
  await settle();
  const runtime = KDB.runtime.tableData;
  assert.ok(runtime.abortControllers.T1, "newer load keeps its controller");
  const shared = service.loadTable([{ tableName: "T1" }]);
  assert.equal(service.readPendingLoad([{ tableName: "T1" }]), runtime.pendingLoads.T1);
  const readsBefore = env.queryCounts.wT1;
  await service.abortTable([{ tableName: "T1" }]);
  assert.equal(await second, null, "abortTable still aborts the newer load");
  assert.equal(await shared, null, "loadTable shared the newer pending promise");
  assert.equal(env.queryCounts.wT1, readsBefore, "no extra query started");
  assert.deepEqual(Object.keys(runtime.pendingLoads), []);
  assert.deepEqual(Object.keys(runtime.abortControllers), []);
});

test("service: concurrent loads share one pending promise", async () => {
  const env = makeEnv({ queryHandlers: { wT1: async () => { await settle(); return { ok: true, data: SAMPLE }; } } });
  const a = env.service.loadTable([{ tableName: "T1" }]);
  const b = env.service.loadTable([{ tableName: "T1" }]);
  const [rowsA, rowsB] = await Promise.all([a, b]);
  assert.equal(rowsA.length, 2);
  assert.equal(rowsB.length, 2);
  assert.equal(env.queryCounts.wT1, 1);
});

test("service: park filter path removes, renders, polls until rows, re-parks", async () => {
  const env = makeEnv({
    tables: PARK_ONLY,
    queryHandlers: { wT3: (options, count) => (count <= 2 ? { ok: true, data: EMPTY } : { ok: true, data: SAMPLE }) },
  });
  const rows = await env.service.loadTable([{ tableName: "T3" }]);
  assert.deepEqual(rows, SHAPED);
  const calls = env.calls.filter((call) => call.widgetId === "wT3");
  assert.deepEqual(calls.map((call) => call.fn), [
    "removeLocalFilter", "removeLocalFilter", "removeLocalFilter", "renderWidget",
    "readQueryRows", "readQueryRows", "readQueryRows",
    "addOrReplaceLocalFilter", "renderWidget",
  ]);
  assert.deepEqual(calls.filter((call) => call.fn === "removeLocalFilter").map((call) => call.itemId), ["[P]", "[P]_none", "[P]_1"]);
  assert.deepEqual(calls.find((call) => call.fn === "addOrReplaceLocalFilter"), { fn: "addOrReplaceLocalFilter", widgetId: "wT3", itemId: "[P]", body: { kind: "park" } });
  assert.equal(env.service.readTableState([{ tableName: "T3" }]).rowCount, 2);
  assert.deepEqual(env.events, [{ name: "tableData:loadFinished", payload: { tableName: "T3", rowCount: 2 } }]);
  return snapshotPart("park", { calls: env.calls, events: env.events, state: snapshotState(env.KDB) });
});

test("service: park filter failures", async () => {
  const trace = {};
  const failedRead = makeEnv({ queryHandlers: { wT3: () => ({ ok: false, errorCode: "READ" }) } });
  trace.failedRead = await rejection(failedRead.service.loadTable([{ tableName: "T3" }]));
  trace.failedReadCalls = failedRead.calls.filter((call) => call.widgetId === "wT3").map((call) => call.fn);
  assert.equal(trace.failedRead.message, "READ");
  assert.deepEqual(trace.failedReadCalls.slice(-2), ["addOrReplaceLocalFilter", "renderWidget"], "park is restored after a failed read");

  const renderFails = makeEnv();
  renderFails.KDB.runtime.tableData.widgetsFacet = {
    renderWidget: async (widgetId) => {
      renderFails.calls.push({ fn: "renderWidget", widgetId });
      return { ok: false, errorCode: "RENDER" };
    },
  };
  trace.renderFails = await rejection(renderFails.service.loadTable([{ tableName: "T3" }]));
  assert.equal(trace.renderFails.message, "RENDER");

  const noWidgets = makeEnv();
  noWidgets.KDB.runtime.tableData.widgetsFacet = null;
  trace.noWidgets = await rejection(noWidgets.service.loadTable([{ tableName: "T3" }]));
  assert.equal(trace.noWidgets.message, "widgetsFacet.renderWidget missing");

  const abortedPark = makeEnv({ queryHandlers: { wT3: (options) => abortableQuery(options) } });
  const pending = abortedPark.service.loadTable([{ tableName: "T3" }]);
  await settle();
  await settle();
  await abortedPark.service.abortTable([{ tableName: "T3" }]);
  assert.equal(await pending, null);
  trace.abortedCalls = abortedPark.calls.filter((call) => call.widgetId === "wT3").map((call) => call.fn);
  return snapshotPart("parkFailures", trace);
});

test("service: parked table that stays empty fails after the read budget", async () => {
  const env = makeEnv({ tables: PARK_ONLY, queryHandlers: { wT3: () => ({ ok: true, data: EMPTY }) } });
  mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1000000 });
  try {
    let outcome = null;
    const loading = env.service.loadTable([{ tableName: "T3" }]).then(
      (value) => { outcome = { value }; },
      (error) => { outcome = { error }; },
    );
    for (let step = 0; step < 1200 && !outcome; step += 1) {
      await settle();
      mock.timers.tick(100);
    }
    await loading;
    assert.ok(outcome && outcome.error, "load rejects");
    assert.equal(outcome.error.message, "TABLE_DATA_PARK_EMPTY");
  } finally {
    mock.timers.reset();
  }
  const reads = env.calls.filter((call) => call.fn === "readQueryRows").length;
  assert.ok(reads >= 590 && reads <= 603, `poll count ${reads}`);
  assert.deepEqual(env.calls.filter((call) => call.widgetId === "wT3").slice(-2).map((call) => call.fn), ["addOrReplaceLocalFilter", "renderWidget"]);
  assert.deepEqual(env.events.map((event) => event.name), ["tableData:loadFailed"]);
  assert.equal(env.events[0].payload.errorMessage, "TABLE_DATA_PARK_EMPTY");
  assert.equal(env.toasts.length, 1);
});

test("service: boot load failure is reported once and does not break other loads", async () => {
  const env = makeEnv({
    tables: { T1: { name: "Tabelle 1", load: true }, T4: { name: "Boot fail", load: true } },
    queryHandlers: { wT4: () => ({ ok: false, errorCode: "BOOT" }) },
  });
  assert.deepEqual(await env.service.waitForRows([{ tableName: "T1", isCoreTable: true }]), SHAPED);
  assert.equal((await rejection(env.service.waitForRows([{ tableName: "T4", isCoreTable: true }]))).message, "BOOT");
  assert.equal(env.toasts.length, 1);
  assert.equal(env.events.filter((event) => event.name === "tableData:loadFinished").length, 1);
  assert.ok(env.events.some((event) => event.name === "tableData:loadFailed"));
});

test("service: invalid input rejects (async) or returns undefined (reads) with one console.error", async () => {
  const env = makeEnv();
  const trace = {};
  for (const method of ["loadTable", "waitForRows", "reloadTable", "ensureFreshRows", "abortTable"]) {
    const before = env.consoleLines.filter((line) => line.level === "error").length;
    trace[`${method}NotArray`] = await rejection(env.service[method]("x"));
    trace[`${method}EmptyItem`] = await rejection(env.service[method]([{}]));
    assert.equal(env.consoleLines.filter((line) => line.level === "error").length - before, 2, method);
  }
  assert.equal(trace.loadTableNotArray.message, ARRAY_MESSAGE);
  assert.equal(trace.abortTableEmptyItem.message, ITEM_MESSAGE);
  for (const method of ["readRows", "readPendingLoad", "readTableState"]) {
    const before = env.consoleLines.filter((line) => line.level === "error").length;
    assert.equal(env.service[method]("x"), undefined);
    assert.equal(env.service[method]([{}]), undefined);
    assert.equal(env.consoleLines.filter((line) => line.level === "error").length - before, 2, method);
  }
  assert.equal(env.service.readRows(), undefined);
  assert.equal(env.service.readPendingLoad(), undefined);
  assert.deepEqual(Object.keys(env.service.readTableState()), Object.keys(env.KDB.state.tableData));
  return snapshotPart("invalidInput", trace);
});

test("service: destroy disposes state, aborts loads, rejects afterwards", async () => {
  const env = makeEnv({ queryHandlers: { wT1: (options, count) => (count === 1 ? { ok: true, data: SAMPLE } : abortableQuery(options)) } });
  const { service, KDB } = env;
  await service.waitForRows([{ tableName: "T1", isCoreTable: true }]);
  await service.loadTable([{ tableName: "T2" }]);
  const loading = service.reloadTable([{ tableName: "T1" }]);
  await settle();
  service.destroy();
  assert.equal(await loading, null);
  service.destroy();

  for (const method of ["loadTable", "waitForRows", "reloadTable", "ensureFreshRows", "abortTable"]) {
    assert.equal((await rejection(service[method]([{ tableName: "T1" }]))).message, DISPOSED_MESSAGE, method);
  }
  assert.equal((await rejection(service.registerConfiguredLoads())).message, DISPOSED_MESSAGE);
  assert.equal(service.readRows([{ tableName: "T1" }]), undefined);
  assert.equal(service.readPendingLoad([{ tableName: "T1" }]), undefined);
  assert.equal(service.readTableState([{ tableName: "T1" }]), undefined);
  assert.equal(service.readTableState(), undefined);

  for (const key of ["T1", "T2"]) {
    assert.equal(KDB.state.tableData[key].lifecycle, "disposed", key);
    assert.equal(KDB.state.tableData[key].freshness, "stale", key);
  }
  for (const key of ["T1", "T2"]) {
    assert.equal(KDB.state.tableData[key].rows, null, `${key} rows released on dispose`);
    assert.equal(KDB.state.tableData[key].sourceRows, null, `${key} sourceRows released on dispose`);
  }
  const runtime = KDB.runtime.tableData;
  assert.equal(runtime.canvasWidgetsForLookup, null, "canvas lookup cache reset on destroy");
  assert.equal(runtime.canvasWidgetsForLookupPromise, null);
  assert.deepEqual(runtime.pendingLoads, {});
  assert.deepEqual(runtime.abortControllers, {});
  assert.deepEqual(runtime.notifiedLoadFailures, {});
  assert.equal(typeof runtime.loadRegistryReady.then, "function");
  assert.equal(await runtime.loadRegistryReady.then((keys) => keys.length), 0);
});

// ------------------------------------------------------------------ snapshot plumbing

const recorded = {};
function snapshotPart(name, value) {
  recorded[name] = JSON.parse(JSON.stringify(value === undefined ? null : value), (key, entry) => (key === "lastLoadedAt" && typeof entry === "number" ? "<ts>" : entry));
}

test("snapshot: scenario traces match the recorded snapshot", () => {
  if (process.env.UPDATE_SNAPSHOT === "1" || !fs.existsSync(SNAPSHOT_FILE)) {
    const sorted = Object.fromEntries(Object.keys(recorded).sort().map((key) => [key, recorded[key]]));
    fs.writeFileSync(SNAPSHOT_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
    return;
  }
  const expected = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf8"));
  assert.deepEqual(Object.keys(recorded).sort(), Object.keys(expected).sort());
  for (const key of Object.keys(expected)) assert.deepEqual(recorded[key], expected[key], key);
});

test("tableState: markTableDisposed gives an unknown table an identity", () => {
  const state = loadService("tableState.js");
  const KDB = { state: { tableData: {} } };
  const entry = state.markTableDisposed(KDB, { tableKey: "Ghost" });
  assert.equal(entry.lifecycle, "disposed");
  assert.equal(entry.tableHandle, "Ghost");
  assert.equal(entry.tableName, "Ghost");
  assert.equal(entry.rows, null);
  assert.equal(KDB.state.tableData.Ghost, entry);
});
