// Surface tests for WS-C task C3: Cognos bridge (host globals), writeback runtime accessor, orchestrator, core/properties.
// Run: node --test tools/tests/ws-c-bridge-properties.test.mjs   (Node >= 22, no dependencies)
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const WB = path.join(JS_ROOT, "core/services/writeback");
const PROPS = path.join(JS_ROOT, "core/properties");
const RUNTIME_BUCKETS = ["domRefs", "listeners", "subscriptions", "abortControllers", "observers", "timers", "pendingPromises"];

function makeConsole() {
  const log = { error: [], warn: [], debug: [] };
  return {
    log,
    error: (...args) => log.error.push(args),
    warn: (...args) => log.warn.push(args),
    debug: (...args) => log.debug.push(args),
    info: () => {},
    log_: () => {},
  };
}

function makeEnv() {
  const top = { document: {} };
  const win = { top };
  const con = makeConsole();
  const doc = makeDocument();
  return { top, win, con, doc, stubs: { window: win, document: doc, console: con } };
}

function makeNode(tag) {
  const node = {
    tagName: tag,
    children: [],
    attrs: {},
    className: "",
    textContent: "",
    parentNode: null,
    classList: null,
    setAttribute(name, value) { this.attrs[name] = value; },
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
    removeChild(child) { this.children = this.children.filter((c) => c !== child); child.parentNode = null; return child; },
    querySelector(selector) {
      const attr = /^\[([\w-]+)\]$/.exec(selector);
      if (!attr) return null;
      return this.children.find((c) => attr[1] in c.attrs) || null;
    },
  };
  const classes = new Set();
  node.classList = {
    add: (name) => classes.add(name),
    remove: (name) => classes.delete(name),
    contains: (name) => classes.has(name),
  };
  return node;
}

function makeDocument() {
  const byId = {};
  const doc = {
    byId,
    selectors: {},
    createElement: (tag) => makeNode(tag),
    getElementById: (id) => byId[id] || null,
    querySelector: (selector) => doc.selectors[selector] || null,
    querySelectorAll(selector) {
      const attr = /^\[([\w-]+)\]$/.exec(selector);
      if (!attr) return [];
      const out = [];
      Object.values(byId).forEach((node) => node.children.forEach((c) => { if (attr[1] in c.attrs) out.push(c); }));
      return out;
    },
    addEventListener() {},
    removeEventListener() {},
  };
  return doc;
}

function makeKdb(overrides = {}) {
  const calls = { collect: [], restore: [], toV3: [], confirm: [] };
  const kdb = {
    _isDisposed: false,
    runtime: {},
    config: { labels: { de: {} } },
    utils: {},
    services: {
      writebackGet: { collect: async (opts) => { calls.collect.push(opts); return { v: 3, tabs: [] }; } },
      writebackSet: { restore: async (payload, status, opts) => { calls.restore.push({ payload, status, opts }); return { ok: true, status, runId: 1, outcome: "committed", diagnostics: [], phases: [] }; } },
      writebackMap: { toV3: (raw, opts) => { calls.toV3.push(raw); opts.diagnostics.push({ code: "MAPPED" }); return { v: 3, tabs: [], mapped: true }; } },
      message: { confirm: async (opts) => { calls.confirm.push(opts); return { confirmed: true }; } },
    },
    calls,
  };
  return Object.assign(kdb, overrides);
}

function loadBridgeFactory(env) {
  return loadAmd(path.join(WB, "cognosWritebackBridge.js"), { stubs: env.stubs });
}

const V3 = JSON.stringify({ v: 3, tabs: [] });
const V2 = JSON.stringify({ configuration: {}, tabs: [] });

test("install exposes both host globals with stamps; uninstall removes them", () => {
  const env = makeEnv();
  const bridge = loadBridgeFactory(env)({ _KDB: makeKdb() });
  assert.equal(bridge.isInstalled(), false);
  assert.equal(bridge.install(), true);
  assert.equal(bridge.install(), true, "install is idempotent");
  assert.equal(typeof env.top.WBParameterGetFunction, "function");
  assert.equal(typeof env.top.WBParameterSetFunction, "function");
  assert.equal(env.top.WBParameterGetFunction.__kdbWritebackBridge, true);
  assert.equal(env.top.WBParameterSetFunction.__kdbWritebackBridge, true);
  assert.ok(env.top.WBParameterGetFunction.__kdbOwner);
  assert.ok(env.top.WBParameterSetFunction.__kdbOwner);
  assert.equal(env.top.WBParameterGetFunction.__kdbForeignPrevious, undefined);
  assert.equal(bridge.isInstalled(), true);
  assert.equal(bridge.uninstall(), true);
  assert.equal(bridge.uninstall(), false);
  assert.equal("WBParameterGetFunction" in env.top, false);
  assert.equal("WBParameterSetFunction" in env.top, false);
  assert.equal(bridge.isInstalled(), false);
});

test("install is refused while the writeback services are missing", () => {
  const env = makeEnv();
  const kdb = makeKdb();
  delete kdb.services.writebackMap;
  const bridge = loadBridgeFactory(env)({ _KDB: kdb });
  assert.equal(bridge.install(), false);
  assert.equal("WBParameterGetFunction" in env.top, false);
  assert.equal(env.con.log.error.length, 1);
});

test("a foreign previous is kept as __kdbForeignPrevious and put back on uninstall", () => {
  const env = makeEnv();
  const foreignGet = () => "foreign-get";
  const foreignSet = () => "foreign-set";
  env.top.WBParameterGetFunction = foreignGet;
  env.top.WBParameterSetFunction = foreignSet;
  const bridge = loadBridgeFactory(env)({ _KDB: makeKdb() });
  bridge.install();
  assert.equal(env.top.WBParameterGetFunction.__kdbForeignPrevious, foreignGet);
  assert.equal(env.top.WBParameterSetFunction.__kdbForeignPrevious, foreignSet);
  assert.equal(env.con.log.warn.length, 1);
  bridge.uninstall();
  assert.equal(env.top.WBParameterGetFunction, foreignGet);
  assert.equal(env.top.WBParameterSetFunction, foreignSet);
});

function boot(env, factory, kdb) {
  const bridge = factory({ _KDB: kdb });
  bridge.install();
  return bridge;
}

test("double boot: destroying boot 1 then boot 2 restores the original foreign fn, never boot 1's anchor", () => {
  const env = makeEnv();
  const foreignGet = () => "foreign-get";
  env.top.WBParameterGetFunction = foreignGet;
  const factory = loadBridgeFactory(env);
  const kdb1 = makeKdb();
  const kdb2 = makeKdb();
  const bridge1 = boot(env, factory, kdb1);
  const anchor1 = env.top.WBParameterGetFunction;
  const bridge2 = boot(env, factory, kdb2);
  assert.notEqual(env.top.WBParameterGetFunction, anchor1);
  assert.equal(env.top.WBParameterGetFunction.__kdbForeignPrevious, foreignGet);
  kdb1._isDisposed = true;
  bridge1.destroy();
  assert.notEqual(env.top.WBParameterGetFunction, anchor1, "older boot must not touch the newer anchor");
  assert.equal(env.top.WBParameterGetFunction.__kdbWritebackBridge, true);
  bridge2.uninstall();
  assert.equal(env.top.WBParameterGetFunction, foreignGet);
  assert.equal("WBParameterSetFunction" in env.top, false);
});

test("double boot, reverse destroy order: boot 2 puts boot 1's live anchor back", () => {
  const env = makeEnv();
  const factory = loadBridgeFactory(env);
  const bridge1 = boot(env, factory, makeKdb());
  const anchor1Get = env.top.WBParameterGetFunction;
  const anchor1Set = env.top.WBParameterSetFunction;
  const bridge2 = boot(env, factory, makeKdb());
  bridge2.destroy();
  assert.equal(env.top.WBParameterGetFunction, anchor1Get);
  assert.equal(env.top.WBParameterSetFunction, anchor1Set);
  bridge1.destroy();
  assert.equal("WBParameterGetFunction" in env.top, false);
});

test("after destroy the anchor no longer retains its owner and a later boot never restores a disposed anchor", { todo: "fixed by C3 step 2 (__kdbOwner getter, owner nulled on destroy)" }, () => {
  const env = makeEnv();
  const factory = loadBridgeFactory(env);
  const kdb1 = makeKdb();
  const bridge1 = boot(env, factory, kdb1);
  const anchor1Get = env.top.WBParameterGetFunction;
  assert.equal(anchor1Get.__kdbOwner, kdb1);
  const kdb2 = makeKdb();
  const bridge2 = boot(env, factory, kdb2);
  kdb1._isDisposed = true;
  bridge1.destroy();
  assert.equal(anchor1Get.__kdbOwner, null);
  bridge2.destroy();
  assert.notEqual(env.top.WBParameterGetFunction, anchor1Get);
  assert.equal("WBParameterGetFunction" in env.top, false);
});

test("bridgeGet resolves the v3 JSON string and rejects when the collector fails", async () => {
  const env = makeEnv();
  const kdb = makeKdb();
  const bridge = loadBridgeFactory(env)({ _KDB: kdb });
  bridge.install();
  assert.equal(await env.top.WBParameterGetFunction(), JSON.stringify({ v: 3, tabs: [] }));
  assert.deepEqual(kdb.calls.collect, [{ source: "bridge" }]);
  kdb.services.writebackGet.collect = async () => { throw new Error("collect failed"); };
  await assert.rejects(env.top.WBParameterGetFunction(), /collect failed/);
});

test("bridgeSet never rejects: a throwing restore resolves a failed envelope", async () => {
  const env = makeEnv();
  const kdb = makeKdb();
  kdb.services.writebackSet.restore = async () => { throw new Error("restore exploded"); };
  const bridge = loadBridgeFactory(env)({ _KDB: kdb });
  bridge.install();
  const result = await env.top.WBParameterSetFunction(V3, "notDefaultParamSet");
  assert.equal(result.ok, false);
  assert.equal(result.outcome, "failed");
  assert.equal(result.runId, 0);
  assert.equal(result.status, "notDefaultParamSet");
  assert.deepEqual(result.phases, []);
  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0].code, "WRITEBACK_INVALID_V3_PAYLOAD");
  assert.equal(result.diagnostics[0].phase, "bridge");
  assert.equal(result.diagnostics[0].message, "restore exploded");
  assert.equal(result.diagnostics[0].runId, 0);
});

test("bridgeSet routes v3, v2, newDashboard and rejects unsupported input", async () => {
  const env = makeEnv();
  const kdb = makeKdb();
  const bridge = loadBridgeFactory(env)({ _KDB: kdb });
  bridge.install();
  const set = env.top.WBParameterSetFunction;

  let result = await set(V3, "notDefaultParamSet");
  assert.equal(result.outcome, "committed");
  assert.deepEqual(kdb.calls.restore[0], { payload: { v: 3, tabs: [] }, status: "notDefaultParamSet", opts: { source: "bridge" } });

  result = await set(V2, "notDefaultParamSet");
  assert.deepEqual(kdb.calls.restore[1].payload, { v: 3, tabs: [], mapped: true });
  assert.deepEqual(result.diagnostics, [{ code: "MAPPED" }]);

  result = await set(null, "newDashboard");
  assert.deepEqual(kdb.calls.restore[2], { payload: null, status: "newDashboard", opts: undefined });

  result = await set("{not json", "default");
  assert.equal(result.outcome, "failed");
  assert.equal(result.diagnostics[0].code, "WRITEBACK_UNSUPPORTED_LEGACY_FORMAT");

  result = await set(JSON.stringify({ foo: 1 }), "default");
  assert.equal(result.diagnostics[0].code, "WRITEBACK_UNSUPPORTED_LEGACY_FORMAT");

  result = await set("", undefined);
  assert.equal(result.status, "notDefaultParamSet");
  assert.equal(result.diagnostics[0].code, "WRITEBACK_INVALID_V3_PAYLOAD");
  assert.equal(kdb.calls.restore.length, 3);
});

test("bridgeSet: a declined discard-confirm cancels without restoring", async () => {
  const env = makeEnv();
  const kdb = makeKdb();
  kdb.services.message.confirm = async () => ({ confirmed: false });
  const select = { value: "pick", options: [] };
  env.doc.byId.selectParameterSet = select;
  const bridge = loadBridgeFactory(env)({ _KDB: kdb });
  bridge.install();
  const result = await env.top.WBParameterSetFunction(V3, "notDefaultParamSet");
  assert.deepEqual(result, { ok: false, status: "notDefaultParamSet", runId: 0, outcome: "cancelled", diagnostics: [], phases: [] });
  assert.equal(kdb.calls.restore.length, 0);
  assert.equal(select.value, "-", "select reverts to the last confirmed set (placeholder when none)");
});

test("bridge calls after the KDB is disposed fail closed", async () => {
  const env = makeEnv();
  const kdb = makeKdb();
  const bridge = loadBridgeFactory(env)({ _KDB: kdb });
  bridge.install();
  const get = env.top.WBParameterGetFunction;
  const set = env.top.WBParameterSetFunction;
  kdb._isDisposed = true;
  await assert.rejects(get(), (error) => error.diagnostic && error.diagnostic.code === "WRITEBACK_RESTORE_CANCELLED");
  const result = await set(V3, "notDefaultParamSet");
  assert.equal(result.ok, false);
  assert.equal(result.outcome, "failed");
  assert.equal(result.diagnostics[0].code, "WRITEBACK_RESTORE_CANCELLED");
  assert.equal(bridge.readSelectedParameterSet(), undefined);
  assert.deepEqual(await bridge.selectParameterSetById("x"), { ok: false, found: false, aborted: true });
});

test("readSelectedParameterSet reads id and sanitised label from the host select", () => {
  const env = makeEnv();
  const bridge = loadBridgeFactory(env)({ _KDB: makeKdb() });
  assert.deepEqual(bridge.readSelectedParameterSet(), { id: null, label: null });
  env.doc.byId.selectParameterSet = { value: "p1", selectedIndex: 1, options: [{ text: "-" }, { text: "Mein Set::intern" }] };
  assert.deepEqual(bridge.readSelectedParameterSet(), { id: "p1", label: "Mein Set" });
  env.doc.byId.selectParameterSet.value = "__KDB_NEW_DASHBOARD__";
  assert.deepEqual(bridge.readSelectedParameterSet(), { id: null, label: null });
});

test("selectParameterSetById times out when the host select never gets options", async () => {
  const env = makeEnv();
  const kdb = makeKdb();
  kdb.utils.waitFor = async () => { throw Object.assign(new Error("t"), { code: "WAITFOR_TIMEOUT" }); };
  kdb.utils.waitForElObserver = async () => { throw Object.assign(new Error("t"), { code: "TIMEOUT" }); };
  const bridge = loadBridgeFactory(env)({ _KDB: kdb });
  const result = await bridge.selectParameterSetById("p1", { timeoutMs: 60 });
  assert.equal(result.ok, false);
  assert.equal(result.found, false);
  assert.equal(result.timedOut, true);
});

test("ensureWritebackRuntime seeds every flag, keeps one object and never overwrites set values", () => {
  const env = makeEnv();
  const ensure = loadAmd(path.join(WB, "set/state/ensureWritebackRuntime.js"), { stubs: env.stubs });
  const kdb = {};
  const runtime = ensure(kdb);
  assert.equal(ensure(kdb), runtime);
  assert.equal(kdb.runtime.writeback, runtime);
  const flags = {
    parameterSetRestoreActive: false, parameterSetRestoreActiveCount: 0, parameterSetRestoreRunId: 0, pendingRunId: null,
    skipDiscardConfirmOnce: false, lastConfirmedParameterSetId: null, discardConfirmInFlight: false, pendingUrlShareMessage: null,
    pendingRestoreFailure: false, pendingRestoreInfo: null, urlShareRestoreWaiter: null, urlShareStartupPromise: null,
    urlShareBootOverlayActive: false,
  };
  Object.keys(flags).forEach((key) => assert.deepEqual(runtime[key], flags[key], key));
  assert.equal(typeof runtime.abortControllers, "object");
  assert.equal(typeof runtime.timers, "object");
  runtime.parameterSetRestoreRunId += 1;
  assert.equal(ensure(kdb).parameterSetRestoreRunId, 1);
  const partial = { parameterSetRestoreActive: true, abortControllers: null };
  const kdb2 = { runtime: { writeback: partial } };
  assert.equal(ensure(kdb2), partial);
  assert.equal(partial.parameterSetRestoreActive, true);
  assert.equal(typeof partial.abortControllers, "object");
});

test("ensureWritebackRuntime provides all seven standard buckets", { todo: "fixed by C3 step 1 (kit ensureRuntime)" }, () => {
  const env = makeEnv();
  const ensure = loadAmd(path.join(WB, "set/state/ensureWritebackRuntime.js"), { stubs: env.stubs });
  const runtime = ensure({});
  RUNTIME_BUCKETS.forEach((name) => assert.equal(typeof runtime[name], "object", name));
});

function loadOrchestrator(env) {
  return loadAmd(path.join(WB, "__orchestratorWriteback.js"), { stubs: env.stubs });
}

test("writeback orchestrator registers the four services, merges labels and honours installCognosBridge:false", () => {
  const env = makeEnv();
  const kdb = { config: { labels: { de: { writeback: { discardUnsavedTitle: "mine" } } } } };
  const services = loadOrchestrator(env)(kdb, { installCognosBridge: false });
  assert.equal(services, kdb.services);
  ["writebackGet", "writebackSet", "writebackMap", "writebackBridge"].forEach((name) => assert.equal(typeof services[name], "object", name));
  assert.equal(services.writebackBridge.isInstalled(), false);
  assert.equal("WBParameterGetFunction" in env.top, false);
  assert.equal(kdb.config.labels.de.writeback.discardUnsavedTitle, "mine", "existing labels win");
  assert.ok(Object.keys(kdb.config.labels.de.writeback).length > 1, "defaults are merged in");
  assert.equal(kdb.runtime.writeback.parameterSetRestoreRunId, 0);
});

test("writeback orchestrator installs the bridge by default and keeps pre-registered services", () => {
  const env = makeEnv();
  const existingGet = { collect: async () => ({}) };
  const kdb = { services: { writebackGet: existingGet } };
  const services = loadOrchestrator(env)(kdb);
  assert.equal(services.writebackGet, existingGet);
  assert.equal(services.writebackBridge.isInstalled(), true);
  assert.equal(typeof env.top.WBParameterGetFunction, "function");
  services.writebackBridge.destroy();
});

test("writeback orchestrator coerces a pre-existing runtime like before", () => {
  const env = makeEnv();
  const kdb = {
    runtime: {
      writeback: {
        parameterSetRestoreActive: "yes", parameterSetRestoreActiveCount: "3", parameterSetRestoreRunId: 7,
        pendingRunId: undefined, skipDiscardConfirmOnce: 1, urlShareBootOverlayActive: "x",
      },
    },
  };
  loadOrchestrator(env)(kdb, { installCognosBridge: false });
  const runtime = kdb.runtime.writeback;
  assert.equal(runtime.parameterSetRestoreActive, false);
  assert.equal(runtime.parameterSetRestoreActiveCount, 0);
  assert.equal(runtime.parameterSetRestoreRunId, 7);
  assert.equal(runtime.pendingRunId, null);
  assert.equal(runtime.skipDiscardConfirmOnce, false);
  assert.equal(runtime.urlShareBootOverlayActive, false);
});

// ---- core/properties ----

function makeContent(values) {
  const handlers = [];
  return {
    handlers,
    offCalls: [],
    getPropertyValue: (id) => values[id],
    on(name, handler) { handlers.push({ name, handler }); },
    off(name, handler) { this.offCalls.push({ name, handler }); },
  };
}

function makePropsKdb(env, values, extra = {}) {
  const host = makeNode("div");
  env.doc.selectors[".dashHost"] = host;
  const kdb = {
    runtime: { core: { adapters: { content: makeContent(values) } } },
    elements: { selectors: { root: { dashboardClassHost: ".dashHost" } } },
    config: { labels: { de: {} } },
    services: {},
    host,
  };
  return Object.assign(kdb, extra);
}

const ALL_OBJECT_IDS = {
  loadingTablesPropId: "loadingTablesPropObj",
  kennzahlenTablesPropId: "kennzahlenTablesPropObj",
  kennzahlenTreePropId: "kennzahlenTreePropObj",
  filterPropId: "filterPropObj",
  textWidgetPropId: "textWidgetPropObj",
  visualizationsPropId: "visualizationsPropObj",
  visualizationsDataPropId: "visualizationsDataPropObj",
  linePropId: "linePropObj",
  piePropId: "piePropObj",
  stackedBarPropId: "stackedBarPropObj",
  stackedColumnPropId: "stackedColumnPropObj",
  listPropId: "listPropObj",
  "com.ibm.vis.custom.prognoseyearlinechartPropId": "prognosePropObj",
  kennzahlSpecificSlotDefaultId: "kennzahlSpecificSlotDefaultObj",
  headerWidgetPropId: "headerWidgetPropObj",
  pdfAttachmentPageId: "pdfAttachmentPageObj",
};

function loadProps(env) {
  return loadAmd(path.join(PROPS, "__orchestratorProperties.js"), { stubs: env.stubs });
}

test("properties: boot maps the 16 object ids and the 4 toggles onto _KDB.properties", () => {
  const env = makeEnv();
  const values = {};
  Object.keys(ALL_OBJECT_IDS).forEach((id, index) => { values[id] = JSON.stringify({ [id]: { n: index } }); });
  Object.assign(values, { KDBReadyToggle: "yes", KDBLoadingImageToggle: "1", KDBLoadingImageTransparentToggle: "0", KDBHideWidgetsToggle: false });
  const kdb = makePropsKdb(env, values);
  const controller = loadProps(env)(kdb);
  Object.entries(ALL_OBJECT_IDS).forEach(([id, key], index) => assert.deepEqual(kdb.properties[key], { n: index }, key));
  assert.equal(kdb.properties.KDBReadyToggle, true);
  assert.equal(kdb.properties.KDBPlayLoadingImageToggle, true);
  assert.equal(kdb.properties.KDBLoadingImageTransparentToggle, false);
  assert.equal(kdb.properties.KDBHideWidgetsToggle, false);
  assert.equal(Object.keys(kdb.properties).length, 20);
  assert.equal(kdb.runtime.properties.controller, controller);
  assert.equal(typeof controller.loadProperties, "function");
  assert.equal(typeof controller.subscribePropertyChanges, "function");
  assert.equal(typeof controller.destroy, "function");
  assert.equal(typeof kdb.api.properties.applyDeveloperMode, "function");
});

test("properties: object parsing needs the wrapper key and tolerates garbage", () => {
  const env = makeEnv();
  const kdb = makePropsKdb(env, {
    filterPropId: JSON.stringify({ wrongKey: { a: 1 } }),
    linePropId: "not json",
    piePropId: "-",
    listPropId: JSON.stringify([1]),
    stackedBarPropId: "{ \"stackedBarPropId\": {\"ok\": true} }",
    textWidgetPropId: JSON.stringify({ textWidgetPropId: 1, other: 2 }),
  });
  loadProps(env)(kdb);
  assert.equal(kdb.properties.filterPropObj, undefined);
  assert.equal(kdb.properties.linePropObj, undefined);
  assert.equal(kdb.properties.piePropObj, undefined);
  assert.equal(kdb.properties.listPropObj, undefined);
  assert.equal(kdb.properties.textWidgetPropObj, undefined);
  assert.deepEqual(kdb.properties.stackedBarPropObj, { ok: true });
  assert.equal(kdb.properties.stackedColumnPropObj, undefined);
});

test("properties: toggle normalisation", () => {
  const env = makeEnv();
  const cases = [[true, true], [false, false], [null, false], [undefined, false], [" TRUE ", true], ["yes", true], ["1", true], ["no", false], ["", false], ["0", false], ["maybe", true], [2, true], [0, false]];
  cases.forEach(([input, expected]) => {
    const kdb = makePropsKdb(env, { KDBReadyToggle: input });
    loadProps(env)(kdb);
    assert.equal(kdb.properties.KDBReadyToggle, expected, String(input));
  });
});

test("properties: a missing content adapter degrades to undefined/false without throwing", () => {
  const env = makeEnv();
  const kdb = makePropsKdb(env, {});
  kdb.runtime.core.adapters.content = null;
  loadProps(env)(kdb);
  assert.equal(kdb.properties.filterPropObj, undefined);
  assert.equal(kdb.properties.KDBReadyToggle, false);
});

test("properties: developer-mode label defaults merge under existing labels", () => {
  const env = makeEnv();
  const kdb = makePropsKdb(env, {});
  kdb.config.labels.de.developerMode = { custom: "x" };
  loadProps(env)(kdb);
  assert.equal(kdb.config.labels.de.developerMode.custom, "x");
  assert.equal(kdb.config.labels.de.developerMode.hideDataBeforeSaveHint, "Hinweis: HideData-Filter vor dem Speichern entfernen");
  const kdb2 = makePropsKdb(env, {});
  loadProps(env)(kdb2);
  assert.equal(typeof kdb2.config.labels.de.developerMode.hideDataBeforeSaveHint, "string");
});

test("properties: the toggle subscription re-reads the property, destroy unsubscribes and disposes", () => {
  const env = makeEnv();
  const values = { KDBHideWidgetsToggle: "false" };
  const kdb = makePropsKdb(env, values);
  const controller = loadProps(env)(kdb);
  const content = kdb.runtime.core.adapters.content;
  assert.equal(content.handlers.length, 1);
  assert.equal(content.handlers[0].name, "change:property:KDBHideWidgetsToggle");
  assert.equal(kdb.host.classList.contains("KDB_developerMode"), false);

  values.KDBHideWidgetsToggle = "true";
  content.handlers[0].handler();
  assert.equal(kdb.properties.KDBHideWidgetsToggle, true);
  assert.equal(kdb.host.classList.contains("KDB_developerMode"), true);
  values.KDBHideWidgetsToggle = "false";
  content.handlers[0].handler();
  assert.equal(kdb.host.classList.contains("KDB_developerMode"), false);

  controller.subscribePropertyChanges();
  assert.equal(content.handlers.length, 1, "a second subscribe does not double-register");

  controller.destroy();
  assert.equal(content.offCalls.length, 1);
  assert.equal(content.offCalls[0].name, "change:property:KDBHideWidgetsToggle");
  assert.equal(content.offCalls[0].handler, content.handlers[0].handler);
  assert.equal(kdb.runtime.properties.controller, undefined);
  controller.destroy();
  assert.equal(content.offCalls.length, 1, "destroy is idempotent");
});

test("properties: calls after destroy warn once and do nothing", () => {
  const env = makeEnv();
  const kdb = makePropsKdb(env, { KDBReadyToggle: "true" });
  const controller = loadProps(env)(kdb);
  controller.destroy();
  const before = kdb.properties;
  assert.equal(controller.loadProperties(), undefined);
  assert.equal(controller.loadProperties(), undefined);
  assert.equal(kdb.properties, before);
  controller.subscribePropertyChanges();
  const warnings = env.con.log.warn.map((args) => String(args[0]));
  assert.equal(warnings.filter((w) => w.indexOf("[properties.loadProperties] called after destroy") === 0).length, 1);
  assert.equal(warnings.filter((w) => w.indexOf("[properties.subscribePropertyChanges] called after destroy") === 0).length, 1);
  kdb.api.properties.applyDeveloperMode({ source: "kdbControl", enabled: true });
  kdb.api.properties.applyDeveloperMode({ source: "kdbControl", enabled: true });
  const developerWarnings = env.con.log.warn.filter((args) => String(args[0]).indexOf("[properties.applyDeveloperMode] called after destroy") === 0);
  assert.equal(developerWarnings.length, 1);
  assert.equal(kdb.host.classList.contains("KDB_developerMode"), false);
});

test("properties: applyDeveloperMode sources", () => {
  const env = makeEnv();
  const dispatched = [];
  const kdb = makePropsKdb(env, { KDBHideWidgetsToggle: "false" }, {
    api: { kdbControl: { dispatch: (action) => dispatched.push(action) } },
  });
  loadProps(env)(kdb);
  const apply = kdb.api.properties.applyDeveloperMode;

  apply({ source: "kdbControl", enabled: true });
  assert.equal(kdb.properties.KDBHideWidgetsToggle, true);
  assert.equal(kdb.host.classList.contains("KDB_developerMode"), true);
  assert.equal(dispatched.length, 0);

  apply({ source: "writebackRestore", enabled: false });
  assert.equal(kdb.properties.KDBHideWidgetsToggle, false);
  assert.equal(kdb.host.classList.contains("KDB_developerMode"), false);

  kdb.runtime.core.adapters.content.getPropertyValue = () => "true";
  apply({ source: "cognos" });
  assert.equal(kdb.host.classList.contains("KDB_developerMode"), true);
  assert.deepEqual(dispatched, [{ type: "kdbControl/settings/setDeveloperMode", payload: { value: true, skipHistory: true } }]);

  const errorsBefore = env.con.log.error.length;
  apply({ source: "bogus" });
  assert.equal(env.con.log.error.length, errorsBefore + 1);
  apply({ source: "kdbControl" });
  assert.equal(kdb.properties.KDBHideWidgetsToggle, false, "missing enabled counts as false");
});

function makeHintKdb(env, rowsGate) {
  const widget = makeNode("div");
  env.doc.byId.widget1 = widget;
  const kdb = makePropsKdb(env, { KDBHideWidgetsToggle: "true" }, {
    services: {
      tableData: {
        waitForRows: () => rowsGate,
        readTableState: () => ({ widgetId: "widget1" }),
      },
    },
  });
  return { kdb, widget };
}

test("properties: the hide-data hint badge is appended once after the rows arrive", async () => {
  const env = makeEnv();
  const { kdb, widget } = makeHintKdb(env, Promise.resolve());
  loadProps(env)(kdb);
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(widget.children.length, 1);
  assert.equal(widget.children[0].textContent, "Hinweis: HideData-Filter vor dem Speichern entfernen");
  kdb.api.properties.applyDeveloperMode({ source: "kdbControl", enabled: true });
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(widget.children.length, 1, "no duplicate badge");
  kdb.api.properties.applyDeveloperMode({ source: "kdbControl", enabled: false });
  assert.equal(widget.children.length, 0, "switching developer mode off removes the badge");
});

test("properties: a stale hint from a disposed boot is not appended", { todo: "fixed by C3 step 6 (hintSeq per instance, disposed check)" }, async () => {
  const env = makeEnv();
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const { kdb, widget } = makeHintKdb(env, gate);
  const controller = loadProps(env)(kdb);
  controller.destroy();
  release();
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(widget.children.length, 0);
});
