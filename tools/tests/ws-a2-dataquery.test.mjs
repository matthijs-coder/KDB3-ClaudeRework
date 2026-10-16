// Golden test: cognosHost dataQuery facet behaviour through the public service (stub _KDB.cognosAPI.dataQuery).
// Run: node --test tools/tests/ws-a2-dataquery.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { create, quiet, ok } from "./ws-a2-helpers.mjs";

function column(label, values) {
  return { label, values, getDataItemList: () => [{ getLabel: () => label }], getRowCount: () => values.length };
}

function queryResult(columns) {
  return {
    getResultItemList: () => columns,
    getRowCount: () => (columns[0] ? columns[0].values.length : 0),
    getValue: (row, col) => columns[col].values[row]
  };
}

const EMPTY = queryResult([]);
const STRUCTURED_EMPTY = queryResult([column("Jahr", [])]);
const ROWS = queryResult([column("Jahr", [{ d: "2024", u: 2024 }, "plain"]), column("Jahr", [[{ d: "a", v: 1 }], null])]);

function setup(api) {
  const { _KDB, svc } = create({ dataQuery: api });
  return { _KDB, svc, dq: svc.dataQuery };
}

test("readQueryRows flattens rows: duplicate labels get a suffix, cell shapes normalised", async () => {
  const { dq } = setup({ getDataQueryResult: async () => ROWS });
  const outcome = await dq.readQueryRows("w1");
  assert.equal(outcome.outcome, "ok");
  assert.deepEqual(outcome.data.columnNames, ["Jahr", "Jahr_2"]);
  assert.equal(outcome.data.rowCount, 2);
  assert.deepEqual(outcome.data.columns.Jahr[0], { d: "2024", u: 2024 });
  assert.deepEqual(outcome.data.columns.Jahr[1], { d: "plain", u: "plain", value: "plain", v: "plain", label: "plain", caption: "plain", primitive: "plain" });
  assert.deepEqual(outcome.data.columns.Jahr_2[0], { d: "a", v: 1 });
  assert.deepEqual(outcome.data.columns.Jahr_2[1], { d: null, u: null });
});

test("readQueryRows on a structured but empty result: zero rows, still ok", async () => {
  const { dq } = setup({ getDataQueryResult: async () => STRUCTURED_EMPTY });
  assert.deepEqual(await dq.readQueryRows("w1"), ok({ columns: { Jahr: [] }, columnNames: ["Jahr"], rowCount: 0 }));
});

test("readQueryRows fetches the host result once (wait result is reused)", async () => {
  let fetches = 0;
  const { dq } = setup({ getDataQueryResult: async () => { fetches += 1; return ROWS; } });
  await dq.readQueryRows("w1");
  assert.equal(fetches, 1);
});

test("waitForQueryResult: resolves on the 3rd poll and reports rowCount/isEmpty", async () => {
  let calls = 0;
  const { dq } = setup({ getDataQueryResult: async () => { calls += 1; return calls < 3 ? EMPTY : STRUCTURED_EMPTY; } });
  const outcome = await dq.waitForQueryResult("w1", { intervalMs: 5 });
  assert.equal(calls, 3);
  assert.equal(outcome.outcome, "ok");
  assert.equal(outcome.data.rowCount, 0);
  assert.equal(outcome.data.isEmpty, true);
  assert.equal(outcome.data.hostResult, STRUCTURED_EMPTY);
});

test("waitForQueryResult: host errors keep polling until the budget, then DATAQUERY_WAIT_TIMEOUT", async () => {
  let calls = 0;
  const { dq, _KDB } = setup({ getDataQueryResult: async () => { calls += 1; throw new Error("not yet"); } });
  const outcome = await dq.waitForQueryResult("w1", { intervalMs: 5, budgetMs: 60 });
  assert.equal(outcome.errorCode, "DATAQUERY_WAIT_TIMEOUT");
  assert.deepEqual(outcome.diagnostics, [{ code: "DATAQUERY_WAIT_TIMEOUT", message: "not yet" }]);
  assert.ok(calls >= 2);
  assert.deepEqual(_KDB.runtime.cognosHostService.abortControllers, {});
});

test("waitForQueryResult: empty results until the budget give the generic timeout diagnostic", async () => {
  const { dq } = setup({ getDataQueryResult: async () => EMPTY });
  const outcome = await dq.waitForQueryResult("w1", { intervalMs: 5, budgetMs: 40 });
  assert.deepEqual(outcome.diagnostics, [{ code: "DATAQUERY_WAIT_TIMEOUT", message: "waitForQueryResult timed out for widget w1" }]);
});

test("waitForQueryResult: caller abort during the wait gives aborted", async () => {
  const { dq } = setup({ getDataQueryResult: async () => EMPTY });
  const controller = new AbortController();
  const pending = dq.waitForQueryResult("w1", { intervalMs: 500, signal: controller.signal });
  setTimeout(() => controller.abort(), 15);
  assert.deepEqual(await pending, { ok: false, outcome: "aborted", reason: "aborted" });
});

test("waitForQueryResult: destroy during the wait gives disposed and releases the slot", async () => {
  const { dq, svc, _KDB } = setup({ getDataQueryResult: async () => EMPTY });
  const pending = dq.waitForQueryResult("w1", { intervalMs: 500 });
  setTimeout(() => svc.destroy(), 15);
  assert.deepEqual(await pending, { ok: false, outcome: "aborted", reason: "disposed" });
  assert.deepEqual(_KDB.runtime.cognosHostService.abortControllers, {});
});

test("waitForQueryResult: missing host / capability keep waiting; abort stops", async () => {
  const { dq } = setup({});
  const outcome = await dq.waitForQueryResult("w1", { intervalMs: 5, budgetMs: 30 });
  assert.equal(outcome.errorCode, "DATAQUERY_WAIT_TIMEOUT");
});

test("readQueryRows: argument and state guards", quiet(async () => {
  const { dq, svc } = setup({ getDataQueryResult: async () => ROWS });
  assert.deepEqual(await dq.readQueryRows(""), { ok: false, outcome: "failed", errorCode: "DATAQUERY_INVALID_ID", diagnostics: [] });
  const controller = new AbortController();
  controller.abort();
  assert.deepEqual(await dq.readQueryRows("w1", { signal: controller.signal }), { ok: false, outcome: "aborted", reason: "aborted" });
  svc.destroy();
  assert.deepEqual(await dq.readQueryRows("w1"), { ok: false, outcome: "aborted", reason: "disposed" });
}));

test("readQueryRows: flatten failure and host failure codes", quiet(async () => {
  const broken = { getResultItemList: () => [column("A", [1])], getRowCount: () => 1, getValue: () => { throw new Error("cell"); } };
  const flat = setup({ getDataQueryResult: async () => broken });
  const outcome = await flat.dq.readQueryRows("w1");
  assert.equal(outcome.errorCode, "DATAQUERY_FLATTEN_FAILED");
  assert.deepEqual(outcome.diagnostics, [{ code: "DATAQUERY_FLATTEN_FAILED", message: "cell" }]);
}));

test("readQueryRows: a wait that fails is passed through unchanged", async () => {
  const { dq } = setup({ getDataQueryResult: async () => EMPTY });
  const outcome = await dq.readQueryRows("w1", { intervalMs: 5, budgetMs: 30 });
  assert.equal(outcome.errorCode, "DATAQUERY_WAIT_TIMEOUT");
});

test("peekQueryRows: sync rows, null for empty/missing/promise, guards and failures", quiet(async () => {
  assert.deepEqual(setup({ peekCurrentQueryResult: () => STRUCTURED_EMPTY }).dq.peekQueryRows("w1"), ok({ columns: { Jahr: [] }, columnNames: ["Jahr"], rowCount: 0 }));
  assert.equal(setup({ peekCurrentQueryResult: () => ROWS }).dq.peekQueryRows("w1").data.rowCount, 2);
  assert.deepEqual(setup({ peekCurrentQueryResult: () => null }).dq.peekQueryRows("w1"), ok(null));
  assert.deepEqual(setup({ peekCurrentQueryResult: () => EMPTY }).dq.peekQueryRows("w1"), ok(null));
  assert.deepEqual(setup({ peekCurrentQueryResult: () => Promise.resolve(ROWS) }).dq.peekQueryRows("w1"), ok(null));
  assert.equal(setup({}).dq.peekQueryRows("w1").errorCode, "DATAQUERY_HOST_CAPABILITY_MISSING");
  assert.equal(setup({}).dq.peekQueryRows("").errorCode, "DATAQUERY_INVALID_ID");
  assert.equal(setup({ peekCurrentQueryResult: () => { throw new Error("p"); } }).dq.peekQueryRows("w1").errorCode, "DATAQUERY_READ_FAILED");
  const broken = { getResultItemList: () => [column("A", [1])], getRowCount: () => 1, getValue: () => { throw new Error("c"); } };
  assert.equal(setup({ peekCurrentQueryResult: () => broken }).dq.peekQueryRows("w1").errorCode, "DATAQUERY_FLATTEN_FAILED");
}));

test("flatten: column names fall back to col_<n> and tolerate a failing data item list", () => {
  const unlabelled = { getResultItemList: () => [{ getDataItemList: () => { throw new Error("x"); }, getRowCount: () => 1 }, { getRowCount: () => 1 }], getRowCount: () => 1, getValue: (r, c) => c };
  const { dq } = setup({ peekCurrentQueryResult: () => unlabelled });
  const outcome = dq.peekQueryRows("w1");
  assert.deepEqual(outcome.data.columnNames, ["col_0", "col_1"]);
});
