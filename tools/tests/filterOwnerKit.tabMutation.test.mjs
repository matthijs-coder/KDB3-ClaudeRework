// Unit tests of the filter owner kit's tab-mutation runner (_core/tabMutation.js), its scope helpers
// (_core/tabMutationScopes.js) and core/utils/filters/tabMutationRun/listAffectedPlanSlots.js (Phase 2 W6b).
// The slot lister is checked against frozen copies of the three implementations it replaced (core list and the two
// owner collectAffectedSlots), over generated plans.
// Run: node --test tools/tests/filterOwnerKit.tabMutation.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const logged = [];
const con = { log() {}, info() {}, debug() {}, warn: (...a) => logged.push(["warn", ...a]), error: (...a) => logged.push(["error", ...a]) };
const load = (rel) => loadAmd(path.join(JS_ROOT, rel), { stubs: { console: con } });
const runner = load("dashboard/filters/_core/tabMutation.js");
const scopes = load("dashboard/filters/_core/tabMutationScopes.js");
const listSlots = load("core/utils/filters/tabMutationRun/listAffectedPlanSlots.js");

const GUARD_OPTIONS = {
  pinOperationId: false, ensureRunIdDefault0: true, includeRunIdsInDiagnostic: true,
  missingIdsMessage: "needs ids", supersededMessage: "superseded"
};
const guard = runner.createRunGuard({ options: GUARD_OPTIONS, staleMode: "runId" });
const base = { name: "demo", guard: guard };
const ctxOf = () => ({ runtime: {}, trace: [] });
const payload = (over) => Object.assign({ runId: 1, operationId: "op", plan: { operation: "move" } }, over || {});

test("run guard wraps the core util with the owner options", () => {
  const runtime = {};
  assert.deepEqual(guard.guardRun(runtime, { runId: "x" }), {
    ok: false, errorCode: "TABS_MUTATION_CANCELLED",
    diagnostics: [{ code: "TABS_MUTATION_CANCELLED", message: "needs ids", runId: "x", currentRunId: 0 }]
  });
  assert.equal(guard.guardRun(runtime, { runId: 2, operationId: "o" }), null);
  assert.equal(guard.guardRun(runtime, { runId: 1, operationId: "o" }).diagnostics[0].message, "superseded");
  assert.equal(guard.isStale(runtime, { runId: 2 }), false);
  assert.equal(guard.isStale(runtime, { runId: 3 }), true);
  assert.equal(guard.cancelled("m", { runId: 2 }, runtime).diagnostics[0].currentRunId, 2);
});

test("prepare: order, ledger write, prune, history slice slot and failure shapes", async () => {
  logged.length = 0;
  const calls = [];
  const hooks = {
    capture(ctx, p) {
      calls.push(["capture", Object.keys(ctx.runtime.tabMutationSnapshots).sort()]);
      return p.plan.operation === "bad"
        ? { ok: false, diagnostics: [{ code: "X" }] }
        : { ok: true, snapshot: { runId: p.runId, mark: p.operationId }, scopeIds: ["s1"] };
    },
    historySlice(ctx, p, snapshot, slot) { calls.push(["slice", slot]); return { slot: slot, mark: snapshot.mark }; }
  };
  const prepare = runner.createPrepare(base, hooks);
  const ctx = ctxOf();
  ctx.runtime.tabMutationSnapshots = { old: { runId: 0 }, odd: null, noRun: {}, next: { runId: 7 } };
  ctx.runtime.tabMutationRunId = 0;
  assert.deepEqual(await prepare(ctx, payload({ runId: 3 })), { ok: true, operationId: "op", snapshotScopes: ["s1"], diagnostics: [] });
  assert.deepEqual(Object.keys(ctx.runtime.tabMutationSnapshots).sort(), ["next", "noRun", "odd", "op"]);
  assert.deepEqual(calls[0], ["capture", ["next", "noRun", "odd"]]);
  const del = await prepare(ctx, payload({ runId: 4, operationId: "d", plan: { operation: "delete", deletedSlot: { tabIdx: 2 } } }));
  assert.deepEqual(del.historySlice, { slot: { tabIdx: 2 }, mark: "d" });
  const dup = await prepare(ctx, payload({ runId: 5, operationId: "u", plan: { operation: "duplicate", clonePair: { from: { tabIdx: 1 } } } }));
  assert.deepEqual(dup.historySlice.slot, { tabIdx: 1 });
  const dupSource = await prepare(ctx, payload({
    runId: 6, operationId: "u2", plan: { operation: "duplicate", sourceSlot: { tabIdx: 0 }, clonePair: { from: { tabIdx: 1 } } }
  }));
  assert.deepEqual(dupSource.historySlice.slot, { tabIdx: 0 });
  assert.equal("historySlice" in await prepare(ctx, payload({ runId: 6, operationId: "m" })), false);
  assert.deepEqual(await prepare(ctx, payload({ runId: 6, operationId: "b", plan: { operation: "bad" } })), {
    ok: false, operationId: "b", snapshotScopes: [], diagnostics: [{ code: "X" }]
  });
  assert.equal(ctx.runtime.tabMutationSnapshots.b, undefined);
  const rejected = await prepare(ctx, payload({ runId: 1 }));
  assert.deepEqual(rejected, {
    ok: false, operationId: "op", snapshotScopes: [],
    diagnostics: [{ code: "TABS_MUTATION_CANCELLED", message: "superseded", runId: 1, currentRunId: 6 }]
  });
  assert.equal(logged.length, 0);
});

test("prepare: prune can be switched off, rejected hook replaces the failure, throws are logged once", async () => {
  logged.length = 0;
  const hooks = {
    prune: false,
    rejected: (g) => g,
    capture: () => ({ ok: true, snapshot: { runId: 2 }, scopeIds: [] }),
    historySlice: () => ({})
  };
  const ctx = ctxOf();
  ctx.runtime.tabMutationSnapshots = { old: { runId: 0 } };
  const prepare = runner.createPrepare(base, hooks);
  assert.equal((await prepare(ctx, payload({ runId: 2 }))).ok, true);
  assert.deepEqual(Object.keys(ctx.runtime.tabMutationSnapshots).sort(), ["old", "op"]);
  assert.equal((await prepare(ctx, payload({ runId: 1 }))).errorCode, "TABS_MUTATION_CANCELLED");
  const boom = runner.createPrepare(base, { capture: () => { throw new Error("kaput"); } });
  assert.deepEqual(await boom(ctxOf(), payload()), {
    ok: false, operationId: "op", snapshotScopes: [], diagnostics: [{ code: "TABS_MUTATION_PREPARE_FAILED", message: "kaput" }]
  });
  const boomWithId = runner.createPrepare(base, { logOperationId: true, capture: () => { throw new Error("kaput"); } });
  await boomWithId(ctxOf(), payload());
  assert.equal(logged.length, 2);
  assert.equal(logged[0].length, 3);
  assert.equal(logged[0][1], "[demo.prepareTabMutation] failed");
  assert.equal(logged[1].length, 4);
  assert.deepEqual(logged[1][2], { operationId: "op" });
});

test("apply: guard rejection, operation table, unsupported operation, onError policy", async () => {
  const seen = [];
  const hooks = {
    unsupportedMessage: "only these",
    operations: { move: (ctx, p) => { seen.push(p.operationId); return runner.applySuccess(p.operationId, ["a"], [], []); } }
  };
  const apply = runner.createApply(base, hooks);
  const ctx = ctxOf();
  assert.deepEqual(await apply(ctx, payload()), { ok: true, operationId: "op", appliedScopes: ["a"], clearedScopes: [], diagnostics: [] });
  assert.deepEqual(await apply(ctx, payload({ plan: { operation: "weird" } })), {
    ok: false, operationId: "op", appliedScopes: [], clearedScopes: [],
    diagnostics: [{ code: "TABS_MUTATION_APPLY_FAILED", message: "only these" }]
  });
  assert.equal((await apply(ctx, payload({ plan: { operation: "toString" } }))).ok, false);
  assert.equal((await apply(ctx, payload({ plan: null }))).diagnostics[0].message, "only these");
  assert.deepEqual((await apply(ctx, payload({ runId: 0 }))).diagnostics[0].message, "superseded");
  assert.equal((await apply(ctx, { runId: 5 })).operationId, null);
  const thrower = { operations: { move: () => { throw new Error("late"); } }, unsupportedMessage: "u" };
  await assert.rejects(runner.createApply(base, thrower)(ctxOf(), payload()), /late/);
  const caught = runner.createApply(base, Object.assign({ onError: (e, p) => runner.applyFailure(p.operationId, [], [], [{ m: e.message }]) }, thrower));
  assert.deepEqual((await caught(ctxOf(), payload())).diagnostics, [{ m: "late" }]);
  const own = runner.createApply(base, { run: (c, p) => ({ own: p.operationId }), rejected: () => "R" });
  assert.deepEqual(await own(ctxOf(), payload()), { own: "op" });
  assert.equal(await own(ctx, payload({ runId: 0 })), "R");
});

test("apply helpers: read the snapshot of this run only, superseded result", () => {
  const runtime = { tabMutationSnapshots: { op: { runId: 3 } } };
  assert.equal(runner.readRunSnapshot(base, runtime, { operationId: "op", runId: 3 }).runId, 3);
  assert.equal(runner.readRunSnapshot(base, runtime, { operationId: "op", runId: 4 }), null);
  assert.equal(runner.readRunSnapshot(base, runtime, { operationId: "none", runId: 3 }), null);
  const result = runner.supersededResult(base, { runtime: { tabMutationRunId: 9 } }, { operationId: "o", runId: 1 }, ["a"], ["c"], "late");
  assert.deepEqual(result, {
    ok: false, operationId: "o", appliedScopes: ["a"], clearedScopes: ["c"],
    diagnostics: [{ code: "TABS_MUTATION_CANCELLED", message: "late", runId: 1, currentRunId: 9 }]
  });
  assert.deepEqual(runner.restoreResult(false, undefined, null, null, null, "E"), {
    ok: false, operationId: null, restored: [], unrecoverable: [], diagnostics: [], errorCode: "E"
  });
});

test("restore: guard result, empty answer without snapshot, release policies", async () => {
  const hooks = (extra) => Object.assign({ run: async (ctx, p, snapshot) => runner.restoreResult(true, p.operationId, [snapshot.n], [], []) }, extra);
  const make = (h) => runner.createRestore(base, h);
  const seeded = () => {
    const ctx = ctxOf();
    ctx.runtime.tabMutationSnapshots = { op: { runId: 1, n: "x" } };
    ctx.runtime.tabMutationRunId = 1;
    return ctx;
  };
  assert.deepEqual(await make(hooks())(ctxOf(), payload()), runner.restoreResult(true, "op", [], [], []));
  assert.deepEqual(await make(hooks())(seeded(), payload({ runId: 0 })), {
    ok: false, operationId: "op", restored: [], unrecoverable: [],
    diagnostics: [{ code: "TABS_MUTATION_CANCELLED", message: "superseded", runId: 0, currentRunId: 1 }],
    errorCode: "TABS_MUTATION_CANCELLED"
  });
  const ctx = seeded();
  assert.deepEqual((await make(hooks())(ctx, payload())).restored, ["x"]);
  assert.deepEqual(ctx.runtime.tabMutationSnapshots, {});
  const throwing = hooks({ run: async () => { throw new Error("walk"); } });
  const always = seeded();
  await assert.rejects(make(throwing)(always, payload()), /walk/);
  assert.deepEqual(always.runtime.tabMutationSnapshots, {});
  const afterRun = seeded();
  await assert.rejects(make(Object.assign({ release: "afterRun" }, throwing))(afterRun, payload()), /walk/);
  assert.deepEqual(Object.keys(afterRun.runtime.tabMutationSnapshots), ["op"]);
  const afterOk = seeded();
  await make(hooks({ release: "afterRun" }))(afterOk, payload());
  assert.deepEqual(afterOk.runtime.tabMutationSnapshots, {});
  assert.equal(await make(hooks({ rejected: () => "R" }))(seeded(), payload({ runId: 0 })), "R");
});

test("resync: guard rejection, false means failure, thrown errors are logged once", async () => {
  logged.length = 0;
  const run = async (ctx, p, diagnostics) => { diagnostics.push({ d: 1 }); return p.plan.operation === "fail" ? false : undefined; };
  const resync = runner.createResync(base, { run });
  assert.deepEqual(await resync(ctxOf(), payload()), { ok: true, operationId: "op", diagnostics: [{ d: 1 }] });
  assert.deepEqual(await resync(ctxOf(), payload({ plan: { operation: "fail" } })), { ok: false, operationId: "op", diagnostics: [{ d: 1 }] });
  const ctx = ctxOf();
  await resync(ctx, payload({ runId: 5 }));
  assert.deepEqual(await resync(ctx, payload({ runId: 4 })), {
    ok: false, diagnostics: [{ code: "TABS_MUTATION_CANCELLED", message: "superseded", runId: 4, currentRunId: 5 }]
  });
  const boom = runner.createResync(base, { run: async () => { throw new Error("push"); } });
  assert.deepEqual(await boom(ctxOf(), payload()), {
    ok: false, operationId: "op", diagnostics: [{ code: "TABS_MUTATION_APPLY_FAILED", message: "push" }]
  });
  assert.equal(logged.length, 1);
  assert.deepEqual(logged[0].slice(0, 3), ["error", "[demo.resyncTabMutationHost] failed", { operationId: "op" }]);
});

test("disposed result: cancelled answer with the operation id", async () => {
  const make = runner.createDisposedResult("demo controller is disposed");
  assert.deepEqual(await make({ payload: { operationId: "o" } }), {
    ok: false, operationId: "o", diagnostics: [{ code: "TABS_MUTATION_CANCELLED", message: "demo controller is disposed" }]
  });
  assert.equal((await make({})).operationId, null);
  assert.equal((await make(undefined)).operationId, null);
});

test("scope helpers: layout match, target scope ids, slot resolution, affected scopes", () => {
  const tabs = [{ id: "L0", pageId: "P0" }, null, { id: 5 }, { id: "L1", pageId: "P1" }];
  assert.equal(scopes.findLayoutScopeId(tabs, "L1", null), "L1");
  assert.equal(scopes.findLayoutScopeId(tabs, null, "P0"), "L0");
  assert.equal(scopes.findLayoutScopeId(tabs, null, "L1"), "L1");
  assert.equal(scopes.findLayoutScopeId(tabs, 5, null), "5");
  assert.equal(scopes.findLayoutScopeId(tabs, "zz", "yy"), null);
  assert.equal(scopes.findLayoutScopeId(null, "L0", null), null);
  let reads = 0;
  const resolveScopeId = scopes.createScopeIdResolver({ readTabs: () => { reads += 1; return tabs; } });
  assert.deepEqual(resolveScopeId({}, { 0: { scopeId: "S0" } }, 0), { ok: true, scopeId: "S0", fromTarget: true });
  assert.equal(reads, 0);
  assert.deepEqual(resolveScopeId({}, { 1: { tabId: "L1", scopeId: "" } }, 1), { ok: true, scopeId: "L1", fromTarget: false });
  assert.deepEqual(resolveScopeId({}, { 1: { tabId: "none" } }, 1), { ok: false, scopeId: null, fromTarget: false });
  assert.deepEqual(resolveScopeId({}, {}, 1), { ok: false, scopeId: null, fromTarget: false });
  assert.deepEqual(resolveScopeId({}, null, 1), { ok: false, scopeId: null, fromTarget: false });
  assert.equal(reads, 2);

  const resolveSlot = scopes.createSlotScopeResolver({
    resolveScopeId: (K, targets, idx) => (targets[idx] ? { ok: true, scopeId: targets[idx] } : { ok: false }),
    isGlobalScope: (scope) => scope === "global"
  });
  const targets = { 0: "a", 1: "global", 2: "b" };
  assert.deepEqual(resolveSlot({}, targets, { tabIdx: 0 }), { ok: true, scopeId: "a" });
  assert.deepEqual(resolveSlot({}, targets, { tabIdx: 1 }), { ok: true, skip: true, scopeId: null });
  assert.deepEqual(resolveSlot({}, targets, { tabIdx: 4, tabId: "t4" }), {
    ok: false, diagnostics: [{ code: "TABS_MUTATION_PREPARE_FAILED", message: "scopeId could not be resolved for tabIdx 4", tabId: "t4" }]
  });
  assert.deepEqual(resolveSlot({}, targets, { tabIdx: "0" }), {
    ok: false, diagnostics: [{ code: "TABS_MUTATION_PREPARE_FAILED", message: "slot tabIdx is missing for scope resolution", tabId: null }]
  });
  assert.equal(resolveSlot({}, null, null).ok, false);
  const noGlobal = scopes.createSlotScopeResolver({ resolveScopeId: () => ({ ok: true, scopeId: "global" }) });
  assert.deepEqual(noGlobal({}, {}, { tabIdx: 0 }), { ok: true, scopeId: "global" });

  assert.deepEqual(scopes.resolveAffectedScopes(resolveSlot, {}, targets, [{ tabIdx: 0 }, { tabIdx: 1 }, { tabIdx: 2 }, { tabIdx: 0 }]),
    { ok: true, scopeIds: ["a", "b"], diagnostics: [] });
  const bad = scopes.resolveAffectedScopes(resolveSlot, {}, targets, [{ tabIdx: 0 }, { tabIdx: 7 }, { tabIdx: 8 }]);
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.scopeIds, []);
  assert.equal(bad.diagnostics.length, 2);
  const diagnostics = [];
  const moves = [
    { fromTabIdx: 0, toTabIdx: 2 }, { fromTabIdx: 1, toTabIdx: 0 }, { fromTabIdx: 7, toTabIdx: 0 }, { fromTabIdx: 0, toTabIdx: 1 }
  ];
  assert.deepEqual(scopes.collectFromScopeIds(resolveSlot, {}, targets, moves, diagnostics), ["a"]);
  assert.equal(diagnostics.length, 1);
  assert.deepEqual(scopes.slotOfMove({ fromTabIdx: 1, fromTabId: "f", toTabIdx: 2, toTabId: "t" }, "to"), { tabIdx: 2, tabId: "t" });
  const list = [];
  scopes.pushUnique(list, 1);
  scopes.pushUnique(list, 1);
  assert.deepEqual(list, [1]);
});

// ---- frozen copies of the implementations the options of listAffectedPlanSlots replace ----

function frozenCoreList(_plan) {
  var slots = [];
  var slotMoves = _plan.slotMoves || [];
  for (var i = 0; i < slotMoves.length; i++) {
    var move = slotMoves[i];
    slots.push(move.fromTabIdx != null ? { tabIdx: move.fromTabIdx, tabId: move.fromTabId } : null);
    slots.push(move.toTabIdx != null ? { tabIdx: move.toTabIdx, tabId: move.toTabId } : null);
  }
  if (_plan.deletedSlot) { slots.push({ tabIdx: _plan.deletedSlot.tabIdx, tabId: _plan.deletedSlot.tabId }); }
  if (_plan.hideSlot) { slots.push({ tabIdx: _plan.hideSlot.tabIdx, tabId: _plan.hideSlot.tabId }); }
  if (_plan.operation === "duplicate") {
    if (_plan.sourceSlot) { slots.push({ tabIdx: _plan.sourceSlot.tabIdx, tabId: _plan.sourceSlot.tabId }); }
    if (_plan.insertSlot) { slots.push({ tabIdx: _plan.insertSlot.tabIdx, tabId: _plan.insertSlot.tabId }); }
    if (_plan.revealSlot) { slots.push({ tabIdx: _plan.revealSlot.tabIdx, tabId: _plan.revealSlot.tabId }); }
  }
  if (_plan.operation === "restoreDeleted") {
    if (_plan.insertSlot) { slots.push({ tabIdx: _plan.insertSlot.tabIdx, tabId: _plan.insertSlot.tabId }); }
    if (_plan.revealSlot) { slots.push({ tabIdx: _plan.revealSlot.tabIdx, tabId: _plan.revealSlot.tabId }); }
  }
  return slots.filter(Boolean);
}

function frozenCollect(_plan, _variant) {
  var plan = _plan || {};
  var slots = [];
  var seen = {};
  function pushSlot(_slot) {
    var slot = _slot || {};
    if (typeof slot.tabIdx !== "number" || seen[slot.tabIdx]) { return; }
    seen[slot.tabIdx] = true;
    slots.push({ tabIdx: slot.tabIdx, tabId: slot.tabId || null });
  }
  (plan.slotMoves || []).forEach(function (_move) {
    pushSlot({ tabIdx: _move.fromTabIdx, tabId: _move.fromTabId });
    pushSlot({ tabIdx: _move.toTabIdx, tabId: _move.toTabId });
  });
  if (plan.deletedSlot) { pushSlot(plan.deletedSlot); }
  if (plan.hideSlot) { pushSlot(plan.hideSlot); }
  if (_variant === "nms") {
    if (plan.operation === "duplicate") {
      if (plan.clonePair) {
        pushSlot(plan.clonePair.from);
        pushSlot(plan.clonePair.to);
      }
      if (plan.sourceSlot) { pushSlot(plan.sourceSlot); }
      if (plan.insertSlot) { pushSlot(plan.insertSlot); }
      if (plan.revealSlot) { pushSlot(plan.revealSlot); }
    }
    if (plan.operation === "restoreDeleted") {
      if (plan.insertSlot) { pushSlot(plan.insertSlot); }
      if (plan.revealSlot) { pushSlot(plan.revealSlot); }
    }
  } else if (plan.operation === "duplicate" || plan.operation === "restoreDeleted") {
    if (plan.insertSlot) { pushSlot(plan.insertSlot); }
    if (plan.revealSlot) { pushSlot(plan.revealSlot); }
  }
  return slots;
}

function makeRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function generatePlans(count) {
  const random = makeRandom(20261016);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const idx = () => pick([undefined, null, 0, 1, 2, 3, 3, 1, "1", NaN]);
  const slot = () => (random() < 0.15 ? undefined : { tabIdx: idx(), tabId: pick([undefined, "a", "b", "", "c"]), index: pick([0, 1]) });
  const plans = [];
  for (let n = 0; n < count; n += 1) {
    const plan = { operation: pick(["delete", "move", "duplicate", "restoreDeleted", "other", undefined]) };
    const moves = Math.floor(random() * 4);
    if (random() < 0.8) {
      plan.slotMoves = [];
      for (let m = 0; m < moves; m += 1) {
        plan.slotMoves.push({ fromTabIdx: idx(), fromTabId: pick([undefined, "a", "b"]), toTabIdx: idx(), toTabId: pick([undefined, "a", "c"]) });
      }
    }
    ["deletedSlot", "hideSlot", "sourceSlot", "insertSlot", "revealSlot"].forEach((key) => { if (random() < 0.5) { plan[key] = slot(); } });
    if (random() < 0.5) { plan.clonePair = random() < 0.2 ? {} : { from: slot(), to: slot() }; }
    plans.push(plan);
  }
  return plans;
}

// Plans as tabs/tabMutation/plans.js builds them: sourceSlot and insertSlot repeat in clonePair.
function realShapedPlans() {
  const slot = (i) => ({ tabIdx: i, index: i, tabId: "t" + i });
  const move = (f, t) => ({ fromTabIdx: f, fromTabId: "t" + f, toTabIdx: t, toTabId: "t" + t });
  const plans = [];
  for (let source = 0; source < 4; source += 1) {
    for (let insert = 0; insert < 4; insert += 1) {
      plans.push({
        operation: "duplicate", sourceSlot: slot(source), insertSlot: slot(insert), revealSlot: slot(3),
        slotMoves: [move(insert, insert + 1)], clonePair: { from: slot(source), to: slot(insert) }
      });
      plans.push({ operation: "restoreDeleted", insertSlot: slot(insert), revealSlot: slot(source), slotMoves: [move(insert, 2)] });
    }
    plans.push({ operation: "delete", deletedSlot: slot(source), hideSlot: slot(3), slotMoves: [move(source + 1, source)] });
    plans.push({ operation: "move", sourceSlot: slot(source), targetTabIdx: 2, slotMoves: [move(source, 2), move(2, source)] });
  }
  return plans;
}

test("listAffectedPlanSlots default equals the frozen core list on generated plans", () => {
  const plans = generatePlans(3000).concat(realShapedPlans());
  plans.forEach((plan, n) => {
    assert.deepEqual(listSlots(plan), frozenCoreList(plan), "plan " + n + " " + JSON.stringify(plan));
  });
});

test("listAffectedPlanSlots options equal the two frozen collectAffectedSlots copies on generated plans", () => {
  const plans = generatePlans(3000).concat(realShapedPlans());
  plans.forEach((plan, n) => {
    assert.deepEqual(
      listSlots(plan, { dedupeByTabIdx: true, includeClonePair: true }), frozenCollect(plan, "nms"), "nms plan " + n + " " + JSON.stringify(plan)
    );
    assert.deepEqual(
      listSlots(plan, { dedupeByTabIdx: true, includeSourceSlot: false }), frozenCollect(plan, "ds"), "ds plan " + n + " " + JSON.stringify(plan)
    );
  });
  assert.deepEqual(listSlots(null, { dedupeByTabIdx: true }), []);
});

test("for plans built by tabs the owner variants differ only by the duplicate source tab", () => {
  realShapedPlans().forEach((plan) => {
    const nms = frozenCollect(plan, "nms").map((s) => s.tabIdx);
    const ds = frozenCollect(plan, "ds").map((s) => s.tabIdx);
    const missing = nms.filter((idx) => ds.indexOf(idx) === -1);
    if (plan.operation !== "duplicate") {
      assert.deepEqual(nms, ds);
    } else {
      assert.ok(missing.every((idx) => idx === plan.sourceSlot.tabIdx), JSON.stringify(plan));
    }
  });
});

test("core tabMutationRun utils throw on a null runtime without logging themselves (the owner boundary logs once)", () => {
  const utils = load("core/utils/filters/tabMutationRun/guardTabMutationRun.js");
  const ledger = load("core/utils/filters/tabMutationRun/tabMutationSnapshots.js");
  logged.length = 0;
  assert.throws(() => utils.guardRun(null, { runId: 1, operationId: "o" }, { ensureRunIdDefault0: true }), TypeError);
  assert.throws(() => utils.isStale(undefined, { runId: 1 }, { staleMode: "pinned" }), TypeError);
  assert.throws(() => ledger.readSnapshot(null, "o"), TypeError);
  assert.throws(() => ledger.writeSnapshot(null, "o", {}), TypeError);
  assert.throws(() => ledger.deleteSnapshot(null, "o"), TypeError);
  assert.equal(logged.length, 0);
  const runtime = {};
  ledger.writeSnapshot(runtime, 7, { runId: 1 });
  assert.deepEqual(runtime, { tabMutationRunId: 0, tabMutationSnapshots: { 7: { runId: 1 } } });
  assert.deepEqual(ledger.readSnapshot(runtime, "7"), { runId: 1 });
  assert.equal(ledger.readSnapshot(runtime, "8"), null);
  ledger.deleteSnapshot(runtime, 7);
  assert.deepEqual(runtime.tabMutationSnapshots, {});
});
