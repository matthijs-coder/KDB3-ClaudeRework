// Golden test: cognosHost dataSources, messages and dashboard facets through the public service (stub host).
// Run: node --test tools/tests/ws-a2-edge-facets.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { create, quiet, ok } from "./ws-a2-helpers.mjs";

const state = (value) => ({ getState: () => value });

test("dataSources.hasErrorDataSource: error / ready / unsettled-then-settled / empty", async () => {
  const withList = (list) => create({ dataSources: { getDataSourceList: () => list } }).svc.dataSources;
  assert.deepEqual(await withList([state("ready"), state("error")]).hasErrorDataSource(), ok(true));
  assert.deepEqual(await withList([state("ready")]).hasErrorDataSource(), ok(false));
  assert.deepEqual(await withList([state("ready"), { getState() { throw new Error("x"); } }, state("error")]).hasErrorDataSource(), ok(true));
  let polls = 0;
  const settling = create({ dataSources: { getDataSourceList: () => (++polls < 3 ? [state("loading")] : [state("ready"), state("error")]) } });
  assert.deepEqual(await settling.svc.dataSources.hasErrorDataSource(), ok(true));
  assert.equal(polls, 3);
  assert.deepEqual(settling._KDB.runtime.cognosHostService.abortControllers, {});
});

test("dataSources.hasErrorDataSource: promise lists, missing host and capability are ok(false)", async () => {
  assert.deepEqual(await create({ dataSources: { getDataSourceList: async () => [state("error")] } }).svc.dataSources.hasErrorDataSource(), ok(true));
  assert.deepEqual(await create({}).svc.dataSources.hasErrorDataSource(), ok(false));
  assert.deepEqual(await create({ dataSources: {} }).svc.dataSources.hasErrorDataSource(), ok(false));
});

test("dataSources.hasErrorDataSource: destroy during the wait gives the disposed Outcome; host throw is ok(false)", quiet(async () => {
  const { svc } = create({ dataSources: { getDataSourceList: () => [state("loading")] } });
  const pending = svc.dataSources.hasErrorDataSource();
  setTimeout(() => svc.destroy(), 20);
  assert.deepEqual(await pending, ok(false), "a disposed wait yields no list");
  assert.deepEqual(await svc.dataSources.hasErrorDataSource(), { ok: false, outcome: "aborted", reason: "disposed" });
  const throwing = create({ dataSources: { getDataSourceList: () => { throw new Error("boom"); } } });
  assert.deepEqual(await throwing.svc.dataSources.hasErrorDataSource(), ok(false));
}));

test("messages.showToast: forwards text and type, ok()", async () => {
  const calls = [];
  const { svc } = create({ glassMessages: { showToast: (text, type) => calls.push([text, type]) } });
  assert.deepEqual(await svc.messages.showToast("hello", "info"), { ok: true, outcome: "ok", data: undefined });
  await svc.messages.showToast(null, "warn");
  assert.deepEqual(calls, [["hello", "info"], ["", "warn"]]);
});

test("messages.showToast: failures, aborts and disposed", quiet(async () => {
  const failing = create({ glassMessages: { showToast: () => { throw new Error("nope"); } } });
  const outcome = await failing.svc.messages.showToast("x", "info");
  assert.equal(outcome.errorCode, "MESSAGES_WRITE_FAILED");
  assert.deepEqual(outcome.diagnostics, [{ code: "MESSAGES_WRITE_FAILED", message: "nope" }]);
  const abortError = create({ glassMessages: { showToast: () => { const e = new Error("a"); e.name = "AbortError"; throw e; } } });
  assert.deepEqual(await abortError.svc.messages.showToast("x", "info"), { ok: false, outcome: "aborted", reason: "aborted" });
  const pre = new AbortController();
  pre.abort();
  assert.deepEqual(await failing.svc.messages.showToast("x", "info", { signal: pre.signal }), { ok: false, outcome: "aborted", reason: "aborted" });
  const mid = new AbortController();
  const slow = create({ glassMessages: { showToast: () => mid.abort() } });
  assert.deepEqual(await slow.svc.messages.showToast("x", "info", { signal: mid.signal }), { ok: false, outcome: "aborted", reason: "aborted-after-effect" });
  const gone = create({ glassMessages: { showToast: () => {} } });
  gone.svc.destroy();
  assert.deepEqual(await gone.svc.messages.showToast("x", "info"), { ok: false, outcome: "aborted", reason: "disposed" });
  assert.equal((await create({ glassMessages: {} }).svc.messages.showToast("x", "i")).errorCode, "MESSAGES_HOST_CAPABILITY_MISSING");
}));

test("dashboard dynamic getters: every frozen method name is looked up on the host", () => {
  const names = ["getFileName", "getDashboardVersion", "getEnvironmentSource", "getBoardId", "getDashboardBiBaseUrl", "getLanguage", "getUserName", "getMode"];
  const host = Object.fromEntries(names.map((n) => [n, () => "v:" + n]));
  const { svc } = create({ dashboard: host });
  for (const name of names) {
    assert.deepEqual(svc.dashboard[name](), ok("v:" + name), name);
  }
});

test("dashboard getters: null, promise, live object, throw, missing capability", quiet(async () => {
  const get = (value) => create({ dashboard: { getFileName: () => value } }).svc.dashboard.getFileName();
  assert.deepEqual(get(null), ok(null));
  assert.deepEqual(get(undefined), ok(null));
  assert.deepEqual(get(7), ok(7));
  assert.deepEqual(get(false), ok(false));
  assert.deepEqual(get(Promise.resolve("x")), { ok: false, outcome: "failed", errorCode: "DASHBOARD_READ_FAILED", diagnostics: [{ code: "DASHBOARD_READ_FAILED", message: "host returned a Promise" }] });
  assert.deepEqual(get({}).diagnostics, [{ code: "DASHBOARD_READ_FAILED", message: "host returned a live object" }]);
  const throwing = create({ dashboard: { getFileName: () => { throw new Error("t"); } } }).svc.dashboard.getFileName();
  assert.deepEqual(throwing.diagnostics, [{ code: "DASHBOARD_READ_FAILED", message: "t" }]);
  const { svc } = create({ dashboard: { getFileName: () => "x" } });
  svc.destroy();
  assert.deepEqual(svc.dashboard.getFileName(), { ok: false, outcome: "aborted", reason: "disposed" });
}));

test("dashboard.getFileName: a stale generation answers disposed", () => {
  const { svc, _KDB } = create({ dashboard: { getFileName: () => "x" } });
  _KDB.runtime.cognosHostService.generation += 1;
  assert.deepEqual(svc.dashboard.getFileName(), { ok: false, outcome: "aborted", reason: "disposed" });
});

function uiStateHost() {
  const host = {
    listeners: [],
    uiState: { authoring: true, mode: "edit" },
    removed: 0,
    getCurrentDashboardUiState: () => host.uiState,
    onDashboardUiStateChange(listener) {
      host.listeners.push(listener);
      return { remove() { host.removed += 1; host.listeners.splice(host.listeners.indexOf(listener), 1); } };
    }
  };
  return host;
}

test("dashboard.subscribeUiState: boot snapshot, change events, mode override, unsubscribe", () => {
  const host = uiStateHost();
  const { svc } = create({ dashboard: host });
  const seen = [];
  const unsubscribe = svc.dashboard.subscribeUiState((snapshot) => seen.push(snapshot));
  assert.deepEqual(seen, [{ authoring: true, mode: "edit" }]);
  host.listeners[0]({ authoring: false, mode: "view" });
  host.listeners[0](Promise.resolve());
  host.listeners[0]({ authoring: true, mode: { live: 1 } });
  assert.deepEqual(seen.slice(1), [{ authoring: false, mode: "view" }, { authoring: false, mode: null }, { authoring: true, mode: null }]);
  host.getMode = () => "present";
  host.listeners[0]({ authoring: true });
  assert.deepEqual(seen[seen.length - 1], { authoring: true, mode: "present" });
  unsubscribe();
  unsubscribe();
  assert.equal(host.removed, 1);
  assert.equal(host.listeners.length, 0);
  assert.equal(seen.length, 5);
});

test("dashboard.subscribeUiState: callback errors are contained; noop when unusable", quiet(async () => {
  const host = uiStateHost();
  const { svc } = create({ dashboard: host });
  svc.dashboard.subscribeUiState(() => { throw new Error("cb"); });
  host.listeners[0]({ authoring: true });
  assert.equal(typeof svc.dashboard.subscribeUiState(null), "function");
  assert.equal(typeof create({ dashboard: {} }).svc.dashboard.subscribeUiState(() => {}), "function");
  assert.equal(typeof create({}).svc.dashboard.subscribeUiState(() => {}), "function");
  const destroyed = create({ dashboard: uiStateHost() });
  destroyed.svc.destroy();
  assert.equal(typeof destroyed.svc.dashboard.subscribeUiState(() => {}), "function");
}));

test("dashboard.subscribeUiState: destroy releases the host subscription", () => {
  const host = uiStateHost();
  const { svc } = create({ dashboard: host });
  svc.dashboard.subscribeUiState(() => {});
  assert.equal(host.listeners.length, 1);
  svc.destroy();
  assert.equal(host.listeners.length, 0);
  assert.equal(host.removed, 1);
});

test("dashboard.subscribeUiState: promise and function handles are detached", async () => {
  let called = 0;
  const viaPromise = { onDashboardUiStateChange: () => Promise.resolve({ unsubscribe() { called += 1; } }) };
  const first = create({ dashboard: viaPromise });
  first.svc.dashboard.subscribeUiState(() => {})();
  await new Promise((r) => setTimeout(r, 5));
  const viaFn = { onDashboardUiStateChange: () => () => { called += 10; } };
  create({ dashboard: viaFn }).svc.dashboard.subscribeUiState(() => {})();
  assert.equal(called, 11);
});

test("dashboard.openAppView: only the home view, awaits the host, abort-after-effect on destroy", async () => {
  const opened = [];
  const { svc } = create({ dashboard: { openAppView: async (name) => { opened.push(name); } } });
  assert.deepEqual(await svc.dashboard.openAppView("home"), ok({ ready: true }));
  assert.deepEqual(opened, ["home"]);
  assert.equal((await svc.dashboard.openAppView("settings")).errorCode, "DASHBOARD_INVALID_VIEW");
  assert.equal((await create({ dashboard: {} }).svc.dashboard.openAppView("home")).errorCode, "DASHBOARD_HOST_CAPABILITY_MISSING");
  assert.equal((await create({}).svc.dashboard.openAppView("home")).errorCode, "DASHBOARD_HOST_UNAVAILABLE");
  const racing = create({ dashboard: { openAppView: async () => { racing.svc.destroy(); } } });
  assert.deepEqual(await racing.svc.dashboard.openAppView("home"), { ok: false, outcome: "aborted", reason: "aborted-after-effect" });
});

test("dashboard.openAppView: host failure is NAV_FAILED", quiet(async () => {
  const { svc } = create({ dashboard: { openAppView: () => { throw new Error("nav"); } } });
  const outcome = await svc.dashboard.openAppView("home");
  assert.equal(outcome.errorCode, "DASHBOARD_NAV_FAILED");
  assert.deepEqual(outcome.diagnostics, [{ code: "DASHBOARD_NAV_FAILED", message: "nav" }]);
}));

test("dashboard.replaceWithBiHomePerspective: builds the URL on window.top", () => {
  const replaced = [];
  const window = { top: { location: { replace: (url) => replaced.push(url) } } };
  const make = (base) => create({ dashboard: { getDashboardBiBaseUrl: () => base } }, { window }).svc.dashboard;
  assert.deepEqual(make("https://bi.example/bi").replaceWithBiHomePerspective(), ok({ ready: true }));
  assert.deepEqual(make("https://bi.example/bi/").replaceWithBiHomePerspective(), ok({ ready: true }));
  assert.deepEqual(replaced, ["https://bi.example/bi/?perspective=home", "https://bi.example/bi/?perspective=home"]);
});

test("dashboard.replaceWithBiHomePerspective: invalid base url, no window, capability", quiet(async () => {
  const window = { top: { location: { replace() {} } } };
  const bad = create({ dashboard: { getDashboardBiBaseUrl: () => "" } }, { window }).svc.dashboard.replaceWithBiHomePerspective();
  assert.deepEqual(bad.diagnostics, [{ code: "DASHBOARD_NAV_FAILED", message: "invalid dashboard bi base url" }]);
  const noWindow = create({ dashboard: { getDashboardBiBaseUrl: () => "https://x" } }).svc.dashboard.replaceWithBiHomePerspective();
  assert.deepEqual(noWindow.diagnostics, [{ code: "DASHBOARD_NAV_FAILED", message: "window.top.location.replace is missing" }]);
  assert.equal(create({ dashboard: {} }, { window }).svc.dashboard.replaceWithBiHomePerspective().errorCode, "DASHBOARD_HOST_CAPABILITY_MISSING");
}));
