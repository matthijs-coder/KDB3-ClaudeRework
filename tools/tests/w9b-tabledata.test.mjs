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

test("readTableState hands out the live entry of the state (identity), the no-input form the live state", async () => {
  const env = makeEnv();
  await env.service.waitForRows([{ tableName: "T1" }]);
  const entry = env.service.readTableState([{ tableName: "T1" }]);
  assert.strictEqual(entry, env.KDB.state.tableData.T1);
  assert.strictEqual(env.service.readTableState(), env.KDB.state.tableData);
});
