// Golden tests for core/services/loadingService (WS-D1). They lock the public surface, the overlay DOM contract,
// the state.loading counters and the watchdog behaviour through core/services/loadingService/__orchestratorLoadingService.js.
// Run: node --test tools/tests/ws-d1-loading-service.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";
import { createEnv } from "./ws-d1-fake-dom.mjs";

const ENTRY = path.join(JS_ROOT, "core/services/loadingService/__orchestratorLoadingService.js");
const BOOT_KEY = "kdb-root-loading-animation-mount";

function setup(options = {}) {
  const env = createEnv();
  const widgetEl = env.document.createElement("div");
  if (options.widgetId) widgetEl.id = options.widgetId;
  env.document.body.appendChild(widgetEl);
  const homeChoices = [];
  const _KDB = {
    elements: { kdbWidget: options.noWidget ? null : widgetEl, selectors: { root: { loadingIndicatorSelector: ".loadingIndicatorContainer" } } },
    config: { labels: { de: options.labels ? { loading: options.labels } : {} } },
    runtime: {}
  };
  const register = loadAmd(ENTRY, { stubs: env.stubs });
  const service = register(_KDB);
  if (!options.noHomeDialog) {
    service.registerWatchdogHandler(BOOT_KEY, (payload) => { homeChoices.push({ kdb: _KDB, opts: payload }); return Promise.resolve(); });
  }
  return { env, _KDB, service, register, widgetEl, homeChoices };
}

const spinnerOf = (mountEl) => mountEl.querySelector(":scope > .loadingIndicatorContainer");
const flush = () => new Promise((resolve) => setImmediate(resolve));

test("register: surface, labels merge, a new service on every registration", () => {
  const { _KDB, service, register } = setup({ labels: { dashboard: "Eigen" } });
  assert.deepEqual(Object.keys(service).sort(), ["destroy", "finishLoading", "isLoading", "registerWatchdogHandler", "startLoading", "updateLoadingMessage"]);
  assert.equal(_KDB.services.loading, service);
  assert.equal(_KDB.config.labels.de.loading.dashboard, "Eigen");
  assert.equal(_KDB.config.labels.de.loading.chart, "Diagramm wird geladen");
  assert.equal(_KDB.config.labels.de.loading.watchdogTitle, "Dashboard nicht vollständig geladen");
  assert.notEqual(register(_KDB), service);
});

test("startLoading: default mount, key resolution (option, id, default), handle shape", () => {
  let ctx = setup();
  let handle = ctx.service.startLoading();
  assert.deepEqual(Object.keys(handle).sort(), ["mountEl", "mountKey"]);
  assert.equal(handle.mountKey, "kdb-root-loading");
  assert.equal(handle.mountEl, ctx.widgetEl);

  ctx = setup({ widgetId: "w-1" });
  assert.equal(ctx.service.startLoading().mountKey, "w-1");
  assert.equal(ctx.service.startLoading({ mountKey: "custom" }).mountKey, "custom");

  const other = ctx.env.document.createElement("div");
  other.id = "other-id";
  handle = ctx.service.startLoading({ mountEl: other });
  assert.equal(handle.mountKey, "other-id");
  assert.equal(handle.mountEl, other);

  assert.equal(setup({ noWidget: true }).service.startLoading(), null);
});

test("startLoading: overlay DOM, variants and captions", () => {
  const { env, _KDB, service, widgetEl } = setup();
  service.startLoading({ messageKey: "chart", sessionMessage: "Sitzung" });
  assert.equal(widgetEl.className, "KDB_loading");
  const spinner = spinnerOf(widgetEl);
  assert.equal(spinner.className, "loadingIndicatorContainer loadingIndicatorSolid");
  assert.equal(widgetEl.children.length, 1);
  const caption = spinner.querySelector(".KDB_loadingMessage");
  assert.equal(caption.textContent, "Diagramm wird geladen");
  assert.equal(caption.hidden, false);
  const session = spinner.querySelector(":scope > .KDB_loadingSessionMessage");
  assert.equal(session.textContent, "Sitzung");
  assert.equal(spinner.children.indexOf(session) < spinner.children.indexOf(spinner.querySelector(":scope > .loading_indicator")), true);
  assert.equal(_KDB.state.loading["kdb-root-loading"].activeCount, 1);

  const transparent = env.document.createElement("div");
  env.document.body.appendChild(transparent);
  service.startLoading({ mountEl: transparent, mountKey: "t", transparent: true, message: "Direkt" });
  assert.equal(spinnerOf(transparent).className, "loadingIndicatorContainer loadingIndicatorTransparent");
  assert.equal(spinnerOf(transparent).querySelector(".KDB_loadingMessage").textContent, "Direkt");

  const plain = env.document.createElement("div");
  env.document.body.appendChild(plain);
  service.startLoading({ mountEl: plain, mountKey: "p" });
  assert.equal(spinnerOf(plain).querySelector(".KDB_loadingMessage").hidden, true);
  assert.equal(spinnerOf(plain).querySelector(".KDB_loadingSessionMessage"), null);
});

test("nested start/finish keeps one spinner until the last finish; the finished entry is dropped", () => {
  const { env, _KDB, service, widgetEl } = setup();
  const first = service.startLoading({ mountKey: "k" });
  service.startLoading({ mountKey: "k" });
  assert.equal(widgetEl.querySelectorAll(":scope > .loadingIndicatorContainer").length, 1);
  assert.deepEqual(_KDB.state.loading.k, { activeCount: 2, isActive: true });
  service.finishLoading({ handle: first });
  env.clock.advance(0);
  assert.equal(_KDB.state.loading.k.activeCount, 1);
  assert.ok(spinnerOf(widgetEl));
  service.finishLoading({ handle: first });
  assert.ok(spinnerOf(widgetEl), "removal runs on a timer");
  env.clock.advance(0);
  assert.equal(spinnerOf(widgetEl), null);
  assert.equal(widgetEl.className, "");
  assert.equal(_KDB.state.loading.k, undefined);
  service.finishLoading({ handle: first });
  assert.equal(_KDB.state.loading.k, undefined);
});

test("isLoading: true while a mount key is loading, false for finished, unknown and destroyed keys", () => {
  const { service } = setup();
  assert.equal(service.isLoading("k"), false);
  service.startLoading({ mountKey: "k" });
  service.startLoading({ mountKey: "k" });
  assert.equal(service.isLoading("k"), true);
  service.finishLoading({ mountKey: "k" });
  assert.equal(service.isLoading("k"), true);
  service.finishLoading({ mountKey: "k" });
  assert.equal(service.isLoading("k"), false);
  service.startLoading({ mountKey: "k" });
  service.destroy();
  assert.equal(service.isLoading("k"), false);
});

test("finishLoading accepts mountEl, mountKey or handle", () => {
  const { env, service, widgetEl } = setup();
  service.startLoading({ mountKey: "by-key" });
  service.finishLoading({ mountKey: "by-key" });
  env.clock.advance(0);
  assert.equal(spinnerOf(widgetEl), null);

  service.startLoading({ mountKey: "by-el" });
  service.finishLoading({ mountEl: widgetEl, mountKey: "by-el" });
  env.clock.advance(0);
  assert.equal(spinnerOf(widgetEl), null);

  const handle = service.startLoading({ mountKey: "by-handle" });
  service.finishLoading({ handle });
  env.clock.advance(0);
  assert.equal(spinnerOf(widgetEl), null);
});

test("finishLoading for an unknown key never throws and leaves no entry", () => {
  const { _KDB, service } = setup();
  assert.doesNotThrow(() => service.finishLoading({ mountKey: "never-started" }));
  assert.equal(_KDB.state.loading["never-started"], undefined);
});

test("removeDelayMs delays removal; restarting on the same mount cancels it", () => {
  const { env, _KDB, service, widgetEl } = setup();
  service.startLoading({ mountKey: "d" });
  service.finishLoading({ mountKey: "d", removeDelayMs: 500 });
  env.clock.advance(499);
  assert.ok(spinnerOf(widgetEl));
  env.clock.advance(1);
  assert.equal(spinnerOf(widgetEl), null);

  service.startLoading({ mountKey: "d" });
  service.finishLoading({ mountKey: "d", removeDelayMs: 500 });
  env.clock.advance(100);
  service.startLoading({ mountKey: "d" });
  env.clock.advance(1000);
  assert.ok(spinnerOf(widgetEl));
  assert.equal(widgetEl.className, "KDB_loading");
  assert.deepEqual(_KDB.state.loading.d, { activeCount: 1, isActive: true });
});

test("static mounts get position relative while loading and are restored afterwards", () => {
  const { env, service, widgetEl } = setup();
  widgetEl.computedPosition = "static";
  widgetEl.style.position = "";
  service.startLoading({ mountKey: "pos" });
  assert.equal(widgetEl.style.position, "relative");
  service.finishLoading({ mountKey: "pos" });
  env.clock.advance(0);
  assert.equal(widgetEl.style.position, "");

  const positioned = env.document.createElement("div");
  positioned.computedPosition = "absolute";
  positioned.style.position = "absolute";
  env.document.body.appendChild(positioned);
  service.startLoading({ mountEl: positioned, mountKey: "abs" });
  assert.equal(positioned.style.position, "absolute");
  service.finishLoading({ mountEl: positioned, mountKey: "abs" });
  env.clock.advance(0);
  assert.equal(positioned.style.position, "absolute");
});

test("updateLoadingMessage: true only for an active spinner under its mount", () => {
  const { env, service, widgetEl } = setup();
  assert.equal(service.updateLoadingMessage({ mountKey: "u", message: "x" }), false);
  const handle = service.startLoading({ mountKey: "u", message: "Start" });
  assert.equal(service.updateLoadingMessage({ mountKey: "u", message: "Zwei" }), true);
  assert.equal(spinnerOf(widgetEl).querySelector(".KDB_loadingMessage").textContent, "Zwei");
  assert.equal(service.updateLoadingMessage({ handle, messageKey: "tab" }), true);
  assert.equal(spinnerOf(widgetEl).querySelector(".KDB_loadingMessage").textContent, "Registerkarte wird geladen");
  assert.equal(service.updateLoadingMessage({ mountKey: "", message: "x" }), false);
  assert.equal(service.updateLoadingMessage({ mountKey: "other", message: "x" }), false);
  service.finishLoading({ handle });
  env.clock.advance(0);
  assert.equal(service.updateLoadingMessage({ mountKey: "u", message: "x" }), false);
});

test("watchdog (non-boot key): finishes the overlay after watchdogMs and shows no dialog", async () => {
  const { env, _KDB, service, widgetEl, homeChoices } = setup();
  service.startLoading({ mountKey: "smoke-test", watchdogMs: 2000 });
  env.clock.advance(1999);
  assert.ok(spinnerOf(widgetEl));
  env.clock.advance(1);
  assert.equal(spinnerOf(widgetEl), null);
  await flush();
  assert.deepEqual(homeChoices, []);
  assert.equal(_KDB.state.loading["smoke-test"], undefined);
});

test("watchdog (boot mount key): default 5 minutes, then the home dialog is presented once", async () => {
  const { env, _KDB, service, widgetEl, homeChoices } = setup();
  service.startLoading({ mountKey: BOOT_KEY });
  env.clock.advance(299999);
  assert.ok(spinnerOf(widgetEl));
  assert.equal(homeChoices.length, 0);
  env.clock.advance(1);
  await flush();
  assert.equal(spinnerOf(widgetEl), null);
  assert.equal(homeChoices.length, 1);
  assert.equal(homeChoices[0].kdb, _KDB);
  assert.deepEqual(homeChoices[0].opts, {
    title: _KDB.config.labels.de.loading.watchdogTitle,
    message: _KDB.config.labels.de.loading.watchdogBody,
    code: "LOADING_WATCHDOG",
    severity: "warning",
    mountKey: BOOT_KEY
  });
});

test("watchdog is cleared by finishLoading and re-armed by a second start", async () => {
  const { env, service, homeChoices } = setup();
  service.startLoading({ mountKey: BOOT_KEY, watchdogMs: 1000 });
  service.finishLoading({ mountKey: BOOT_KEY });
  env.clock.advance(5000);
  await flush();
  assert.equal(homeChoices.length, 0);

  service.startLoading({ mountKey: BOOT_KEY, watchdogMs: 1000 });
  env.clock.advance(900);
  service.startLoading({ mountKey: BOOT_KEY, watchdogMs: 1000 });
  env.clock.advance(900);
  await flush();
  assert.equal(homeChoices.length, 0);
  env.clock.advance(100);
  await flush();
  assert.equal(homeChoices.length, 1);
});

test("watchdog without a registered handler lifts the overlay and logs nothing", async () => {
  const { env, service, widgetEl } = setup({ noHomeDialog: true });
  service.startLoading({ mountKey: BOOT_KEY, watchdogMs: 10 });
  env.clock.advance(10);
  await flush();
  assert.equal(spinnerOf(widgetEl), null);
  assert.equal(env.console.calls.error.length, 0);
  assert.equal(env.console.calls.warn.length, 0);
});

test("registerWatchdogHandler: handlers per mount key run in registration order with their own payload copy", async () => {
  const { env, service } = setup({ noHomeDialog: true });
  const seen = [];
  service.registerWatchdogHandler("chart-1", (payload) => { seen.push(["a", payload]); payload.title = "changed"; });
  service.registerWatchdogHandler("chart-1", (payload) => { seen.push(["b", payload]); });
  service.registerWatchdogHandler("chart-2", () => { seen.push(["other"]); });
  service.startLoading({ mountKey: "chart-1", watchdogMs: 10 });
  env.clock.advance(10);
  await flush();
  assert.deepEqual(seen.map((entry) => entry[0]), ["a", "b"]);
  assert.equal(seen[1][1].title, "Dashboard nicht vollständig geladen");
  assert.deepEqual(Object.keys(seen[1][1]).sort(), ["code", "message", "mountKey", "severity", "title"]);
  assert.equal(seen[1][1].mountKey, "chart-1");
});

test("registerWatchdogHandler: unregister removes only that handler and is safe to call twice", async () => {
  const { env, service } = setup({ noHomeDialog: true });
  const seen = [];
  const offA = service.registerWatchdogHandler(BOOT_KEY, () => seen.push("a"));
  service.registerWatchdogHandler(BOOT_KEY, () => seen.push("b"));
  offA();
  offA();
  service.startLoading({ mountKey: BOOT_KEY, watchdogMs: 10 });
  env.clock.advance(10);
  await flush();
  assert.deepEqual(seen, ["b"]);
});

test("registerWatchdogHandler: the same function registered twice runs twice; one unregister removes only its own registration", async () => {
  const { env, service } = setup({ noHomeDialog: true });
  const seen = [];
  const shared = () => { seen.push("shared"); };
  const offFirst = service.registerWatchdogHandler(BOOT_KEY, shared);
  service.registerWatchdogHandler(BOOT_KEY, shared);
  offFirst();
  offFirst();
  service.startLoading({ mountKey: BOOT_KEY, watchdogMs: 10 });
  env.clock.advance(10);
  await flush();
  assert.deepEqual(seen, ["shared"]);
});

test("registerWatchdogHandler: a throwing or rejecting handler is logged and does not stop the others", async () => {
  const { env, service } = setup({ noHomeDialog: true });
  const seen = [];
  service.registerWatchdogHandler(BOOT_KEY, () => { throw new Error("sync"); });
  service.registerWatchdogHandler(BOOT_KEY, () => Promise.reject(new Error("async")));
  service.registerWatchdogHandler(BOOT_KEY, () => seen.push("third"));
  service.startLoading({ mountKey: BOOT_KEY, watchdogMs: 10 });
  assert.doesNotThrow(() => env.clock.advance(10));
  await flush();
  assert.deepEqual(seen, ["third"]);
  assert.deepEqual(env.console.calls.error.map((entry) => entry[0]), ["[loadingService.presentWatchdog] failed", "[loadingService.presentWatchdog] failed"]);
});

test("registerWatchdogHandler: invalid arguments are rejected with a warning and a no-op unregister", () => {
  const { env, service } = setup({ noHomeDialog: true });
  for (const args of [["", () => {}], [null, () => {}], [BOOT_KEY, null], [BOOT_KEY, "x"]]) {
    const unregister = service.registerWatchdogHandler(...args);
    assert.equal(typeof unregister, "function");
    assert.doesNotThrow(unregister);
  }
  assert.equal(env.console.calls.warn.length, 4);
});

test("watchdog with empty labels and a registered handler warns once and calls nobody", async () => {
  const { env, service } = setup({ noHomeDialog: true, labels: { watchdogTitle: "", watchdogBody: "" } });
  const seen = [];
  service.registerWatchdogHandler(BOOT_KEY, () => seen.push("called"));
  service.startLoading({ mountKey: BOOT_KEY, watchdogMs: 10 });
  env.clock.advance(10);
  await flush();
  assert.deepEqual(seen, []);
  assert.equal(env.console.calls.warn.length, 1);
});

test("destroy clears the watchdog handlers; registering afterwards is a blocked no-op", () => {
  const { env, _KDB, service } = setup({ noHomeDialog: true });
  service.registerWatchdogHandler(BOOT_KEY, () => {});
  service.destroy();
  assert.deepEqual(_KDB.runtime.loadingService.watchdogHandlersByMountKey, {});
  const unregister = service.registerWatchdogHandler(BOOT_KEY, () => {});
  assert.equal(typeof unregister, "function");
  assert.deepEqual(_KDB.runtime.loadingService.watchdogHandlersByMountKey, {});
  assert.equal(env.console.calls.warn.some((w) => /called after destroy/.test(w[0])), true);
});

test("destroy: removes overlays, restores mounts, clears timers, zeroes counters, guards later calls", () => {
  const { env, _KDB, service, widgetEl } = setup();
  widgetEl.computedPosition = "static";
  service.startLoading({ mountKey: "a", watchdogMs: 5000 });
  service.finishLoading({ mountKey: "a", removeDelayMs: 1000 });
  service.startLoading({ mountKey: "b", watchdogMs: 5000 });
  service.destroy();
  service.destroy();
  assert.equal(spinnerOf(widgetEl), null);
  assert.equal(widgetEl.className, "");
  assert.equal(widgetEl.style.position, "");
  assert.equal(env.clock.pendingTimeouts(), 0);
  assert.equal(_KDB.state.loading.a, undefined);
  assert.deepEqual(_KDB.state.loading.b, { activeCount: 0, isActive: false });
  const runtime = _KDB.runtime.loadingService;
  assert.deepEqual(runtime.timers.watchdogsByMountKey, {});
  assert.deepEqual(runtime.timers.removeDelaysByMountKey, {});
  assert.deepEqual(runtime.domRefs.mountsByMountKey, {});
  assert.deepEqual(runtime.domRefs.spinnersByMountKey, {});
  assert.deepEqual(runtime.domRefs.positionOverridesByMountKey, {});
  assert.deepEqual(runtime.domRefs.pendingRemovalByMountKey, {});
  assert.equal(service.startLoading({ mountKey: "c" }), null);
  assert.equal(service.finishLoading({ mountKey: "c" }), undefined);
  assert.equal(service.updateLoadingMessage({ mountKey: "c" }), false);
  assert.equal(env.console.calls.warn.filter((w) => /called after destroy/.test(w[0])).length, 3);
});

test("the position decision is made once per active overlay on a mount", () => {
  const { env, service, widgetEl } = setup();
  let reads = 0;
  const read = env.window.getComputedStyle;
  env.window.getComputedStyle = (el) => { reads += 1; return read(el); };
  widgetEl.computedPosition = "static";
  service.startLoading({ mountKey: "p1" });
  service.startLoading({ mountKey: "p1" });
  service.startLoading({ mountKey: "p1" });
  assert.equal(reads, 1);
  assert.equal(widgetEl.style.position, "relative");
  service.finishLoading({ mountKey: "p1" });
  service.finishLoading({ mountKey: "p1" });
  service.finishLoading({ mountKey: "p1" });
  env.clock.advance(0);
  assert.equal(widgetEl.style.position, "");
  service.startLoading({ mountKey: "p1" });
  assert.equal(reads, 2);
  assert.equal(widgetEl.style.position, "relative");
});

test("finishLoading resolves a non-string mountKey like the old code (truthy key, stored mount lookup)", () => {
  const { env, _KDB, service, widgetEl } = setup();
  service.startLoading({ mountKey: "7" });
  service.finishLoading({ mountKey: 7 });
  env.clock.advance(0);
  assert.equal(spinnerOf(widgetEl), null);
  assert.equal(_KDB.state.loading["7"], undefined);
  assert.equal(_KDB.state.loading["kdb-root-loading"], undefined);
});

test("watchdog callback failure is logged and does not escape the timer", async () => {
  const { env, _KDB, service, homeChoices } = setup();
  service.startLoading({ mountKey: BOOT_KEY, watchdogMs: 10 });
  _KDB.services.loading.finishLoading = () => { throw new Error("boom"); };
  assert.doesNotThrow(() => env.clock.advance(10));
  await flush();
  assert.equal(env.console.calls.error.length, 1);
  assert.equal(homeChoices.length, 0);
});
