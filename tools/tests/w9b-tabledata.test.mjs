// W9b: tableData API hardening. Sections marked "recorded on old code" were committed passing before the change;
// the delta tests at the end describe the new additive behaviour.
// Run: node --test tools/tests/w9b-tabledata.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const SERVICE_DIR = path.join(JS_ROOT, "core/services/tableData");
const settle = () => new Promise((resolve) => setImmediate(resolve));

const TOAST_TEXT = "Tabellendaten konnten nicht geladen werden: ";
const UNKNOWN_TABLE_TEXT = "unbekannte Tabelle";

const SAMPLE = {
  columnNames: ["Jahr", "Wert"],
  rowCount: 2,
  columns: {
    Jahr: [{ d: "2024", u: 2024 }, { d: "2025", u: 2025 }],
    Wert: [{ d: "1", u: 1 }, { d: "2", u: 2 }]
  }
};
const SHAPED = [
  { Jahr: { display: "2024", use: 2024 }, Wert: { display: "1", use: 1 } },
  { Jahr: { display: "2025", use: 2025 }, Wert: { display: "2", use: 2 } }
];

function makeEnv(options) {
  const opts = options || {};
  const toasts = [];
  const events = [];
  const queries = [];
  const logs = [];
  const KDB = {
    runtime: {},
    state: {},
    config: Object.assign({ tables: { T1: { name: "Tabelle 1" }, T2: { name: "Missing" } } }, opts.config),
    events: { emit: (name, payload) => events.push({ name, payload }) },
    services: {
      message: { notify: (message) => toasts.push(message) },
      cognosHost: {
        canvas: {
          listCanvasWidgets: async () => ({ ok: true, data: [{ widgetId: "wT1", isLiveWidget: true, visType: "List", visTitle: "Tabelle 1" }] })
        },
        dataQuery: {
          readQueryRows: async (widgetId, queryOptions) => {
            queries.push(widgetId);
            return opts.query ? opts.query(widgetId, queryOptions) : { ok: true, data: SAMPLE };
          }
        },
        visualization: { removeLocalFilter: async () => ({ ok: true }), addOrReplaceLocalFilter: async () => ({ ok: true }) },
        widgets: { renderWidget: async () => ({ ok: true }) }
      }
    }
  };
  const fakeConsole = { error: (...a) => logs.push(a), warn: () => {}, log: () => {}, info: () => {} };
  const register = loadAmd(path.join(SERVICE_DIR, "__orchestratorTableData.js"), { stubs: { console: fakeConsole } });
  return { KDB, service: register(KDB), toasts, events, queries, logs };
}

const noLastLoaded = (entry) => {
  const copy = Object.assign({}, entry);
  delete copy.lastLoadedAt;
  return copy;
};

// ---------- recorded on old code ----------

test("loadTable: one input unwraps to its rows, several inputs give an array; a fresh entry is not re-read", async () => {
  const env = makeEnv();
  const one = await env.service.loadTable([{ tableName: "T1" }]);
  assert.deepEqual(one, SHAPED);
  const queriesAfterFirst = env.queries.length;
  const many = await env.service.loadTable([{ tableName: "T1" }, { tableName: "T1", shape: "column", pick: ["use"] }]);
  assert.equal(Array.isArray(many) && many.length, 2);
  assert.deepEqual(many[0], SHAPED);
  assert.equal(many[1].columns.Jahr[0].use, 2024);
  assert.equal(env.queries.length, queriesAfterFirst);
});

test("readTableState: a loaded table reports its fields; unknown tables are undefined; several inputs give an array", async () => {
  const env = makeEnv();
  await env.service.waitForRows([{ tableName: "T1", isCoreTable: true }]);
  const state = env.service.readTableState([{ tableName: "T1" }]);
  assert.deepEqual(noLastLoaded(state), {
    lifecycle: "ready", freshness: "fresh", tableHandle: "T1", tableName: "T1", title: "Tabelle 1", widgetId: "wT1", role: null,
    shape: "row", pick: ["display", "use"], rows: SHAPED, sourceRows: SAMPLE, rowCount: 2, isHierarchy: false, hasData: true,
    errorCode: null, errorMessage: null, isCoreTable: true
  });
  assert.equal(env.service.readTableState([{ tableName: "Nope" }]), undefined);
  const several = env.service.readTableState([{ tableName: "T1" }, { tableName: "Nope" }]);
  assert.equal(several.length, 2);
  assert.equal(several[0].lifecycle, "ready");
  assert.equal(several[1], undefined);
});

test("a table without a live widget commits as an empty ready table (no failure, no toast)", async () => {
  const env = makeEnv();
  const rows = await env.service.waitForRows([{ tableName: "T2", isCoreTable: true }]);
  assert.equal(rows, null);
  const state = env.service.readTableState([{ tableName: "T2" }]);
  assert.equal(state.lifecycle, "ready");
  assert.equal(state.widgetId, null);
  assert.equal(state.rowCount, 0);
  assert.equal(state.hasData, false);
  assert.deepEqual(env.toasts, []);
  assert.deepEqual(env.events.map((event) => event.name), ["tableData:loadFinished"]);
});

test("a failed load toasts the German text once per message and rejects", async () => {
  const env = makeEnv({ query: () => ({ ok: false, errorCode: "E1" }) });
  await assert.rejects(env.service.reloadTable([{ tableName: "T1" }]), /E1/);
  assert.deepEqual(env.toasts, [{ severity: "error", message: TOAST_TEXT + "Tabelle 1" }]);
  await assert.rejects(env.service.reloadTable([{ tableName: "T1" }]), /E1/);
  assert.equal(env.toasts.length, 1);
});

test("waitForRows without options waits for the load and resolves shaped rows", async () => {
  const env = makeEnv();
  const rows = await env.service.waitForRows([{ tableName: "T1" }]);
  assert.deepEqual(rows, SHAPED);
  await settle();
  assert.equal(env.queries.length, 1);
});

test("the German toast and fallback texts are the recorded literals", () => {
  const config = loadAmd(path.join(SERVICE_DIR, "config.js"));
  const labels = config.tableDataLabels || { loadFailedToast: config.LOAD_FAILED_TOAST, unknownTable: config.UNKNOWN_TABLE_LABEL };
  assert.equal(labels.loadFailedToast, TOAST_TEXT);
  assert.equal(labels.unknownTable, UNKNOWN_TABLE_TEXT);
});

// ---------- W9b deltas ----------

test("loadTables always resolves to an array, one entry per input; loadTable keeps its unwrapping", async () => {
  const env = makeEnv();
  const one = await env.service.loadTables([{ tableName: "T1" }]);
  assert.equal(Array.isArray(one), true);
  assert.deepEqual(one, [SHAPED]);
  const queries = env.queries.length;
  const two = await env.service.loadTables([{ tableName: "T1" }, { tableName: "T1", shape: "column", pick: ["use"] }]);
  assert.equal(two.length, 2);
  assert.deepEqual(two[0], SHAPED);
  assert.deepEqual(await env.service.loadTables([]), []);
  assert.equal(env.queries.length, queries);
  assert.deepEqual(await env.service.loadTable([{ tableName: "T1" }]), SHAPED);
  await assert.rejects(env.service.loadTables("x"), /must be an array/);
});

test("readTableState returns frozen copies: the state cannot be changed through them, rows stay shared", async () => {
  const env = makeEnv();
  await env.service.waitForRows([{ tableName: "T1" }]);
  const live = env.KDB.state.tableData.T1;
  const entry = env.service.readTableState([{ tableName: "T1" }]);
  assert.notStrictEqual(entry, live);
  assert.equal(Object.isFrozen(entry), true);
  assert.deepEqual(noLastLoaded(entry), noLastLoaded(live));
  assert.throws(() => { entry.lifecycle = "error"; }, TypeError);
  assert.notStrictEqual(entry.pick, live.pick);
  entry.pick.push("x");
  assert.deepEqual(live.pick, ["display", "use"]);
  assert.strictEqual(entry.sourceRows, live.sourceRows);
  const pending = env.service.reloadTable([{ tableName: "T1" }]);
  assert.equal(entry.lifecycle, "ready", "an earlier read does not follow the state");
  assert.equal(env.service.readTableState([{ tableName: "T1" }]).lifecycle, "loading");
  await pending;
});

test("readTableState without input returns a frozen map of frozen copies", async () => {
  const env = makeEnv();
  await env.service.waitForRows([{ tableName: "T1" }]);
  const whole = env.service.readTableState();
  assert.notStrictEqual(whole, env.KDB.state.tableData);
  assert.deepEqual(Object.keys(whole), Object.keys(env.KDB.state.tableData));
  assert.equal(Object.isFrozen(whole), true);
  assert.equal(Object.isFrozen(whole.T1), true);
  assert.notStrictEqual(whole.T1, env.KDB.state.tableData.T1);
  assert.equal(whole.T1.lifecycle, "ready");
  assert.deepEqual(env.service.readTableState(null), whole);
});

function holdQuery() {
  const held = { release: null };
  held.query = () => new Promise((resolve) => { held.release = () => resolve({ ok: true, data: SAMPLE }); });
  return held;
}

test("waitForRows(signal): an aborted signal rejects with AbortError before anything starts", async () => {
  const env = makeEnv();
  const controller = new AbortController();
  controller.abort();
  const error = await env.service.waitForRows([{ tableName: "T1" }], { signal: controller.signal }).then(() => null, (e) => e);
  assert.equal(error && error.name, "AbortError");
  await settle();
  assert.deepEqual(env.queries, []);
  assert.equal(env.KDB.state.tableData.T1, undefined);
});

test("waitForRows(signal): aborting ends the wait only; the shared load finishes for other callers", async () => {
  const held = holdQuery();
  const env = makeEnv({ query: held.query });
  const controller = new AbortController();
  const waiting = env.service.waitForRows([{ tableName: "T1" }], { signal: controller.signal });
  const other = env.service.waitForRows([{ tableName: "T1" }]);
  await settle();
  assert.equal(env.queries.length, 1, "both waits share one load");
  controller.abort();
  const error = await waiting.then(() => null, (e) => e);
  assert.equal(error && error.name, "AbortError");
  held.release();
  assert.deepEqual(await other, SHAPED);
  assert.equal(env.service.readTableState([{ tableName: "T1" }]).lifecycle, "ready");
});

test("waitForRows(signal): a signal that never aborts changes nothing and leaves no listener behind", async () => {
  const env = makeEnv();
  const listeners = { added: 0, removed: 0 };
  const signal = {
    aborted: false,
    addEventListener: () => { listeners.added += 1; },
    removeEventListener: () => { listeners.removed += 1; }
  };
  assert.deepEqual(await env.service.waitForRows([{ tableName: "T1" }], { signal }), SHAPED);
  assert.deepEqual(listeners, { added: 1, removed: 1 });
  assert.deepEqual(await env.service.waitForRows([{ tableName: "T1" }], {}), SHAPED);
  assert.deepEqual(await env.service.waitForRows([{ tableName: "T1" }], { signal: { aborted: false } }), SHAPED);
});

test("labels: registered on config.labels.de.tableData, existing values win, the toast reads them", async () => {
  const env = makeEnv();
  assert.deepEqual({ ...env.KDB.config.labels.de.tableData }, { loadFailedToast: TOAST_TEXT, unknownTable: UNKNOWN_TABLE_TEXT });
  const custom = makeEnv({
    config: { labels: { de: { tableData: { loadFailedToast: "Eigener Text: " } } } },
    query: () => ({ ok: false, errorCode: "E1" })
  });
  assert.deepEqual({ ...custom.KDB.config.labels.de.tableData }, { loadFailedToast: "Eigener Text: ", unknownTable: UNKNOWN_TABLE_TEXT });
  await assert.rejects(custom.service.reloadTable([{ tableName: "T1" }]), /E1/);
  assert.deepEqual(custom.toasts, [{ severity: "error", message: "Eigener Text: Tabelle 1" }]);
});
