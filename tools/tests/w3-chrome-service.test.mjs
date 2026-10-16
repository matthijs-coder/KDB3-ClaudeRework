// services.chrome: accessor over runtime.cognosHost.chromeChecks (W3, additive).
// Run: node --test tools/tests/w3-chrome-service.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const registerChrome = loadAmd(path.join(JS_ROOT, "core/services/chrome/index.js"));
const registerSelectors = loadAmd(path.join(JS_ROOT, "core/cognosHost/registerCognosHostSelectors.js"));
const loadOrchestrator = () => loadAmd(path.join(JS_ROOT, "core/services/__orchestratorServices.js"));

const silent = async (fn) => {
  const saved = { error: console.error, debug: console.debug };
  console.error = () => {};
  console.debug = () => {};
  try {
    return await fn();
  } finally {
    Object.assign(console, saved);
  }
};

function bootedKdb(extra = {}) {
  const _KDB = { ...extra };
  registerSelectors(_KDB);
  registerChrome(_KDB);
  return _KDB;
}

test("registration keeps an existing service and publishes the six named methods", () => {
  const _KDB = {};
  const service = registerChrome(_KDB);
  assert.equal(_KDB.services.chrome, service);
  assert.equal(registerChrome(_KDB), service);
  assert.deepEqual(Object.keys(service).sort(), ["beginWait", "endWait", "readChromeChecks", "recordSyncMiss", "scheduleFlush", "trackWait"]);
});

test("missing chrome checks: reads null, trackWait returns the same promise, everything else is a no-op", async () => {
  for (const _KDB of [{}, { runtime: {} }, { runtime: { cognosHost: {} } }]) {
    const chrome = registerChrome(_KDB);
    const promise = Promise.resolve("el");
    assert.equal(chrome.readChromeChecks(), null);
    assert.equal(chrome.trackWait("k", promise), promise);
    assert.equal(chrome.beginWait("k"), undefined);
    assert.equal(chrome.endWait("k", { found: true }), undefined);
    assert.equal(chrome.recordSyncMiss("k"), undefined);
    assert.equal(chrome.scheduleFlush(), undefined);
  }
});

test("partial chrome checks: absent methods are no-ops, present ones are called with _KDB first", () => {
  const calls = [];
  const _KDB = { runtime: { cognosHost: { chromeChecks: { recordSyncMiss: (...args) => calls.push(args) } } } };
  const chrome = registerChrome(_KDB);
  const promise = Promise.resolve(1);
  assert.equal(chrome.trackWait("k", promise), promise);
  chrome.beginWait("k");
  chrome.recordSyncMiss("root.pageViewContent");
  assert.deepEqual(calls, [[_KDB, "root.pageViewContent"]]);
});

test("every operation reaches the real chrome checks with the arguments of the old per-feature readers", async () => {
  await silent(async () => {
    const _KDB = bootedKdb();
    const rt = _KDB.runtime.cognosHost;
    const chrome = _KDB.services.chrome;
    assert.equal(chrome.readChromeChecks(), rt.chromeChecks);

    chrome.beginWait("tabs.hydrate");
    assert.equal(rt.pendingWaits, 1);
    chrome.endWait("tabs.hydrate", { aborted: false, found: true });
    assert.equal(rt.pendingWaits, 0);
    assert.deepEqual(rt.misses, {});

    const found = await chrome.trackWait("root.pageViewContent", Promise.resolve({ id: "el" }));
    assert.deepEqual(found, { id: "el" });
    await assert.rejects(chrome.trackWait("root.pageViewContent", Promise.reject(Object.assign(new Error("x"), { code: "ABORTED" }))), /x/);
    assert.deepEqual(rt.misses, {});

    chrome.recordSyncMiss("root.pageViewContent");
    assert.deepEqual(Object.keys(rt.misses), ["root.pageViewContent"]);
  });
});

test("scheduleFlush flushes once with one alert for a missed required selector, like checks.scheduleFlush", async () => {
  await silent(async () => {
    const alerts = [];
    const _KDB = bootedKdb({ services: { message: { showAlert: (payload) => alerts.push(payload) } } });
    _KDB.services.chrome.recordSyncMiss("root.pageViewContent");
    _KDB.services.chrome.scheduleFlush();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(alerts.length, 1);
    assert.equal(_KDB.runtime.cognosHost.flushed, true);
  });
});

test("scheduleFlush has renderSupport's boundary: a throwing checks object is logged, not thrown", () => {
  const logged = [];
  const saved = console.error;
  console.error = (...args) => logged.push(args);
  try {
    const _KDB = { runtime: { cognosHost: { chromeChecks: { scheduleFlush() { throw new Error("flush boom"); } } } } };
    const chrome = registerChrome(_KDB);
    assert.doesNotThrow(() => chrome.scheduleFlush());
    assert.equal(logged.length, 1);
    assert.equal(logged[0][0], "[core.chromeCapability] scheduleFlush failed");
    assert.match(String(logged[0][1]), /flush boom/);
  } finally {
    console.error = saved;
  }
});

test("a replaced checks object is seen on the next call (nothing is captured at registration)", () => {
  const _KDB = { runtime: { cognosHost: {} } };
  const chrome = registerChrome(_KDB);
  assert.equal(chrome.readChromeChecks(), null);
  const calls = [];
  _KDB.runtime.cognosHost.chromeChecks = { beginWait: (...args) => calls.push(args) };
  chrome.beginWait("k");
  assert.deepEqual(calls, [[_KDB, "k"]]);
});

test("the services orchestrator registers chrome right after cognosHost", () => {
  const _KDB = { elements: { selectors: {} }, runtime: {}, state: {}, events: { emit() {}, subscribe() {} }, config: {} };
  registerSelectors(_KDB);
  loadOrchestrator()(_KDB);
  const keys = Object.keys(_KDB.services);
  assert.equal(keys.indexOf("chrome"), keys.indexOf("cognosHost") + 1);
  assert.equal(typeof _KDB.services.chrome.trackWait, "function");
});
