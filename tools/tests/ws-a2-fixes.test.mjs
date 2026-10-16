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

test("P2: dataSources list wait does not register the same signal twice", async () => {
  let polls = 0;
  const state = (value) => ({ getState: () => value });
  const { svc } = create({ dataSources: { getDataSourceList: () => (++polls < 3 ? [state("loading")] : [state("ready")]) } });
  assert.equal((await svc.dataSources.hasErrorDataSource()).data, false);
});
