// Golden test for core/services/historyService (WS-D2): push / undo / redo / replay / writeback restore / destroy.
// Run: node --test tools/tests/ws-d-history.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";

const JS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../_____________KDB3API/KDB3/js");
const ENTRY = JS_ROOT + "/core/services/historyService/__orchestratorHistoryService.js";

function quietConsole() {
  const calls = { warn: [], error: [] };
  return { calls, warn: (...a) => calls.warn.push(a), error: (...a) => calls.error.push(a), log() {}, info() {} };
}

function setup(options, preset) {
  const con = quietConsole();
  const register = loadAmd(ENTRY, { stubs: { console: con } });
  const emitted = [];
  const notified = [];
  const _KDB = Object.assign(
    {
      events: { emit: (name, payload) => emitted.push({ name, payload }) },
      services: { message: { notify: (m) => notified.push(m) } },
    },
    preset || {}
  );
  const service = register(_KDB, options);
  return { register, _KDB, service, emitted, notified, con };
}

const step = (key, o, n, extra) => Object.assign({ key, old: o, new: n }, extra || {});
const payload = (pointer, stackLength, canUndo, canRedo) => ({ pointer, stackLength, limit: 5, canUndo, canRedo });

function deferred() {
  let resolveFn;
  const promise = new Promise((r) => { resolveFn = r; });
  return { promise, resolve: resolveFn };
}

test("registration: initial state, runtime shape, service surface, single instance", () => {
  const { register, _KDB, service, emitted } = setup();
  assert.deepStrictEqual(Object.keys(service).sort(), [
    "beginWritebackRestore", "canRedo", "canUndo", "destroy", "finishWritebackRestore",
    "getSnapshot", "pushCommittedStep", "redo", "undo",
  ]);
  assert.deepStrictEqual(_KDB.state.history, {
    lifecycle: "ready", stack: [], pointer: -1, limit: 5, pendingStep: null,
    lastChangedAt: null, errorCode: null, errorMessage: null,
  });
  const rt = _KDB.runtime.history;
  assert.deepStrictEqual(Object.keys(rt).sort(), [
    "abortControllers", "adapters", "listeners", "pendingPromises", "replay",
    "subscriptions", "timers", "writebackRestore",
  ]);
  assert.equal(typeof rt.adapters.bindReplayHandlers, "function");
  assert.deepStrictEqual(rt.writebackRestore, { active: false, runId: null, source: null, status: null, lastFinish: null });
  assert.deepStrictEqual(rt.replay, { active: false, direction: null });
  assert.deepStrictEqual(emitted, [{ name: "history:changed", payload: payload(-1, 0, false, false) }]);
  assert.equal(register(_KDB), service);
  assert.equal(_KDB.services.history, service);
  assert.equal(service.canUndo(), false);
  assert.equal(service.canRedo(), false);
});

test("registration: preset state and runtime flags are normalised, not discarded", () => {
  const stack = [step("a", null, { v: 1 }, { timestamp: 1 }), step("a", { v: 1 }, { v: 2 }, { timestamp: 2 })];
  const { _KDB, service } = setup(undefined, {
    state: { history: { lifecycle: "error", stack, pointer: 0, limit: -3, lastChangedAt: 7, errorCode: 12, errorMessage: null } },
    runtime: { history: { writebackRestore: { active: true, runId: 4, source: "s" }, replay: { active: true, direction: "undo" } } },
  });
  const s = _KDB.state.history;
  assert.equal(s.limit, 5);
  assert.equal(s.pointer, 0);
  assert.equal(s.lastChangedAt, 7);
  assert.equal(s.errorCode, "12");
  assert.equal(s.lifecycle, "ready");
  assert.deepStrictEqual(_KDB.runtime.history.writebackRestore, { active: true, runId: 4, source: "s", status: null, lastFinish: null });
  assert.deepStrictEqual(_KDB.runtime.history.replay, { active: true, direction: "undo" });
  assert.equal(service.canUndo(), false);
  assert.deepStrictEqual(service.getSnapshot(), { stack, pointer: 0, limit: 5 });
});

test("pushCommittedStep: accepted step shape, emit payload, input isolation", () => {
  const { service, emitted } = setup();
  emitted.length = 0;
  const input = { key: "  tabs.rename  ", old: { n: "a", list: [1, { x: 1 }] }, new: { n: "b" }, timestamp: 42, extra: "dropped", other: { q: 1 } };
  assert.equal(service.pushCommittedStep(input), true);
  input.old.n = "mutated";
  input.old.list[1].x = 99;
  assert.deepStrictEqual(service.getSnapshot(), {
    stack: [{ key: "tabs.rename", timestamp: 42, old: { n: "a", list: [1, { x: 1 }] }, new: { n: "b" } }],
    pointer: 0,
    limit: 5,
  });
  assert.deepStrictEqual(emitted, [{ name: "history:changed", payload: payload(0, 1, true, false) }]);
  assert.equal(service.canUndo(), true);
  assert.equal(service.canRedo(), false);
  const before = Date.now();
  service.pushCommittedStep(step("k", null, { v: 1 }, { timestamp: Infinity }));
  const stored = service.getSnapshot().stack[1];
  assert.equal(typeof stored.timestamp, "number");
  assert.ok(stored.timestamp >= before && stored.timestamp <= Date.now());
  assert.deepStrictEqual(Object.keys(stored), ["key", "timestamp", "old", "new"]);
  assert.equal(stored.old, null);
  service.pushCommittedStep(step("k2", undefined, { v: 1 }));
  assert.equal(service.getSnapshot().stack[2].old, null);
});

test("pushCommittedStep: getSnapshot result is a copy", () => {
  const { service, _KDB } = setup();
  service.pushCommittedStep(step("k", { a: 1 }, { a: 2 }, { timestamp: 1 }));
  const snap = service.getSnapshot();
  snap.stack[0].old.a = 100;
  snap.stack.push("x");
  snap.pointer = 9;
  assert.deepStrictEqual(service.getSnapshot(), { stack: [{ key: "k", timestamp: 1, old: { a: 1 }, new: { a: 2 } }], pointer: 0, limit: 5 });
  assert.equal(_KDB.state.history.pointer, 0);
  assert.equal(_KDB.state.history.stack.length, 1);
});

test("pushCommittedStep: rejection rules", () => {
  const { service, emitted, _KDB } = setup();
  emitted.length = 0;
  const circular = {};
  circular.self = circular;
  const rejected = [
    null, undefined, "str", 5,
    step("", { a: 1 }, { a: 2 }),
    step("   ", { a: 1 }, { a: 2 }),
    step(7, { a: 1 }, { a: 2 }),
    { old: { a: 1 }, new: { a: 2 } },
    step("k", [1], { a: 2 }),
    step("k", { a: 1 }, [2]),
    step("k", "text", { a: 2 }),
    step("k", { a: 1 }, 5),
    step("k", { a: 1 }, () => 1),
    step("k", circular, { a: 2 }),
    step("k", { a: 1 }, { toJSON: () => undefined }),
    step("k", { a: 1 }, { a: 1 }),
    step("k", { a: 1, b: { c: [1, 2] } }, { a: 1, b: { c: [1, 2] } }),
    step("k", null, null),
    step("k", null, undefined),
    step("k", { a: undefined, f() {} }, {}),
    step("k", { a: 1, f() {} }, { a: 1 }),
  ];
  rejected.forEach((candidate, index) => {
    assert.equal(service.pushCommittedStep(candidate), false, "rejected case " + index);
  });
  assert.equal(_KDB.state.history.stack.length, 0);
  assert.deepStrictEqual(emitted, []);
});

test("pushCommittedStep: equality is order-sensitive JSON compare; null vs {} is a change", () => {
  const { service } = setup();
  assert.equal(service.pushCommittedStep(step("k", { a: 1, b: 2 }, { b: 2, a: 1 })), true);
  assert.equal(service.pushCommittedStep(step("k", null, {})), true);
  assert.equal(service.pushCommittedStep(step("k", {}, null)), true);
  assert.equal(service.getSnapshot().stack.length, 3);
});

test("pushCommittedStep: Date values serialise like JSON; thrown getters record an error and recover", () => {
  const { service, _KDB, con } = setup();
  assert.equal(service.pushCommittedStep(step("k", { when: new Date(0) }, { when: null }, { timestamp: 1 })), true);
  assert.deepStrictEqual(service.getSnapshot().stack[0].old, { when: "1970-01-01T00:00:00.000Z" });
  const hostile = { get key() { throw new Error("boom"); }, old: null, new: { a: 1 } };
  assert.equal(service.pushCommittedStep(hostile), false);
  assert.equal(_KDB.state.history.lifecycle, "error");
  assert.equal(_KDB.state.history.errorCode, "historyServicePublicMethodFailed");
  assert.equal(_KDB.state.history.errorMessage, "boom");
  assert.equal(con.calls.error.length, 1);
  assert.equal(con.calls.error[0][0], "[historyService.pushCommittedStep] public method failed");
  assert.equal(service.pushCommittedStep(step("k", { a: 1 }, { a: 2 })), true);
  assert.equal(_KDB.state.history.lifecycle, "ready");
  assert.equal(_KDB.state.history.errorCode, null);
  assert.equal(_KDB.state.history.errorMessage, null);
});

test("limit 5: oldest step dropped, pointer at tail", () => {
  const { service, _KDB, emitted } = setup();
  for (let i = 0; i < 6; i += 1) service.pushCommittedStep(step("k", { v: i }, { v: i + 1 }, { timestamp: i }));
  const snap = service.getSnapshot();
  assert.equal(snap.stack.length, 5);
  assert.equal(snap.pointer, 4);
  assert.equal(snap.limit, 5);
  assert.deepStrictEqual(snap.stack.map((s) => s.timestamp), [1, 2, 3, 4, 5]);
  assert.equal(typeof _KDB.state.history.lastChangedAt, "number");
  assert.deepStrictEqual(emitted[emitted.length - 1].payload, payload(4, 5, true, false));
});

test("undo / redo: handler args, pointer, emit sequence, redo-tail truncation", async () => {
  const calls = [];
  const handler = { apply: (...args) => { calls.push(args); return true; } };
  const { service, _KDB, emitted, notified } = setup({ replayHandlers: { k: handler } });
  service.pushCommittedStep(step("k", { v: 0 }, { v: 1 }, { timestamp: 1 }));
  service.pushCommittedStep(step("k", { v: 1 }, { v: 2 }, { timestamp: 2 }));
  emitted.length = 0;

  assert.equal(await service.undo(), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], _KDB);
  assert.deepStrictEqual(calls[0][1], { v: 1 });
  assert.deepStrictEqual(calls[0][2], { key: "k", timestamp: 2, old: { v: 1 }, new: { v: 2 } });
  assert.deepStrictEqual(calls[0][3], { direction: "undo" });
  assert.deepStrictEqual(emitted.map((e) => e.payload), [payload(1, 2, false, false), payload(0, 2, true, true)]);
  assert.equal(_KDB.state.history.pointer, 0);
  assert.equal(service.canUndo(), true);
  assert.equal(service.canRedo(), true);

  assert.equal(await service.redo(), true);
  assert.deepStrictEqual(calls[1][1], { v: 2 });
  assert.deepStrictEqual(calls[1][3], { direction: "redo" });
  assert.equal(_KDB.state.history.pointer, 1);

  assert.equal(await service.undo(), true);
  assert.equal(await service.undo(), true);
  assert.equal(_KDB.state.history.pointer, -1);
  assert.deepStrictEqual(calls[3][1], { v: 0 });
  emitted.length = 0;
  assert.equal(await service.undo(), false);
  assert.deepStrictEqual(emitted, []);
  assert.equal(calls.length, 4);

  assert.equal(service.pushCommittedStep(step("k", { v: 9 }, { v: 10 }, { timestamp: 3 })), true);
  const snap = service.getSnapshot();
  assert.deepStrictEqual(snap.stack.map((s) => s.timestamp), [3]);
  assert.equal(snap.pointer, 0);
  assert.equal(await service.redo(), false);
  assert.deepStrictEqual(notified, []);
  assert.deepStrictEqual(_KDB.runtime.history.replay, { active: false, direction: null });
});

test("replay failures: false result, thrown handler, missing handler, truthy non-true", async () => {
  const mode = { value: "false" };
  const handler = {
    apply: () => {
      if (mode.value === "throw") throw new Error("apply failed");
      if (mode.value === "reject") return Promise.reject(new Error("apply rejected"));
      if (mode.value === "truthy") return 1;
      return false;
    },
  };
  const { service, _KDB, notified, con, emitted } = setup({ replayHandlers: { k: handler } });
  service.pushCommittedStep(step("k", { v: 0 }, { v: 1 }));
  service.pushCommittedStep(step("unknown", { v: 0 }, { v: 1 }));
  assert.equal(await service.undo(), false);
  assert.deepStrictEqual(con.calls.warn.pop(), ["[historyService.applyHistoryStep] handler missing", "unknown"]);
  assert.equal(_KDB.state.history.pointer, 1);
  _KDB.state.history = Object.assign({}, _KDB.state.history, { pointer: 0 });

  const undoText = "Rückgängig machen ist fehlgeschlagen; die Änderung wurde nicht zurückgenommen.";
  const redoText = "Wiederholen ist fehlgeschlagen; die Änderung wurde nicht erneut angewendet.";
  for (const m of ["false", "throw", "reject", "truthy"]) {
    mode.value = m;
    notified.length = 0;
    emitted.length = 0;
    assert.equal(await service.undo(), false, m);
    assert.deepStrictEqual(notified, [{ severity: "error", message: undoText }], m);
    assert.equal(_KDB.state.history.pointer, 0, m);
    assert.deepStrictEqual(emitted.map((e) => e.payload), [payload(0, 2, false, false), payload(0, 2, true, true)], m);
    assert.equal(_KDB.state.history.lifecycle, "ready", m);
  }
  assert.equal(con.calls.error.filter((c) => c[0] === "[historyService.applyHistoryStep] replay failed").length, 2);
  notified.length = 0;
  assert.equal(await service.redo(), false);
  assert.deepStrictEqual(notified, [{ severity: "error", message: redoText }]);
  assert.equal(_KDB.state.history.pointer, 0);
});

test("replay failure without a message service does not throw", async () => {
  const { service, _KDB } = setup({ replayHandlers: { k: { apply: () => false } } });
  _KDB.services.message = null;
  service.pushCommittedStep(step("k", { v: 0 }, { v: 1 }));
  assert.equal(await service.undo(), false);
});

test("replay failure: a throwing message service is swallowed with a warning", async () => {
  const { service, _KDB, con } = setup({ replayHandlers: { k: { apply: () => false } } });
  _KDB.services.message = { notify: () => { throw new Error("toast"); } };
  service.pushCommittedStep(step("k", { v: 0 }, { v: 1 }));
  assert.equal(await service.undo(), false);
  assert.equal(con.calls.warn[0][0], "[historyService.runReplay] failure message failed");
});

test("replay lock: second undo/redo while pending resolves false, flags and payloads", async () => {
  const gate = deferred();
  let applied = 0;
  const { service, _KDB, emitted } = setup({ replayHandlers: { k: { apply: () => { applied += 1; return gate.promise; } } } });
  service.pushCommittedStep(step("k", { v: 0 }, { v: 1 }));
  service.pushCommittedStep(step("k", { v: 1 }, { v: 2 }));
  emitted.length = 0;
  const first = service.undo();
  assert.deepStrictEqual(_KDB.runtime.history.replay, { active: true, direction: "undo" });
  assert.equal(service.canUndo(), false);
  assert.equal(service.canRedo(), false);
  assert.equal(await service.undo(), false);
  assert.equal(await service.redo(), false);
  assert.equal(applied, 1);
  assert.deepStrictEqual(emitted.map((e) => e.payload), [payload(1, 2, false, false)]);
  gate.resolve(true);
  assert.equal(await first, true);
  assert.equal(_KDB.state.history.pointer, 0);
  assert.deepStrictEqual(_KDB.runtime.history.replay, { active: false, direction: null });
  assert.deepStrictEqual(emitted.map((e) => e.payload), [payload(1, 2, false, false), payload(0, 2, true, true)]);
});

test("replay handlers: replaced wholesale by bindReplayHandlersOnly, service instance kept", async () => {
  const log = [];
  const { register, _KDB, service } = setup({ replayHandlers: { a: { apply: () => { log.push("a1"); return true; } } } });
  service.pushCommittedStep(step("a", { v: 0 }, { v: 1 }));
  service.pushCommittedStep(step("b", { v: 0 }, { v: 1 }));
  const bound = register(_KDB, {
    bindReplayHandlersOnly: true,
    replayHandlers: { b: { apply: () => { log.push("b"); return true; } }, c: {}, d: { apply: "no" } },
  });
  assert.equal(bound, service);
  assert.equal(await service.undo(), true);
  assert.deepStrictEqual(log, ["b"]);
  assert.equal(await service.undo(), false);
  register(_KDB, { bindReplayHandlersOnly: true, replayHandlers: { a: { apply: () => { log.push("a2"); return true; } } } });
  assert.equal(await service.undo(), true);
  assert.deepStrictEqual(log, ["b", "a2"]);
  register(_KDB, { bindReplayHandlersOnly: true });
  assert.equal(await service.redo(), false);
});

test("bindReplayHandlersOnly without a registered service warns and returns null", () => {
  const con = quietConsole();
  const register = loadAmd(ENTRY, { stubs: { console: con } });
  const _KDB = {};
  assert.equal(register(_KDB, { bindReplayHandlersOnly: true, replayHandlers: {} }), null);
  assert.equal(con.calls.warn[0][0], "[historyService.__orchestrator] bindReplayHandlersOnly requested but adapter or service is absent");
  assert.equal(_KDB.services.history, undefined);
  assert.equal(typeof _KDB.runtime.history, "object");
});

test("writeback restore: begin / finish, guard on push, baseline empties the stack", async () => {
  const { service, _KDB, emitted, con } = setup({ replayHandlers: { k: { apply: () => true } } });
  service.pushCommittedStep(step("k", { v: 0 }, { v: 1 }));
  service.pushCommittedStep(step("k", { v: 1 }, { v: 2 }));
  const idleFlag = _KDB.runtime.history.writebackRestore;

  assert.equal(service.beginWritebackRestore(), false);
  assert.equal(service.beginWritebackRestore({ runId: "1" }), false);
  assert.equal(con.calls.warn.filter((c) => c[0] === "[historyService.beginWritebackRestore] rejected: numeric runId is required").length, 2);
  assert.equal(_KDB.runtime.history.writebackRestore, idleFlag);

  emitted.length = 0;
  assert.equal(service.beginWritebackRestore({ runId: 7, source: "parameterSet", status: "running" }), true);
  const activeFlag = _KDB.runtime.history.writebackRestore;
  assert.notEqual(activeFlag, idleFlag);
  assert.deepStrictEqual(activeFlag, { active: true, runId: 7, source: "parameterSet", status: "running" });
  assert.deepStrictEqual(emitted.map((e) => e.payload), [payload(1, 2, false, false)]);
  assert.equal(service.canUndo(), false);
  assert.equal(service.canRedo(), false);
  assert.equal(await service.undo(), false);
  assert.equal(service.pushCommittedStep(step("k", { v: 2 }, { v: 3 })), false);
  assert.equal(service.getSnapshot().stack.length, 2);

  assert.equal(service.beginWritebackRestore({ runId: 8 }), false);
  assert.deepStrictEqual(con.calls.warn.pop(), ["[historyService.beginWritebackRestore] rejected: restore already active", { activeRunId: 7, requestedRunId: 8 }]);
  assert.equal(service.finishWritebackRestore({ runId: 8, outcome: "x" }), false);
  assert.deepStrictEqual(con.calls.warn.pop(), ["[historyService.finishWritebackRestore] ignored: runId does not match active restore", { activeRunId: 7, requestedRunId: 8 }]);
  assert.equal(_KDB.runtime.history.writebackRestore, activeFlag);

  emitted.length = 0;
  assert.equal(service.finishWritebackRestore({ runId: 7, outcome: "applied", baseline: { id: "b" } }), true);
  const finished = _KDB.runtime.history.writebackRestore;
  assert.notEqual(finished, activeFlag);
  assert.deepStrictEqual(Object.keys(finished), ["active", "runId", "source", "status", "lastFinish"]);
  assert.deepStrictEqual({ ...finished, lastFinish: null }, { active: false, runId: null, source: null, status: null, lastFinish: null });
  assert.deepStrictEqual(Object.keys(finished.lastFinish), ["runId", "outcome", "baseline", "finishedAt"]);
  assert.equal(finished.lastFinish.runId, 7);
  assert.equal(finished.lastFinish.outcome, "applied");
  assert.deepStrictEqual(finished.lastFinish.baseline, { id: "b" });
  assert.equal(typeof finished.lastFinish.finishedAt, "number");
  assert.deepStrictEqual(service.getSnapshot(), { stack: [], pointer: -1, limit: 5 });
  assert.deepStrictEqual(emitted.map((e) => e.payload), [payload(-1, 0, false, false)]);
  assert.equal(_KDB.state.history.lifecycle, "ready");

  assert.equal(service.finishWritebackRestore({ runId: 7 }), false);
  assert.equal(service.pushCommittedStep(step("k", { v: 2 }, { v: 3 })), true);

  assert.equal(service.beginWritebackRestore({ runId: 9 }), true);
  assert.equal(service.finishWritebackRestore({ runId: 9 }), true);
  assert.deepStrictEqual(_KDB.runtime.history.writebackRestore.lastFinish.outcome, null);
  assert.deepStrictEqual(_KDB.runtime.history.writebackRestore.lastFinish.baseline, null);
  assert.deepStrictEqual(service.getSnapshot().stack, []);
});

test("writeback restore during a pending replay: undo lock stays until replay ends", async () => {
  const gate = deferred();
  const { service, _KDB } = setup({ replayHandlers: { k: { apply: () => gate.promise } } });
  service.pushCommittedStep(step("k", { v: 0 }, { v: 1 }));
  const pending = service.undo();
  assert.equal(service.beginWritebackRestore({ runId: 1 }), true);
  assert.equal(service.finishWritebackRestore({ runId: 1 }), true);
  gate.resolve(true);
  assert.equal(await pending, true);
  assert.equal(_KDB.state.history.pointer, -1);
  assert.equal(_KDB.state.history.stack.length, 0);
});

test("destroy: idempotent, disposed returns, lifecycle, runtime teardown", async () => {
  const gate = deferred();
  const { service, _KDB, emitted, con } = setup({ replayHandlers: { k: { apply: () => gate.promise } } });
  service.pushCommittedStep(step("k", { v: 0 }, { v: 1 }));
  let aborted = 0;
  let unsubscribed = 0;
  _KDB.runtime.history.abortControllers.a = { abort: () => { aborted += 1; } };
  _KDB.runtime.history.subscriptions.s = () => { unsubscribed += 1; };
  const pending = service.undo();
  emitted.length = 0;
  service.destroy();
  service.destroy();
  assert.equal(aborted, 1);
  assert.equal(unsubscribed, 1);
  assert.equal(_KDB.state.history.lifecycle, "disposed");
  assert.equal(_KDB.state.history.stack.length, 1);
  assert.equal(_KDB.services.history, service);
  assert.deepStrictEqual(_KDB.runtime.history.abortControllers, {});
  assert.deepStrictEqual(_KDB.runtime.history.subscriptions, {});
  gate.resolve(true);
  assert.equal(await pending, false);
  assert.deepStrictEqual(emitted, []);
  assert.equal(_KDB.state.history.pointer, 0);

  assert.equal(service.pushCommittedStep(step("k", { v: 1 }, { v: 2 })), false);
  assert.equal(service.canUndo(), false);
  assert.equal(service.canRedo(), false);
  assert.equal(service.getSnapshot(), undefined);
  assert.equal(service.beginWritebackRestore({ runId: 1 }), false);
  assert.equal(service.finishWritebackRestore({ runId: 1 }), false);
  await assert.rejects(() => service.undo(), (e) => e instanceof Error && e.message === "historyService disposed");
  await assert.rejects(() => service.redo(), (e) => e instanceof Error && e.message === "historyService disposed");
  const warned = con.calls.warn.map((c) => c[0]).filter((m) => m.includes("called after destroy"));
  assert.deepStrictEqual(warned, [
    "[historyService.pushCommittedStep] called after destroy",
    "[historyService.beginWritebackRestore] called after destroy",
    "[historyService.finishWritebackRestore] called after destroy",
  ]);
});

test("events: eventNames module path and value stay frozen", () => {
  const names = loadAmd(JS_ROOT + "/core/services/historyService/events/eventNames.js");
  assert.deepStrictEqual(names, { HISTORY_CHANGED: "history:changed" });
});

test("emit is skipped without an event bus and survives a throwing bus", async () => {
  const { service, _KDB, con } = setup({ replayHandlers: { k: { apply: () => true } } });
  _KDB.events = { emit: () => { throw new Error("bus"); } };
  assert.equal(service.pushCommittedStep(step("k", { v: 0 }, { v: 1 })), true);
  assert.equal(con.calls.error[0][0], "[historyService.emitHistoryChanged] event emit failed");
  _KDB.events = null;
  assert.equal(await service.undo(), true);
});
