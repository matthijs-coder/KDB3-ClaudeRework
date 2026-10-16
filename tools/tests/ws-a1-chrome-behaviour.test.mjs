// Behaviour golden test for core/cognosHost chromeChecks details (recorded on the unchanged code).
// Run: node --test tools/tests/ws-a1-chrome-behaviour.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const REGISTER = path.join(JS_ROOT, "core/cognosHost/registerCognosHostSelectors.js");

function register(extra = {}) {
  const _KDB = { ...extra };
  loadAmd(REGISTER)(_KDB);
  return _KDB;
}

function keysByRequired(_KDB) {
  const meta = _KDB.runtime.cognosHost.selectorMeta;
  const keys = Object.keys(meta);
  return { required: keys.find((k) => meta[k].required), optional: keys.find((k) => !meta[k].required) };
}

function capture(fn) {
  const logs = { error: [], debug: [] };
  const saved = { error: console.error, debug: console.debug };
  console.error = (...a) => logs.error.push(a);
  console.debug = (...a) => logs.debug.push(a);
  const restore = () => Object.assign(console, saved);
  return Promise.resolve(fn(logs)).finally(restore);
}

test("register returns the selectors object and runtime keeps its documented key order", () => {
  const _KDB = register();
  assert.deepEqual(Object.keys(_KDB.runtime.cognosHost), [
    "selectorMeta", "pendingWaits", "misses", "waitKeys", "waitCounts", "flushRequested", "flushed", "chromeChecks",
  ]);
  const again = register({ elements: { selectors: { widget: { custom: ".keep" } } } });
  assert.equal(again.elements.selectors.widget.custom, ".keep", "existing keys of a group are preserved");
});

test("recordSyncMiss: required miss is logged every time but recorded once; optional only debug", async () => {
  await capture((logs) => {
    const _KDB = register();
    const checks = _KDB.runtime.cognosHost.chromeChecks;
    const { required, optional } = keysByRequired(_KDB);
    checks.recordSyncMiss(_KDB, required);
    checks.recordSyncMiss(_KDB, required);
    checks.recordSyncMiss(_KDB, optional);
    checks.recordSyncMiss(_KDB, "unknown.key");
    assert.deepEqual(Object.keys(_KDB.runtime.cognosHost.misses), [required]);
    assert.equal(logs.error.length, 2);
    assert.equal(logs.debug.length, 2);
    assert.deepEqual(logs.error[0][1], { key: required, selector: _KDB.runtime.cognosHost.selectorMeta[required].selector });
    assert.deepEqual(logs.debug[1][1], { key: "unknown.key", selector: undefined });
    _KDB._isDisposed = true;
    checks.recordSyncMiss(_KDB, required);
    assert.equal(logs.error.length, 2, "disposed: nothing logged");
  });
});

test("trackWait: resolves with the element, rejects with the same error, counts waits per key", async () => {
  await capture(async () => {
    const _KDB = register();
    const checks = _KDB.runtime.cognosHost.chromeChecks;
    const { required } = keysByRequired(_KDB);
    const rt = _KDB.runtime.cognosHost;
    const el = {};
    const first = checks.trackWait(_KDB, required, Promise.resolve(el));
    const second = checks.trackWait(_KDB, required, Promise.resolve(el));
    assert.equal(rt.pendingWaits, 1);
    assert.equal(rt.waitCounts[required], 2);
    assert.equal(await first, el);
    assert.equal(await second, el);
    assert.equal(rt.waitKeys[required], "done");
    assert.equal(rt.pendingWaits, 0);
    const failure = new Error("nope");
    await assert.rejects(checks.trackWait(_KDB, required, Promise.reject(failure)), (err) => err === failure);
    assert.deepEqual(Object.keys(rt.misses), [required]);
    const aborted = Object.assign(new Error("a"), { code: "ABORTED" });
    const other = register();
    await assert.rejects(other.runtime.cognosHost.chromeChecks.trackWait(other, required, Promise.reject(aborted)), (err) => err === aborted);
    assert.deepEqual(other.runtime.cognosHost.misses, {});
    const empty = await checks.trackWait(_KDB, keysByRequired(_KDB).optional, Promise.resolve(null));
    assert.equal(empty, null);
  });
});

test("scheduleFlush after teardown of the runtime bucket does not alert", async () => {
  await capture(async () => {
    const alerts = [];
    const _KDB = register({ services: { message: { showAlert: (p) => alerts.push(p) } } });
    const checks = _KDB.runtime.cognosHost.chromeChecks;
    const { required } = keysByRequired(_KDB);
    checks.recordSyncMiss(_KDB, required);
    checks.scheduleFlush(_KDB);
    delete _KDB.runtime.cognosHost;
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(alerts.length, 0);
  });
});
