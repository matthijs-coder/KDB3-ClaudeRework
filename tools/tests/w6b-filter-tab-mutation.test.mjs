// Characterisation of the filter owners' tab-mutation actions (Phase 2 W6b), recorded on the code BEFORE the shared runner.
// Drives each REAL owner (singleSelect, nativeMultiSelect, dienststelle) through its public dispatch with fake host
// facets: delete, duplicate, move, restoreDeleted, forced host-write failure, forced rollback failure, thrown writes,
// stale / older run ids, double prepare, unknown operation ids, malformed plans and run guards, resync, destroy.
// Per step the golden holds the return value, tab-mutation runtime keys, owner state, host values, host write log and
// console output. The same expectations must hold after the owners adopt dashboard/filters/_core/tabMutation.js.
// Run: node --test tools/tests/w6b-filter-tab-mutation.test.mjs   (W6B_RECORD=1 rewrites the fixture)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OWNER_BOOTS } from "./lib/w6b-filter-hosts.mjs";

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/w6b-filter-tab-mutation.golden.json");
const J = (value) => (value === undefined ? "__undefined__" : JSON.parse(JSON.stringify(value)));

const slot = (i) => ({ tabId: "t" + i, tabIdx: i, index: i });
const mv = (f, t) => ({ fromTabId: "t" + f, fromTabIdx: f, fromIndex: f, toTabId: "t" + t, toTabIdx: t, toIndex: t });
const PLANS = {
  move: () => ({ operation: "move", sourceSlot: slot(0), targetTabIdx: 1, slotMoves: [mv(0, 1), mv(1, 0)] }),
  shift: () => ({ operation: "move", sourceSlot: slot(0), targetTabIdx: 2, slotMoves: [mv(0, 2), mv(1, 0), mv(2, 1)] }),
  delete: () => ({ operation: "delete", deletedSlot: slot(1), hideSlot: slot(2), slotMoves: [mv(2, 1)] }),
  duplicate: () => ({
    operation: "duplicate", sourceSlot: slot(0), insertSlot: slot(1), revealSlot: slot(2), slotMoves: [mv(1, 2)],
    clonePair: { from: slot(0), to: slot(1) }
  }),
  duplicateClonePairOnly: () => ({
    operation: "duplicate", insertSlot: slot(1), slotMoves: [], clonePair: { from: slot(0), to: slot(1) }
  }),
  odd: () => ({
    operation: "duplicate", sourceSlot: { tabId: "t0", tabIdx: 0 }, insertSlot: { tabId: "t1", tabIdx: "1" },
    revealSlot: { tabId: "t2" }, slotMoves: [mv(1, 2), { fromTabIdx: 2, toTabIdx: 1 }, { fromTabIdx: null, toTabIdx: 0 }],
    clonePair: { from: slot(0), to: slot(2) }, hideSlot: slot(1), deletedSlot: slot(2)
  }),
  restoreDeleted: (slice, owner) => ({
    operation: "restoreDeleted", insertSlot: slot(1), revealSlot: slot(2), slotMoves: [mv(1, 2)],
    restore: { filters: { [owner]: slice } }
  }),
  unknown: () => ({ operation: "weird", slotMoves: [mv(0, 1)] }),
  badSlot: () => ({ operation: "move", slotMoves: [mv(9, 1)] }),
  empty: () => ({ operation: "move", slotMoves: [] })
};

function diffView(previous, current) {
  if (!previous) { return current; }
  const out = {};
  Object.keys(current).forEach((key) => {
    if (JSON.stringify(previous[key]) !== JSON.stringify(current[key])) { out[key] = current[key]; }
  });
  return out;
}

function makeDriver(h) {
  const steps = [];
  let previous = null;
  async function call(phase, runId, operationId, planName, extra) {
    const plan = typeof planName === "function" ? planName() : planName ? PLANS[planName]() : null;
    const payload = Object.assign({ source: "tabsMutation", skipHistory: true, plan: plan, tabIdxToScopeId: h.targets }, extra || {});
    if (runId !== undefined) { payload.runId = runId; }
    if (operationId !== undefined) { payload.operationId = operationId; }
    let result;
    let thrown = null;
    try {
      result = await h.api.dispatch({ type: h.types[phase], payload: payload });
    } catch (error) {
      thrown = String(error && error.message ? error.message : error);
    }
    const view = h.view();
    steps.push({
      step: phase + " run=" + runId + " op=" + operationId + " plan=" + (plan ? plan.operation : null),
      result: J(result), thrown: thrown, view: diffView(previous, J(view)),
      log: J(h.takeLog()), console: J(h.takeConsole())
    });
    previous = J(view);
    return result;
  }
  function note(label) {
    steps.push({ step: label, view: diffView(previous, J(h.view())), log: J(h.takeLog()), console: J(h.takeConsole()) });
    previous = J(h.view());
  }
  return { call, note, steps };
}

const SCENARIOS = {
  async move(h, d) {
    await d.call("prepare", 1, "a", "move");
    await d.call("apply", 1, "a", "move");
    await d.call("resync", 1, "a", "move");
    await d.call("restore", 1, "a", null);
    await d.call("restore", 1, "a", null);
  },
  async shiftMove(h, d) {
    await d.call("prepare", 1, "a", "shift");
    await d.call("apply", 1, "a", "shift");
    await d.call("restore", 1, "a", null);
  },
  async deleteThenRestoreDeleted(h, d) {
    const prepared = await d.call("prepare", 1, "a", "delete");
    await d.call("apply", 1, "a", "delete");
    await d.call("resync", 1, "a", "delete");
    const slice = prepared && prepared.historySlice;
    await d.call("prepare", 2, "b", () => PLANS.restoreDeleted(slice, h.name));
    await d.call("apply", 2, "b", () => PLANS.restoreDeleted(slice, h.name));
    await d.call("resync", 2, "b", () => PLANS.restoreDeleted(slice, h.name));
    await d.call("restore", 2, "b", null);
  },
  async duplicate(h, d) {
    await d.call("prepare", 1, "a", "duplicate");
    await d.call("apply", 1, "a", "duplicate");
    await d.call("resync", 1, "a", "duplicate");
    await d.call("restore", 1, "a", null);
  },
  async duplicateClonePairOnly(h, d) {
    await d.call("prepare", 1, "a", "duplicateClonePairOnly");
    await d.call("apply", 1, "a", "duplicateClonePairOnly");
    await d.call("resync", 1, "a", "duplicateClonePairOnly");
    await d.call("restore", 1, "a", null);
  },
  async applyFailsOnHost(h, d) {
    await d.call("prepare", 1, "a", "move");
    h.control.failWrites = true;
    await d.call("apply", 1, "a", "move");
    await d.call("restore", 1, "a", null);
    h.control.failWrites = false;
    await d.call("restore", 1, "a", null);
  },
  async applyFailsThenRollbackSucceeds(h, d) {
    await d.call("prepare", 1, "a", "delete");
    h.control.failWrites = true;
    await d.call("apply", 1, "a", "delete");
    h.control.failWrites = false;
    await d.call("restore", 1, "a", null);
  },
  async hostWriteThrows(h, d) {
    await d.call("prepare", 1, "a", "move");
    h.control.throwWrites = true;
    await d.call("apply", 1, "a", "move");
    await d.call("restore", 1, "a", null);
    h.control.throwWrites = false;
    await d.call("restore", 1, "a", null);
  },
  async resyncFails(h, d) {
    await d.call("prepare", 1, "a", "duplicate");
    h.control.failWrites = true;
    await d.call("resync", 1, "a", "duplicate");
    h.control.failWrites = false;
    h.control.throwWrites = true;
    await d.call("resync", 1, "a", "duplicate");
  },
  async hostIgnoresWrites(h, d) {
    await d.call("prepare", 1, "a", "move");
    h.control.noopWrites = true;
    await d.call("apply", 1, "a", "move");
    await d.call("restore", 1, "a", null);
  },
  async staleRuns(h, d) {
    await d.call("prepare", 5, "a", "move");
    await d.call("prepare", 6, "b", "delete");
    await d.call("apply", 5, "a", "move");
    await d.call("restore", 5, "a", null);
    await d.call("resync", 5, "a", "move");
    await d.call("prepare", 4, "c", "move");
    await d.call("apply", 6, "b", "delete");
    await d.call("restore", 6, "b", null);
  },
  async supersededDuringApply(h, d) {
    await d.call("prepare", 1, "a", "move");
    h.control.afterWrite = () => { h.runtime().tabMutationRunId = 99; };
    await d.call("apply", 1, "a", "move");
    await d.call("restore", 1, "a", null);
    await d.call("restore", 99, "a", null);
  },
  async supersededDuringRestore(h, d) {
    await d.call("prepare", 1, "a", "move");
    await d.call("apply", 1, "a", "move");
    h.control.afterWrite = () => { h.runtime().tabMutationRunId = 99; };
    await d.call("restore", 1, "a", null);
    await d.call("restore", 99, "a", null);
  },
  async doublePrepare(h, d) {
    await d.call("prepare", 1, "a", "move");
    await d.call("apply", 1, "a", "move");
    await d.call("prepare", 1, "a", "move");
    await d.call("restore", 1, "a", null);
  },
  async sameRunOtherOperation(h, d) {
    await d.call("prepare", 2, "a", "move");
    await d.call("apply", 2, "b", "move");
    await d.call("prepare", 2, "b", "move");
    await d.call("restore", 2, "a", null);
    await d.call("restore", 2, "b", null);
  },
  async unknownOperation(h, d) {
    await d.call("apply", 1, "nope", "move");
    await d.call("restore", 1, "nope", null);
    await d.call("resync", 1, "nope", "move");
    await d.call("prepare", 3, "a", "move");
    await d.call("apply", 4, "a", "move");
    await d.call("restore", 4, "zzz", null);
  },
  async malformedInput(h, d) {
    await d.call("prepare", 1, "a", null);
    await d.call("prepare", 1, "a", "unknown");
    await d.call("prepare", 1, "a", "empty");
    await d.call("prepare", 1, "a", "badSlot");
    await d.call("prepare", undefined, "a", "move");
    await d.call("prepare", 2, undefined, "move");
    await d.call("prepare", "x", "a", "move");
    await d.call("apply", undefined, "a", "move");
    await d.call("restore", 2, undefined, null);
    await d.call("resync", undefined, "a", "move");
    await d.call("prepare", 3, "m", "move");
    await d.call("apply", 3, "m", "unknown");
    await d.call("apply", 3, "m", null);
    await d.call("resync", 3, "m", "badSlot");
    await d.call("resync", 3, "m", null);
  },
  async pruneOlderSnapshots(h, d) {
    h.seedSnapshot("old1", 1);
    h.seedSnapshot("old2", 4);
    h.seedSnapshot("same", 5);
    h.seedSnapshot("newer", 9);
    d.note("seeded");
    await d.call("prepare", 5, "fresh", "move");
    await d.call("prepare", 6, "fresh2", "move");
  },
  async globalTargets(h, d) {
    const globals = { 0: { scopeId: "global" }, 1: { scopeId: "global" }, 2: { scopeId: "global" } };
    await d.call("prepare", 1, "a", "move", { tabIdxToScopeId: globals });
    await d.call("apply", 1, "a", "move", { tabIdxToScopeId: globals });
    await d.call("restore", 1, "a", null);
  },
  async layoutFallbackTargets(h, d) {
    const noScope = h.layoutTargets;
    await d.call("prepare", 1, "a", "move", { tabIdxToScopeId: noScope });
    await d.call("apply", 1, "a", "move", { tabIdxToScopeId: noScope });
    await d.call("resync", 1, "a", "move", { tabIdxToScopeId: noScope });
    await d.call("restore", 1, "a", null);
    await d.call("prepare", 2, "b", "move", { tabIdxToScopeId: {} });
    await d.call("prepare", 3, "c", "move", { tabIdxToScopeId: null });
  },
  async resyncAffectedSlots(h, d) {
    let run = 1;
    for (const name of ["move", "shift", "delete", "duplicate", "duplicateClonePairOnly", "odd", "empty"]) {
      await d.call("resync", run, "r" + run, name);
      run += 1;
    }
    await d.call("resync", run, "r" + run, () => PLANS.restoreDeleted({}, h.name));
    await d.call("resync", run + 1, "r" + (run + 1), null);
  },
  async preparePlansWithOddSlots(h, d) {
    await d.call("prepare", 1, "a", "odd");
    await d.call("prepare", 2, "b", "delete");
    await d.call("prepare", 3, "c", "shift");
  },
  async missingTargetPayload(h, d) {
    await d.call("prepare", 1, "a", "move", { tabIdxToScopeId: undefined });
    await d.call("apply", 1, "a", "move", { tabIdxToScopeId: undefined });
  },
  async reconcileFails(h, d) {
    await d.call("prepare", 1, "a", "move");
    h.control.reconcileFails = true;
    await d.call("apply", 1, "a", "move");
    await d.call("resync", 1, "a", "move");
    await d.call("restore", 1, "a", null);
    h.control.reconcileFails = false;
    h.control.reconcileThrows = true;
    await d.call("prepare", 2, "b", "move");
    await d.call("apply", 2, "b", "move");
    await d.call("restore", 2, "b", null);
  },
  async destroyThenDispatch(h, d) {
    await d.call("prepare", 1, "a", "move");
    h.api.destroy();
    d.note("destroyed");
    await d.call("prepare", 2, "b", "move");
    await d.call("apply", 2, "b", "move");
    await d.call("restore", 2, "b", null);
    await d.call("resync", 2, "b", "move");
  }
};

function runAll(ownerName) {
  return async function () {
    const out = {};
    for (const scenarioName of Object.keys(SCENARIOS)) {
      const h = OWNER_BOOTS[ownerName]();
      const driver = makeDriver(h);
      await SCENARIOS[scenarioName](h, driver);
      out[scenarioName] = driver.steps;
    }
    return out;
  };
}

const recorded = {};
const record = process.env.W6B_RECORD === "1";
const golden = !record && existsSync(FIXTURE) ? JSON.parse(readFileSync(FIXTURE, "utf8")) : {};

for (const ownerName of Object.keys(OWNER_BOOTS)) {
  test("filter tab mutation characterisation: " + ownerName, async () => {
    const actual = J(await runAll(ownerName)());
    recorded[ownerName] = actual;
    if (record) { return; }
    for (const scenarioName of Object.keys(SCENARIOS)) {
      assert.deepEqual(actual[scenarioName], golden[ownerName] && golden[ownerName][scenarioName], ownerName + " / " + scenarioName);
    }
    assert.deepEqual(Object.keys(actual), Object.keys(golden[ownerName] || {}));
  });
}

test("filter tab mutation characterisation: every phase of every owner is exercised", () => {
  if (record) { return; }
  for (const ownerName of Object.keys(OWNER_BOOTS)) {
    const text = JSON.stringify(golden[ownerName]);
    ["prepare", "apply", "restore", "resync"].forEach((phase) => {
      assert.ok(text.indexOf('"step":"' + phase + " run=") >= 0, ownerName + " " + phase);
    });
  }
});

test.after(() => {
  if (record) { writeFileSync(FIXTURE, JSON.stringify(recorded, null, 1) + "\n"); }
});
