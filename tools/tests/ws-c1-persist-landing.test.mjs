// Behaviour test for writeback GET persist landing: cancel, abort and destroy stop the host wait at once.
// Run: node --test tools/tests/ws-c1-persist-landing.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const WB = path.join(JS_ROOT, "core/services/writeback");
const kit = (name) => loadAmd(path.join(JS_ROOT, "core/utils/kit", name));
const kitRuntime = kit("runtime.js");

// Stand-in for set/state/ensureWritebackRuntime.js with the contract: flags present, all 7 buckets objects.
function ensureWritebackRuntime(_KDB) {
  return kitRuntime.ensureRuntime(_KDB, "writeback", { persistRestoreGeneration: 0, parameterSetRestoreActive: false, getPersistLoadingHandle: null });
}

const silent = { log() {}, info() {}, warn() {}, error() {}, debug() {} };

function loadLanding() {
  const document = { getElementById: () => null, querySelector: () => null };
  return loadAmd(path.join(WB, "get/persist/persistLanding.js"), {
    stubs: { console: silent, document },
    modules: { "../../set/state/ensureWritebackRuntime.js": ensureWritebackRuntime },
  });
}

function fakeKdb() {
  const subscribed = [];
  const dispatched = [];
  const tabsState = {
    activeIndex: 1,
    order: [0, 1],
    byIndex: {
      0: { index: 0, role: "dashboard", visible: true, pageId: "page0" },
      1: { index: 1, role: "dashboard", visible: true, pageId: "page1" },
    },
  };
  return {
    subscribed,
    dispatched,
    runtime: {},
    elements: { selectors: { root: {} } },
    events: { subscribe: (name, fn) => { subscribed.push(name); return () => {}; } },
    api: {
      tabs: {
        getState: () => tabsState,
        dispatch: async (action) => { dispatched.push(action); return { ok: true }; },
      },
    },
    services: {},
  };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test("cancel during the host wait resolves the landing immediately and never subscribes", async () => {
  const landing = loadLanding();
  const _KDB = fakeKdb();
  const startedAt = Date.now();
  const pending = landing.applyWritebackGetPersistLanding(_KDB);
  await settle();
  assert.equal(_KDB.dispatched.length, 1);
  assert.ok(_KDB.runtime.writeback.abortControllers.persistLanding, "landing has an abort controller while waiting");
  landing.cancelWritebackGetPersistLanding(_KDB);
  await pending;
  assert.ok(Date.now() - startedAt < 300, "landing did not wait out the 10 x 400 ms host loop");
  assert.deepEqual(_KDB.subscribed, []);
  assert.equal(_KDB.runtime.writeback.abortControllers.persistLanding, undefined);
  assert.equal(_KDB.runtime.writeback.timers.persistRestoreTab, undefined);
});

test("disposeRuntimeBuckets (set destroy) aborts the landing without a generation bump", async () => {
  const landing = loadLanding();
  const _KDB = fakeKdb();
  const pending = landing.applyWritebackGetPersistLanding(_KDB);
  await settle();
  const errors = kitRuntime.disposeRuntimeBuckets(_KDB.runtime.writeback);
  assert.deepEqual(errors, []);
  const startedAt = Date.now();
  await pending;
  assert.ok(Date.now() - startedAt < 300);
  assert.deepEqual(_KDB.subscribed, []);
});

test("a new landing invalidates the previous one", async () => {
  const landing = loadLanding();
  const _KDB = fakeKdb();
  const first = landing.applyWritebackGetPersistLanding(_KDB);
  await settle();
  const second = landing.applyWritebackGetPersistLanding(_KDB);
  const startedAt = Date.now();
  await first;
  assert.ok(Date.now() - startedAt < 300, "first landing ended when the second started");
  landing.cancelWritebackGetPersistLanding(_KDB);
  await second;
  assert.deepEqual(_KDB.subscribed, []);
});

test("landing is skipped when the user is already on the first visible tab", async () => {
  const landing = loadLanding();
  const _KDB = fakeKdb();
  _KDB.api.tabs.getState().activeIndex = 0;
  await landing.applyWritebackGetPersistLanding(_KDB);
  assert.equal(_KDB.dispatched.length, 0);
});

test("persist overlay finishes after a bucket reset because the handle lives outside the buckets", () => {
  const document = { querySelector: () => ({ tag: "mount" }) };
  const overlay = loadAmd(path.join(WB, "get/persist/persistLoadingOverlay.js"), {
    stubs: { console: silent, document },
    modules: { "../../set/state/ensureWritebackRuntime.js": ensureWritebackRuntime },
  });
  const _KDB = fakeKdb();
  const finished = [];
  _KDB.services.loading = {
    startLoading: (options) => ({ mountKey: options.mountKey }),
    finishLoading: (options) => finished.push(options.handle.mountKey),
  };
  const handle = overlay.start(_KDB);
  assert.equal(handle.mountKey, "writeback-get-persist-loading");
  kitRuntime.disposeRuntimeBuckets(_KDB.runtime.writeback);
  overlay.finish(_KDB);
  assert.deepEqual(finished, ["writeback-get-persist-loading"]);
  overlay.finish(_KDB);
  assert.equal(finished.length, 1, "finish is idempotent");
});
