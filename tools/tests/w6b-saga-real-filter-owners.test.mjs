// The tabs saga (real: plans, reducer, history, widgetBase slot-stock handlers over a fake placement) driving the REAL
// filter owners: tab delete, duplicate, move, their undo/redo, forced host failures and a recovering host (Phase 2 W6b).
// Extends tools/tests/w6a-tab-mutation.test.mjs, which uses fake filter owners. Recorded on the code BEFORE the shared
// runner; the golden must not change afterwards.
// Run: node --test tools/tests/w6b-saga-real-filter-owners.test.mjs   (W6B_RECORD=1 rewrites the fixture)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeWorld, run, replay, tabNames, readSnapshotStores, OWNER_RUNTIME_KEYS, normalize } from "./lib/w6b-saga-world.mjs";

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/w6b-saga-real-filter-owners.golden.json");

function summarise(world, result) {
  const owners = {};
  OWNER_RUNTIME_KEYS.forEach((name) => {
    const view = world.real[name].view();
    owners[name] = { state: view.state, host: view.host, runtime: view.runtime, console: world.real[name].takeConsole() };
  });
  return normalize({
    result: result && {
      ok: result.ok, outcome: result.outcome, phases: Object.keys(result.phases || {}).map((key) => [key, result.phases[key].status]),
      diagnostics: (result.diagnostics || []).map((entry) => [entry.phase, entry.code, entry.owner || null, entry.message || null])
    },
    tabs: tabNames(world.KDB),
    ownerCalls: world.log.filter((entry) => OWNER_RUNTIME_KEYS.indexOf(entry[0]) >= 0),
    history: world.history,
    snapshotStores: readSnapshotStores(world.KDB, OWNER_RUNTIME_KEYS),
    lock: Object.keys(world.KDB.runtime.tabs.pendingPromises),
    owners: owners
  });
}

async function undoRedo(world) {
  const step = world.history[0];
  world.log.push(["undo", await replay(world, step, "undo")]);
  world.log.push(["redo", await replay(world, step, "redo")]);
}

const SCENARIOS = {
  "delete tab B": async (world) => run(world, "tabs/delete", { tabId: "t1" }),
  "duplicate tab A": async (world) => run(world, "tabs/duplicate", { tabId: "t0" }),
  "move tab A to position 2": async (world) => run(world, "tabs/move", { tabId: "t0", targetPosition: 2 }),
  "delete tab B, undo, redo": async (world) => { await run(world, "tabs/delete", { tabId: "t1" }); await undoRedo(world); },
  "duplicate tab A, undo, redo": async (world) => { await run(world, "tabs/duplicate", { tabId: "t0" }); await undoRedo(world); },
  "move tab A to position 2, undo, redo": async (world) => { await run(world, "tabs/move", { tabId: "t0", targetPosition: 2 }); await undoRedo(world); },
  "delete tab B, singleSelect host offline": { options: { failWrites: "singleSelect" }, run: (world) => run(world, "tabs/delete", { tabId: "t1" }) },
  "duplicate tab A, dienststelle host offline": { options: { failWrites: "dienststelle" }, run: (world) => run(world, "tabs/duplicate", { tabId: "t0" }) },
  "move tab A, nativeMultiSelect host throws": { options: { throwWrites: "nativeMultiSelect" }, run: (world) => run(world, "tabs/move", { tabId: "t0", targetPosition: 2 }) },
  "delete tab B, singleSelect host recovers after the first failed write": {
    options: { failWrites: "singleSelect" },
    prepare: (world) => { const c = world.real.singleSelect.control; c.afterFailedWrite = () => { c.failWrites = false; }; },
    run: (world) => run(world, "tabs/delete", { tabId: "t1" })
  },
  "move tab A, dienststelle host recovers after the first failed write": {
    options: { failWrites: "dienststelle" },
    prepare: (world) => { const c = world.real.dienststelle.control; c.afterFailedWrite = () => { c.failWrites = false; }; },
    run: (world) => run(world, "tabs/move", { tabId: "t0", targetPosition: 2 })
  },
  "delete tab B, commit fails after every filter applied": { options: { commitFails: true }, run: (world) => run(world, "tabs/delete", { tabId: "t1" }) }
};

async function runScenario(name) {
  const spec = SCENARIOS[name];
  const world = makeWorld(Object.assign({ realFilters: true }, typeof spec === "function" ? {} : spec.options));
  if (typeof spec !== "function" && spec.prepare) { spec.prepare(world); }
  const result = await (typeof spec === "function" ? spec : spec.run)(world);
  return summarise(world, result);
}

if (process.env.W6B_RECORD === "1") {
  const recorded = {};
  for (const name of Object.keys(SCENARIOS)) { recorded[name] = await runScenario(name); }
  writeFileSync(FIXTURE, JSON.stringify(recorded, null, 1) + "\n");
} else {
  const golden = existsSync(FIXTURE) ? JSON.parse(readFileSync(FIXTURE, "utf8")) : {};
  for (const name of Object.keys(SCENARIOS)) {
    test("real filter owners behind the tabs saga: " + name, async () => {
      const summary = await runScenario(name);
      assert.deepStrictEqual(summary, golden[name]);
      assert.deepStrictEqual(summary.snapshotStores, { widgetBase: [], singleSelect: [], dienststelle: [], nativeMultiSelect: [] });
    });
  }
  test("the golden covers exactly the scenarios", () => assert.deepEqual(Object.keys(golden), Object.keys(SCENARIOS)));
}
