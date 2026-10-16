// Golden test: cognosHost filters facet behaviour through the public service (stub _KDB.cognosAPI.filters).
// Run: node --test tools/tests/ws-a2-filters.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { create, quiet, ok } from "./ws-a2-helpers.mjs";

function item(id, label, scope, values = []) {
  return { id, label, scope, values, getScope() { return this.scope; } };
}

function filtersApi(overrides = {}) {
  const calls = { replace: [], clear: [], globalReads: 0, pageReads: 0 };
  const state = { global: [], page: [] };
  const api = {
    getFilterItemId: (i) => i.id,
    getFilterItemLabel: (i) => i.label,
    getFilterSourceId: (i) => "src-" + i.id,
    getFilterValues: (i) => i.values,
    getAllGlobalFilterItems: () => { calls.globalReads += 1; return state.global; },
    getAllPageContextFilterItems: () => { calls.pageReads += 1; return state.page; },
    replaceFilterContext: (handle, values) => { calls.replace.push([handle.id, values]); handle.values = values; },
    clearPageContextFilter: (handle) => { calls.clear.push(handle.id); handle.values = []; },
    ...overrides
  };
  return { api, state, calls };
}

function setup(overrides) {
  const host = filtersApi(overrides);
  const { _KDB, svc } = create({ filters: host.api });
  return { ...host, _KDB, svc, filters: svc.filters };
}

test("listFilterItems: global and page-context partitions, descriptor shape, includeValues copy", () => {
  const { filters, state } = setup();
  state.global.push(item("g1", "Jahr", "global", ["2024"]));
  state.page.push(item("p1", "Jahr", "tab1_tabpanel", ["2023"]), item("p2", "Amt", "tab2", ["x"]));
  const globalOutcome = filters.listFilterItems({ scopeId: "global" });
  assert.deepEqual(globalOutcome, ok([
    { itemId: "g1", itemName: "Jahr", sourceId: "src-g1", scopeType: "global", scopeId: "global", rawScopeId: "global" }
  ]));
  const pageOutcome = filters.listFilterItems({ scopeId: "tab1", includeValues: true });
  assert.deepEqual(pageOutcome, ok([
    { itemId: "p1", itemName: "Jahr", sourceId: "src-p1", scopeType: "pageContext", scopeId: "tab1", rawScopeId: "tab1_tabpanel", values: ["2023"] }
  ]));
  pageOutcome.data[0].values.push("mutated");
  assert.deepEqual(filters.listFilterItems({ scopeId: "tab1", includeValues: true }).data[0].values, ["2023"]);
  assert.equal(filters.listFilterItems({ scopeId: "unknown" }).data.length, 0);
  assert.equal(filters.listFilterItems({ allPageContextScopes: true }).data.length, 2);
  assert.equal(filters.listFilterItems({}).data.length, 0, "missing scopeId matches nothing in the page partition");
});

test("listFilterItems: page items fall back to getPageContextItemsArr and drop global scope", () => {
  const { filters, state } = setup({ getAllPageContextFilterItems: undefined, getPageContextItemsArr: (flag) => state.page });
  state.page.push(item("p1", "A", "tab1"), item("g", "G", "global"));
  assert.deepEqual(filters.listFilterItems({ allPageContextScopes: true }).data.map((d) => d.itemId), ["p1"]);
});

test("listFilterItems: broken item gives a degraded Outcome with a diagnostic, others stay", () => {
  const { filters, state } = setup();
  state.page.push(item("p1", "A", "tab1"), { id: "bad", getScope() { throw new Error("boom"); } });
  const outcome = filters.listFilterItems({ scopeId: "tab1" });
  assert.equal(outcome.outcome, "degraded");
  assert.deepEqual(outcome.data.map((d) => d.itemId), ["p1"]);
  assert.deepEqual(outcome.diagnostics, [{ code: "FILTERS_READ_FAILED", message: "host item 1 could not be read: boom" }]);
});

test("listFilterItems: capability and host failures", quiet(async () => {
  const noGlobal = setup({ getAllGlobalFilterItems: undefined });
  assert.deepEqual(noGlobal.filters.listFilterItems({ scopeId: "global" }), { ok: false, outcome: "failed", errorCode: "FILTERS_HOST_CAPABILITY_MISSING", diagnostics: [] });
  const throwing = setup({ getAllPageContextFilterItems: () => { throw new Error("x"); } });
  assert.equal(throwing.filters.listFilterItems({ scopeId: "t" }).errorCode, "FILTERS_INVENTORY_FAILED");
  const noPage = setup({ getAllPageContextFilterItems: undefined });
  assert.equal(noPage.filters.listFilterItems({ scopeId: "t" }).errorCode, "FILTERS_HOST_CAPABILITY_MISSING");
}));

test("findFilterItem: by id, by name, not found is ok(null), invalid ref fails", () => {
  const { filters, state } = setup();
  state.page.push(item("p1", "Jahr", "tab1_tabpanel"));
  const expected = { itemId: "p1", itemName: "Jahr", sourceId: "src-p1", scopeType: "pageContext", scopeId: "tab1", rawScopeId: "tab1_tabpanel" };
  assert.deepEqual(filters.findFilterItem({ itemId: "p1", scopeId: "tab1" }), ok(expected));
  assert.deepEqual(filters.findFilterItem({ itemName: "Jahr", scopeId: "tab1" }), ok(expected));
  assert.deepEqual(filters.findFilterItem({ itemName: "Nope", scopeId: "tab1" }), ok(null));
  assert.deepEqual(filters.findFilterItem({}), { ok: false, outcome: "failed", errorCode: "FILTERS_INVALID_REF", diagnostics: [] });
  assert.equal(filters.findFilterItem(null).errorCode, "FILTERS_INVALID_REF");
});

test("findFilterItem: a cached entry does not re-read the host; a miss re-reads exactly once", () => {
  const { filters, state, calls } = setup();
  state.page.push(item("p1", "Jahr", "tab1"));
  filters.findFilterItem({ itemId: "p1", scopeId: "tab1" });
  assert.equal(calls.pageReads, 1);
  filters.findFilterItem({ itemId: "p1", scopeId: "tab1" });
  assert.equal(calls.pageReads, 1);
  filters.findFilterItem({ itemId: "missing", scopeId: "tab1" });
  assert.equal(calls.pageReads, 2);
});

test("readFilterValues: reads live values from the handle", () => {
  const { filters, state } = setup();
  const p1 = item("p1", "Jahr", "tab1", ["a"]);
  state.page.push(p1);
  assert.deepEqual(filters.readFilterValues({ itemId: "p1", scopeId: "tab1" }), ok(["a"]));
  p1.values = ["b", "c"];
  assert.deepEqual(filters.readFilterValues({ itemId: "p1", scopeId: "tab1" }), ok(["b", "c"]));
  assert.equal(filters.readFilterValues({ itemId: "zz", scopeId: "tab1" }).errorCode, "FILTERS_ITEM_NOT_FOUND");
});

test("readFilterValues: missing capability and thrown host error", quiet(async () => {
  const { filters, state } = setup({ getFilterValues: undefined });
  state.page.push(item("p1", "Jahr", "tab1"));
  assert.equal(filters.readFilterValues({ itemId: "p1", scopeId: "tab1" }).errorCode, "FILTERS_HOST_CAPABILITY_MISSING");
  const thrower = setup({ getFilterValues: (i) => { if (i.id === "p1" && thrower.state.page[0].armed) throw new Error("late"); return []; } });
  thrower.state.page.push(item("p1", "Jahr", "tab1"));
  thrower.filters.listFilterItems({ scopeId: "tab1" });
  thrower.state.page[0].armed = true;
  const outcome = thrower.filters.readFilterValues({ itemId: "p1", scopeId: "tab1" });
  assert.equal(outcome.errorCode, "FILTERS_READ_FAILED");
  assert.deepEqual(outcome.diagnostics, [{ code: "FILTERS_READ_FAILED", message: "late" }]);
}));

test("listPageContextScopes: raw scopes, exact name match, de-duplicated", () => {
  const { filters, state } = setup();
  state.page.push(item("1", "Amt", "tab1_tabpanel"), item("2", "Amt", "tab1_tabpanel"), item("3", "Amt", "tab2"), item("4", "amt", "tab3"));
  assert.deepEqual(filters.listPageContextScopes({ itemName: "Amt" }), ok(["tab1_tabpanel", "tab2"]));
  assert.equal(filters.listPageContextScopes({ itemName: "" }).errorCode, "FILTERS_INVALID_REF");
  assert.equal(filters.listPageContextScopes().errorCode, "FILTERS_INVALID_REF");
});

test("writeFilter: replaces with values, invalidates the index entry, returns ok()", async () => {
  const { filters, state, calls } = setup();
  state.page.push(item("p1", "Jahr", "tab1"));
  const outcome = await filters.writeFilter({ ref: { itemId: "p1", scopeId: "tab1" }, values: ["x"] });
  assert.deepEqual(outcome, { ok: true, outcome: "ok", data: undefined });
  assert.deepEqual(calls.replace, [["p1", ["x"]]]);
  assert.equal(calls.pageReads, 1);
  await filters.writeFilter({ ref: { itemId: "p1", scopeId: "tab1" } });
  assert.deepEqual(calls.replace[1], ["p1", []]);
  assert.equal(calls.pageReads, 2, "invalidated entry forces a fresh inventory");
});

test("clearFilter: host clear, ITEM_NOT_FOUND, capability missing", async () => {
  const { filters, state, calls } = setup();
  state.page.push(item("p1", "Jahr", "tab1", ["v"]));
  assert.equal((await filters.clearFilter({ itemId: "p1", scopeId: "tab1" })).ok, true);
  assert.deepEqual(calls.clear, ["p1"]);
  assert.equal((await filters.clearFilter({ itemId: "nope", scopeId: "tab1" })).errorCode, "FILTERS_ITEM_NOT_FOUND");
  const missing = setup({ clearPageContextFilter: undefined, replaceFilterContext: undefined });
  missing.state.page.push(item("p1", "Jahr", "tab1"));
  assert.equal((await missing.filters.clearFilter({ itemId: "p1", scopeId: "tab1" })).errorCode, "FILTERS_HOST_CAPABILITY_MISSING");
  assert.equal((await missing.filters.writeFilter({ ref: { itemId: "p1", scopeId: "tab1" }, values: [] })).errorCode, "FILTERS_HOST_CAPABILITY_MISSING");
});

test("write: host error becomes WRITE_FAILED, abort before and after the effect", quiet(async () => {
  const failing = setup({ replaceFilterContext: () => { throw new Error("denied"); } });
  failing.state.page.push(item("p1", "Jahr", "tab1"));
  const outcome = await failing.filters.writeFilter({ ref: { itemId: "p1", scopeId: "tab1" }, values: [] });
  assert.equal(outcome.errorCode, "FILTERS_WRITE_FAILED");
  assert.deepEqual(outcome.diagnostics, [{ code: "FILTERS_WRITE_FAILED", message: "denied" }]);

  const { filters, state, calls } = setup();
  state.page.push(item("p1", "Jahr", "tab1"));
  const pre = new AbortController();
  pre.abort();
  assert.deepEqual(await filters.writeFilter({ ref: { itemId: "p1", scopeId: "tab1" }, values: [] }, { signal: pre.signal }), { ok: false, outcome: "aborted", reason: "aborted" });
  assert.deepEqual(await filters.clearFilter({ itemId: "p1", scopeId: "tab1" }, { signal: pre.signal }), { ok: false, outcome: "aborted", reason: "aborted" });
  assert.equal(calls.replace.length, 0);

  const mid = new AbortController();
  const slow = setup({ replaceFilterContext: async () => { mid.abort(); } });
  slow.state.page.push(item("p1", "Jahr", "tab1"));
  assert.deepEqual(await slow.filters.writeFilter({ ref: { itemId: "p1", scopeId: "tab1" }, values: [] }, { signal: mid.signal }), { ok: false, outcome: "aborted", reason: "aborted-after-effect" });
}));

test("writes on the same filter are serialised; different filters are not", async () => {
  const order = [];
  const gates = {};
  const { filters, state } = setup({
    replaceFilterContext: (handle, values) => new Promise((resolve) => {
      order.push("start:" + handle.id + ":" + values[0]);
      gates[handle.id + ":" + values[0]] = () => { order.push("end:" + handle.id + ":" + values[0]); resolve(); };
    })
  });
  state.page.push(item("p1", "A", "tab1"), item("p2", "B", "tab1"));
  const ref1 = { itemId: "p1", scopeId: "tab1" };
  const first = filters.writeFilter({ ref: ref1, values: ["1"] });
  const second = filters.writeFilter({ ref: ref1, values: ["2"] });
  const other = filters.writeFilter({ ref: { itemId: "p2", scopeId: "tab1" }, values: ["3"] });
  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(order, ["start:p1:1", "start:p2:3"]);
  gates["p1:1"]();
  await first;
  await new Promise((r) => setTimeout(r, 10));
  assert.deepEqual(order.slice(2), ["end:p1:1", "start:p1:2"]);
  gates["p1:2"]();
  gates["p2:3"]();
  await Promise.all([second, other]);
  assert.deepEqual(state.page.length, 2);
});

test("disposed facet answers with the disposed Outcome", async () => {
  const { svc, filters } = setup();
  svc.destroy();
  const disposed = { ok: false, outcome: "aborted", reason: "disposed" };
  assert.deepEqual(filters.listFilterItems({}), disposed);
  assert.deepEqual(filters.findFilterItem({ itemId: "x" }), disposed);
  assert.deepEqual(filters.readFilterValues({ itemId: "x" }), disposed);
  assert.deepEqual(filters.listPageContextScopes({ itemName: "x" }), disposed);
  assert.deepEqual(await filters.writeFilter({}), disposed);
  assert.deepEqual(await filters.clearFilter({}), disposed);
  assert.deepEqual(await filters.waitForPageContextReady({ scopeIds: ["a"] }), disposed);
});

function pageApi(scopes) {
  const state = { scopes, reads: 0 };
  const api = {
    getAllPageContextFilterItems: () => { state.reads += 1; return state.scopes.slice(); }
  };
  return { api, state };
}

test("waitForPageContextReady: ready on the first probe", async () => {
  const { api, state } = pageApi([item("1", "A", "tab1_tabpanel")]);
  const { svc } = create({ filters: api });
  assert.deepEqual(await svc.filters.waitForPageContextReady({ scopeIds: ["tab1"] }), ok({ ready: true, attempts: 1 }));
  assert.equal(state.reads, 1);
});

test("waitForPageContextReady: becomes ready on a later attempt", async () => {
  const { api, state } = pageApi([]);
  const { svc } = create({ filters: api });
  setTimeout(() => { state.scopes = [item("1", "A", "tab1")]; }, 15);
  const outcome = await svc.filters.waitForPageContextReady({ scopeIds: ["tab1"], intervalMs: 20, budgetMs: 1000 });
  assert.deepEqual(outcome, ok({ ready: true, attempts: 2 }));
});

test("waitForPageContextReady: budget exhausted is degraded WAIT_NOT_READY; maxAttempts bounds the polls", async () => {
  const { api, state } = pageApi([]);
  const { svc, _KDB } = create({ filters: api });
  const outcome = await svc.filters.waitForPageContextReady({ scopeIds: ["tab1"], intervalMs: 5, budgetMs: 1000, maxAttempts: 3 });
  assert.equal(outcome.outcome, "degraded");
  assert.deepEqual(outcome.data, { ready: false, attempts: 3 });
  assert.deepEqual(outcome.diagnostics, [{ code: "FILTERS_WAIT_NOT_READY", message: "page context did not register within budget" }]);
  assert.equal(state.reads, 3);
  assert.deepEqual(_KDB.runtime.cognosHostService.abortControllers, {}, "wait slot released");
  const timed = await svc.filters.waitForPageContextReady({ scopeIds: ["tab1"], intervalMs: 50, budgetMs: 20, maxAttempts: 10 });
  assert.equal(timed.outcome, "degraded");
  assert.ok(timed.data.attempts <= 3);
});

test("waitForPageContextReady: no scope ids, caller abort, destroy during the wait", async () => {
  const { api } = pageApi([]);
  const { svc, _KDB } = create({ filters: api });
  const none = await svc.filters.waitForPageContextReady({ scopeIds: [] });
  assert.equal(none.errorCode, "FILTERS_INVALID_REF");
  assert.deepEqual(none.diagnostics, [{ code: "FILTERS_INVALID_REF", message: "no scope ids requested" }]);

  const controller = new AbortController();
  const pending = svc.filters.waitForPageContextReady({ scopeIds: ["tab1"], intervalMs: 500, budgetMs: 5000, signal: controller.signal });
  setTimeout(() => controller.abort(), 10);
  assert.deepEqual(await pending, { ok: false, outcome: "aborted", reason: "aborted" });
  assert.deepEqual(_KDB.runtime.cognosHostService.abortControllers, {});

  const second = create({ filters: pageApi([]).api });
  const waiting = second.svc.filters.waitForPageContextReady({ scopeIds: ["tab1"], intervalMs: 500, budgetMs: 5000 });
  setTimeout(() => second.svc.destroy(), 10);
  assert.deepEqual(await waiting, { ok: false, outcome: "aborted", reason: "disposed" });
});
