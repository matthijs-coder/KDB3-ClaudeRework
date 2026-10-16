// Second characterisation pass of the filter owners' tab-mutation actions (Phase 2 W6b review): the interleavings the
// first golden (w6b-filter-tab-mutation) does not reach, recorded on the code BEFORE the shared runner.
//   - the Nth host write fails after earlier writes landed (delete, duplicate, move, shift, restoreDeleted)
//   - the run is superseded, or the owner is destroyed, as write N begins (during apply and during restore)
//   - restoreDeleted with throwing writes, a prepare that throws (log shape), a tabs facet that throws or returns
//     unstringifiable ids, a console that throws inside an owner catch
//   - malformed input: non-array / sparse slotMoves, array operations, resync diagnostics with undefined keys,
//     a runtime whose ledger was wiped or holds a falsy entry, destroy inside prepare
// The "[tabMutationRun.*] failed" lines of the core utils are left out of the console record: the W6b log-only commit
// removes them on purpose (the owner boundary's own line stays and is recorded).
// Values are serialised so that undefined-valued keys stay visible ("<undefined>"): the first golden's JSON drops them.
// Run: node --test tools/tests/w6b-filter-tab-mutation-gaps.test.mjs   (W6B_RECORD=1 rewrites the fixture)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OWNER_BOOTS } from "./lib/w6b-filter-hosts.mjs";

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/w6b-filter-tab-mutation-gaps.golden.json");
const S = (value) => (value === undefined ? "__undefined__" : JSON.parse(JSON.stringify(value, (key, item) => (item === undefined ? "<undefined>" : item))));

const slot = (i) => ({ tabId: "t" + i, tabIdx: i, index: i });
const mv = (f, t) => ({ fromTabId: "t" + f, fromTabIdx: f, fromIndex: f, toTabId: "t" + t, toTabIdx: t, toIndex: t });
const PLANS = {
  move: () => ({ operation: "move", sourceSlot: slot(0), targetTabIdx: 1, slotMoves: [mv(0, 1), mv(1, 0)] }),
  shift: () => ({ operation: "move", sourceSlot: slot(0), targetTabIdx: 2, slotMoves: [mv(0, 2), mv(1, 0), mv(2, 1)] }),
  delete: () => ({ operation: "delete", deletedSlot: slot(1), hideSlot: slot(2), slotMoves: [mv(2, 1)] }),
  duplicate: () => ({
    operation: "duplicate", sourceSlot: slot(0), insertSlot: slot(1), revealSlot: slot(2), slotMoves: [mv(1, 2)],
    clonePair: { from: slot(0), to: slot(1) }
  })
};
const restorePlan = (slice, owner) => ({
  operation: "restoreDeleted", insertSlot: slot(1), revealSlot: slot(2), slotMoves: [mv(1, 2)], restore: { filters: { [owner]: slice } }
});

function diffView(previous, current) {
  if (!previous) { return current; }
  const out = {};
  Object.keys(current).forEach((key) => {
    if (JSON.stringify(previous[key]) !== JSON.stringify(current[key])) { out[key] = current[key]; }
  });
  return out;
}

function rawRuntime(h) {
  const rt = h.runtime();
  const snapshots = rt ? rt.tabMutationSnapshots : undefined;
  return {
    keys: rt ? Object.keys(rt).filter((key) => /^tabMutation/.test(key)).sort() : "no runtime",
    runId: rt ? rt.tabMutationRunId : undefined,
    operationId: rt ? rt.tabMutationOperationId : undefined,
    snapshots: snapshots === null ? "null" : snapshots === undefined ? "undefined" : Object.keys(snapshots).sort().map((id) => id + "=" + (snapshots[id] === null ? "null" : typeof snapshots[id]))
  };
}

function makeDriver(h) {
  const steps = [];
  let previous = null;
  const record = (label, result, thrown) => {
    const view = S(h.view());
    view.raw = S(rawRuntime(h));
    steps.push({ step: label, result: S(result), thrown: thrown, view: diffView(previous, view), log: S(h.takeLog()), console: S(h.takeConsole().filter((entry) => String(entry[1]).indexOf("[tabMutationRun.") !== 0)) });
    previous = view;
  };
  async function call(phase, runId, operationId, plan, extra) {
    const payload = Object.assign({ source: "tabsMutation", skipHistory: true, plan: plan || null, tabIdxToScopeId: h.targets }, extra || {});
    if (runId !== undefined) { payload.runId = runId; }
    if (operationId !== undefined) { payload.operationId = operationId; }
    let result;
    let thrown = null;
    try {
      result = await h.api.dispatch({ type: h.types[phase], payload: payload });
    } catch (error) {
      thrown = String(error && error.message ? error.message : error);
    }
    record(phase + " run=" + runId + " op=" + operationId + " plan=" + (plan ? plan.operation : null), result, thrown);
    return result;
  }
  return { call, note: (label) => record(label), steps };
}

const OPS = ["delete", "duplicate", "move", "shift"];
const SCENARIOS = {};

OPS.forEach((op) => {
  for (let n = 1; n <= 6; n += 1) {
    SCENARIOS["failAfter " + n + " writes / " + op] = async (h, d) => {
      await d.call("prepare", 1, "a", PLANS[op]());
      h.control.failAfter = n;
      await d.call("apply", 1, "a", PLANS[op]());
      h.control.failAfter = null;
      await d.call("restore", 1, "a", null);
    };
    SCENARIOS["supersede as write " + n + " begins during apply / " + op] = async (h, d) => {
      await d.call("prepare", 1, "a", PLANS[op]());
      h.control.atWrite = { n: n, fn: () => { h.runtime().tabMutationRunId = 99; } };
      await d.call("apply", 1, "a", PLANS[op]());
      await d.call("restore", 99, "a", null);
    };
    SCENARIOS["destroy as write " + n + " begins during apply / " + op] = async (h, d) => {
      await d.call("prepare", 1, "a", PLANS[op]());
      h.control.atWrite = { n: n, fn: () => { h.api.destroy(); } };
      await d.call("apply", 1, "a", PLANS[op]());
      d.note("after apply");
      await d.call("restore", 1, "a", null);
    };
  }
});

["delete", "move", "duplicate"].forEach((op) => {
  for (let n = 1; n <= 4; n += 1) {
    SCENARIOS["supersede as write " + n + " begins during restore / " + op] = async (h, d) => {
      await d.call("prepare", 1, "a", PLANS[op]());
      await d.call("apply", 1, "a", PLANS[op]());
      h.control.writes = 0;
      h.control.atWrite = { n: n, fn: () => { h.runtime().tabMutationRunId = 99; } };
      await d.call("restore", 1, "a", null);
      await d.call("restore", 99, "a", null);
    };
    SCENARIOS["destroy as write " + n + " begins during restore / " + op] = async (h, d) => {
      await d.call("prepare", 1, "a", PLANS[op]());
      await d.call("apply", 1, "a", PLANS[op]());
      h.control.writes = 0;
      h.control.atWrite = { n: n, fn: () => { h.api.destroy(); } };
      await d.call("restore", 1, "a", null);
      d.note("after restore");
    };
    SCENARIOS["restore fails after " + n + " writes / " + op] = async (h, d) => {
      await d.call("prepare", 1, "a", PLANS[op]());
      await d.call("apply", 1, "a", PLANS[op]());
      h.control.writes = 0;
      h.control.failAfter = n;
      await d.call("restore", 1, "a", null);
      h.control.failAfter = null;
      await d.call("restore", 1, "a", null);
    };
  }
});

async function deleteThenRestorePlan(h, d) {
  const prepared = await d.call("prepare", 1, "a", PLANS.delete());
  await d.call("apply", 1, "a", PLANS.delete());
  return () => restorePlan(prepared && prepared.historySlice, h.name);
}

for (let n = 1; n <= 5; n += 1) {
  SCENARIOS["restoreDeleted fails after " + n + " writes"] = async (h, d) => {
    const plan = await deleteThenRestorePlan(h, d);
    await d.call("prepare", 2, "b", plan());
    h.control.writes = 0;
    h.control.failAfter = n;
    await d.call("apply", 2, "b", plan());
    h.control.failAfter = null;
    await d.call("restore", 2, "b", null);
  };
}

SCENARIOS["restoreDeleted apply with throwing writes"] = async (h, d) => {
  const plan = await deleteThenRestorePlan(h, d);
  await d.call("prepare", 2, "b", plan());
  h.control.throwWrites = true;
  await d.call("apply", 2, "b", plan());
  h.control.throwWrites = false;
  await d.call("restore", 2, "b", null);
};

SCENARIOS["restoreDeleted apply with a throwing slice"] = async (h, d) => {
  await d.call("prepare", 1, "a", PLANS.delete());
  await d.call("prepare", 2, "b", restorePlan({ get BROKEN() { throw new Error("slice boom"); } }, h.name));
  await d.call("apply", 2, "b", restorePlan(null, h.name));
  await d.call("apply", 2, "b", restorePlan(7, h.name));
};

SCENARIOS["prepare that throws, then recovers"] = async (h, d) => {
  h.armPrepareThrow();
  await d.call("prepare", 1, "a", PLANS.move());
  await d.call("prepare", 1, "a", PLANS.delete());
  h.control.readThrows = false;
  await d.call("prepare", 2, "b", PLANS.move());
};

SCENARIOS["tabs facet throws"] = async (h, d) => {
  h.control.tabsThrow = true;
  const layout = h.layoutTargets;
  await d.call("prepare", 1, "a", PLANS.move(), { tabIdxToScopeId: layout });
  await d.call("apply", 1, "a", PLANS.move(), { tabIdxToScopeId: layout });
  await d.call("resync", 1, "a", PLANS.move(), { tabIdxToScopeId: layout });
  await d.call("prepare", 2, "b", PLANS.move());
};

SCENARIOS["tab descriptors with an unstringifiable id"] = async (h, d) => {
  const hostile = { toString() { throw new Error("no string"); } };
  h.control.tabsItems = () => [{ id: hostile, pageId: "x" }, null, { id: "tab0", pageId: hostile }, { id: "page1_tabpanel", pageId: "p1" }];
  const layout = h.layoutTargets;
  await d.call("prepare", 1, "a", PLANS.move(), { tabIdxToScopeId: layout });
  await d.call("prepare", 2, "a", PLANS.move(), { tabIdxToScopeId: { 0: { tabId: "q" }, 1: { tabId: "tab1" } } });
  await d.call("apply", 2, "a", PLANS.move(), { tabIdxToScopeId: { 0: { tabId: "q" }, 1: { tabId: "tab1" } } });
  await d.call("resync", 3, "a", PLANS.move(), { tabIdxToScopeId: { 0: { tabId: "q" }, 1: { tabId: "tab1" } } });
};

SCENARIOS["console throws inside the owner catch of apply and restore"] = async (h, d) => {
  await d.call("prepare", 1, "a", PLANS.move());
  await d.call("apply", 1, "a", PLANS.move());
  h.control.throwWrites = true;
  h.control.consoleThrows = true;
  await d.call("restore", 1, "a", null);
  await d.call("prepare", 2, "b", PLANS.delete());
  await d.call("apply", 2, "b", PLANS.delete());
  h.control.throwWrites = false;
  h.control.consoleThrows = false;
  d.note("console healthy again");
};

SCENARIOS["console throws inside the owner catch of prepare and resync"] = async (h, d) => {
  h.control.consoleThrows = true;
  h.armPrepareThrow();
  await d.call("prepare", 1, "a", PLANS.move());
  await d.call("resync", 2, "b", { operation: "move", slotMoves: "abc" });
  h.control.consoleThrows = false;
};

SCENARIOS["resync and prepare with malformed slotMoves"] = async (h, d) => {
  const sparse = [];
  sparse[2] = mv(0, 1);
  const moves = {
    string: "abc", object: { length: 2, 0: mv(0, 1) }, number: 7, sparse: sparse, trueValue: true, nullEntry: [null], nested: [[mv(0, 1)]]
  };
  let run = 1;
  for (const key of Object.keys(moves)) {
    const plan = () => ({ operation: "duplicate", sourceSlot: slot(0), insertSlot: slot(1), slotMoves: moves[key], clonePair: { from: slot(0), to: slot(1) } });
    await d.call("resync", run, "r" + run, plan());
    run += 1;
    await d.call("prepare", run, "p" + run, plan());
    run += 1;
    await d.call("apply", run - 1, "p" + (run - 1), plan());
  }
};

SCENARIOS["operation values that are not plain strings"] = async (h, d) => {
  const named = (name) => ({ toString() { return name; } });
  const operations = [["delete"], named("delete"), ["move"], "constructor", "hasOwnProperty", "__proto__", 7, ""];
  let run = 1;
  for (const operation of operations) {
    const plan = () => Object.assign(PLANS.delete(), { operation: operation });
    await d.call("prepare", run, "o" + run, PLANS.delete());
    await d.call("apply", run, "o" + run, plan());
    run += 1;
  }
};

SCENARIOS["resync diagnostics keep their undefined keys"] = async (h, d) => {
  h.control.reconcileThrows = true;
  await d.call("prepare", 1, "a", PLANS.move());
  await d.call("resync", 1, "a", PLANS.move());
  await d.call("resync", 1, "a", { operation: "move", slotMoves: "abc" });
  await d.call("resync", 1, "a", { operation: "move", slotMoves: [null] });
};

SCENARIOS["ledger wiped or corrupted outside the owner"] = async (h, d) => {
  const rt = () => h.runtime();
  await d.call("prepare", 1, "a", PLANS.move());
  rt().tabMutationSnapshots = null;
  await d.call("apply", 1, "a", PLANS.move());
  await d.call("restore", 1, "a", null);
  rt().tabMutationSnapshots = undefined;
  await d.call("apply", 1, "a", PLANS.move());
  await d.call("restore", 1, "a", null);
  await d.call("prepare", 2, "b", PLANS.move());
  delete rt().tabMutationSnapshots;
  await d.call("restore", 2, "b", null);
  await d.call("prepare", 3, "c", PLANS.move());
  delete rt().tabMutationRunId;
  await d.call("restore", 3, "c", null);
  await d.call("prepare", 4, "d", PLANS.move());
  rt().tabMutationRunId = "seven";
  await d.call("apply", 4, "d", PLANS.move());
  await d.call("restore", 4, "d", null);
};

SCENARIOS["ledger entries that are falsy"] = async (h, d) => {
  const rt = () => h.runtime();
  [null, 0, "", false].forEach((value, i) => { rt().tabMutationSnapshots["f" + i] = value; });
  d.note("seeded");
  await d.call("restore", 1, "f0", null);
  await d.call("restore", 1, "f1", null);
  await d.call("apply", 1, "f2", PLANS.move());
  await d.call("restore", 1, "f2", null);
  await d.call("restore", 1, "f3", null);
};

SCENARIOS["destroy inside prepare"] = async (h, d) => {
  h.control.onRead = () => { h.api.destroy(); };
  await d.call("prepare", 1, "a", PLANS.move());
  d.note("after prepare");
  await d.call("apply", 1, "a", PLANS.move());
  await d.call("restore", 1, "a", null);
};

SCENARIOS["runtime missing the ledger or the run id before the first run"] = async (h, d) => {
  const rt = () => h.runtime();
  delete rt().tabMutationSnapshots;
  delete rt().tabMutationRunId;
  d.note("wiped");
  await d.call("restore", 1, "a", null);
  await d.call("apply", 1, "a", PLANS.move());
  delete rt().tabMutationSnapshots;
  await d.call("prepare", 1, "a", PLANS.move());
};

async function runAll(ownerName) {
  const out = {};
  for (const name of Object.keys(SCENARIOS)) {
    const h = OWNER_BOOTS[ownerName]();
    const driver = makeDriver(h);
    await SCENARIOS[name](h, driver);
    out[name] = driver.steps;
  }
  return out;
}

const recorded = {};
const record = process.env.W6B_RECORD === "1";
const golden = !record && existsSync(FIXTURE) ? JSON.parse(readFileSync(FIXTURE, "utf8")) : {};

for (const ownerName of Object.keys(OWNER_BOOTS)) {
  test("filter tab mutation gaps: " + ownerName, async () => {
    const actual = S(await runAll(ownerName));
    recorded[ownerName] = actual;
    if (record) { return; }
    const expected = golden[ownerName] || {};
    const differing = Object.keys(SCENARIOS).filter((name) => JSON.stringify(actual[name]) !== JSON.stringify(expected[name]));
    assert.deepEqual(differing, [], ownerName + ": scenarios that differ from the recording");
    assert.deepEqual(Object.keys(actual), Object.keys(golden[ownerName] || {}));
  });
}

test.after(() => {
  if (record) { writeFileSync(FIXTURE, JSON.stringify(recorded) + "\n"); }
});
