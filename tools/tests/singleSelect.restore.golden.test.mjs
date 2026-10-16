// Golden tests for singleSelect restore/ (parameterSet run bookkeeping, clear, restore, resync) and tabMutation/.
// Run: node --test tools/tests/singleSelect.restore.golden.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const SS = path.join(JS_ROOT, "dashboard/filters/singleSelect");
const logged = [];
const quietConsole = {
  log() {}, info() {}, debug() {},
  warn(...a) { logged.push(["warn", ...a]); },
  error(...a) { logged.push(["error", ...a]); }
};
const reconcileStub = {
  calls: [],
  impl: async () => ({ ok: true, diagnostics: [] })
};
const reconcileModule = {
  reconcileFilterInstances: (...args) => {
    reconcileStub.calls.push(args[2]);
    return reconcileStub.impl(...args);
  }
};

const tabsSelectorsStub = {
  readTabScopeMatch(KDB, scopeId, targets) {
    const hit = Object.keys(targets || {}).filter((idx) => targets[idx].scopeId === scopeId)[0];
    return hit === undefined ? { status: "missing" } : { status: "ok", evidence: "liveScope", tab: { tabIdx: Number(hit) } };
  }
};

function load(rel) {
  return loadAmd(path.join(SS, rel), {
    stubs: { console: quietConsole },
    modules: {
      "../../inventory/reconcile.js": reconcileModule,
      "../inventory/reconcile.js": reconcileModule,
      "../../../../tabs/state/selectors.js": tabsSelectorsStub,
      "../../../tabs/state/selectors.js": tabsSelectorsStub
    }
  });
}

function adapter() {
  const runs = load("restore/runs.js");
  const guard = load("tabMutation/guard.js");
  return {
    runs: runs,
    guards: load("restore/generationGuards.js"),
    handleRunFinished: (KDB, rtime, payload) => runs.handleParameterSetRunFinished(KDB, rtime, payload),
    handleClear: load("restore/clear.js").handleParameterSetClear,
    handleRestore: load("restore/restore.js").handleParameterSetRestore,
    handleResync: load("restore/resync.js").handleParameterSetResync,
    resolveRestorePair: load("restore/applySelection.js").resolveRestoreSelectionPair,
    transfers: load("tabMutation/transfers.js").buildTabMutationTransfers,
    tabGuard: {
      guardRun: guard.guardRun, isStaleRun: guard.isStaleRun, resolveScope: guard.resolveScope,
      instancesInScope: guard.instancesInScope, matchTarget: guard.matchTarget,
      cloneSnapshotRecord: guard.cloneSnapshotRecord, matchSnapshotTarget: guard.matchSnapshotTarget
    },
    prepare: load("tabMutation/prepare.js").prepareTabMutation,
    apply: load("tabMutation/apply.js").applyTabMutation,
    restoreSnapshot: load("tabMutation/restore.js").restoreTabMutationSnapshot,
    resyncHost: load("tabMutation/resync.js").resyncTabMutationHost
  };
}

const A = adapter();

function sel(displayValue, useValue, displaySource) {
  return { displayValue: displayValue, useValue: useValue, displaySource: displaySource || "cognos" };
}

function instance(id, over) {
  return Object.assign({
    filterInstanceId: id,
    selectionOwner: "singleSelect",
    status: "active",
    hostStatus: "present",
    scopeType: "pageContext",
    scopeId: "s1",
    filterType: "singleSelect",
    filterLabel: "Geschlecht",
    itemName: "Geschlecht",
    itemId: "g1",
    semanticInstanceKey: "",
    currentSelection: sel("Alle", "", "policy"),
    backupSelection: sel("Alle", "", "policy"),
    pendingSelection: { displayValue: "Alle" }
  }, over || {});
}

function refKey(ref) { return (ref.scopeId || "") + "|" + (ref.itemId || ref.itemName || ""); }

function multiFacet(initial, opts) {
  const o = opts || {};
  const facet = {
    byRef: Object.assign({}, initial || {}),
    writes: [],
    readFilterValues(ref) {
      return { ok: true, data: (facet.byRef[refKey(ref)] || []).slice() };
    },
    async writeFilter(req) {
      facet.writes.push({ key: refKey(req.ref), values: req.values.slice() });
      if (o.throwOn && o.throwOn === refKey(req.ref)) { throw new Error("write boom"); }
      if (o.failOn && o.failOn === refKey(req.ref)) { return { ok: false }; }
      facet.byRef[refKey(req.ref)] = req.values.slice();
      return { ok: true };
    }
  };
  return facet;
}

function makeKDB(instances, facet, extra) {
  const byId = {};
  (instances || []).forEach((rec) => { byId[rec.filterInstanceId] = rec; });
  const KDB = {
    state: { filters: { singleSelect: { instancesById: byId, inventory: { generation: 4, freshness: "fresh" } } } },
    runtime: { singleSelect: { filtersFacet: facet || null, pendingPromises: {} } }
  };
  return Object.assign(KDB, extra || {});
}

function codes(result) {
  return (result.diagnostics || []).map((d) => d.code);
}

// ---------------------------------------------------------------- restore/runs

test("guardRun: numeric runId, stale, newer run resets the registry", () => {
  const KDB = makeKDB([]);
  const rtime = KDB.runtime.singleSelect;
  const bad = A.runs.guardRun(KDB, { runId: "x" });
  assert.deepEqual(bad, {
    ok: false, degraded: false, applied: [], skipped: [],
    diagnostics: [{ code: "WRITEBACK_RESTORE_CANCELLED", message: "singleSelect parameterSet action requires a numeric runId" }]
  });
  assert.equal(A.runs.guardRun(KDB, {}).ok, false);
  assert.equal(A.runs.guardRun(KDB, { runId: NaN }).ok, false);
  assert.equal(A.runs.guardRun(KDB, { runId: 3 }), null);
  assert.equal(rtime.parameterSetRunId, 3);
  A.runs.registerAppliedPageContext(KDB, 3, "a", { key: "k" });
  assert.equal(A.runs.guardRun(KDB, { runId: 3 }), null);
  assert.deepEqual(A.runs.readAppliedPageContext(KDB, 3), { a: { key: "k" } });
  const stale = A.runs.guardRun(KDB, { runId: 2 });
  assert.equal(stale.diagnostics[0].message, "stale parameterSet runId 2 superseded by 3");
  assert.equal(rtime.parameterSetRunId, 3);
  assert.equal(A.runs.guardRun(KDB, { runId: 4 }), null);
  assert.equal(rtime.parameterSetRunId, 4);
  assert.deepEqual(rtime.pendingPromises.parameterSetRuns, {});
  assert.equal(A.runs.readAppliedPageContext(KDB, 3), null);
  assert.equal(A.runs.isStale(KDB, 3), true);
  assert.equal(A.runs.isStale(KDB, 4), false);
  assert.equal(A.runs.cancelledResult().diagnostics[0].message, "singleSelect parameterSet run was cancelled or superseded");
});

test("validateInventoryGeneration pins the first generation of a run", () => {
  const KDB = makeKDB([]);
  const v = A.runs.validateInventoryGeneration;
  assert.equal(v(KDB, 1, 5, 4), false);
  assert.equal(v(KDB, 1, 4, 4), true);
  assert.equal(A.runs.ensureRunRegistry(KDB, 1).inventoryGeneration, 4);
  assert.equal(v(KDB, 1, 5, 4), false);
  assert.equal(v(KDB, 1, undefined, 9), true);
  assert.equal(v(KDB, 2, undefined, 7), true);
  assert.equal(A.runs.ensureRunRegistry(KDB, 2).inventoryGeneration, 7);
});

test("normalizeResult, release acks, settleParameterSetRun, mergeTerminalCleanup", () => {
  assert.deepEqual(A.runs.normalizeResult(null), { ok: false, degraded: false, applied: [], skipped: [], diagnostics: [] });
  const src = { ok: true, degraded: true, applied: [1], skipped: [2], diagnostics: [3] };
  const out = A.runs.normalizeResult(src);
  assert.deepEqual(out, src);
  assert.notEqual(out.applied, src.applied);
  assert.deepEqual(A.runs.buildRunReleaseAck(true, 5, true, false, [1]),
    { ok: true, runId: 5, released: true, alreadyReleased: false, diagnostics: [1] });
  assert.deepEqual(A.runs.buildRunReleaseAck(0, 5, 0, 0, null),
    { ok: false, runId: 5, released: false, alreadyReleased: false, diagnostics: [] });
  const KDB = makeKDB([]);
  A.runs.ensureRunRegistry(KDB, 7);
  assert.deepEqual(A.runs.settleParameterSetRun(KDB, 7),
    { ok: true, runId: 7, released: true, alreadyReleased: false, diagnostics: [] });
  const again = A.runs.settleParameterSetRun(KDB, 7);
  assert.equal(again.alreadyReleased, true);
  assert.deepEqual(codes(again), ["SINGLE_SELECT_PARAMETER_SET_RUN_ALREADY_RELEASED"]);
  assert.deepEqual(A.runs.settleParameterSetRun(KDB, 7, { reportAlreadyReleased: false }).diagnostics, []);
  A.runs.ensureRunRegistry(KDB, 8);
  const merged = A.runs.mergeTerminalCleanup(KDB, { runId: 8 }, { ok: false, diagnostics: [{ code: "X" }] }, { reportAlreadyReleased: false });
  assert.deepEqual(merged, { ok: false, degraded: false, applied: [], skipped: [], diagnostics: [{ code: "X" }] });
  const dup = A.runs.mergeTerminalCleanup(KDB, { runId: 8 }, { ok: true }, {});
  assert.equal(dup.ok, true);
  assert.equal(dup.degraded, true);
  assert.deepEqual(codes(dup), ["SINGLE_SELECT_PARAMETER_SET_RUN_ALREADY_RELEASED"]);
  assert.deepEqual(A.runs.mergeTerminalCleanup(KDB, { runId: "n" }, { ok: true }, {}),
    { ok: true, degraded: false, applied: [], skipped: [], diagnostics: [] });
  assert.equal(A.runs.isRunFinishOutcome("success"), true);
  assert.equal(A.runs.isRunFinishOutcome("abortedByOwner"), true);
  assert.equal(A.runs.isRunFinishOutcome("nope"), false);
  assert.equal(A.runs.isRunFinishOutcome(null), false);
});

test("handleParameterSetRunFinished validation matrix", async () => {
  const KDB = makeKDB([]);
  const rtime = KDB.runtime.singleSelect;
  const finish = (p) => A.handleRunFinished(KDB, rtime, p);
  const bad = async (p, runId, message) => {
    const r = await finish(p);
    assert.equal(r.ok, false);
    assert.equal(r.runId, runId);
    assert.equal(r.released, false);
    assert.deepEqual(codes(r), ["SINGLE_SELECT_PARAMETER_SET_RUN_FINISH_INVALID"]);
    assert.match(r.diagnostics[0].message, message);
  };
  await bad(null, null, /only runId\/source\/outcome/);
  await bad({ runId: 1, source: "writebackSet" }, null, /only runId\/source\/outcome/);
  await bad({ runId: 1, source: "writebackSet", outcome: "success", extra: 1 }, null, /only runId\/source\/outcome/);
  await bad({ runId: "1", source: "writebackSet", outcome: "success" }, null, /finite numeric runId/);
  await bad({ runId: 1, source: "other", outcome: "success" }, 1, /requires source "writebackSet"/);
  await bad({ runId: 1, source: "writebackSet", outcome: "weird" }, 1, /outcome is invalid/);
  A.runs.ensureRunRegistry(KDB, 1);
  assert.deepEqual(await finish({ runId: 1, source: "writebackSet", outcome: "success" }),
    { ok: true, runId: 1, released: true, alreadyReleased: false, diagnostics: [] });
  const second = await finish({ runId: 1, source: "writebackSet", outcome: "failure" });
  assert.equal(second.alreadyReleased, true);
});

// ---------------------------------------------------------------- generation guards

test("ensureWritebackPinnedGeneration and validateMutationGuard", () => {
  const KDB = makeKDB([]);
  const g = A.guards;
  assert.deepEqual(g.ensureWritebackPinnedGeneration(KDB, { runId: 1, source: "ui" }),
    { ok: true, shouldBypassReconcile: false, isWriteback: false });
  const noGen = g.ensureWritebackPinnedGeneration(KDB, { runId: 1, source: "writebackSet" });
  assert.equal(noGen.ok, false);
  assert.equal(noGen.code, "WRITEBACK_SINGLESELECT_INVENTORY_STALE");
  assert.deepEqual(g.ensureWritebackPinnedGeneration(KDB, { runId: 1, source: "writebackSet", inventoryGeneration: "4" }),
    { ok: true, shouldBypassReconcile: true, isWriteback: true, generation: 4 });
  const mismatch = g.ensureWritebackPinnedGeneration(KDB, { runId: 1, source: "writebackSet", inventoryGeneration: 5 });
  assert.match(mismatch.message, /mismatches the pinned run generation/);
  assert.equal(g.ensureWritebackPinnedGeneration(KDB, { runId: 2, source: "writebackSet", inventoryGeneration: 3 }).ok, false);
  KDB.state.filters.singleSelect.inventory.freshness = "stale";
  assert.equal(g.ensureWritebackPinnedGeneration(KDB, { runId: 1, source: "writebackSet", inventoryGeneration: 4 }).ok, false);
  KDB.state.filters.singleSelect.inventory.freshness = "fresh";

  assert.deepEqual(g.validateMutationGuard(KDB, { runId: 1, source: "ui" }),
    { ok: true, degraded: false, applied: [], skipped: [], diagnostics: [] });
  assert.equal(g.validateMutationGuard(KDB, { runId: "x" }).diagnostics[0].code, "WRITEBACK_RESTORE_CANCELLED");
  KDB.runtime.singleSelect.parameterSetRunId = 9;
  assert.match(g.validateMutationGuard(KDB, { runId: 8 }).diagnostics[0].message, /blocked stale runId 8 superseded by 9/);
  assert.equal(g.validateMutationGuard(KDB, { runId: 9 }).ok, true);
  KDB.state.filters.singleSelect.inventory.freshness = "stale";
  assert.equal(g.validateMutationGuard(KDB, { runId: 9 }).diagnostics[0].code, "WRITEBACK_SINGLESELECT_INVENTORY_STALE");
  KDB.state.filters.singleSelect.inventory.freshness = "fresh";
  assert.equal(g.validateMutationGuard(KDB, { runId: 9, source: "writebackSet", inventoryGeneration: 4 }).ok, true);
  KDB.state.filters.singleSelect.inventory.generation = 5;
  assert.match(g.validateMutationGuard(KDB, { runId: 9, source: "writebackSet", inventoryGeneration: 4 }).diagnostics[0].message,
    /stale/);
});

// ---------------------------------------------------------------- resolveRestoreSelectionPair

test("resolveRestoreSelectionPair: empty, map, table, singleton, degraded", async () => {
  const resolve = A.resolveRestorePair;
  const rec = instance("a", { scopeType: "global", scopeId: "global" });
  const KDB = {
    properties: { filterPropObj: { KENNZAHLEN: { filterInstances: {
      i1: { scopeType: "global", itemName: "Geschlecht", itemId: "g1", selectionValuesByDisplay: { Frau: { d: "Frau", u: "2" }, Mann: { d: "Mann", u: "1" } } },
      i2: { scopeType: "global", itemName: "Seite", itemId: "p1", filterLabel: "Seite", useValue: "7", displayValue: "Sieben" }
    } } } },
    config: { tables: { geschlecht_filter: { shape: "s", pick: "p" } } },
    services: { tableData: { readRows: () => [{ Geschlecht: { d: "Divers", u: "3" } }] } }
  };
  assert.deepEqual(await resolve(KDB, rec, ""), { selection: { d: "Alle", u: "" }, degraded: false, diagnostic: null });
  assert.deepEqual(await resolve(KDB, rec, null), { selection: { d: "Alle", u: "" }, degraded: false, diagnostic: null });
  assert.deepEqual(await resolve(KDB, rec, 2), { selection: { d: "Frau", u: "2" }, degraded: false, diagnostic: null });
  assert.deepEqual(await resolve(KDB, rec, "3"), { selection: { d: "Divers", u: "3" }, degraded: false, diagnostic: null });
  const single = await resolve(KDB, instance("b", { scopeType: "global", itemName: "Seite", itemId: "p1", filterLabel: "Seite" }), "7");
  assert.deepEqual(single, { selection: { d: "Sieben", u: "7" }, degraded: false, diagnostic: null });
  const degraded = await resolve(KDB, rec, "99");
  assert.equal(degraded.degraded, true);
  assert.deepEqual(degraded.selection, { d: "99", u: "99" });
  assert.deepEqual(degraded.diagnostic, {
    code: "SINGLE_SELECT_RESTORE_DISPLAY_DEGRADED",
    filterInstanceId: "a",
    message: "real display unavailable; transport-only d=u used before mandatory reread"
  });
  const waiting = Object.assign({}, KDB, { services: { tableData: { readRows: () => null, waitForRows: async () => { throw new Error("late"); } } } });
  assert.equal((await resolve(waiting, rec, "3")).degraded, true);
  const lazy = Object.assign({}, KDB, { services: { tableData: { readRows: () => null, waitForRows: async () => [{ Geschlecht: { d: "Divers", u: "3" } }] } } });
  assert.deepEqual((await resolve(lazy, rec, "3")).selection, { d: "Divers", u: "3" });
});

// ---------------------------------------------------------------- tabMutation pure parts

const slotA = { tabId: "t1", tabIdx: 1, index: 0 };
const slotB = { tabId: "t2", tabIdx: 2, index: 1 };

test("buildTabMutationTransfers per operation", () => {
  const build = A.transfers;
  assert.deepEqual(build(null), { transfers: [], clearSlots: [], affectedSlots: [] });
  const move = build({
    operation: "move",
    slotMoves: [
      { fromTabId: "t1", fromTabIdx: 1, fromIndex: 0, toTabId: "t2", toTabIdx: 2, toIndex: 1 },
      { fromTabId: "t2", fromTabIdx: 2, fromIndex: 1, toTabId: "t1", toTabIdx: 1, toIndex: 0 }
    ]
  });
  assert.deepEqual(move.transfers, [{ from: slotA, to: slotB }, { from: slotB, to: slotA }]);
  assert.deepEqual(move.clearSlots, [slotA, slotB]);
  assert.deepEqual(move.affectedSlots, [slotA, slotB]);
  const del = build({
    operation: "delete",
    slotMoves: [{ fromTabId: "t2", fromTabIdx: 2, fromIndex: 1, toTabId: "t1", toTabIdx: 1, toIndex: 0 }],
    deletedSlot: { tabId: "t3", tabIdx: 3, index: 2 },
    hideSlot: { tabId: "t3", tabIdx: 3, index: 2 },
    clearSlots: [{ tabId: "t4", tabIdx: 4, index: 3 }]
  });
  assert.deepEqual(del.clearSlots.map((s) => s.tabIdx), [2, 3, 4]);
  assert.deepEqual(del.affectedSlots.map((s) => s.tabIdx), [2, 1, 3, 4]);
  const dup = build({
    operation: "duplicate",
    slotMoves: [{ fromTabId: "t2", fromTabIdx: 2, fromIndex: 1, toTabId: "t3", toTabIdx: 3, toIndex: 2 }],
    sourceSlot: { tabId: "t1", tabIdx: 1, index: 0 },
    insertSlot: { tabId: "t2", tabIdx: 2, index: 1 },
    revealSlot: { tabId: "t9", tabIdx: 9, index: 8 }
  });
  assert.deepEqual(dup.transfers.map((p) => [p.from.tabIdx, p.to.tabIdx]), [[2, 3], [1, 2]]);
  assert.deepEqual(dup.clearSlots, []);
  assert.deepEqual(dup.affectedSlots.map((s) => s.tabIdx), [2, 3, 1, 9]);
  const dupMoves = build({ operation: "duplicate", slotMoves: [{ fromTabIdx: 1, toTabIdx: 2 }, { fromTabIdx: 2, toTabIdx: 3 }] });
  assert.deepEqual(dupMoves.transfers.map((p) => [p.from.tabIdx, p.to.tabIdx]), [[1, 2], [2, 3], [1, 2]]);
  const restored = build({
    operation: "restoreDeleted",
    slotMoves: [{ fromTabIdx: 3, toTabIdx: 4 }],
    insertSlot: { tabIdx: 3, tabId: "t3", index: 2 },
    revealSlot: { tabIdx: 4 }
  });
  assert.deepEqual(restored.clearSlots, []);
  assert.deepEqual(restored.affectedSlots.map((s) => s.tabIdx), [3, 4, 3]);
  const pairs = build({ operation: "move", transferPairs: [{ from: { tabIdx: 1 }, to: { tabIdx: 2 } }, { fromTabIdx: 5, toTabIdx: 6 }] });
  assert.deepEqual(pairs.transfers.map((p) => [p.from.tabIdx, p.to.tabIdx]), [[1, 2], [5, 6]]);
});

test("tab guard: scope resolve, instances in scope, semantic key match, snapshot target", () => {
  const g = A.tabGuard;
  const instances = {
    a: instance("a", { scopeId: "s1" }),
    b: instance("b", { scopeId: "s2" }),
    c: instance("c", { scopeId: "s2", filterLabel: "Jahr", itemName: "Jahr", itemId: "j1" }),
    d: instance("d", { scopeId: "s2_tabpanel", filterLabel: "Alter", itemName: "Alter" }),
    e: instance("e", { scopeId: "s2", status: "removed" }),
    f: instance("f", { scopeId: "s2", selectionOwner: "sicht", filterLabel: "Sicht" }),
    g: instance("g", { scopeType: "global", scopeId: "global" })
  };
  assert.deepEqual(g.instancesInScope(instances, "s2").map((r) => r.filterInstanceId), ["b", "c", "d"]);
  assert.deepEqual(g.instancesInScope(instances, "s2_tabpanel").map((r) => r.filterInstanceId), ["b", "c", "d"]);
  assert.deepEqual(g.instancesInScope(instances, "nope"), []);
  const targets = { 1: { scopeId: "s1" }, 2: "s2", 3: { scopeId: "zz" }, x: { tabId: "tx", scopeId: "s2" } };
  assert.deepEqual(g.resolveScope(instances, targets, { tabIdx: 1 }), { status: "ok", scopeId: "s1" });
  assert.deepEqual(g.resolveScope(instances, targets, { tabIdx: 2 }), { status: "ok", scopeId: "s2" });
  assert.deepEqual(g.resolveScope(instances, targets, { tabIdx: 3 }), { status: "unverified", scopeId: null });
  assert.deepEqual(g.resolveScope(instances, targets, { index: 2 }), { status: "ok", scopeId: "s2" });
  assert.deepEqual(g.resolveScope(instances, targets, { tabId: "tx" }), { status: "ok", scopeId: "s2" });
  assert.deepEqual(g.resolveScope(instances, targets, { tabIdx: 7 }), { status: "unverified", scopeId: null });
  assert.deepEqual(g.resolveScope(instances, targets), { status: "unverified", scopeId: null });
  const dupTargets = { 1: { tabId: "tx", scopeId: "s1" }, 2: { tabId: "tx", scopeId: "s2" } };
  assert.equal(g.resolveScope(instances, dupTargets, { tabId: "tx" }).status, "unverified");

  const wanted = instance("w", { scopeId: "s1" });
  const hit = g.matchTarget(instances, "s2", wanted);
  assert.equal(hit.status, "ok");
  assert.equal(hit.instance.filterInstanceId, "b");
  assert.equal(g.matchTarget(instances, "s2", instance("w2", { semanticInstanceKey: "other" })).status, "missing");
  const twin = Object.assign({}, instances, { b2: instance("b2", { scopeId: "s2" }) });
  assert.equal(g.matchTarget(twin, "s2", wanted).status, "ambiguous");
  assert.equal(g.matchTarget(twin, "s2", wanted).instance, null);

  const snapshot = g.cloneSnapshotRecord(instances.a, [{ d: "Frau", u: "2", extra: 1 }]);
  assert.deepEqual(snapshot, {
    filterInstanceId: "a", scopeId: "s1", semanticKey: "singleSelect|Geschlecht||Geschlecht",
    currentSelection: sel("Alle", "", "policy"), backupSelection: sel("Alle", "", "policy"),
    pendingSelection: { displayValue: "Alle" }, hostValues: [{ d: "Frau", u: "2" }]
  });
  assert.notEqual(snapshot.currentSelection, instances.a.currentSelection);
  assert.deepEqual(g.cloneSnapshotRecord(instances.a, null).hostValues, []);
  assert.equal(g.cloneSnapshotRecord(instance("n", { pendingSelection: null }), []).pendingSelection, null);

  const byId = g.matchSnapshotTarget(instances, snapshot);
  assert.deepEqual([byId.status, byId.instance.filterInstanceId], ["ok", "a"]);
  const moved = Object.assign({}, snapshot, { filterInstanceId: "gone", scopeId: "s2" });
  const byKey = g.matchSnapshotTarget(instances, moved);
  assert.deepEqual([byKey.status, byKey.instance.filterInstanceId], ["ok", "b"]);
  assert.equal(g.matchSnapshotTarget(twin, moved).status, "ambiguous");
  assert.equal(g.matchSnapshotTarget(instances, Object.assign({}, moved, { scopeId: "s9" })).status, "missing");
  assert.equal(g.matchSnapshotTarget({}, snapshot).instance, null);
});

test("tab guard: run guard and stale check", () => {
  const g = A.tabGuard;
  const rtime = {};
  assert.deepEqual(g.guardRun(rtime, { runId: "x" }), {
    ok: false, errorCode: "TABS_MUTATION_CANCELLED",
    diagnostics: [{ code: "TABS_MUTATION_CANCELLED", message: "tab mutation requires numeric runId and operationId" }]
  });
  assert.equal(g.guardRun(rtime, { runId: 2, operationId: "op" }), null);
  assert.equal(rtime.tabMutationRunId, 2);
  assert.equal(rtime.tabMutationOperationId, "op");
  assert.equal(g.guardRun(rtime, { runId: 1, operationId: "op" }).diagnostics[0].message, "tab mutation run was superseded");
  assert.equal(g.guardRun(rtime, { runId: 2, operationId: "other" }).diagnostics[0].message,
    "operationId does not match the active tab mutation run");
  assert.equal(g.isStaleRun(rtime, { runId: 2, operationId: "op" }), false);
  assert.equal(g.isStaleRun(rtime, { runId: 3, operationId: "op" }), true);
  assert.equal(g.isStaleRun(rtime, { runId: 2, operationId: "x" }), true);
});

// ---------------------------------------------------------------- tabMutation flows

function tabFixture() {
  const instances = [
    instance("a", { scopeId: "s1" }),
    instance("b", { scopeId: "s2" }),
    instance("a2", { scopeId: "s1", filterLabel: "Jahr", itemName: "Jahr", itemId: "j1" }),
    instance("b2", { scopeId: "s2", filterLabel: "Jahr", itemName: "Jahr", itemId: "j1" })
  ];
  const facet = multiFacet({
    "s1|g1": [{ d: "Frau", u: "2" }],
    "s2|g1": [{ d: "Mann", u: "1" }],
    "s1|j1": [{ d: "2020", u: "2020" }],
    "s2|j1": []
  });
  const KDB = makeKDB(instances, facet);
  const rtime = KDB.runtime.singleSelect;
  rtime.tabMutationSnapshots = {};
  const payload = (over) => Object.assign({
    runId: 5, operationId: "op5", tabIdxToScopeId: { 1: { scopeId: "s1" }, 2: { scopeId: "s2" } },
    plan: {
      operation: "move",
      slotMoves: [
        { fromTabId: "t1", fromTabIdx: 1, fromIndex: 0, toTabId: "t2", toTabIdx: 2, toIndex: 1 },
        { fromTabId: "t2", fromTabIdx: 2, fromIndex: 1, toTabId: "t1", toTabIdx: 1, toIndex: 0 }
      ]
    }
  }, over || {});
  return { KDB, rtime, facet, payload };
}

test("prepareTabMutation: snapshot, failures and delete history slice", async () => {
  const f = tabFixture();
  const result = await A.prepare(f.KDB, f.rtime, f.payload());
  assert.deepEqual(result, { ok: true, operationId: "op5", snapshotScopes: ["s1", "s2"], diagnostics: [] });
  const snap = f.rtime.tabMutationSnapshots.op5;
  assert.equal(snap.runId, 5);
  assert.deepEqual(Object.keys(snap.byId).sort(), ["a", "a2", "b", "b2"]);
  assert.deepEqual(snap.byId.a.hostValues, [{ d: "Frau", u: "2" }]);

  const g = tabFixture();
  assert.deepEqual(await A.prepare(g.KDB, g.rtime, g.payload({ plan: { operation: "explode" } })), {
    ok: false, operationId: "op5", snapshotScopes: [],
    diagnostics: [{ code: "TABS_MUTATION_PREPARE_FAILED", message: "unsupported or missing tab mutation plan" }]
  });
  assert.equal((await A.prepare(g.KDB, g.rtime, g.payload({ plan: { operation: "move", slotMoves: [] } }))).diagnostics[0].message,
    "tab mutation plan contains no semantic transfer or clear work");
  const unverified = await A.prepare(g.KDB, g.rtime, g.payload({ tabIdxToScopeId: {} }));
  assert.equal(unverified.ok, false);
  assert.deepEqual(unverified.diagnostics, ["t1", "t2"].map((tabId) => (
    { code: "SINGLE_SELECT_SCOPE_TARGET_UNVERIFIED", message: "tab mutation scope target is not verified", tabId: tabId })));
  assert.deepEqual(g.rtime.tabMutationSnapshots, {});
  const cancelled = await A.prepare(g.KDB, g.rtime, { runId: "x" });
  assert.equal(cancelled.errorCode, "TABS_MUTATION_CANCELLED");
  g.facet.writeFilter = undefined;
  const noHost = await A.prepare(g.KDB, g.rtime, g.payload({ runId: 6, operationId: "op6" }));
  assert.equal(noHost.ok, false);
  assert.equal(noHost.diagnostics[0].message, "runtime host filter reference missing during snapshot");

  const d = tabFixture();
  const del = await A.prepare(d.KDB, d.rtime, d.payload({
    plan: {
      operation: "delete", deletedSlot: { tabId: "t2", tabIdx: 2, index: 1 }, hideSlot: { tabId: "t2", tabIdx: 2, index: 1 },
      slotMoves: []
    }
  }));
  assert.equal(del.ok, true);
  assert.deepEqual(del.snapshotScopes, ["s2"]);
  assert.deepEqual(Object.keys(del.historySlice).sort(), ["b", "b2"]);
  assert.equal(del.historySlice.b, d.rtime.tabMutationSnapshots.op5.byId.b);
});

test("prepareTabMutation prunes snapshots of superseded runs", async () => {
  const f = tabFixture();
  f.rtime.tabMutationSnapshots = { old3: { runId: 3, byId: {} }, old4: { runId: 4, byId: {} } };
  f.rtime.tabMutationRunId = 4;
  const result = await A.prepare(f.KDB, f.rtime, f.payload());
  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(f.rtime.tabMutationSnapshots), ["op5"]);
  const stale = await A.prepare(f.KDB, f.rtime, f.payload({ runId: 4, operationId: "late" }));
  assert.equal(stale.errorCode, "TABS_MUTATION_CANCELLED");
  assert.deepEqual(Object.keys(f.rtime.tabMutationSnapshots), ["op5"]);
});

test("applyTabMutation move swaps host values and overlays state", async () => {
  const f = tabFixture();
  reconcileStub.calls.length = 0;
  assert.equal((await A.prepare(f.KDB, f.rtime, f.payload())).ok, true);
  const snapshotA = f.rtime.tabMutationSnapshots.op5.byId.a;
  const result = await A.apply(f.KDB, f.rtime, f.payload());
  assert.deepEqual(result, { ok: true, operationId: "op5", appliedScopes: ["s2", "s1"], clearedScopes: ["s1", "s2"], diagnostics: [] });
  assert.deepEqual(f.facet.byRef["s2|g1"], [{ d: "Frau", u: "2" }]);
  assert.deepEqual(f.facet.byRef["s1|g1"], [{ d: "Mann", u: "1" }]);
  assert.deepEqual(f.facet.byRef["s2|j1"], [{ d: "2020", u: "2020" }]);
  assert.deepEqual(f.facet.byRef["s1|j1"], []);
  assert.deepEqual(reconcileStub.calls, [{ reason: "tabMutation", runId: 5 }]);
  const byId = f.KDB.state.filters.singleSelect.instancesById;
  assert.deepEqual(byId.b.currentSelection, snapshotA.currentSelection);
  assert.deepEqual(byId.a2.currentSelection, sel("Alle", "", "policy"));
  assert.deepEqual(byId.a2.pendingSelection, { displayValue: "Alle" });
  assert.notEqual(byId.b.currentSelection, snapshotA.currentSelection);
});

test("applyTabMutation failure paths", async () => {
  const f = tabFixture();
  const noSnapshot = await A.apply(f.KDB, f.rtime, f.payload());
  assert.deepEqual(noSnapshot, {
    ok: false, operationId: "op5", appliedScopes: [], clearedScopes: [],
    diagnostics: [{ code: "TABS_MUTATION_APPLY_FAILED", filterInstanceId: undefined, message: "prepare snapshot missing" }]
  });
  assert.equal((await A.apply(f.KDB, f.rtime, { runId: "x" })).errorCode, "TABS_MUTATION_CANCELLED");

  assert.equal((await A.prepare(f.KDB, f.rtime, f.payload())).ok, true);
  f.facet.failOn = null;
  const failing = multiFacet({ "s1|g1": [{ d: "Frau", u: "2" }], "s2|g1": [], "s1|j1": [], "s2|j1": [] }, { failOn: "s2|g1" });
  f.KDB.runtime.singleSelect.filtersFacet = failing;
  const failed = await A.apply(f.KDB, f.rtime, f.payload());
  assert.equal(failed.ok, false);
  assert.deepEqual(failed.diagnostics.map((d) => [d.code, d.filterInstanceId]), [
    ["SINGLE_SELECT_HOST_WRITE_FAILED", "b"],
    ["SINGLE_SELECT_HOST_WRITE_FAILED", "b"]
  ]);

  const g = tabFixture();
  assert.equal((await A.prepare(g.KDB, g.rtime, g.payload())).ok, true);
  reconcileStub.impl = async () => ({ ok: false, diagnostics: [] });
  const superseded = await A.apply(g.KDB, g.rtime, g.payload());
  assert.equal(superseded.errorCode, "TABS_MUTATION_CANCELLED");
  assert.equal(superseded.diagnostics[0].message, "tab mutation reconcile failed or was superseded");
  reconcileStub.impl = async () => { throw new Error("reconcile boom"); };
  const thrown = await A.apply(g.KDB, g.rtime, g.payload());
  assert.equal(thrown.ok, false);
  assert.deepEqual(thrown.diagnostics.map((d) => [d.code, d.message]), [["TABS_MUTATION_APPLY_FAILED", "reconcile boom"]]);
  reconcileStub.impl = async () => ({ ok: true, diagnostics: [] });
});

test("applyTabMutation restoreDeleted writes the history slice by semantic key", async () => {
  const f = tabFixture();
  const slice = {
    b: { semanticKey: "singleSelect|Geschlecht||Geschlecht", hostValues: [{ d: "Divers", u: "3" }],
      currentSelection: sel("Divers", "3"), backupSelection: sel("Divers", "3"), pendingSelection: { displayValue: "Divers" } },
    x: { semanticKey: "singleSelect|Unbekannt||Unbekannt", hostValues: [] }
  };
  const plan = {
    operation: "restoreDeleted", slotMoves: [],
    insertSlot: { tabId: "t2", tabIdx: 2, index: 1 },
    restore: { filters: { singleSelect: slice } }
  };
  assert.equal((await A.prepare(f.KDB, f.rtime, f.payload({ plan }))).ok, true);
  const result = await A.apply(f.KDB, f.rtime, f.payload({ plan }));
  assert.equal(result.ok, false);
  assert.deepEqual(result.diagnostics.map((d) => [d.code, d.message]), [
    ["TABS_MUTATION_APPLY_FAILED", "semantic restore target missing"]
  ]);
  assert.deepEqual(f.facet.byRef["s2|g1"], [{ d: "Divers", u: "3" }]);
  const scoped = tabFixture();
  const onlyB = Object.assign({}, plan, { restore: { filters: { singleSelect: { b: slice.b } } } });
  assert.equal((await A.prepare(scoped.KDB, scoped.rtime, scoped.payload({ plan: onlyB }))).ok, true);
  const ok = await A.apply(scoped.KDB, scoped.rtime, scoped.payload({ plan: onlyB }));
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.appliedScopes.slice(-1), ["s2"]);
  assert.deepEqual(scoped.KDB.state.filters.singleSelect.instancesById.b.currentSelection, sel("Divers", "3"));
});

test("restoreTabMutationSnapshot rolls back and releases the snapshot", async () => {
  const f = tabFixture();
  const missing = await A.restoreSnapshot(f.KDB, f.rtime, f.payload());
  assert.deepEqual(missing, { ok: true, operationId: "op5", restored: [], unrecoverable: [], diagnostics: [] });
  assert.equal((await A.prepare(f.KDB, f.rtime, f.payload())).ok, true);
  f.facet.byRef["s1|g1"] = [{ d: "Mann", u: "1" }];
  f.facet.byRef["s2|g1"] = [{ d: "Frau", u: "2" }];
  f.KDB.state.filters.singleSelect.instancesById.a.currentSelection = sel("Mann", "1");
  const result = await A.restoreSnapshot(f.KDB, f.rtime, f.payload());
  assert.deepEqual(result, { ok: true, operationId: "op5", restored: ["a", "a2", "b", "b2"], unrecoverable: [], diagnostics: [] });
  assert.deepEqual(f.facet.byRef["s1|g1"], [{ d: "Frau", u: "2" }]);
  assert.deepEqual(f.KDB.state.filters.singleSelect.instancesById.a.currentSelection, sel("Alle", "", "policy"));
  assert.deepEqual(f.rtime.tabMutationSnapshots, {});
});

test("restoreTabMutationSnapshot: unrecoverable targets, stale run and thrown errors", async () => {
  const f = tabFixture();
  assert.equal((await A.prepare(f.KDB, f.rtime, f.payload())).ok, true);
  delete f.KDB.state.filters.singleSelect.instancesById.b;
  f.KDB.runtime.singleSelect.filtersFacet = multiFacet({}, { failOn: "s1|j1" });
  const result = await A.restoreSnapshot(f.KDB, f.rtime, f.payload());
  assert.equal(result.ok, false);
  assert.deepEqual(result.unrecoverable.sort(), ["a2", "b"]);
  assert.deepEqual(result.diagnostics.map((d) => d.message).sort(), [
    "snapshot host pair could not be restored: SINGLE_SELECT_HOST_WRITE_FAILED",
    "snapshot rollback target missing"
  ]);
  assert.deepEqual(f.rtime.tabMutationSnapshots, {});

  const g = tabFixture();
  assert.equal((await A.prepare(g.KDB, g.rtime, g.payload())).ok, true);
  g.rtime.tabMutationRunId = 6;
  const stale = await A.restoreSnapshot(g.KDB, g.rtime, g.payload());
  assert.equal(stale.errorCode, "TABS_MUTATION_CANCELLED");
  assert.deepEqual(Object.keys(g.rtime.tabMutationSnapshots), ["op5"]);

  const h = tabFixture();
  assert.equal((await A.prepare(h.KDB, h.rtime, h.payload())).ok, true);
  reconcileStub.impl = async () => { throw new Error("reconcile boom"); };
  const thrown = await A.restoreSnapshot(h.KDB, h.rtime, h.payload());
  reconcileStub.impl = async () => ({ ok: true, diagnostics: [] });
  assert.equal(thrown.ok, false);
  assert.equal(thrown.diagnostics.slice(-1)[0].code, "TABS_MUTATION_ROLLBACK_INCOMPLETE");
  assert.equal(thrown.diagnostics.slice(-1)[0].message, "reconcile boom");
  assert.deepEqual(thrown.restored, ["a", "a2", "b", "b2"]);
  assert.deepEqual(Object.keys(h.rtime.tabMutationSnapshots), []);
});

test("restoreTabMutationSnapshot releases the snapshot when the run turns stale after the guard", async () => {
  const f = tabFixture();
  assert.equal((await A.prepare(f.KDB, f.rtime, f.payload())).ok, true);
  f.rtime.tabMutationSnapshots.op6 = { runId: 6, operationId: "op6", byId: {} };
  const originalWrite = f.facet.writeFilter;
  f.facet.writeFilter = async (req) => {
    const out = await originalWrite(req);
    f.rtime.tabMutationRunId = 6;
    f.rtime.tabMutationOperationId = "op6";
    return out;
  };
  const result = await A.restoreSnapshot(f.KDB, f.rtime, f.payload());
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "TABS_MUTATION_CANCELLED");
  assert.deepEqual(Object.keys(f.rtime.tabMutationSnapshots), ["op6"]);
  assert.equal(f.rtime.tabMutationSnapshots.op6.runId, 6);
});

test("resyncTabMutationHost re-pushes captured selections after reconcile", async () => {
  const f = tabFixture();
  const inst = f.KDB.state.filters.singleSelect.instancesById;
  inst.a.currentSelection = sel("Frau", "2");
  inst.b.currentSelection = sel("Mann", "1");
  f.rtime.domRefs = { filterEl: 1, popupMount: 2, filterKey: 3, keep: 4 };
  reconcileStub.calls.length = 0;
  const result = await A.resyncHost(f.KDB, f.rtime, f.payload());
  assert.deepEqual(result, { ok: true, operationId: "op5", diagnostics: [] });
  assert.deepEqual(reconcileStub.calls, [{ reason: "tabMutation", runId: 5 }]);
  assert.deepEqual(f.rtime.domRefs, { keep: 4 });
  assert.deepEqual(f.facet.byRef["s1|g1"], [{ d: "Frau", u: "2" }]);
  assert.deepEqual(f.facet.byRef["s2|g1"], [{ d: "Mann", u: "1" }]);
  assert.deepEqual(f.facet.byRef["s1|j1"], []);
  assert.equal(inst.a.currentSelection.displayValue, "Frau");

  const g = tabFixture();
  const cancelled = await A.resyncHost(g.KDB, g.rtime, { runId: "x" });
  assert.deepEqual(codes(cancelled), ["TABS_MUTATION_CANCELLED"]);
  assert.equal(cancelled.ok, false);
  reconcileStub.impl = async () => ({ ok: false, diagnostics: [] });
  const failed = await A.resyncHost(g.KDB, g.rtime, g.payload());
  assert.deepEqual(failed.diagnostics.map((d) => d.message), ["resync reconcile failed or was superseded"]);
  reconcileStub.impl = async () => { throw new Error("reconcile boom"); };
  const thrown = await A.resyncHost(g.KDB, g.rtime, g.payload({ runId: 6 }));
  assert.deepEqual(thrown.diagnostics.map((d) => d.message), ["reconcile boom"]);
  reconcileStub.impl = async () => ({ ok: true, diagnostics: [] });
  const unverified = await A.resyncHost(g.KDB, g.rtime, g.payload({ runId: 7, tabIdxToScopeId: {} }));
  assert.equal(unverified.ok, true);
  assert.equal(unverified.diagnostics.length, 2);
  assert.match(unverified.diagnostics[0].message, /resync scope unverified for tabIdx 1/);
});

// ---------------------------------------------------------------- parameterSet handlers (writeback source: no reconcile)

function paramFixture() {
  const instances = [
    instance("g", { scopeType: "global", scopeId: "global" }),
    instance("p", { scopeId: "s1", filterLabel: "Jahr", itemName: "Jahr", itemId: "j1" })
  ];
  const facet = multiFacet({ "global|g1": [{ d: "Mann", u: "1" }], "s1|j1": [{ d: "2020", u: "2020" }] });
  const KDB = makeKDB(instances, facet, {
    properties: { filterPropObj: { K: { filterInstances: {
      i1: { scopeType: "global", itemName: "Geschlecht", itemId: "g1", selectionValuesByDisplay: { Frau: { d: "Frau", u: "2" } } },
      i2: { scopeType: "pageContext", itemName: "Jahr", itemId: "j1", selectionValuesByDisplay: { "2021": { d: "2021", u: "2021" } } }
    } } } }
  });
  KDB.state.filters.singleSelect.lastInteraction = { x: 1 };
  KDB.state.filters.singleSelect.lastConfirmedAt = 5;
  const base = (over) => Object.assign({ runId: 1, source: "writebackSet", inventoryGeneration: 4 }, over || {});
  return { KDB, rtime: KDB.runtime.singleSelect, facet, base };
}

test("handleParameterSetRestore: global and page-context phases", async () => {
  const f = paramFixture();
  const global = await A.handleRestore(f.KDB, f.rtime, f.base({
    phase: "global",
    filters: [{ key: "Geschlecht", vals: ["2"] }, { key: "Sicht", vals: ["x"] }, { vals: [] }, { key: "Nope", vals: ["1"] }, { key: "Jahr", tab: 1, vals: ["2021"] }]
  }));
  assert.equal(global.ok, false);
  assert.deepEqual(global.applied, [{ key: "Geschlecht", inst: undefined, filterInstanceId: "g", degraded: false }]);
  assert.deepEqual(global.skipped.map((s) => [s.key, s.code]), [
    ["Sicht", "WRITEBACK_FILTER_KIND_UNSUPPORTED"],
    ["", "WRITEBACK_SINGLESELECT_ENTRY_INVALID"],
    ["Nope", "WRITEBACK_SINGLESELECT_INSTANCE_MISSING"],
    ["Jahr", "WRITEBACK_SINGLESELECT_ENTRY_INVALID"]
  ]);
  assert.deepEqual(f.facet.byRef["global|g1"], [{ d: "Frau", u: "2" }]);
  assert.deepEqual(f.KDB.state.filters.singleSelect.instancesById.g.currentSelection.useValue, "2");

  const g = paramFixture();
  const page = await A.handleRestore(g.KDB, g.rtime, g.base({
    phase: "pageContext", tabIdxToScopeId: { 1: { scopeId: "s1" } },
    filters: [{ key: "Jahr", tab: 1, vals: ["2021"] }, { key: "Jahr", tab: 2, vals: ["2021"] }]
  }));
  assert.equal(page.ok, false);
  assert.deepEqual(codes(page), ["WRITEBACK_TABS_TARGET_MISSING"]);
  assert.deepEqual(page.skipped, [{ key: "Jahr", code: "WRITEBACK_TABS_TARGET_MISSING", tab: 2 }]);
  assert.deepEqual(page.applied, [{ key: "Jahr", inst: undefined, tab: 1, filterInstanceId: "p", degraded: false }]);
  assert.deepEqual(g.facet.byRef["s1|j1"], [{ d: "2021", u: "2021" }]);
});

test("handleParameterSetRestore: guards, empty value, stale and rollback", async () => {
  const f = paramFixture();
  const invalidPhase = await A.handleRestore(f.KDB, f.rtime, f.base({ phase: "x", filters: [] }));
  assert.deepEqual(codes(invalidPhase), ["WRITEBACK_SINGLESELECT_PHASE_INVALID"]);
  const g = paramFixture();
  const stale = await A.handleRestore(g.KDB, g.rtime, g.base({ phase: "global", inventoryGeneration: 3, filters: [] }));
  assert.deepEqual(codes(stale), ["WRITEBACK_SINGLESELECT_INVENTORY_STALE"]);
  const h = paramFixture();
  h.rtime.parameterSetRunId = 9;
  const old = await A.handleRestore(h.KDB, h.rtime, h.base({ phase: "global", filters: [] }));
  assert.deepEqual(codes(old), ["WRITEBACK_RESTORE_CANCELLED"]);
  const e = paramFixture();
  const empty = await A.handleRestore(e.KDB, e.rtime, e.base({ phase: "global", filters: [{ key: "Geschlecht", vals: [] }] }));
  assert.equal(empty.ok, true);
  assert.deepEqual(e.facet.byRef["global|g1"], []);
  assert.deepEqual(e.KDB.state.filters.singleSelect.instancesById.g.currentSelection, sel("Alle", "", "policy"));
  const r = paramFixture();
  r.facet.writeFilter = async function (req) {
    r.facet.writes.push(req.values.slice());
    r.facet.byRef[refKey(req.ref)] = r.facet.writes.length === 1 ? [{ d: "Wrong", u: "9" }] : req.values.slice();
    return { ok: true };
  };
  const mismatch = await A.handleRestore(r.KDB, r.rtime, r.base({ phase: "global", filters: [{ key: "Geschlecht", vals: ["2"] }] }));
  assert.equal(mismatch.ok, false);
  assert.deepEqual(r.facet.byRef["global|g1"], [{ d: "Mann", u: "1" }]);
  assert.match(mismatch.diagnostics[0].message, /restore reread did not confirm target use value; rollback succeeded/);
  const reconciled = paramFixture();
  reconcileStub.calls.length = 0;
  reconcileStub.impl = async () => ({ ok: true, degraded: true, diagnostics: [{ code: "R" }] });
  const viaReconcile = await A.handleRestore(reconciled.KDB, reconciled.rtime, {
    runId: 1, phase: "global", filters: [{ key: "Geschlecht", vals: ["2"] }]
  });
  reconcileStub.impl = async () => ({ ok: true, diagnostics: [] });
  assert.deepEqual(reconcileStub.calls, [{ reason: "parameterRestore", runId: 1 }]);
  assert.equal(viaReconcile.ok, true);
  assert.equal(viaReconcile.degraded, true);
  assert.deepEqual(codes(viaReconcile), ["R"]);
});

test("handleParameterSetClear: writes Alle, honours allowed tabs, reports cancellation", async () => {
  const f = paramFixture();
  const result = await A.handleClear(f.KDB, f.rtime, f.base({ status: "newDashboard" }));
  assert.deepEqual(result, { ok: true, degraded: false, applied: [], skipped: [], diagnostics: [] });
  assert.deepEqual(f.facet.byRef["global|g1"], []);
  assert.deepEqual(f.facet.byRef["s1|j1"], []);
  const inst = f.KDB.state.filters.singleSelect.instancesById;
  assert.deepEqual(inst.g.currentSelection, sel("Alle", "", "policy"));
  assert.deepEqual(inst.p.pendingSelection, { displayValue: "Alle" });
  assert.equal(f.KDB.state.filters.singleSelect.lastInteraction, null);
  assert.equal(f.KDB.state.filters.singleSelect.lastConfirmedAt, null);

  const g = paramFixture();
  const partial = await A.handleClear(g.KDB, g.rtime, g.base({ allowedClearTabIdxs: [], tabIdxToScopeId: { 1: { scopeId: "s1" } } }));
  assert.equal(partial.ok, true);
  assert.deepEqual(g.facet.byRef["global|g1"], []);
  assert.deepEqual(g.facet.byRef["s1|j1"], [{ d: "2020", u: "2020" }]);

  const h = paramFixture();
  h.rtime.filtersFacet = {};
  const noFacet = await A.handleClear(h.KDB, h.rtime, h.base({ status: "newDashboard" }));
  assert.equal(noFacet.ok, true);
  assert.equal(noFacet.degraded, true);
  assert.deepEqual(codes(noFacet), ["WRITEBACK_FILTER_RESTORE_FAILED"]);
  const plain = await A.handleClear(paramFixture().KDB, h.rtime, { runId: 3, source: "writebackSet", inventoryGeneration: 4 });
  assert.equal(plain.ok, false);

  const mismatch = paramFixture();
  mismatch.facet.writeFilter = async function (req) {
    mismatch.facet.writes.push(req.values.slice());
    if (mismatch.facet.writes.length === 1) { return { ok: true }; }
    mismatch.facet.byRef[refKey(req.ref)] = req.values.slice();
    return { ok: true };
  };
  mismatch.facet.byRef["global|g1"] = [{ d: "Mann", u: "1" }];
  const mismatched = await A.handleClear(mismatch.KDB, mismatch.rtime, mismatch.base({}));
  assert.equal(mismatched.ok, false);
  assert.match(mismatched.diagnostics[0].message, /host clear verification mismatch; rollback succeeded/);

  const thrown = paramFixture();
  thrown.facet.writeFilter = async () => { throw new Error("write boom"); };
  const failed = await A.handleClear(thrown.KDB, thrown.rtime, thrown.base({}));
  assert.equal(failed.ok, false);
  assert.match(failed.diagnostics[0].message, /^singleSelect clear failed: /);

  const superseded = paramFixture();
  const original = superseded.facet.writeFilter;
  superseded.facet.writeFilter = async (req) => {
    const out = await original(req);
    superseded.rtime.parameterSetRunId = 2;
    return out;
  };
  const cancelled = await A.handleClear(superseded.KDB, superseded.rtime, superseded.base({}));
  assert.equal(cancelled.ok, false);
  assert.equal(cancelled.degraded, true);
  assert.match(cancelled.diagnostics[0].message, /blocked stale runId 1 superseded by 2; rollback succeeded/);
  assert.deepEqual(superseded.facet.byRef["global|g1"], [{ d: "Mann", u: "1" }]);
});

test("handleParameterSetClear: superseded before the first host write reports the cancellation without writing", async () => {
  const f = paramFixture();
  f.KDB.state.filters.singleSelect.inventory.freshness = "stale";
  const errorsBefore = logged.filter((entry) => entry[0] === "error").length;
  const result = await A.handleClear(f.KDB, f.rtime, { runId: 1 });
  assert.equal(result.ok, false);
  assert.deepEqual(codes(result), ["WRITEBACK_SINGLESELECT_INVENTORY_STALE"]);
  assert.match(result.diagnostics[0].message, /not fresh during parameterSet mutation/);
  assert.deepEqual(f.facet.writes, []);
  assert.deepEqual(f.facet.byRef["global|g1"], [{ d: "Mann", u: "1" }]);
  assert.equal(f.KDB.state.filters.singleSelect.lastInteraction.x, 1);
  assert.equal(logged.filter((entry) => entry[0] === "error").length, errorsBefore);
});

test("handleParameterSetResync re-applies registered restore assignments", async () => {
  const f = paramFixture();
  await A.handleRestore(f.KDB, f.rtime, f.base({ phase: "global", filters: [{ key: "Geschlecht", vals: ["2"] }] }));
  f.facet.byRef["global|g1"] = [];
  reconcileStub.calls.length = 0;
  reconcileStub.impl = async () => ({ ok: true, generation: 6, diagnostics: [] });
  const result = await A.handleResync(f.KDB, f.rtime, f.base({}));
  reconcileStub.impl = async () => ({ ok: true, diagnostics: [] });
  assert.deepEqual(reconcileStub.calls, [{ reason: "parameterRestore", runId: 1 }]);
  assert.equal(result.ok, true);
  assert.equal(result.inventoryGeneration, 6);
  assert.deepEqual(result.applied, [{ filterInstanceId: "g", key: "Geschlecht", ok: true }]);
  assert.deepEqual(f.facet.byRef["global|g1"], [{ d: "Frau", u: "2" }]);

  const g = paramFixture();
  const none = await A.handleResync(g.KDB, g.rtime, g.base({}));
  assert.equal(none.ok, true);
  assert.equal(none.degraded, true);
  assert.deepEqual(codes(none), ["WRITEBACK_SINGLESELECT_RESYNC_UNREGISTERED"]);
  assert.deepEqual(none.skipped, [{ filterInstanceId: null, reason: "noRegisteredAssignments" }]);

  const h = paramFixture();
  const stale = await A.handleResync(h.KDB, h.rtime, h.base({ inventoryGeneration: 2 }));
  assert.equal(stale.ok, false);
  assert.deepEqual(codes(stale), ["WRITEBACK_SINGLESELECT_INVENTORY_STALE"]);
});

// ---------------------------------------------------------------- handler call contract
// Asserts what the singleSelect index.js async table must do: hand every restore/tabMutation handler
// (KDB, runtime, payload) in that order. `wire()` boots index.js with the eight handlers replaced by spies.

function spyHandlers() {
  const calls = [];
  const spy = (name) => (...args) => {
    calls.push({ name, args });
    return Promise.resolve({ handled: name });
  };
  return { calls, spy };
}

function wire() {
  const rec = spyHandlers();
  const modules = {
    "./restore/clear.js": { handleParameterSetClear: rec.spy("clear") },
    "./restore/restore.js": { handleParameterSetRestore: rec.spy("restore") },
    "./restore/resync.js": { handleParameterSetResync: rec.spy("resync") },
    "./restore/runs.js": { handleParameterSetRunFinished: rec.spy("runFinished") },
    "./tabMutation/prepare.js": { prepareTabMutation: rec.spy("prepare") },
    "./tabMutation/apply.js": { applyTabMutation: rec.spy("apply") },
    "./tabMutation/restore.js": { restoreTabMutationSnapshot: rec.spy("restoreSnapshot") },
    "./tabMutation/resync.js": { resyncTabMutationHost: rec.spy("resyncHost") }
  };
  const register = loadAmd(path.join(SS, "index.js"), { stubs: { console: quietConsole }, modules });
  const KDB = { state: {}, api: {}, elements: {}, services: {} };
  const controller = register(KDB, {});
  const config = load("config.js");
  const dispatch = (type, payload) => controller.dispatch({ type: type, payload: payload });
  return {
    calls: rec.calls,
    config: config,
    KDB: KDB,
    rtime: KDB.runtime.singleSelect,
    controller: controller,
    parameterSet: dispatch,
    tab: {
      prepare: (payload) => dispatch(config.actions.PREPARE_TAB_MUTATION, payload),
      apply: (payload) => dispatch(config.actions.APPLY_TAB_MUTATION, payload),
      restoreSnapshot: (payload) => dispatch(config.actions.RESTORE_TAB_MUTATION_SNAPSHOT, payload),
      resyncHost: (payload) => dispatch(config.actions.RESYNC_TAB_MUTATION_HOST, payload)
    }
  };
}

test("parameterSet actions reach their handler as (KDB, runtime, payload); unknown types reach no handler", async () => {
  const w = wire();
  const KDB = w.KDB;
  const rtime = w.rtime;
  const types = [
    [w.config.actions.PARAMETER_SET_CLEAR_REQUESTED, "clear"],
    [w.config.actions.PARAMETER_SET_RESTORE_REQUESTED, "restore"],
    [w.config.actions.PARAMETER_SET_RESYNC_REQUESTED, "resync"],
    [w.config.actions.PARAMETER_SET_RUN_FINISHED, "runFinished"]
  ];
  assert.deepEqual(types.map((t) => t[0]), [
    "singleSelect/parameterSetClearRequested",
    "singleSelect/parameterSetRestoreRequested",
    "singleSelect/parameterSetResyncRequested",
    "singleSelect/parameterSetRunFinished"
  ]);
  for (const [type, name] of types) {
    const payload = { runId: 7, marker: name };
    const result = await w.parameterSet(type, payload);
    assert.deepEqual(result, { handled: name });
    const call = w.calls[w.calls.length - 1];
    assert.equal(call.name, name);
    assert.equal(call.args.length, 3);
    assert.equal(call.args[0], KDB);
    assert.equal(call.args[1], rtime);
    assert.equal(call.args[2], payload);
  }
  const before = w.calls.length;
  // index.js answers an unknown type with the state snapshot (it was `null` from the removed router).
  const state = w.controller.getState();
  assert.deepEqual(w.parameterSet("singleSelect/somethingElse", {}), state);
  assert.deepEqual(w.controller.dispatch(null), state);
  assert.deepEqual(w.controller.dispatch({}), state);
  assert.equal(w.calls.length, before);
});

test("tab mutation actions reach their handler as (KDB, runtime, payload)", async () => {
  const w = wire();
  const KDB = w.KDB;
  const rtime = w.rtime;
  const expected = [
    ["prepare", "prepare"],
    ["apply", "apply"],
    ["restoreSnapshot", "restoreSnapshot"],
    ["resyncHost", "resyncHost"]
  ];
  assert.equal(w.config.actions.PREPARE_TAB_MUTATION, "singleSelect/prepareTabMutation");
  assert.equal(w.config.actions.APPLY_TAB_MUTATION, "singleSelect/applyTabMutation");
  assert.equal(w.config.actions.RESTORE_TAB_MUTATION_SNAPSHOT, "singleSelect/restoreTabMutationSnapshot");
  assert.equal(w.config.actions.RESYNC_TAB_MUTATION_HOST, "singleSelect/resyncTabMutationHost");
  for (const [key, name] of expected) {
    const payload = { runId: 3, operationId: "op", marker: name };
    const result = await w.tab[key](payload);
    assert.deepEqual(result, { handled: name });
    const call = w.calls[w.calls.length - 1];
    assert.equal(call.name, name);
    assert.equal(call.args.length, 3);
    assert.equal(call.args[0], KDB);
    assert.equal(call.args[1], rtime);
    assert.equal(call.args[2], payload);
  }
  assert.equal(w.calls.length, 4);
});
