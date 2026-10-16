// Unit tests for _____________KDB3API/KDB3/js/core/utils/kit/*.js
// Run: node --test tools/tests/kit.test.mjs   (Node >= 22, no dependencies)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getEventListeners } from "node:events";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import vm from "node:vm";

const KIT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../_____________KDB3API/KDB3/js/core/utils/kit");

// Minimal AMD shim: evaluates the file in this realm (so Object.prototype checks match the browser)
// and returns the factory result. Kit files have no dependencies.
function loadKit(name) {
  const source = readFileSync(resolve(KIT_DIR, name), "utf8");
  let exported;
  const define = (deps, factory) => {
    assert.deepEqual(deps, [], `${name} must not have AMD dependencies`);
    exported = factory();
  };
  vm.runInThisContext(`(function (define) {\n${source}\n})`, { filename: name })(define);
  return exported;
}

const data = loadKit("data.js");
const kitAsync = loadKit("async.js");
const runtime = loadKit("runtime.js");
const errors = loadKit("errors.js");
const history = loadKit("history.js");

const abortListenerCount = (signal) => getEventListeners(signal, "abort").length;
const realClearTimeout = globalThis.clearTimeout;

function withGlobals(overrides, fn) {
  const saved = {};
  for (const key of Object.keys(overrides)) {
    saved[key] = Object.getOwnPropertyDescriptor(globalThis, key);
    globalThis[key] = overrides[key];
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(overrides)) {
      if (saved[key]) Object.defineProperty(globalThis, key, saved[key]);
      else delete globalThis[key];
    }
  }
}

// ---------------------------------------------------------------- data.js

test("cloneJson: deep copy with JSON semantics", () => {
  const source = { a: 1, nested: { list: [1, undefined, () => 1, NaN] }, skip: undefined, fn() {}, when: new Date(0) };
  const copy = data.cloneJson(source);
  assert.notEqual(copy, source);
  assert.notEqual(copy.nested, source.nested);
  assert.deepEqual(copy, { a: 1, nested: { list: [1, null, null, null] }, when: "1970-01-01T00:00:00.000Z" });
  assert.equal(data.cloneJson(new Date(0)), "1970-01-01T00:00:00.000Z");
});

test("cloneJson: non-objects pass through, cycles and BigInt throw", () => {
  const fn = () => 1;
  assert.equal(data.cloneJson(undefined), undefined);
  assert.equal(data.cloneJson(null), null);
  assert.equal(data.cloneJson("x"), "x");
  assert.equal(data.cloneJson(fn), fn);
  assert.ok(Number.isNaN(data.cloneJson(NaN)));
  const cyclic = { a: 1 };
  cyclic.self = cyclic;
  assert.throws(() => data.cloneJson(cyclic), TypeError);
  assert.throws(() => data.cloneJson({ big: 1n }), TypeError);
});

test("isPlainObject / isObjectLike", () => {
  class Box {}
  assert.equal(data.isPlainObject({}), true);
  assert.equal(data.isPlainObject(Object.create(null)), true);
  assert.equal(data.isPlainObject(JSON.parse('{"a":1}')), true);
  for (const value of [null, undefined, [], new Date(), new Box(), "s", 1, () => {}]) {
    assert.equal(data.isPlainObject(value), false, String(value));
  }
  assert.equal(data.isObjectLike(new Box()), true);
  assert.equal(data.isObjectLike(new Date()), true);
  assert.equal(data.isObjectLike([]), false);
  assert.equal(data.isObjectLike(null), false);
});

test("toArray: copies arrays and array-likes, everything else is []", () => {
  const list = [1, 2];
  const copy = data.toArray(list);
  assert.deepEqual(copy, [1, 2]);
  assert.notEqual(copy, list);
  assert.deepEqual(data.toArray({ 0: "a", 1: "b", length: 2 }), ["a", "b"]);
  (function () { assert.deepEqual(data.toArray(arguments), [7, 8]); })(7, 8);
  for (const value of [null, undefined, "abc", 5, {}, () => {}]) {
    assert.deepEqual(data.toArray(value), []);
  }
});

// ---------------------------------------------------------------- async.js

test("sleep: resolves true after the delay and removes its abort listener", async () => {
  const controller = new AbortController();
  const pending = kitAsync.sleep(10, controller.signal);
  assert.equal(abortListenerCount(controller.signal), 1);
  assert.equal(await pending, true);
  assert.equal(abortListenerCount(controller.signal), 0);
});

test("sleep: resolves false on abort, clears listeners on all signals", async () => {
  const a = new AbortController();
  const b = new AbortController();
  const started = Date.now();
  const pending = kitAsync.sleep(10_000, [a.signal, b.signal, null, a.signal]);
  assert.equal(abortListenerCount(a.signal), 1, "duplicate signals get one listener");
  assert.equal(abortListenerCount(b.signal), 1);
  setTimeout(() => b.abort(), 5);
  assert.equal(await pending, false);
  assert.ok(Date.now() - started < 1000);
  assert.equal(abortListenerCount(a.signal), 0);
  assert.equal(abortListenerCount(b.signal), 0);
});

test("sleep: already aborted and non-positive delays resolve immediately", async () => {
  const controller = new AbortController();
  controller.abort();
  assert.equal(await kitAsync.sleep(10_000, controller.signal), false);
  assert.equal(abortListenerCount(controller.signal), 0);
  assert.equal(await kitAsync.sleep(0), true);
  assert.equal(await kitAsync.sleep(-5), true);
  assert.equal(await kitAsync.sleep(undefined), true);
});

test("pollUntil: requires check and timeoutMs", async () => {
  await assert.rejects(kitAsync.pollUntil({ timeoutMs: 10 }), TypeError);
  await assert.rejects(kitAsync.pollUntil({ check: () => true }), TypeError);
  await assert.rejects(kitAsync.pollUntil({ check: () => true, timeoutMs: 0 }), TypeError);
});

test("pollUntil: succeeds after transient failures, keeps no listeners", async () => {
  const controller = new AbortController();
  let calls = 0;
  const outcome = await kitAsync.pollUntil({
    check: async ({ attempt }) => {
      calls += 1;
      assert.equal(attempt, calls);
      if (calls === 1) throw new Error("not yet");
      return calls >= 3 ? { rows: calls } : null;
    },
    intervalMs: 2,
    timeoutMs: 1000,
    signal: controller.signal
  });
  assert.equal(outcome.ok, true);
  assert.deepEqual(outcome.value, { rows: 3 });
  assert.equal(outcome.attempts, 3);
  assert.equal(abortListenerCount(controller.signal), 0);
});

test("pollUntil: custom predicate accepts falsy values", async () => {
  const outcome = await kitAsync.pollUntil({ check: () => 0, predicate: (v) => v === 0, timeoutMs: 50 });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.value, 0);
});

test("pollUntil: times out with lastError and does not overshoot", async () => {
  const controller = new AbortController();
  const started = Date.now();
  const outcome = await kitAsync.pollUntil({
    check: () => { throw new Error("host not ready"); },
    intervalMs: 5,
    timeoutMs: 40,
    signal: controller.signal
  });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.reason, "timeout");
  assert.equal(outcome.lastError.message, "host not ready");
  assert.ok(outcome.attempts >= 2);
  assert.ok(Date.now() - started < 500);
  assert.equal(abortListenerCount(controller.signal), 0);
});

test("pollUntil: abort ends the wait early, before and during polling", async () => {
  const pre = new AbortController();
  pre.abort();
  let calls = 0;
  const immediate = await kitAsync.pollUntil({ check: () => { calls += 1; }, timeoutMs: 1000, signal: pre.signal });
  assert.equal(immediate.reason, "aborted");
  assert.equal(calls, 0);

  const controller = new AbortController();
  const started = Date.now();
  setTimeout(() => controller.abort(), 15);
  const outcome = await kitAsync.pollUntil({ check: () => false, intervalMs: 50, timeoutMs: Infinity, signal: controller.signal });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.reason, "aborted");
  assert.ok(Date.now() - started < 500);
  assert.equal(abortListenerCount(controller.signal), 0);
});

test("pollUntil: backoff grows the interval up to maxIntervalMs", async () => {
  const stamps = [];
  await kitAsync.pollUntil({
    check: () => { stamps.push(Date.now()); return stamps.length === 5; },
    intervalMs: 5,
    backoff: 2,
    maxIntervalMs: 20,
    timeoutMs: 2000
  });
  const gaps = stamps.slice(1).map((t, i) => t - stamps[i]);
  assert.equal(gaps.length, 4);
  assert.ok(gaps[2] >= 15, `third gap ${gaps[2]} should be ~20ms`);
  assert.ok(gaps[3] < 60, `fourth gap ${gaps[3]} should stay capped at ~20ms`);
});

// ---------------------------------------------------------------- runtime.js

test("ensureRuntime: creates owner runtime, keeps existing values, applies defaults", () => {
  const _KDB = {};
  const rt = runtime.ensureRuntime(_KDB, "messageService", { listeners: [], queues: { modalRequests: [] } });
  assert.equal(_KDB.runtime.messageService, rt);
  assert.deepEqual(Object.keys(rt).sort(), [...runtime.RUNTIME_BUCKETS, "queues"].sort());
  assert.ok(Array.isArray(rt.listeners));
  rt.timers.a = 1;
  const again = runtime.ensureRuntime(_KDB, "messageService", { queues: null });
  assert.equal(again, rt);
  assert.equal(rt.timers.a, 1);
  assert.deepEqual(rt.queues, { modalRequests: [] });
});

test("disposeRuntimeBuckets: releases every bucket and cancels rAF vs timeout correctly", () => {
  const calls = [];
  const target = new EventTarget();
  const handler = () => calls.push("event");
  target.addEventListener("click", handler, true);
  const controller = new AbortController();
  const rt = runtime.ensureRuntimeBuckets({
    listeners: {
      cleanup: () => calls.push("listener-fn"),
      dockClick: { element: target, type: "click", handler, capture: true },
      dropboxes: [{ target, type: "x", handler, options: false }]
    },
    subscriptions: { unsubscribe: () => calls.push("sub-named-unsubscribe"), other: { unsubscribe: () => calls.push("sub-obj") } },
    abortControllers: { run: controller },
    observers: [{ disconnect: () => calls.push("observer") }],
    timers: { plain: 11, frame: { kind: "raf", id: 22 }, timeout: { kind: "timeout", id: 33 }, ladder: [44, 45], byMount: { m1: 55 } },
    domRefs: { root: {} },
    pendingPromises: { mount: Promise.resolve() },
    keep: "owner field"
  });
  const cleared = [];
  const cancelled = [];
  const errs = withGlobals({
    clearTimeout: (id) => { cleared.push(id); realClearTimeout(id); },
    cancelAnimationFrame: (id) => cancelled.push(id)
  }, () => runtime.disposeRuntimeBuckets(rt));

  assert.deepEqual(errs, []);
  assert.equal(controller.signal.aborted, true);
  assert.deepEqual(calls.sort(), ["listener-fn", "observer", "sub-named-unsubscribe", "sub-obj"]);
  target.dispatchEvent(new Event("click"));
  assert.ok(!calls.includes("event"), "capture listener removed");
  assert.deepEqual(cleared.sort((a, b) => a - b), [11, 33, 44, 45, 55]);
  assert.deepEqual(cancelled, [22]);
  assert.deepEqual(rt.observers, []);
  for (const name of runtime.RUNTIME_BUCKETS.filter((n) => n !== "observers")) {
    assert.deepEqual(rt[name], {}, name);
  }
  assert.equal(rt.keep, "owner field");
});

test("disposeRuntimeBuckets: a throwing entry does not stop the others", () => {
  let released = 0;
  const rt = {
    subscriptions: { bad: () => { throw new Error("boom"); }, good: () => { released += 1; } },
    observers: { o: { disconnect: () => { released += 1; } } }
  };
  const errs = runtime.disposeRuntimeBuckets(rt);
  assert.equal(errs.length, 1);
  assert.equal(errs[0].message, "boom");
  assert.equal(released, 2);
  assert.deepEqual(runtime.disposeRuntimeBuckets(null), []);
});

test("scheduleFrame / scheduleTimeout / clearTimer track tagged ids", () => {
  const frames = new Map();
  let nextFrame = 100;
  const cancelled = [];
  const cleared = [];
  withGlobals({
    requestAnimationFrame: (cb) => { nextFrame += 1; frames.set(nextFrame, cb); return nextFrame; },
    cancelAnimationFrame: (id) => { cancelled.push(id); frames.delete(id); },
    clearTimeout: (id) => { cleared.push(id); realClearTimeout(id); }
  }, () => {
    const timers = {};
    let ran = 0;
    const first = runtime.scheduleFrame(timers, "viewSync", () => { ran += 1; });
    assert.deepEqual(first, { kind: "raf", id: 101 });
    const second = runtime.scheduleFrame(timers, "viewSync", (ts) => { ran += ts; });
    assert.deepEqual(cancelled, [101], "rescheduling cancels the previous frame with cancelAnimationFrame");
    assert.deepEqual(cleared, []);
    frames.get(second.id)(10);
    assert.equal(ran, 10);
    assert.equal(timers.viewSync, undefined, "fired entry removes itself");

    runtime.scheduleTimeout(timers, "retry", () => {}, 10_000);
    assert.equal(timers.retry.kind, "timeout");
    const timeoutId = timers.retry.id;
    assert.equal(runtime.clearTimer(timers, "retry"), true);
    assert.deepEqual(cleared, [timeoutId]);
    assert.deepEqual(cancelled, [101]);
    assert.equal(runtime.clearTimer(timers, "retry"), false);
  });
});

test("scheduleTimeout fires and removes its entry; scheduleFrame falls back without rAF", async () => {
  const timers = {};
  await new Promise((done) => runtime.scheduleTimeout(timers, "t", done, 1));
  assert.equal(timers.t, undefined);
  const entry = withGlobals({ requestAnimationFrame: undefined }, () => runtime.scheduleFrame(timers, "f", () => {}));
  assert.equal(entry.kind, "timeout");
  runtime.clearTimer(timers, "f");
});

test("readTabsBusy: reads runtime.tabs.pendingPromises", () => {
  assert.equal(runtime.readTabsBusy(null), false);
  assert.equal(runtime.readTabsBusy({ runtime: {} }), false);
  const _KDB = { runtime: { tabs: { pendingPromises: { traverseKey: "x" } } } };
  assert.equal(runtime.readTabsBusy(_KDB), false);
  _KDB.runtime.tabs.pendingPromises.startup = Promise.resolve();
  assert.equal(runtime.readTabsBusy(_KDB), true);
  assert.equal(runtime.readTabsBusy(_KDB, ["tabMutation"]), false);
  _KDB.runtime.tabs.pendingPromises.tabMutation = Promise.resolve();
  assert.equal(runtime.readTabsBusy(_KDB, ["tabMutation"]), true);
});

// ---------------------------------------------------------------- errors.js

test("codedError: Error with code and extra fields", () => {
  const cause = new Error("inner");
  const error = errors.codedError("DASHBOARD_PDF_ABORTED", "Export aborted.", { cause, diagnostics: [1], code: "IGNORED", message: "IGNORED" });
  assert.ok(error instanceof Error);
  assert.equal(error.code, "DASHBOARD_PDF_ABORTED");
  assert.equal(error.message, "Export aborted.");
  assert.equal(error.cause, cause);
  assert.deepEqual(error.diagnostics, [1]);
  assert.equal(errors.codedError("ONLY_CODE").message, "ONLY_CODE");
});

test("createDisposedGuard: blocks after dispose and warns once per method", () => {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (msg) => warnings.push(msg);
  try {
    const guard = errors.createDisposedGuard("sicht");
    assert.equal(guard.blocked("mount"), false);
    guard.dispose();
    assert.equal(guard.isDisposed(), true);
    assert.equal(guard.blocked("mount"), true);
    assert.equal(guard.blocked("mount"), true);
    assert.equal(guard.blocked("dispatch"), true);
  } finally {
    console.warn = originalWarn;
  }
  assert.deepEqual(warnings, ["[sicht.mount] called after destroy", "[sicht.dispatch] called after destroy"]);
});

// ---------------------------------------------------------------- history.js

test("pushHistoryStep: skips replay/skip flags and a missing service, forwards otherwise", () => {
  const pushed = [];
  const _KDB = { services: { history: { pushCommittedStep: (step) => { pushed.push(step); return step.key !== "rejected"; } } } };
  const step = { key: "header_textChange", old: { value: "a" }, new: { value: "b" } };
  assert.equal(history.pushHistoryStep(_KDB, step, { isHistoryReplay: true }), false);
  assert.equal(history.pushHistoryStep(_KDB, step, { skipHistory: true }), false);
  assert.equal(history.pushHistoryStep({}, step), false);
  assert.equal(history.pushHistoryStep(_KDB, step), true);
  assert.equal(history.pushHistoryStep(_KDB, { key: "rejected", old: {}, new: {} }), false);
  assert.deepEqual(pushed.map((s) => s.key), ["header_textChange", "rejected"]);
  assert.equal(pushed[0], step);
});

test("createReplayHandler: dispatches by step key", async () => {
  const seen = [];
  const handler = history.createReplayHandler({
    header_textChange: (_KDB, targetValue, step, ctx) => { seen.push([targetValue, step.key, ctx.direction]); return true; },
    header_chromeChange: async () => true
  });
  assert.equal(handler.apply({}, { v: 1 }, { key: "header_textChange" }, { direction: "undo" }), true);
  assert.equal(await handler.apply({}, null, { key: "header_chromeChange" }, {}), true);
  assert.equal(handler.apply({}, null, { key: "toString" }, {}), false);
  assert.equal(handler.apply({}, null, null, {}), false);
  assert.deepEqual(seen, [[{ v: 1 }, "header_textChange", "undo"]]);
});
