// Contract test for WS-C writebackSet: restore constants, RestoreResult shape, run context, restore run
// phases (newDashboard branch, cancel/overlap/destroy), lifecycle and inventory waits, URL-share startup.
// Run: node --test tools/tests/ws-c-restore-contract.test.mjs
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const WB = path.join(JS_ROOT, "core/services/writeback");
const MODULES = {
  constants: "set/config/restoreConstants.js",
  labels: "set/config/writebackLabels.js",
  buildRestoreResult: "set/state/buildRestoreResult.js",
  createRunContext: "set/state/createRunContext.js",
  service: "set/createWritebackSetService.js",
  waitForRootLifecycleReady: "set/effects/waitForRootLifecycleReady.js",
  ensureTabWidgetsRouted: "set/effects/ensureTabWidgetsRouted.js",
  whenUrlShareRestoreSettled: "urlShare/whenUrlShareRestoreSettled.js",
  waitForSingleSelectInventoryQuiet: "urlShare/waitForSingleSelectInventoryQuiet.js",
  mapUrlShareSelectResult: "urlShare/mapUrlShareSelectResult.js",
};

function createConsole() {
  const calls = [];
  const record = (level) => (...args) => { calls.push({ level, args }); };
  return { calls, log: record("log"), info: record("info"), warn: record("warn"), error: record("error"), debug: record("debug") };
}

function createDocument(href) {
  const url = new URL(href || "https://cognos.test/dashboard");
  return { location: { href: url.href, origin: url.origin }, getElementById: () => null };
}

function load(name, options = {}) {
  const console = options.console || createConsole();
  const stubs = {
    console,
    document: options.document || createDocument(),
    performance: { getEntriesByType: () => [] },
  };
  return loadAmd(path.join(WB, MODULES[name]), { stubs, modules: options.modules || {} });
}

const constants = load("constants");
const errorCodes = loadAmd(path.join(WB, "schema/errorCodes.js"));
const realWaitFor = loadAmd(path.join(JS_ROOT, "core/utils/waitFor.js"));
const CODES = errorCodes.codes;
const flush = () => new Promise((resolve) => setImmediate(resolve));

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

async function advanceMockedTime(ms, stepMs = 50) {
  for (let elapsed = 0; elapsed < ms; elapsed += stepMs) {
    mock.timers.tick(stepMs);
    await flush();
  }
}

const OWNERS = ["widgetBase", "sicht", "singleSelect", "dienststelle", "nativeMultiSelect", "tabs", "kdbControl", "header", "footer"];

function createKdb(options = {}) {
  const dispatched = [];
  const historyCalls = [];
  const alerts = [];
  const ownerResult = options.ownerResult || (() => ({ ok: true }));
  const api = {};
  for (const owner of OWNERS) {
    api[owner] = {
      getState: () => ({}),
      dispatch: async (action) => {
        dispatched.push(action);
        return ownerResult(owner, action);
      },
    };
  }
  api.tabs.getState = () => ({ activeIndex: 0, byIndex: { 0: { tabId: "tab-0" } } });
  const services = {
    message: {
      showAlert: (payload) => { alerts.push(payload); },
      notify: (payload) => { alerts.push(Object.assign({ notify: true }, payload)); },
    },
  };
  if (options.history !== false) {
    services.history = {
      beginWritebackRestore: (payload) => { historyCalls.push(["begin", payload]); },
      finishWritebackRestore: (payload) => { historyCalls.push(["finish", payload]); },
    };
  }
  const _KDB = {
    runtime: {},
    state: { rootLifecycle: { lifecycle: options.lifecycle || "ready" } },
    api,
    services,
    config: { labels: { de: { writeback: load("labels") } } },
    utils: { waitFor: realWaitFor },
  };
  return { _KDB, dispatched, historyCalls, alerts };
}

const phaseSummary = (phases) => phases.map((phase) => [phase.name, phase.owner || null, phase.ok, phase.degraded === true]);
const diagnosticCodes = (diagnostics) => diagnostics.map((diagnostic) => diagnostic.code);

// ---------------------------------------------------------------- constants

test("RESTORE_PHASE_NAMES keeps the 31 frozen names in order", () => {
  assert.deepEqual([...constants.RESTORE_PHASE_NAMES], [
    "status", "validate", "historyBegin", "newDashboardReset", "widgetReset",
    "kdbControlRestore", "headerRestore", "footerRestore", "tabsRestore",
    "tabTargetResolve", "filterScopeResolve", "singleSelectPreRestoreReconcile", "filterClear", "sichtRestore",
    "singleSelectGlobalRestore", "tabActivateForPageContext", "singleSelectPageContextRestore", "nativeMultiSelectRestore",
    "sichtDownstreamVisibility", "dienststelleRestore", "singleSelectResync", "specialSingleSelectRestoreSync",
    "tabActivateForWidgets", "tabWidgetsEnsureRouted", "widgetBaseRestore", "widgetSettingsRestore",
    "widgetTextRestore", "widgetVisBinding", "tabsPostRestoreTraverse", "historyFinish", "cleanup",
  ]);
  assert.equal(constants.RESTORE_PHASE_NAMES.length, 31);
  assert.ok(Object.isFrozen(constants.RESTORE_PHASE_NAMES));
});

test("STATUS_TABLE keeps every frozen status spelling", () => {
  assert.deepEqual({ ...constants.STATUS_TABLE }, {
    notDefaultParamSet: "direct",
    default: "default",
    defaultParamSet: "default",
    defaultparamset: "default",
    defaultparameterset: "default",
    newDashboard: "newDashboard",
  });
  assert.equal(constants.ABORT.writebackSetAbort, true);
  assert.equal(constants.CANCELLED.writebackSetCancelled, true);
});

test("writeback labels stay byte-identical", () => {
  const labels = load("labels");
  const digest = crypto.createHash("sha256").update(JSON.stringify(labels)).digest("hex");
  assert.equal(digest, "7cf6d84af4ecaea8c28ad889149d995c6c8a052c65de95af3d470ab3d5600647");
  assert.equal(labels.dienststelleRestoreFallbackMessage, labels.dienststelleRestoreMissingMessage);
});

// ---------------------------------------------------------------- RestoreResult

test("buildRestoreResult: ok/outcome matrix and baseline requirement", () => {
  const { buildRestoreResult, captureBaseline } = load("buildRestoreResult");
  const run = (statusKind) => ({ status: "s", statusKind, runId: 3, diagnostics: [{ code: "X" }], phases: [{ name: "status", ok: true }] });
  for (const outcome of ["committed", "degraded"]) {
    const result = buildRestoreResult(run("direct"), outcome);
    assert.equal(result.ok, true);
    assert.equal(result.outcome, outcome);
    assert.equal(result.baseline.kind, "postRestore");
    assert.equal(result.baseline.status, "s");
    assert.deepEqual(Object.keys(result), ["ok", "status", "runId", "outcome", "diagnostics", "phases", "baseline"]);
  }
  assert.equal(buildRestoreResult(run("newDashboard"), "committed").baseline.kind, "newDashboardReset");
  for (const outcome of ["cancelled", "failed", "abortedByOwner"]) {
    const result = buildRestoreResult(run("direct"), outcome);
    assert.equal(result.ok, false);
    assert.equal(result.outcome, outcome);
    assert.equal("baseline" in result, false);
    assert.deepEqual(result.phases, [{ name: "status", ok: true }]);
  }
  const explicit = { kind: "custom" };
  assert.equal(buildRestoreResult(run("direct"), "failed", explicit).baseline, explicit);
  assert.equal(buildRestoreResult(run("direct"), "committed", explicit).baseline, explicit);
  assert.deepEqual(Object.keys(captureBaseline(run("direct"), "postRestore")), ["kind", "status", "capturedAt"]);
});

// ---------------------------------------------------------------- run context

test("createRunContext: runId, status phase, unknown phase name reported, stale guard", () => {
  const console = createConsole();
  const createRunContext = load("createRunContext", { console });
  const { _KDB } = createKdb();
  const run = createRunContext(_KDB, "newDashboard", "newDashboard", null);
  assert.equal(run.runId, 1);
  assert.equal(_KDB.runtime.writeback.parameterSetRestoreRunId, 1);
  assert.deepEqual(run.options, {});
  assert.deepEqual(run.originalActive, { index: 0, tabId: "tab-0" });
  assert.deepEqual(run.phases, [{ name: "status", ok: true }]);

  run.recordPhase("notAPhase", "x", true);
  assert.equal(console.calls.filter((call) => call.level === "error").length, 1);
  assert.match(String(console.calls[0].args[0]), /unknown restore phase name: notAPhase/);

  const entry = run.recordPhase("filterClear", "sicht", false, true, [{ code: "D" }]);
  assert.deepEqual(entry, { name: "filterClear", ok: false, owner: "sicht", degraded: true, diagnostics: [{ code: "D" }] });
  assert.equal(run.hasDegradedPhase(), true);

  run.assertStillCurrent();
  _KDB.runtime.writeback.parameterSetRestoreRunId += 1;
  assert.throws(() => run.assertStillCurrent(), (error) => error && error.writebackSetCancelled === true);
  assert.deepEqual(diagnosticCodes(run.diagnostics), [CODES.WRITEBACK_RESTORE_CANCELLED]);
});

// ---------------------------------------------------------------- restore runs through the service

const NEW_DASHBOARD_PHASES = [
  ["status", null, true, false],
  ["historyBegin", null, true, false],
  ["widgetReset", "widgetBase", true, false],
  ["filterClear", "sicht", true, false],
  ["filterClear", "singleSelect", true, false],
  ["filterClear", "dienststelle", true, false],
  ["filterClear", "nativeMultiSelect", true, false],
  ["filterClear", "sicht", true, false],
  ["newDashboardReset", "tabs", true, false],
  ["newDashboardReset", "kdbControl", true, false],
  ["newDashboardReset", "header", true, false],
  ["newDashboardReset", "footer", true, false],
  ["historyFinish", null, true, false],
  ["cleanup", null, true, false],
];

test("restore newDashboard: committed result, phase order, history call shapes, runtime flags", async () => {
  const createService = load("service");
  const kdb = createKdb();
  const service = createService({ _KDB: kdb._KDB, options: {} });
  const result = await service.restore(null, "newDashboard");
  assert.equal(result.ok, true);
  assert.equal(result.outcome, "committed");
  assert.equal(result.status, "newDashboard");
  assert.equal(result.runId, 1);
  assert.equal(result.baseline.kind, "newDashboardReset");
  assert.deepEqual(phaseSummary(result.phases), NEW_DASHBOARD_PHASES);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(kdb.historyCalls.map(([kind, payload]) => [kind, Object.keys(payload)]), [
    ["begin", ["source", "runId", "status"]],
    ["finish", ["source", "runId", "outcome", "baseline"]],
  ]);
  assert.deepEqual(kdb.historyCalls[0][1], { source: "writebackSet", runId: 1, status: "newDashboard" });
  assert.equal(kdb.historyCalls[1][1].outcome, "committed");
  assert.deepEqual(kdb.dispatched.map((action) => action.type), [
    "widgetBase/parameterSetResetRequested",
    "sicht/parameterSetClearRequested",
    "singleSelect/parameterSetClearRequested",
    "dienststelle/parameterSetClearRequested",
    "nativeMultiSelect/parameterSetClearRequested",
    "sicht/syncRequested",
    "tabs/parameterSetResetRequested",
    "kdbControl/parameterSetRestoreRequested",
    "header/parameterSetRestoreRequested",
    "footer/parameterSetRestoreRequested",
    "singleSelect/parameterSetRunFinished",
  ]);
  const runtime = kdb._KDB.runtime.writeback;
  assert.equal(runtime.parameterSetRestoreActive, false);
  assert.equal(runtime.parameterSetRestoreActiveCount, 0);
  assert.equal(runtime.pendingRunId, null);
  assert.equal(runtime.lastConfirmedParameterSetId, null);
});

test("restore without history service fails closed before any owner dispatch", async () => {
  const createService = load("service");
  const kdb = createKdb({ history: false });
  const result = await createService({ _KDB: kdb._KDB }).restore(null, "newDashboard");
  assert.equal(result.ok, false);
  assert.equal(result.outcome, "failed");
  assert.equal("baseline" in result, false);
  assert.deepEqual(phaseSummary(result.phases), [
    ["status", null, true, false],
    ["historyBegin", null, false, false],
    ["cleanup", null, true, false],
  ]);
  assert.deepEqual(diagnosticCodes(result.diagnostics), [CODES.WRITEBACK_HISTORY_GUARD_FAILED]);
  assert.deepEqual(kdb.dispatched.map((action) => action.type), [
    "singleSelect/parameterSetRunFinished",
    "tabs/parameterSetAbortLandingRequested",
  ]);
  assert.equal(kdb.alerts.length, 1);
  assert.equal(kdb.alerts[0].severity, "error");
});

test("restore with a failing required owner phase ends abortedByOwner", async () => {
  const createService = load("service");
  const kdb = createKdb({ ownerResult: (owner, action) => (action.type === "tabs/parameterSetResetRequested" ? { ok: false } : { ok: true }) });
  const result = await createService({ _KDB: kdb._KDB }).restore(null, "newDashboard");
  assert.equal(result.outcome, "abortedByOwner");
  assert.equal(result.ok, false);
  assert.deepEqual(phaseSummary(result.phases), [
    ...NEW_DASHBOARD_PHASES.slice(0, 8),
    ["newDashboardReset", "tabs", false, false],
    ["historyFinish", null, true, false],
    ["cleanup", null, true, false],
  ]);
  assert.equal(kdb.historyCalls[1][1].outcome, "abortedByOwner");
  assert.deepEqual(diagnosticCodes(result.diagnostics), [CODES.WRITEBACK_TABS_TARGET_MISSING]);
});

test("status validation: unsupported, reserved and disposed", async () => {
  const createService = load("service");
  const kdb = createKdb();
  const service = createService({ _KDB: kdb._KDB });
  await assert.rejects(service.restore(null, "bogus"), (error) => error.name === "WritebackError"
    && error.diagnostic.code === CODES.WRITEBACK_UNSUPPORTED_STATUS && error.diagnostic.details.status === "bogus");
  await assert.rejects(service.restore(null, "sichtChange"), (error) => /reserved/.test(error.diagnostic.message));
  service.destroy();
  await assert.rejects(service.restore(null, "newDashboard"), (error) => error.diagnostic.code === CODES.WRITEBACK_RESTORE_CANCELLED);
});

test("a second restore cancels the active run; a second default restore is rejected", async () => {
  const createService = load("service");
  const gate = deferred();
  let first = true;
  const kdb = createKdb({
    ownerResult: async (owner, action) => {
      if (first && action.type === "widgetBase/parameterSetResetRequested") {
        first = false;
        await gate.promise;
      }
      return { ok: true };
    },
  });
  const service = createService({ _KDB: kdb._KDB });
  const runA = service.restore(null, "newDashboard");
  await flush();
  await assert.rejects(service.restore(null, "default"), (error) => error.diagnostic.code === CODES.WRITEBACK_RESTORE_CANCELLED
    && error.diagnostic.details.activeRunId === 1);
  const runB = service.restore(null, "newDashboard");
  await flush();
  gate.resolve();
  const resultA = await runA;
  const resultB = await runB;
  assert.equal(resultA.outcome, "cancelled");
  assert.equal(resultA.runId, 1);
  assert.deepEqual(phaseSummary(resultA.phases), [
    ["status", null, true, false],
    ["historyBegin", null, true, false],
    ["widgetReset", "widgetBase", false, false],
    ["historyFinish", null, true, false],
    ["cleanup", null, true, false],
  ]);
  assert.deepEqual(diagnosticCodes(resultA.diagnostics), [CODES.WRITEBACK_RESTORE_CANCELLED]);
  assert.equal(resultB.outcome, "committed");
  assert.equal(resultB.runId, 2);
});

test("destroy during an active run cancels it", async () => {
  const createService = load("service");
  const gate = deferred();
  const kdb = createKdb({
    ownerResult: async (owner, action) => {
      if (action.type === "widgetBase/parameterSetResetRequested") await gate.promise;
      return { ok: true };
    },
  });
  const service = createService({ _KDB: kdb._KDB });
  const run = service.restore(null, "newDashboard");
  await flush();
  service.destroy();
  gate.resolve();
  const result = await run;
  assert.equal(result.outcome, "cancelled");
  assert.deepEqual(diagnosticCodes(result.diagnostics), [CODES.WRITEBACK_RESTORE_CANCELLED]);
});

test("default restore waits for root lifecycle ready, destroy cancels the wait", async () => {
  const createService = load("service");
  const kdb = createKdb({ lifecycle: "booting" });
  const service = createService({ _KDB: kdb._KDB });
  const pending = service.restore(null, "default");
  await new Promise((resolve) => setTimeout(resolve, 120));
  assert.ok(kdb._KDB.runtime.writeback.abortControllers.readyWait);
  service.destroy();
  const result = await pending;
  assert.equal(result.outcome, "cancelled");
  assert.deepEqual(phaseSummary(result.phases), [["status", null, true, false]]);
  assert.deepEqual(diagnosticCodes(result.diagnostics), [CODES.WRITEBACK_RESTORE_CANCELLED]);
  assert.equal(kdb.dispatched.length, 0);
});

test("default restore is skipped when the URL carries a parameterId", async () => {
  const createService = load("service", { document: createDocument("https://cognos.test/dashboard?parameterId=42") });
  const kdb = createKdb();
  const result = await createService({ _KDB: kdb._KDB }).restore(null, "default");
  assert.equal(result.outcome, "cancelled");
  assert.equal(result.status, "default");
  assert.deepEqual(phaseSummary(result.phases), [["status", null, true, false]]);
  assert.deepEqual(diagnosticCodes(result.diagnostics), [CODES.WRITEBACK_URL_PARAMETER_ID_PRECEDENCE]);
  assert.equal(result.diagnostics[0].details.parameterId, "42");
});

test("destroy aborts controllers, clears timers and resets restore flags; get-owned state survives", () => {
  const createService = load("service");
  const kdb = createKdb();
  const service = createService({ _KDB: kdb._KDB });
  const controller = new AbortController();
  const persistLoading = { mountKey: "writeback-get-persist-loading" };
  let timerFired = false;
  const runtime = Object.assign(kdb._KDB.runtime.writeback = {}, {
    abortControllers: { someWait: controller },
    timers: { someTimer: Number(setTimeout(() => { timerFired = true; }, 5)) },
    pendingPromises: { getPersistLoading: persistLoading },
    pendingUrlShareMessage: { parameterId: "1" },
    pendingRestoreFailure: true,
    pendingRestoreInfo: { labelKey: "x" },
    urlShareBootOverlayActive: true,
    urlShareRestoreWaiter: {},
    persistRestoreGeneration: 4,
    getPersistLoadingHandle: persistLoading,
  });
  service.destroy();
  assert.equal(controller.signal.aborted, true);
  assert.deepEqual(runtime.abortControllers, {});
  assert.deepEqual(runtime.timers, {});
  assert.equal(runtime.pendingUrlShareMessage, null);
  assert.equal(runtime.pendingRestoreFailure, false);
  assert.equal(runtime.pendingRestoreInfo, null);
  assert.equal(runtime.urlShareBootOverlayActive, false);
  assert.equal(runtime.urlShareRestoreWaiter, null);
  assert.equal(runtime.persistRestoreGeneration, 4);
  assert.equal(runtime.getPersistLoadingHandle, persistLoading);
  assert.equal(runtime.pendingPromises.getPersistLoading, persistLoading);
  return new Promise((resolve) => setTimeout(() => { assert.equal(timerFired, false); resolve(); }, 20));
});

test("destroy also releases subscriptions and resets run and URL-share flags", () => {
  const createService = load("service");
  const kdb = createKdb();
  const service = createService({ _KDB: kdb._KDB });
  let unsubscribed = 0;
  const runtime = Object.assign(kdb._KDB.runtime.writeback = {}, {
    subscriptions: { someSubscription: () => { unsubscribed += 1; } },
    parameterSetRestoreActive: true,
    parameterSetRestoreActiveCount: 2,
    pendingRunId: 9,
    urlShareStartupPromise: Promise.resolve(),
  });
  service.destroy();
  assert.equal(unsubscribed, 1);
  assert.deepEqual(runtime.subscriptions, {});
  assert.equal(runtime.parameterSetRestoreActive, false);
  assert.equal(runtime.parameterSetRestoreActiveCount, 0);
  assert.equal(runtime.pendingRunId, null);
  assert.equal(runtime.urlShareStartupPromise, null);
});

// ---------------------------------------------------------------- waits

function createWaitRun(createRunContext, _KDB) {
  return createRunContext(_KDB, "default", "default", {});
}

test("waitForRootLifecycleReady: ready, terminal lifecycle, cancel request and abort", async () => {
  const waitForRootLifecycleReady = load("waitForRootLifecycleReady");
  const createRunContext = load("createRunContext");

  const ready = createKdb({ lifecycle: "ready" });
  assert.deepEqual(await waitForRootLifecycleReady(ready._KDB, createWaitRun(createRunContext, ready._KDB)), { proceed: true });
  assert.equal(ready._KDB.runtime.writeback.abortControllers.readyWait, undefined);

  for (const lifecycle of ["error", "disposed"]) {
    const kdb = createKdb({ lifecycle });
    const run = createWaitRun(createRunContext, kdb._KDB);
    assert.deepEqual(await waitForRootLifecycleReady(kdb._KDB, run), { proceed: false });
    assert.deepEqual(diagnosticCodes(run.diagnostics), [CODES.WRITEBACK_RESTORE_CANCELLED]);
  }

  const booting = createKdb({ lifecycle: "booting" });
  const lateReady = createWaitRun(createRunContext, booting._KDB);
  const lateResult = waitForRootLifecycleReady(booting._KDB, lateReady);
  setTimeout(() => { booting._KDB.state.rootLifecycle.lifecycle = "ready"; }, 80);
  assert.deepEqual(await lateResult, { proceed: true });

  const cancelled = createKdb({ lifecycle: "booting" });
  const cancelRun = createWaitRun(createRunContext, cancelled._KDB);
  const cancelResult = waitForRootLifecycleReady(cancelled._KDB, cancelRun);
  setTimeout(() => { cancelRun.cancelRequested = true; }, 80);
  assert.deepEqual(await cancelResult, { proceed: false });
  assert.deepEqual(diagnosticCodes(cancelRun.diagnostics), [CODES.WRITEBACK_RESTORE_CANCELLED]);

  const aborted = createKdb({ lifecycle: "booting" });
  const abortRun = createWaitRun(createRunContext, aborted._KDB);
  const abortResult = waitForRootLifecycleReady(aborted._KDB, abortRun);
  await flush();
  aborted._KDB.runtime.writeback.abortControllers.readyWait.abort();
  assert.deepEqual(await abortResult, { proceed: false });
  assert.equal(aborted._KDB.runtime.writeback.abortControllers.readyWait, undefined);
  assert.equal(aborted._KDB.runtime.writeback.timers.readyWait, undefined);
});

test("waitForRootLifecycleReady: gives up after 180 s with WRITEBACK_TIMEOUT", async (t) => {
  const waitForRootLifecycleReady = load("waitForRootLifecycleReady");
  const createRunContext = load("createRunContext");
  const kdb = createKdb({ lifecycle: "booting" });
  const run = createWaitRun(createRunContext, kdb._KDB);
  mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
  t.after(() => mock.timers.reset());
  let outcome = null;
  const pending = waitForRootLifecycleReady(kdb._KDB, run).then((value) => { outcome = value; });
  await advanceMockedTime(179900);
  const settledEarly = outcome !== null;
  await advanceMockedTime(200);
  if (outcome === null) {
    run.cancelRequested = true;
    await advanceMockedTime(100);
  }
  await pending;
  assert.equal(settledEarly, false);
  assert.deepEqual(outcome, { proceed: false });
  assert.deepEqual(run.diagnostics.map((d) => [d.code, d.phase]), [[CODES.WRITEBACK_TIMEOUT, "status"]]);
  assert.equal(kdb._KDB.runtime.writeback.abortControllers.readyWait, undefined);
});

function createQuietKdb(state) {
  const kdb = createKdb();
  kdb._KDB.api.filterDock = { getState: () => ({ filtersReady: state.filtersReady }) };
  kdb._KDB.api.singleSelect.getState = () => ({ inventory: { freshness: state.freshness, reconcileInFlight: state.reconcileInFlight } });
  return kdb;
}

test("waitForSingleSelectInventoryQuiet: quiet, pre-aborted and aborted while waiting", async () => {
  const waitQuiet = load("waitForSingleSelectInventoryQuiet");
  const quiet = createQuietKdb({ filtersReady: true, freshness: "fresh", reconcileInFlight: false });
  assert.deepEqual(await waitQuiet(quiet._KDB, new AbortController().signal), { quiet: true });

  const preAborted = new AbortController();
  preAborted.abort();
  assert.deepEqual(await waitQuiet(quiet._KDB, preAborted.signal), { aborted: true });

  const state = { filtersReady: false, freshness: "stale", reconcileInFlight: true };
  const busy = createQuietKdb(state);
  const controller = new AbortController();
  const pending = waitQuiet(busy._KDB, controller.signal);
  setTimeout(() => controller.abort(), 80);
  assert.deepEqual(await pending, { aborted: true });

  const later = createQuietKdb(state);
  const latePending = waitQuiet(later._KDB, new AbortController().signal);
  setTimeout(() => Object.assign(state, { filtersReady: true, freshness: "fresh", reconcileInFlight: false }), 80);
  assert.deepEqual(await latePending, { quiet: true });
});

test("waitForSingleSelectInventoryQuiet: gives up after 68 s", async (t) => {
  const waitQuiet = load("waitForSingleSelectInventoryQuiet");
  const busy = createQuietKdb({ filtersReady: false, freshness: "stale", reconcileInFlight: true });
  mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
  t.after(() => mock.timers.reset());
  let outcome = null;
  const pending = waitQuiet(busy._KDB, new AbortController().signal).then((value) => { outcome = value; });
  await advanceMockedTime(67900);
  assert.equal(outcome, null);
  await advanceMockedTime(200);
  await pending;
  assert.deepEqual(outcome, { quiet: false });
});

// ---------------------------------------------------------------- ensureTabWidgetsRouted

test("ensureTabWidgetsRouted: bounded re-ensure, owner failure aborts, cancel propagates", async () => {
  const shared = { "../config/restoreConstants.js": constants };
  const ensureTabWidgetsRouted = load("ensureTabWidgetsRouted", { modules: shared });
  const createRunContext = load("createRunContext", { modules: shared });

  const results = [{ ok: true, missingShells: 2 }, { ok: true, missingShells: 1 }, { ok: true, missingShells: 1 }, { ok: true }];
  const kdb = createKdb({ ownerResult: () => results.shift() });
  const run = createRunContext(kdb._KDB, "notDefaultParamSet", "direct", {});
  await ensureTabWidgetsRouted(kdb._KDB, run, 0, { 0: { tabId: "tab-0" } });
  assert.equal(kdb.dispatched.length, 3);
  assert.deepEqual(kdb.dispatched[0].payload, { tabId: "tab-0", reason: "writebackSet", runId: run.runId });
  const phase = run.phases[run.phases.length - 1];
  assert.equal(phase.name, "tabWidgetsEnsureRouted");
  assert.equal(phase.ok, true);
  assert.equal(phase.missingShells, 1);
  assert.deepEqual(diagnosticCodes(run.diagnostics), [CODES.WRITEBACK_SKIPPED_BY_DESIGN]);

  const throwing = createKdb({ ownerResult: () => { throw new Error("boom"); } });
  const throwRun = createRunContext(throwing._KDB, "notDefaultParamSet", "direct", {});
  await assert.rejects(ensureTabWidgetsRouted(throwing._KDB, throwRun, 0, { 0: { tabId: "tab-0" } }), (error) => error === constants.ABORT);
  assert.deepEqual(diagnosticCodes(throwRun.diagnostics), [CODES.WRITEBACK_WIDGET_RESTORE_FAILED]);
  assert.match(throwRun.diagnostics[0].message, /owner dispatch threw .*boom/);

  let cancelRun = null;
  const cancelling = createKdb({ ownerResult: () => { cancelRun.cancelRequested = true; return { ok: true }; } });
  cancelRun = createRunContext(cancelling._KDB, "notDefaultParamSet", "direct", {});
  await assert.rejects(ensureTabWidgetsRouted(cancelling._KDB, cancelRun, 0, { 0: { tabId: "tab-0" } }),
    (error) => error === constants.CANCELLED);
  assert.deepEqual(phaseSummary(cancelRun.phases).slice(-1), [["tabWidgetsEnsureRouted", "widgetBase", false, false]]);

  const missing = createKdb();
  const missingRun = createRunContext(missing._KDB, "notDefaultParamSet", "direct", {});
  await assert.rejects(ensureTabWidgetsRouted(missing._KDB, missingRun, 1, {}), (error) => error === constants.ABORT);
  assert.deepEqual(diagnosticCodes(missingRun.diagnostics), [CODES.WRITEBACK_TABS_TARGET_MISSING]);
});

// ---------------------------------------------------------------- URL share

test("mapUrlShareSelectResult: host select outcomes map to URL-share kinds", () => {
  const map = load("mapUrlShareSelectResult");
  const ok = { ok: true };
  const cases = [
    [[null, "7", false], { kind: "failed", parameterId: "7", shouldRecover: false, restoreResult: null }],
    [[{ aborted: true }, "7", false], { kind: "failed", parameterId: "7", shouldRecover: false, restoreResult: undefined }],
    [[{ found: true, restoreResult: ok }, "7", true], { kind: "failed", parameterId: "7", shouldRecover: false, restoreResult: ok }],
    [[{ hostListReady: false }, "7", false], { kind: "hostListUnready", parameterId: "7", shouldRecover: true, recoverCopy: "hostListUnready" }],
    [[{ found: false, hostListReady: true }, "7", false],
      { kind: "missingId", parameterId: "7", shouldRecover: true, recoverCopy: "missingId", waitTimedOut: false }],
    [[{ found: false }, "7", false], { kind: "hostListUnready", parameterId: "7", shouldRecover: true, recoverCopy: "hostListUnready" }],
    [[{ found: true, timedOut: true }, "7", false],
      { kind: "missingId", parameterId: "7", shouldRecover: true, recoverCopy: "missingId", waitTimedOut: true }],
    [[{ found: true, restoreResult: ok }, "7", false], { kind: "applied", parameterId: "7", shouldRecover: false, restoreResult: ok }],
    [[{ found: true, restoreResult: { ok: false } }, "7", false],
      { kind: "failed", parameterId: "7", shouldRecover: false, restoreResult: { ok: false } }],
  ];
  for (const [args, expected] of cases) assert.deepEqual(map(...args), expected);
});

function createUrlShareKdb(selectResult) {
  const kdb = createQuietKdb({ filtersReady: true, freshness: "fresh", reconcileInFlight: false });
  kdb.selectCalls = [];
  kdb.restoreCalls = [];
  kdb._KDB.services.writebackBridge = {
    selectParameterSetById: async (id, options) => {
      kdb.selectCalls.push([id, options]);
      return typeof selectResult === "function" ? selectResult(id, options) : selectResult;
    },
  };
  kdb._KDB.services.writebackSet = {
    restore: async (payload, status) => {
      kdb.restoreCalls.push([payload, status]);
      return { ok: true, outcome: "committed", diagnostics: [] };
    },
  };
  return kdb;
}

test("whenUrlShareRestoreSettled: no parameterId resolves absent once and clears the boot overlay flag", async () => {
  const whenSettled = load("whenUrlShareRestoreSettled");
  const kdb = createUrlShareKdb(null);
  const first = whenSettled(kdb._KDB);
  assert.equal(whenSettled(kdb._KDB), first);
  assert.deepEqual(await first, { kind: "absent", parameterId: null });
  assert.equal(kdb._KDB.runtime.writeback.urlShareBootOverlayActive, false);
  assert.equal(kdb.selectCalls.length, 0);

  const fresh = createUrlShareKdb(null);
  fresh._KDB._isDisposed = true;
  assert.deepEqual(await whenSettled(fresh._KDB), { kind: "failed", parameterId: null });
});

test("whenUrlShareRestoreSettled: settled startup controller is released", async () => {
  const whenSettled = load("whenUrlShareRestoreSettled");
  const kdb = createUrlShareKdb(null);
  await whenSettled(kdb._KDB);
  assert.equal("urlShareStartup" in kdb._KDB.runtime.writeback.abortControllers, false);
});

test("whenUrlShareRestoreSettled: parameterId found and applied", async () => {
  const whenSettled = load("whenUrlShareRestoreSettled", { document: createDocument("https://cognos.test/d?parameterId=42") });
  const restoreResult = { ok: true };
  const kdb = createUrlShareKdb({ found: true, restoreResult });
  const result = await whenSettled(kdb._KDB);
  assert.deepEqual(result, { kind: "applied", parameterId: "42", shouldRecover: false, restoreResult });
  assert.equal(kdb.selectCalls.length, 1);
  assert.equal(kdb.selectCalls[0][0], "42");
  assert.ok(kdb.selectCalls[0][1].signal instanceof AbortSignal);
  assert.equal(kdb.alerts.length, 0);
});

test("whenUrlShareRestoreSettled: hash parameterId missing from the host list recovers and alerts once", async () => {
  const whenSettled = load("whenUrlShareRestoreSettled", { document: createDocument("https://cognos.test/d#view?parameterId=77") });
  const kdb = createUrlShareKdb({ found: false, hostListReady: true });
  const result = await whenSettled(kdb._KDB);
  assert.equal(result.kind, "missingId");
  assert.equal(result.parameterId, "77");
  assert.deepEqual(diagnosticCodes(result.restoreResult.diagnostics), [CODES.WRITEBACK_URL_PARAMETER_ID_NOT_FOUND]);
  assert.deepEqual(kdb.restoreCalls, [[null, "newDashboard"]]);
  const labels = load("labels");
  assert.deepEqual(kdb.alerts, [{
    title: labels.missingIdTitle,
    severity: "warning",
    message: labels.missingIdMessage.split("{id}").join("77"),
  }]);
  assert.equal(kdb._KDB.runtime.writeback.pendingUrlShareMessage, null);
});

test("whenUrlShareRestoreSettled: unready host list after a timed-out wait recovers with the unready copy", async () => {
  const whenSettled = load("whenUrlShareRestoreSettled", { document: createDocument("https://cognos.test/d?parameterId=5") });
  const kdb = createUrlShareKdb({ found: true, timedOut: true });
  const result = await whenSettled(kdb._KDB);
  assert.equal(result.kind, "missingId");
  assert.deepEqual(diagnosticCodes(result.restoreResult.diagnostics), [
    CODES.WRITEBACK_URL_PARAMETER_ID_NOT_FOUND, CODES.WRITEBACK_URL_PARAMETER_SET_WAIT_TIMEOUT,
  ]);

  const unready = createUrlShareKdb({ hostListReady: false });
  const unreadyResult = await load("whenUrlShareRestoreSettled", { document: createDocument("https://cognos.test/d?parameterId=6") })(unready._KDB);
  assert.equal(unreadyResult.kind, "hostListUnready");
  assert.deepEqual(diagnosticCodes(unreadyResult.restoreResult.diagnostics), [CODES.WRITEBACK_URL_SHARE_HOST_LIST_UNREADY]);
  const labels = load("labels");
  assert.equal(unready.alerts[0].title, labels.hostListUnreadyTitle);
});

test("whenUrlShareRestoreSettled: abort during the inventory wait fails silently and clears pending messages", async () => {
  const whenSettled = load("whenUrlShareRestoreSettled", { document: createDocument("https://cognos.test/d?parameterId=9") });
  const kdb = createUrlShareKdb({ found: true, restoreResult: { ok: true } });
  kdb._KDB.api.filterDock.getState = () => ({ filtersReady: false });
  const runtime = kdb._KDB.runtime.writeback = { pendingRestoreInfo: { labelKey: "x" } };
  const pending = whenSettled(kdb._KDB);
  await new Promise((resolve) => setTimeout(resolve, 80));
  runtime.abortControllers.urlShareStartup.abort();
  assert.deepEqual(await pending, { kind: "failed", parameterId: "9" });
  assert.equal(runtime.pendingRestoreInfo, null);
  assert.equal(kdb.selectCalls.length, 0);
  assert.equal(kdb.alerts.length, 0);
});
