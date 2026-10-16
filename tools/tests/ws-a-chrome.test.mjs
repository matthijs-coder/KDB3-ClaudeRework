// Golden test: Cognos chrome selector registration and chromeChecks (core/cognosHost).
// Run: node --test tools/tests/ws-a-chrome.test.mjs   (UPDATE_SNAPSHOTS=1 rewrites the fixture)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const REGISTER = path.join(JS_ROOT, "core/cognosHost/registerCognosHostSelectors.js");
const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/ws-a-chrome-selectors.json");
const GROUPS = ["root", "toolbar", "dashboardPdf", "footer", "tab", "tabs", "dragDrop", "page", "filterDock", "widget", "focusMode", "legend"];
const CHECK_KEYS = ["beginWait", "endWait", "ensureRuntime", "recordSyncMiss", "scheduleFlush", "trackWait"];

function register(extra = {}) {
  const _KDB = { ...extra };
  loadAmd(REGISTER)(_KDB);
  return _KDB;
}

function snapshotOf(_KDB) {
  return JSON.parse(JSON.stringify({ selectors: _KDB.elements.selectors, selectorMeta: _KDB.runtime.cognosHost.selectorMeta }));
}

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

test("selector groups and selectorMeta match the recorded snapshot", () => {
  const snapshot = snapshotOf(register());
  assert.deepEqual(Object.keys(snapshot.selectors).sort(), [...GROUPS].sort());
  if (process.env.UPDATE_SNAPSHOTS === "1" || !fs.existsSync(FIXTURE)) {
    fs.writeFileSync(FIXTURE, JSON.stringify(snapshot, null, 1) + "\n");
  }
  assert.deepEqual(snapshot, JSON.parse(fs.readFileSync(FIXTURE, "utf8")));
});

test("register returns _KDB.elements.selectors and installs chromeChecks", () => {
  const _KDB = {};
  const result = loadAmd(REGISTER)(_KDB);
  assert.equal(result, _KDB.elements.selectors);
  assert.deepEqual(Object.keys(_KDB.runtime.cognosHost.chromeChecks).sort(), CHECK_KEYS);
  const rt = _KDB.runtime.cognosHost;
  assert.deepEqual(
    Object.keys(rt).filter((k) => k !== "chromeChecks").sort(),
    ["flushRequested", "flushed", "misses", "pendingWaits", "selectorMeta", "waitCounts", "waitKeys"]
  );
  assert.equal(rt.pendingWaits, 0);
  assert.equal(rt.flushRequested, false);
  assert.equal(rt.flushed, false);
});

test("registering twice keeps the same selector groups", () => {
  const _KDB = register();
  const first = JSON.stringify(_KDB.elements.selectors);
  loadAmd(REGISTER)(_KDB);
  assert.equal(JSON.stringify(_KDB.elements.selectors), first);
});

function pickKeys(_KDB) {
  const meta = _KDB.runtime.cognosHost.selectorMeta;
  const keys = Object.keys(meta);
  return {
    required: keys.find((k) => meta[k].required === true),
    optional: keys.find((k) => meta[k].required !== true)
  };
}

test("flush: one missing required selector yields exactly one showAlert", async () => {
  await silent(async () => {
    const alerts = [];
    const _KDB = register({ services: { message: { showAlert: (payload) => alerts.push(payload) } } });
    const checks = _KDB.runtime.cognosHost.chromeChecks;
    const { required } = pickKeys(_KDB);
    assert.ok(required, "catalog has at least one required selector");
    checks.beginWait(_KDB, required);
    checks.endWait(_KDB, required, { found: false });
    checks.recordSyncMiss(_KDB, required);
    checks.scheduleFlush(_KDB);
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].title, "Dashboard");
    assert.equal(alerts[0].severity, "error");
    checks.scheduleFlush(_KDB);
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(alerts.length, 1, "flushed only once");
  });
});

test("flush: optional miss records nothing and raises no alert", async () => {
  await silent(async () => {
    const alerts = [];
    const _KDB = register({ services: { message: { showAlert: (payload) => alerts.push(payload) } } });
    const checks = _KDB.runtime.cognosHost.chromeChecks;
    const { optional } = pickKeys(_KDB);
    assert.ok(optional, "catalog has at least one optional selector");
    checks.beginWait(_KDB, optional);
    checks.endWait(_KDB, optional, { found: false });
    checks.recordSyncMiss(_KDB, optional);
    checks.scheduleFlush(_KDB);
    await Promise.resolve();
    await Promise.resolve();
    assert.deepEqual(_KDB.runtime.cognosHost.misses, {});
    assert.equal(alerts.length, 0);
  });
});

test("flush waits for pending waits; aborted wait records no miss", async () => {
  await silent(async () => {
    const alerts = [];
    const _KDB = register({ services: { message: { showAlert: (payload) => alerts.push(payload) } } });
    const checks = _KDB.runtime.cognosHost.chromeChecks;
    const { required } = pickKeys(_KDB);
    checks.beginWait(_KDB, required);
    checks.scheduleFlush(_KDB);
    await Promise.resolve();
    assert.equal(_KDB.runtime.cognosHost.pendingWaits, 1);
    assert.equal(_KDB.runtime.cognosHost.flushed, false);
    checks.endWait(_KDB, required, { aborted: true, found: false });
    assert.equal(_KDB.runtime.cognosHost.pendingWaits, 0);
    assert.deepEqual(_KDB.runtime.cognosHost.misses, {});
    assert.equal(alerts.length, 0);
  });
});

test("trackWait: found resolves with the element; ABORTED rejection is not a miss", async () => {
  await silent(async () => {
    const _KDB = register({ services: {} });
    const checks = _KDB.runtime.cognosHost.chromeChecks;
    const { required } = pickKeys(_KDB);
    const el = {};
    assert.equal(await checks.trackWait(_KDB, required, Promise.resolve(el)), el);
    const err = Object.assign(new Error("aborted"), { code: "ABORTED" });
    await assert.rejects(checks.trackWait(_KDB, required, Promise.reject(err)), err);
    assert.deepEqual(_KDB.runtime.cognosHost.misses, {});
    assert.equal(_KDB.runtime.cognosHost.pendingWaits, 0);
  });
});

test("disposed _KDB records no miss", async () => {
  await silent(async () => {
    const _KDB = register({ services: {} });
    const checks = _KDB.runtime.cognosHost.chromeChecks;
    const { required } = pickKeys(_KDB);
    _KDB._isDisposed = true;
    checks.recordSyncMiss(_KDB, required);
    assert.deepEqual(_KDB.runtime.cognosHost.misses, {});
  });
});
