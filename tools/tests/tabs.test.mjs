// Tests for _____________KDB3API/KDB3/js/dashboard/tabs/**
// Run: node --test tools/tests/tabs.test.mjs   (Node >= 22, no dependencies)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";

const TABS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../_____________KDB3API/KDB3/js/dashboard/tabs");
const silent = { log() {}, warn() {}, error() {}, info() {} };

function load(rel, stubs) {
  return loadAmd(join(TABS_DIR, rel), { stubs: Object.assign({ console: silent }, stubs || {}) });
}

function listModules(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) { return listModules(full); }
    return entry.name.endsWith(".js") ? [full] : [];
  });
}

test("every tabs module factory runs without throwing", () => {
  const failures = [];
  for (const file of listModules(TABS_DIR)) {
    try {
      loadAmd(file, { stubs: { console: silent } });
    } catch (err) {
      failures.push(relative(TABS_DIR, file) + ": " + err.message);
    }
  }
  assert.deepEqual(failures, []);
});

test("edit icons are disabled only while a tab mutation runs", () => {
  const confirm = load("editUi/confirm.js");
  const idle = { _KDB: { runtime: { tabs: { pendingPromises: { traverse: Promise.resolve() } } } } };
  const busy = { _KDB: { runtime: { tabs: { pendingPromises: { tabMutation: Promise.resolve() } } } } };
  assert.equal(confirm.isTabMutationInFlight(idle._KDB), false);
  assert.equal(confirm.isTabMutationInFlight(undefined), false);
  assert.equal(confirm.isTabMutationInFlight(busy._KDB), true);
});

test("a disabled edit icon click only cancels the event and drops focus", () => {
  const logged = [];
  const icons = load("editUi/icons.js", { console: Object.assign({}, silent, { log: (...args) => logged.push(args) }) });
  const handlers = [];
  const target = () => ({ addEventListener: (type, handler) => handlers.push([type, handler]) });
  icons.bindIconClick({ key: "delete" }, {}, false, target(), target(), 1, "tab1");
  const calls = [];
  const ev = {
    preventDefault: () => calls.push("preventDefault"),
    stopPropagation: () => calls.push("stopPropagation"),
    target: { blur: () => calls.push("blur") }
  };
  assert.equal(handlers.length, 2);
  assert.equal(handlers[0][1](ev), false);
  assert.deepEqual(calls, ["preventDefault", "stopPropagation", "blur"]);
  assert.deepEqual(logged, []);
});

test("parameterSet router: unknown types and disposed acknowledgements", async () => {
  const types = load("config/actionTypes.js");
  const router = load("restore/parameterSetRestore.js");
  assert.equal(router.isParameterSetAction(types.PARAMETER_SET_RESTORE), true);
  assert.equal(router.isParameterSetAction(types.TRAVERSE), false);
  assert.deepEqual(await router.routeParameterSetAction({}, { type: "tabs/nope" }), {
    ok: false,
    diagnostics: [{ code: "TABS_PARAMETER_SET_UNKNOWN_ACTION", message: "unknown tabs parameterSet action type" }]
  });
  assert.deepEqual(await router.disposedResult(types.PARAMETER_SET_RESET, {}), {
    ok: false,
    diagnostics: [{ code: "WRITEBACK_RESTORE_CANCELLED", message: "tabs controller is disposed" }]
  });
  const scope = await router.disposedResult(types.RESOLVE_FILTER_SCOPE_TARGETS, { source: "pdf" });
  assert.equal(scope.ok, false);
  assert.equal(scope.diagnostics[0].code, "TABS_FILTER_SCOPE_TARGETS_NOT_READY");
});

test("destroy restores the original _KDB.utils.readCurrentTab, re-orchestration binds it again", () => {
  const orchestrate = load("__orchestratorTabs.js");
  const original = function readCurrentTab() { return "original"; };
  const _KDB = { utils: { readCurrentTab: original }, config: {}, services: {} };
  const first = orchestrate(_KDB, {});
  assert.notEqual(_KDB.utils.readCurrentTab, original);
  first.destroy();
  assert.equal(_KDB.utils.readCurrentTab, original);

  const second = orchestrate(_KDB, {});
  assert.notEqual(_KDB.utils.readCurrentTab, original);
  const foreign = function foreignReadCurrentTab() { return "foreign"; };
  _KDB.utils.readCurrentTab = foreign;
  second.destroy();
  assert.equal(_KDB.utils.readCurrentTab, foreign);
});

test("hydrate: destroy aborts the button wait at once and reports it to the chrome checks", async () => {
  const doc = { querySelectorAll: () => [], querySelector: () => null };
  const hydrate = load("effects.js", { document: doc });
  const endWaits = [];
  const dispatched = [];
  let disposed = false;
  const _KDB = {
    runtime: {
      tabs: { domRefs: {}, abortControllers: {} },
      cognosHost: { chromeChecks: { beginWait() {}, endWait: (_k, key, info) => endWaits.push([key, info]) } }
    }
  };
  const ctx = { _KDB, dispatch: (action) => dispatched.push(action.payload.phase), isDisposed: () => disposed };
  const startedAt = Date.now();
  const pending = hydrate.applyTabsEffects(ctx, { type: "tabs/hydrateDom" });
  disposed = true;
  _KDB.runtime.tabs.abortControllers.hydrate.abort();
  assert.equal(await pending, false);
  assert.ok(Date.now() - startedAt < 250);
  assert.deepEqual(dispatched, ["pending", "confirmed"]);
  assert.deepEqual(endWaits, [["tabs.primaryTabButtonSelector", { aborted: true, found: false }]]);
  assert.equal(_KDB.runtime.tabs.abortControllers.hydrate, undefined);
});

test("page loading cover: finishWhenReady ends once the inner page exists, finish() cancels the poll", async () => {
  let ready = false;
  const wrapper = { id: "p1", matches: () => false, querySelector: () => (ready ? { id: "inner" } : null) };
  const doc = { getElementById: (id) => (id === "p1" ? wrapper : null) };
  const loading = load("pageLoading.js", { document: doc });
  const calls = [];
  const _KDB = {
    services: { loading: { startLoading: (opts) => { calls.push("start:" + opts.mountEl.id); return "handle"; }, finishLoading: () => calls.push("finish") } },
    runtime: { tabs: { abortControllers: {} } },
    state: { tabs: {} }
  };
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  assert.equal(loading.start(_KDB, { pageId: "p1", finishWhenReady: true }), "handle");
  await sleep(150);
  ready = true;
  await sleep(250);
  assert.deepEqual(calls, ["finish", "start:p1", "finish"]);
  assert.equal(_KDB.runtime.tabs.abortControllers.tabPageLoadingReady, undefined);

  ready = false;
  calls.length = 0;
  loading.start(_KDB, { pageId: "p1", finishWhenReady: true });
  loading.finish(_KDB);
  ready = true;
  await sleep(250);
  assert.deepEqual(calls, ["finish", "start:p1", "finish"]);
});

test("traverse options: key and target indexes", () => {
  const options = load("traverse/traverseOptions.js");
  const normalized = options.normalizeTraverseOptions({ source: "mount" });
  assert.equal(typeof options.buildTraverseKey(normalized), "string");
  assert.equal(options.buildTraverseKey(normalized), options.buildTraverseKey(options.normalizeTraverseOptions({ source: "mount" })));
  const failed = options.buildFailedPayload("TABS_TRAVERSE_TIMEOUT", "timed out");
  assert.equal(failed.errorCode, "TABS_TRAVERSE_TIMEOUT");
});
