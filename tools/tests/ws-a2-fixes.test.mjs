// Tests for the confirmed fixes of WS-A2: P1 (subscription pruning), P2 (abort listener leaks), P3 (dataQuery back-off).
// Run: node --test tools/tests/ws-a2-fixes.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { create, countingSignal } from "./ws-a2-helpers.mjs";

function uiStateHost() {
  const host = {
    listeners: [],
    removed: 0,
    getCurrentDashboardUiState: () => ({ authoring: false }),
    onDashboardUiStateChange(listener) {
      host.listeners.push(listener);
      return { remove() { host.removed += 1; host.listeners.splice(host.listeners.indexOf(listener), 1); } };
    }
  };
  return host;
}

test("P1: subscribeUiState unsubscribe prunes runtime.subscriptions (no growth on re-subscribe)", () => {
  const host = uiStateHost();
  const { svc, _KDB } = create({ dashboard: host });
  const baseline = _KDB.runtime.cognosHostService.subscriptions.length;
  for (let round = 0; round < 5; round += 1) {
    const unsubscribe = svc.dashboard.subscribeUiState(() => {});
    assert.equal(_KDB.runtime.cognosHostService.subscriptions.length, baseline + 1);
    unsubscribe();
    unsubscribe();
    assert.equal(_KDB.runtime.cognosHostService.subscriptions.length, baseline);
  }
  assert.equal(host.removed, 5);
});

test("P1: destroy still releases every live subscription", () => {
  const host = uiStateHost();
  const { svc, _KDB } = create({ dashboard: host });
  svc.dashboard.subscribeUiState(() => {});
  const second = svc.dashboard.subscribeUiState(() => {});
  svc.dashboard.subscribeUiState(() => {});
  second();
  assert.equal(_KDB.runtime.cognosHostService.subscriptions.length, 2);
  svc.destroy();
  assert.equal(host.removed, 3);
  assert.equal(host.listeners.length, 0);
  assert.deepEqual(_KDB.runtime.cognosHostService.subscriptions, []);
});

test("P2: filters.waitForPageContextReady leaves no abort listener on the caller signal", async () => {
  const { svc } = create({ filters: { getAllPageContextFilterItems: () => [] } });
  const { signal, counts } = countingSignal();
  await svc.filters.waitForPageContextReady({ scopeIds: ["tab1"], intervalMs: 3, budgetMs: 1000, maxAttempts: 4, signal });
  assert.ok(counts.added >= 3);
  assert.equal(counts.added, counts.removed);
});

test("P2: dataQuery wait leaves no abort listener on the caller signal", async () => {
  let calls = 0;
  const empty = { getResultItemList: () => [] };
  const full = { getResultItemList: () => [{}], getRowCount: () => 0 };
  const { svc } = create({ dataQuery: { getDataQueryResult: async () => (++calls < 4 ? empty : full) } });
  const { signal, counts } = countingSignal();
  const outcome = await svc.dataQuery.waitForQueryResult("w1", { intervalMs: 3, signal });
  assert.equal(outcome.ok, true);
  assert.ok(counts.added >= 3);
  assert.equal(counts.added, counts.removed);
});

test("P2: dataSources list wait balances abort listeners on its internal controller", async () => {
  const counts = { added: 0, removed: 0 };
  class CountingAbortController extends AbortController {
    constructor() {
      super();
      const add = this.signal.addEventListener.bind(this.signal);
      const remove = this.signal.removeEventListener.bind(this.signal);
      this.signal.addEventListener = (type, ...rest) => { if (type === "abort") counts.added += 1; return add(type, ...rest); };
      this.signal.removeEventListener = (type, ...rest) => { if (type === "abort") counts.removed += 1; return remove(type, ...rest); };
    }
  }
  let polls = 0;
  const state = (value) => ({ getState: () => value });
  const { svc } = create(
    { dataSources: { getDataSourceList: () => (++polls < 4 ? [state("loading")] : [state("ready")]) } },
    { AbortController: CountingAbortController }
  );
  assert.equal((await svc.dataSources.hasErrorDataSource()).data, false);
  assert.ok(counts.added >= 3, "one listener per sleep, not two: " + counts.added);
  assert.equal(counts.added, counts.removed, "every added listener is removed after its sleep");
});

test("clearRuntime releases every subscription even when each unsubscribe prunes itself (iterates a copy)", () => {
  const { svc, _KDB } = create({});
  const subscriptions = _KDB.runtime.cognosHostService.subscriptions;
  let released = 0;
  for (let n = 0; n < 4; n += 1) {
    const unsubscribe = () => {
      released += 1;
      const at = subscriptions.indexOf(unsubscribe);
      if (at !== -1) subscriptions.splice(at, 1);
    };
    subscriptions.push(unsubscribe);
  }
  svc.destroy();
  assert.equal(released, 4);
  assert.deepEqual(_KDB.runtime.cognosHostService.subscriptions, []);
});

test("clearFilter and writeFilter keep their distinct failure log texts", async () => {
  const logged = [];
  const saved = console.error;
  console.error = (...args) => logged.push(args[0]);
  try {
    const item = { id: "p1", getScope: () => "tab1" };
    const api = {
      getFilterItemId: (i) => i.id, getFilterItemLabel: (i) => i.id, getFilterSourceId: () => "", getFilterValues: () => [],
      getAllPageContextFilterItems: () => [item],
      replaceFilterContext: () => { throw new Error("w"); },
      clearPageContextFilter: () => { throw new Error("c"); }
    };
    const { svc } = create({ filters: api });
    await svc.filters.writeFilter({ ref: { itemId: "p1", scopeId: "tab1" }, values: [] });
    await svc.filters.clearFilter({ itemId: "p1", scopeId: "tab1" });
  } finally {
    console.error = saved;
  }
  assert.deepEqual(logged, ["[cognosHost.filters.writeFilter] host write failed", "[cognosHost.filters.clearFilter] host clear failed"]);
});

test("P3: dataQuery poll interval backs off x1.25 and is capped at max(intervalMs, 1000)", async () => {
  const stamps = [];
  const empty = { getResultItemList: () => [] };
  const { svc } = create({ dataQuery: { getDataQueryResult: async () => { stamps.push(Date.now()); return empty; } } });
  await svc.dataQuery.waitForQueryResult("w1", { intervalMs: 20, budgetMs: 400 });
  const gaps = stamps.slice(1).map((stamp, index) => stamp - stamps[index]);
  assert.ok(gaps.length >= 4, "enough polls: " + gaps.length);
  assert.ok(gaps[gaps.length - 1] > gaps[0] + 10, "later gaps are longer: " + gaps.join(","));
  assert.ok(gaps[gaps.length - 1] < 800, "far below the 1000 ms cap within 400 ms");
});

test("P3: a caller-set interval above the cap is not shortened", async () => {
  const stamps = [];
  const empty = { getResultItemList: () => [] };
  const { svc } = create({ dataQuery: { getDataQueryResult: async () => { stamps.push(Date.now()); return empty; } } });
  const outcome = await svc.dataQuery.waitForQueryResult("w1", { intervalMs: 1500, budgetMs: 1200 });
  assert.equal(outcome.errorCode, "DATAQUERY_WAIT_TIMEOUT");
  assert.equal(stamps.length, 2);
  assert.ok(stamps[1] - stamps[0] >= 1450, "interval above the cap is not shortened");
});
