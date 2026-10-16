// Routing table test for singleSelect/index.js: which handler each action type reaches, with which arguments.
// Run: node --test tools/tests/singleSelect.index.routing.test.mjs
// When a handler module moves, edit only ROUTES and MODULES.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const SS = path.join(JS_ROOT, "dashboard/filters/singleSelect");
const PREFIX = "singleSelect/";

// Each row: action type, the handler id it must reach, and how that handler receives the payload.
// "action" = the handler gets the whole { type, payload } action;
// "payload" = the handler gets the payload as third argument (every current route).
const ROUTES = [
  { type: "parameterSetClearRequested", handler: "parameterSet.clear", payloadAs: "payload", disposed: true },
  { type: "parameterSetRestoreRequested", handler: "parameterSet.restore", payloadAs: "payload", disposed: true },
  { type: "parameterSetResyncRequested", handler: "parameterSet.resync", payloadAs: "payload", disposed: true },
  { type: "parameterSetRunFinished", handler: "parameterSet.runFinished", payloadAs: "payload", disposed: true },
  { type: "reconcileFilterInstances", handler: "reconcile", payloadAs: "payload", disposed: true },
  { type: "applyOwnerSelection", handler: "ownerSelection", payloadAs: "payload", disposed: true },
  { type: "applySpecialSelectionPolicy", handler: "specialPolicy", payloadAs: "payload", disposed: true },
  { type: "prepareTabMutation", handler: "tabMutation.prepare", payloadAs: "payload", disposed: true },
  { type: "applyTabMutation", handler: "tabMutation.apply", payloadAs: "payload", disposed: true },
  { type: "restoreTabMutationSnapshot", handler: "tabMutation.restoreSnapshot", payloadAs: "payload", disposed: true },
  { type: "resyncTabMutationHost", handler: "tabMutation.resyncHost", payloadAs: "payload", disposed: false }
];

const calls = [];
function spy(id, wrap) {
  return function (K, rt, arg) {
    calls.push({ handler: id, K, rt, arg, argc: arguments.length });
    return Promise.resolve(wrap ? wrap(arg) : { handled: id });
  };
}

const MODULES = {
  "./restore/clear.js": { handleParameterSetClear: spy("parameterSet.clear") },
  "./restore/restore.js": { handleParameterSetRestore: spy("parameterSet.restore") },
  "./restore/resync.js": { handleParameterSetResync: spy("parameterSet.resync") },
  "./restore/runs.js": { handleParameterSetRunFinished: spy("parameterSet.runFinished") },
  "./tabMutation/prepare.js": { prepareTabMutation: spy("tabMutation.prepare") },
  "./tabMutation/apply.js": { applyTabMutation: spy("tabMutation.apply") },
  "./tabMutation/restore.js": { restoreTabMutationSnapshot: spy("tabMutation.restoreSnapshot") },
  "./tabMutation/resync.js": { resyncTabMutationHost: spy("tabMutation.resyncHost") },
  "./inventory/reconcile.js": { reconcileFilterInstances: spy("reconcile") },
  "./commit/ownerSelection.js": { applyOwnerSelection: spy("ownerSelection") },
  "./commit/specialPolicy.js": { applySpecialSelectionPolicy: spy("specialPolicy") }
};

const logged = [];
const quietConsole = {
  log() {}, info() {}, debug() {},
  warn(...a) { logged.push(["warn", ...a]); },
  error(...a) { logged.push(["error", ...a]); }
};

function boot() {
  const register = loadAmd(path.join(SS, "index.js"), { stubs: { console: quietConsole }, modules: MODULES });
  const KDB = { state: {}, api: {}, elements: {}, services: {} };
  const controller = register(KDB, {});
  return { KDB, controller };
}

const DISPOSED_SHAPE = {
  ok: false, degraded: false, applied: [], skipped: [],
  diagnostics: [{ code: "WRITEBACK_RESTORE_CANCELLED", message: "singleSelect controller is disposed" }]
};

for (const route of ROUTES) {
  test("routing: " + route.type + " reaches " + route.handler, async () => {
    const { KDB, controller } = boot();
    calls.length = 0;
    const payload = { marker: route.type };
    const result = await controller.dispatch({ type: PREFIX + route.type, payload });
    assert.equal(calls.length, 1);
    const call = calls[0];
    assert.equal(call.handler, route.handler);
    assert.equal(call.K, KDB);
    assert.ok(call.rt && typeof call.rt === "object", "runtime is passed as second argument");
    if (route.payloadAs === "action") {
      assert.deepEqual(call.arg, { type: PREFIX + route.type, payload });
    } else {
      assert.equal(call.arg, payload);
    }
    assert.deepEqual(result, { handled: route.handler });
    controller.destroy();
  });
}

test("routing: handlers receive the same runtime object across action types", async () => {
  const { controller } = boot();
  calls.length = 0;
  for (const route of ROUTES) {
    await controller.dispatch({ type: PREFIX + route.type, payload: {} });
  }
  assert.equal(calls.length, ROUTES.length);
  assert.equal(new Set(calls.map((c) => c.rt)).size, 1);
  controller.destroy();
});

for (const route of ROUTES) {
  test("routing after destroy: " + route.type + (route.disposed ? " returns the disposed result" : " is excluded"), async () => {
    const { controller } = boot();
    controller.destroy();
    calls.length = 0;
    const result = controller.dispatch({ type: PREFIX + route.type, payload: { runId: 3 } });
    assert.equal(calls.length, 0, "no handler runs once disposed");
    if (!route.disposed) {
      assert.equal(result, undefined);
      return;
    }
    const resolved = await result;
    if (route.type === "parameterSetRunFinished") {
      assert.deepEqual(resolved, {
        ok: false, runId: 3, released: false, alreadyReleased: false,
        diagnostics: DISPOSED_SHAPE.diagnostics
      });
    } else {
      assert.deepEqual(resolved, DISPOSED_SHAPE);
    }
  });
}

test("routing: disposed list holds exactly the flagged types", () => {
  assert.equal(ROUTES.filter((r) => r.disposed).length, 10);
  assert.equal(ROUTES.length, 11);
});

test("routing: unknown and malformed actions return the state unreduced", () => {
  const { KDB, controller } = boot();
  const before = controller.getState();
  calls.length = 0;
  for (const action of [
    { type: PREFIX + "bogus", payload: { x: 1 } },
    { type: "other/parameterSetClearRequested", payload: {} },
    { type: PREFIX + "toString", payload: {} },
    { type: PREFIX + "hasOwnProperty", payload: {} },
    { type: undefined },
    undefined,
    null
  ]) {
    const result = controller.dispatch(action);
    assert.equal(typeof result.then, "undefined", "state is returned synchronously");
    assert.equal(result.lifecycle, before.lifecycle);
    assert.deepEqual(result, controller.getState());
  }
  assert.equal(calls.length, 0);
  assert.equal(KDB.state.filters.singleSelect.lifecycle, before.lifecycle);
  controller.destroy();
});

test("routing: unknown actions after destroy return undefined", () => {
  const { controller } = boot();
  controller.destroy();
  assert.equal(controller.dispatch({ type: PREFIX + "bogus" }), undefined);
});
