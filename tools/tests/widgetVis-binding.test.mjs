// Golden tests for the widgetVis binding pipeline, TopN gate/wave/period pin, settings and restore handlers (WS-M W2).
// Run: node --test tools/tests/widgetVis-binding.test.mjs
// Re-record fixtures: RECORD_WIDGETVIS_BINDING=1 node --test tools/tests/widgetVis-binding.test.mjs
// Only the adapter section knows module paths; fixtures are the recorded outputs of the foundation code.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const W = "dashboard/widgets/widgetVis/";
const load = (rel, options) => loadAmd(path.join(JS_ROOT, rel), options);
const sha = (value) => createHash("sha256").update(JSON.stringify(value === undefined ? "<undefined>" : value)).digest("hex").slice(0, 16);
const json = (value) => (value === undefined ? "<undefined>" : JSON.parse(JSON.stringify(value)));
const QUIET = { error() {}, warn() {}, log() {} };

function createClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  return {
    setTimeout(fn, ms) {
      const id = nextId++;
      timers.set(id, { at: now + (ms || 0), fn });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    advance(ms) {
      const target = now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        now = due[1].at;
        due[1].fn();
      }
      now = target;
    },
    pending() {
      return timers.size;
    }
  };
}

function buildKdb(extra) {
  const _KDB = Object.assign({ config: { options: {} }, api: {}, properties: {}, state: {}, runtime: {} }, extra || {});
  load("core/config/__orchestratorConfig.js")(_KDB);
  return _KDB;
}

function track(promise) {
  const box = { state: "pending", value: undefined };
  promise.then((value) => { box.state = "resolved"; box.value = value; }, (value) => { box.state = "rejected"; box.value = value; });
  return box;
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

// ---- adapters: the only place that knows module paths -------------------------------------------------------------

function loadBuildBindingSpec() {
  return load(W + "effects/buildBindingSpec.js");
}

function loadGates(clock) {
  const stubs = { setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout, console: QUIET };
  const dienststelle = load(W + "effects/gates/dienststelleGate.js", { stubs });
  const topN = load(W + "effects/gates/topNGateWaiters.js", { stubs });
  const gates = load(W + "binding/gates.js", { stubs });
  return {
    waitDienststelle: (_KDB, widgetId, opSeq) => dienststelle.resolveDienststellePrerequisite(_KDB, { widgetId, opSeq }),
    resolveDienststelle: (_KDB, snapshot) => dienststelle.resolveDienststelleGateWaiters(_KDB, snapshot),
    isConfirmedHierarchy: dienststelle.isConfirmedHierarchy,
    waitTopN: (_KDB, widgetId, opSeq) => topN.waitForTopN(_KDB, widgetId, opSeq),
    resolveTopN: (_KDB, widgetId, opSeq, value) => topN.resolveTopNGateWaiter(_KDB, widgetId, opSeq, value),
    cancelTopN: (_KDB, widgetId, opSeq) => topN.cancelTopNGateWaiter(_KDB, widgetId, opSeq),
    isDefaultTopNChoice: topN.isDefaultTopNChoice,
    cancelForWidget: gates.cancelGateWaitersForWidget,
    rejectAll: gates.rejectAllGateWaiters
  };
}

function loadTopNGate(clock, fakes) {
  const stubs = { setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout, console: QUIET };
  const modules = {};
  if (fakes && fakes.pin) modules["../applyTopNJahrMismatchPin.js"] = fakes.pin;
  const gate = load(W + "effects/gates/topNGate.js", { stubs, modules });
  const waiters = load(W + "effects/gates/topNGateWaiters.js", { stubs });
  const cleanup = load(W + "effects/gates/dispatchTopNCleanupWhenDimensionAbsent.js", { stubs });
  const resolved = load(W + "actions/handleTopNResolved.js", { stubs });
  return {
    runGate: async (context, input, settings, hierarchy) => {
      const out = await gate.resolveTopNPrerequisite(context, input, settings, hierarchy);
      if (out && out.blocked === true) return { blocked: true, result: out.result };
      return { blocked: false, helperTableResult: out };
    },
    resolveTopN: waiters.resolveTopNGateWaiter,
    cleanupWhenDimensionAbsent: cleanup,
    mapTopNPayloadToHelper: gate.mapTopNPayloadToHelper,
    handleTopNResolved: resolved
  };
}

function loadPeriodPin(fakes) {
  const stubs = { console: QUIET };
  const modules = {};
  if (fakes && fakes.year) modules["../drillthrough/year.js"] = fakes.year;
  return {
    resolveTopNJahrFilterValue: load(W + "effects/resolveTopNJahrFilterValue.js", { stubs }),
    applyTopNJahrMismatchPin: load(W + "effects/applyTopNJahrMismatchPin.js", { stubs, modules }),
    readConfirmedJahrYear: load(W + "effects/readConfirmedJahrYear.js", { stubs })
  };
}

function loadWaveList() {
  return load(W + "effects/listTopNWaveWidgets.js", { stubs: { console: QUIET } });
}

function loadWaveWithFakes(fakes) {
  const fanOut = load(W + "effects/runTopNWaveFanOut.js", {
    stubs: { console: QUIET },
    modules: { "./runBindingPipeline.js": fakes.pipeline, "./applyTopNJahrMismatchPin.js": fakes.pin }
  });
  return load(W + "actions/runTopNFilterConfirmWave.js", { stubs: { console: QUIET }, modules: { "../effects/runTopNWaveFanOut.js": fanOut } });
}

function loadPipeline(clock, fakes) {
  const stubs = { setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout, console: QUIET };
  const modules = {
    "../render/visProperties.js": fakes.visProperties,
    "../render/title.js": fakes.title,
    "../render/postRender.js": fakes.postRender,
    "../legend/sweep.js": fakes.legend
  };
  return load(W + "effects/runBindingPipeline.js", { stubs, modules });
}

function loadDienststelleChanged(fakes) {
  return load(W + "actions/handleDienststelleChanged.js", {
    stubs: { console: QUIET },
    modules: { "../effects/runBindingPipeline.js": fakes.pipeline }
  });
}

function loadSettings(fakes) {
  const modules = {
    "../effects/runBindingPipeline.js": fakes.pipeline,
    "../../widgetSettings/effects/startWidgetRenderLoading.js": fakes.startLoading,
    "../../widgetSettings/view/resolveWidgetPlacementContext.js": { resolveWidgetEl: () => ({ nodeType: 1, id: "el" }) }
  };
  const startupModules = { "../effects/runBindingPipeline.js": fakes.pipeline };
  return {
    handleApplySetting: load(W + "actions/handleApplySetting.js", { stubs: { console: QUIET }, modules }),
    handleApplyStartupSettings: load(W + "actions/handleApplyStartupSettings.js", { stubs: { console: QUIET }, modules: startupModules })
      .handleApplyStartupSettings
  };
}

function loadRestore(fakes) {
  const startup = load(W + "actions/handleApplyStartupSettings.js", {
    stubs: { console: QUIET },
    modules: { "../effects/runBindingPipeline.js": fakes.pipeline }
  });
  return {
    handleParameterSetBinding: load(W + "actions/handleParameterSetBinding.js", {
      stubs: { console: QUIET },
      modules: { "../lifecycle.js": fakes.lifecycle, "./handleApplyStartupSettings.js": startup }
    }),
    handleParameterSetCancelBindings: load(W + "actions/handleParameterSetCancelBindings.js", {
      stubs: { console: QUIET },
      modules: { "../cleanup.js": fakes.cleanup }
    }),
    helpers: load(W + "actions/parameterSetBindingHelpers.js")
  };
}

// ---- fixtures -----------------------------------------------------------------------------------------------------

const DIMENSION = "Altersgruppe";
const METRIC = { code: "P_A_MOA_01", display: "Kennzahl 1", metricsTable: "Personal_KDB" };
const SETTINGS = { dimension: DIMENSION, visType: "Line", topNChoice: "none" };
const HIERARCHY = {
  activeDownstreamName: "Dienststelle_Ebene",
  hierarchyItemId: 42,
  resolution: { hasConfirmedSelection: true, downstreamValues: ["A"], dominantValues: [], displayValues: ["A"] }
};

function specInputs() {
  const base = { widgetId: "w1", opSeq: 3, metric: METRIC, payload: {} };
  const groupings = ["stichtag", "jahr", "jahrStichtag", "stichtagProJahrH", "stichtagProJahrV"];
  const out = {
    contentCreate: Object.assign({}, base, { reason: "contentCreate", settings: SETTINGS }),
    contentCreateNoSettings: { widgetId: "w1", opSeq: 1, reason: "contentCreate", metric: METRIC },
    dimension: Object.assign({}, base, { reason: "dimension", control: "dimension", settings: Object.assign({}, SETTINGS, { dimension: "Geschlecht" }) }),
    visType: Object.assign({}, base, { reason: "visType", control: "visType", settings: Object.assign({}, SETTINGS, { visType: "Pie" }) }),
    visTypePrognose: Object.assign({}, base, { reason: "visType", settings: Object.assign({}, SETTINGS, { visType: "Prognose" }) }),
    topN: Object.assign({}, base, { reason: "topN", control: "topNChoice", settings: Object.assign({}, SETTINGS, { topNChoice: "10" }) }),
    startup: Object.assign({}, base, { reason: "startup", control: "startupBatch", payload: { source: "startup" }, settings: SETTINGS }),
    cleanupReset: Object.assign({}, base, {
      reason: "cleanup", mode: "cleanup", forceEmpty: false, settings: SETTINGS,
      resetIntent: { enabled: true, scope: "widget", clearAllSlots: true, clearAllLocalFilters: true, reason: "reset" }
    }),
    cleanupForceEmpty: Object.assign({}, base, {
      reason: "cleanup", mode: "cleanup", forceEmpty: true, emptyReason: "noDimension", settings: SETTINGS,
      emptyIntent: { enabled: false, reason: null, itemId: null, value: null }
    }),
    topNHelperResult: Object.assign({}, base, {
      reason: "topN", settings: Object.assign({}, SETTINGS, { topNChoice: "5" }),
      helperTableResult: { ok: true, applied: true, topNResultValues: ["a", "b"], topNExcludeItemId: "e1", error: null }
    }),
    hierarchy: Object.assign({}, base, { reason: "dienststelle", settings: SETTINGS, hierarchySnapshot: HIERARCHY }),
    hierarchyNoDownstream: Object.assign({}, base, { reason: "dienststelle", settings: SETTINGS, hierarchySnapshot: { resolution: {} } }),
    noDimension: Object.assign({}, base, { reason: "dimension", settings: { dimension: null, visType: "Line", topNChoice: "5" } }),
    noMetricTable: { widgetId: "w2", opSeq: 9, reason: "dimension", metric: { code: "P_A_MOA_01" }, settings: SETTINGS },
    invalidGrouping: Object.assign({}, base, { reason: "grouping", settings: Object.assign({}, SETTINGS, { grouping: "bogus" }) })
  };
  groupings.forEach((grouping) => {
    out["grouping_" + grouping] = Object.assign({}, base, { reason: "grouping", control: "grouping", settings: Object.assign({}, SETTINGS, { grouping }) });
  });
  return out;
}

function makeContext(_KDB, extra) {
  const dispatched = [];
  let opSeq = 0;
  const context = Object.assign({
    _KDB,
    selectors: { readVisRecord: (kdb, id) => (kdb.state.widgets && kdb.state.widgets.vis && kdb.state.widgets.vis.byId[id]) || undefined },
    dispatchInternal: (action) => { dispatched.push(action); },
    ensureOpSeq: (id, requested) => (typeof requested === "number" ? requested : ++opSeq),
    isStaleOpSeq: () => false,
    readMetric: () => METRIC,
    readSettingsSnapshot: (id, payload) => Object.assign({}, SETTINGS, (payload && payload.settingsSnapshot) || {}),
    isDisposed: false
  }, extra || {});
  return { context, dispatched };
}

function computeSpecFixtures() {
  const buildBindingSpec = loadBuildBindingSpec();
  const _KDB = buildKdb();
  const out = {};
  for (const [name, input] of Object.entries(specInputs())) {
    const spec = buildBindingSpec(_KDB, JSON.parse(JSON.stringify(input)));
    out[name] = sha(spec);
  }
  return out;
}

function shortSpec(spec) {
  return {
    reason: spec.reason,
    keys: Object.keys(spec),
    dataConfigKeys: Object.keys(spec.dataConfig),
    configKeys: Object.keys(spec.config),
    dimension: spec.dataConfig.dimension,
    topN: spec.dataConfig.topN,
    grouping: spec.dataConfig.grouping,
    emptyIntent: spec.emptyIntent,
    resetIntent: spec.resetIntent,
    helperTableResult: spec.helperTableResult,
    hierarchySnapshot: spec.hierarchySnapshot,
    filterPropObj: spec.config.filterPropObj,
    hierarchyTarget: spec.dataConfig.hierarchyTarget,
    ownerWidgetId: spec.ownerWidgetId
  };
}

function computeSpecDetails() {
  const buildBindingSpec = loadBuildBindingSpec();
  const _KDB = buildKdb();
  const inputs = specInputs();
  const out = {};
  for (const name of ["noDimension", "cleanupForceEmpty", "hierarchy", "hierarchyNoDownstream", "topNHelperResult", "grouping_jahr", "invalidGrouping", "noMetricTable"]) {
    out[name] = json(shortSpec(buildBindingSpec(_KDB, JSON.parse(JSON.stringify(inputs[name])))));
  }
  return out;
}

async function computeWaiterFixtures() {
  const out = {};
  const clock = createClock();
  const gates = loadGates(clock);
  const _KDB = buildKdb();

  const d1 = track(gates.waitDienststelle(_KDB, "w1", 1));
  const d2 = track(gates.waitDienststelle(_KDB, "w2", 1));
  await flush();
  clock.advance(4999);
  await flush();
  out.dienststelleBeforeTimeout = [d1.state, d2.state];
  clock.advance(1);
  await flush();
  out.dienststelleTimeout = [d1.state, json(d1.value), d2.state, json(d2.value)];

  const unconfirmed = { resolution: { hasConfirmedSelection: false, downstreamValues: [], dominantValues: [] } };
  const confirmed = { activeDownstreamName: "X", resolution: { hasConfirmedSelection: true, downstreamValues: ["A"] } };
  const r1 = track(gates.waitDienststelle(_KDB, "w1", 2));
  const r2 = track(gates.waitDienststelle(_KDB, "w2", 2));
  await flush();
  out.dienststelleResolveUnconfirmed = json(gates.resolveDienststelle(_KDB, unconfirmed));
  const resolved = gates.resolveDienststelle(_KDB, confirmed);
  await flush();
  out.dienststelleResolveConfirmed = [json(resolved), r1.state, json(r1.value), r2.state];
  out.isConfirmedHierarchy = [gates.isConfirmedHierarchy(null), gates.isConfirmedHierarchy(unconfirmed), gates.isConfirmedHierarchy(confirmed)];

  const c1 = track(gates.waitDienststelle(_KDB, "w1", 3));
  const c2 = track(gates.waitDienststelle(_KDB, "w2", 3));
  await flush();
  out.cancelForWidgetDienststelle = json(gates.cancelForWidget(_KDB, "w1"));
  await flush();
  out.cancelForWidgetDienststelleStates = [c1.state, json(c1.value), c2.state];
  gates.rejectAll(_KDB);
  await flush();
  out.rejectAllDienststelle = [c2.state, json(c2.value)];

  const t1 = track(gates.waitTopN(_KDB, "w1", 5));
  await flush();
  out.topNResolveWrongOpSeq = gates.resolveTopN(_KDB, "w1", 6, { ok: true });
  out.topNResolveUnknownWidget = gates.resolveTopN(_KDB, "nope", 5, { ok: true });
  out.topNCancelWrongOpSeq = gates.cancelTopN(_KDB, "w1", 4);
  out.topNResolve = gates.resolveTopN(_KDB, "w1", 5, { ok: true, applied: true });
  await flush();
  out.topNResolved = [t1.state, json(t1.value)];
  out.topNResolveAgain = gates.resolveTopN(_KDB, "w1", 5, { ok: true });

  const t2 = track(gates.waitTopN(_KDB, "w1", 7));
  await flush();
  out.topNCancel = gates.cancelTopN(_KDB, "w1", 7);
  await flush();
  out.topNCancelled = [t2.state, json(t2.value)];

  const t3 = track(gates.waitTopN(_KDB, "w1", 8));
  const t4 = track(gates.waitTopN(_KDB, "w2", 8));
  await flush();
  out.cancelForWidgetTopN = json(gates.cancelForWidget(_KDB, "w1"));
  await flush();
  out.cancelForWidgetTopNStates = [t3.state, json(t3.value), t4.state];
  gates.rejectAll(_KDB);
  await flush();
  out.rejectAllTopN = [t4.state, json(t4.value)];

  const t5 = track(gates.waitTopN(_KDB, "w1", 10));
  clock.advance(2000);
  const t6 = track(gates.waitTopN(_KDB, "w1", 11));
  await flush();
  clock.advance(3000);
  await flush();
  out.topNReplaceLateTimeout = [t5.state, json(t5.value), t6.state];
  out.topNReplaceResolveNew = gates.resolveTopN(_KDB, "w1", 11, { ok: true, fresh: true });
  await flush();
  out.topNReplaceResolved = [t6.state, json(t6.value)];
  clock.advance(5000);
  await flush();
  out.topNTimeoutAfterResolve = [t6.state, clock.pending()];

  const t7 = track(gates.waitTopN(_KDB, "w3", 1));
  clock.advance(5000);
  await flush();
  out.topNTimeout = [t7.state, json(t7.value)];
  out.cancelForWidgetNothing = json(gates.cancelForWidget(_KDB, "w3"));
  out.cancelForWidgetNoRuntime = json(gates.cancelForWidget({ runtime: {} }, "w3"));
  out.isDefaultTopNChoice = [null, "", "none", "None", "DEFAULT", "5", 0, "0"].map((v) => gates.isDefaultTopNChoice(v));
  return out;
}

async function computeGateFixtures() {
  const out = {};
  const clock = createClock();
  const dispatched = [];
  const topNState = { byOwner: {} };
  const topNApi = {
    mode: "resolve",
    getState: () => topNState,
    dispatch: null
  };
  const fakes = { pin: async () => ({ jahrFilterValue: { d: "2024", u: "2024" }, monatFilterValue: { d: "Dez", u: "Dez" } }) };
  const gateApi = loadTopNGate(clock, fakes);
  const _KDB = buildKdb({ api: { widgetTopN: topNApi } });
  const waitersGate = loadGates(clock);
  const { context } = makeContext(_KDB);
  topNApi.dispatch = async (action) => {
    dispatched.push(action);
    if (action.type === "widgetTopN/resolveRequested") {
      if (topNApi.mode === "resolve") {
        await flush();
        waitersGate.resolveTopN(_KDB, action.widgetId, action.opSeq, { ok: true, applied: true, topNResultValues: ["a"], topNExcludeItemId: null, error: null });
        return { ok: true };
      }
      if (topNApi.mode === "reject") throw { errorCode: "TOPN_X", errorMessage: "helper failed" };
      if (topNApi.mode === "rejectPlain") throw new Error("plain failure");
      return { ok: true };
    }
    return { ok: true, plain: true };
  };
  const input = (extra) => Object.assign({ widgetId: "w1", opSeq: 4, reason: "topN", metric: METRIC, payload: { source: "user" }, periodPin: {
    jahrFilterValue: { d: "2023", u: "2023" }, monatFilterValue: { d: "Dez", u: "Dez" } } }, extra || {});
  const settings = (extra) => Object.assign({}, SETTINGS, { topNChoice: "10" }, extra || {});

  out.noDimension = json(await gateApi.runGate(context, input(), settings({ dimension: null }), null));
  out.noDimensionCleanupCalls = dispatched.length;
  topNState.byOwner.w1 = { resolutionStatus: "success" };
  out.noDimensionWithRecord = json(await gateApi.runGate(context, input(), settings({ dimension: "" }), null));
  out.noDimensionCleanupAction = json(dispatched.slice(0));
  dispatched.length = 0;
  out.defaultChoice = json(await gateApi.runGate(context, input(), settings({ topNChoice: "none" }), null));
  out.defaultChoiceDispatches = dispatched.length;

  const noApiKdb = buildKdb({ api: {} });
  out.topNApiMissing = json(await gateApi.runGate(makeContext(noApiKdb).context, input({ reason: "startup", payload: { source: "startup" } }), settings(), null));
  out.topNApiMissingUser = json(await gateApi.runGate(makeContext(noApiKdb).context, input(), settings(), null));
  out.helperListMissing = json(await gateApi.runGate(context, input({ metric: { code: "X", metricsTable: "Nope" } }), settings(), null));

  dispatched.length = 0;
  out.resolved = json(await gateApi.runGate(context, input(), settings(), HIERARCHY));
  out.resolveAction = sha(dispatched[0]);
  out.resolveActionShape = json({
    type: dispatched[0].type, widgetId: dispatched[0].widgetId, opSeq: dispatched[0].opSeq,
    payloadKeys: Object.keys(dispatched[0].payload),
    jahr: dispatched[0].payload.jahrFilterValue, monat: dispatched[0].payload.monatFilterValue,
    source: dispatched[0].payload.source, isHistoryReplay: dispatched[0].payload.isHistoryReplay,
    dimension: dispatched[0].payload.dataConfig.dimension, topN: dispatched[0].payload.dataConfig.topN,
    configKeys: Object.keys(dispatched[0].payload.config), helperConfig: dispatched[0].payload.config.topNHelperConfig,
    hierarchy: dispatched[0].payload.hierarchySnapshot, settingsSnapshot: dispatched[0].payload.settingsSnapshot
  });
  out.resolveActionDataConfig = sha(dispatched[0].payload.dataConfig);
  out.resolveActionConfig = sha(dispatched[0].payload.config);

  topNApi.mode = "reject";
  out.dispatchRejectsCoded = await gateApi.runGate(context, input(), settings(), null).then(() => "resolved", (err) => json(err));
  topNApi.mode = "rejectPlain";
  out.dispatchRejectsPlain = await gateApi.runGate(context, input(), settings(), null).then(() => "resolved", (err) => json(err));
  topNApi.mode = "hang";
  const hang = track(gateApi.runGate(context, input(), settings(), null));
  await flush();
  clock.advance(5000);
  await flush();
  out.timeout = [hang.state, json(hang.value)];

  out.mapTopNPayloadToHelper = [
    undefined, { status: "success", resultValues: ["x"], excludeItemId: "e" }, { status: "error", errorMessage: "m" }, { status: "error", errorCode: "C" }
  ].map((p) => json(gateApi.mapTopNPayloadToHelper(p)));

  const waiters = loadGates(clock);
  const { context: resolveContext } = makeContext(buildKdb(), { isStaleOpSeq: (id, opSeq) => opSeq === 99 });
  const KDB2 = resolveContext._KDB;
  const wait = track(waiters.waitTopN(KDB2, "w1", 3));
  await flush();
  out.handleTopNResolved = [];
  for (const action of [
    { widgetId: "w1", payload: { ownerVisId: "other", opSeq: 3 } },
    { widgetId: "w1", payload: { opSeq: 99 } },
    { widgetId: "w1", payload: { opSeq: 3, status: "success", resultValues: ["q"], ownerVisId: "w1" } },
    { widgetId: "w1", payload: { opSeq: 3, status: "success" } },
    { widgetId: "w1", opSeq: 3, payload: {} }
  ]) {
    out.handleTopNResolved.push(json(await gateApi.handleTopNResolved(resolveContext, action)));
  }
  out.handleTopNResolvedWait = [wait.state, json(wait.value)];
  return out;
}

function computePeriodFixtures() {
  const pin = loadPeriodPin({});
  const out = {};
  out.readConfirmedJahrYear = [
    [], null, ["2024"], [2023, "2025"], ["Jahr 2019 bis 2021"], [" 1899 "], ["2101"], [{ d: "2020", u: "1999" }],
    [{ d: "x", u: "2018" }], [{ d: null, u: null }], ["abc"], ["", null], ["12345"], ["20221"], [1900, 2100, 2101]
  ].map((values) => json(pin.readConfirmedJahrYear(values)));
  return out;
}

async function computePinFixtures() {
  const out = {};
  const monthMap = load("core/config/visualizations/topNHelper.js").monthCodeToCaption;
  const decemberCaption = monthMap["12"];
  const januaryCaption = monthMap["01"] || monthMap["1"] || Object.values(monthMap)[0];
  const rows = {
    ok: [[{ Jahr: { d: "2024" }, Monat: { d: decemberCaption } }]],
    okFlatRow: [{ a: "2022", b: januaryCaption }],
    okDisplayFields: [[{ a: { display: "2021" }, b: { label: januaryCaption } }]],
    longYear: [[{ a: "20245", b: decemberCaption }]],
    textYear: [[{ a: "Jahr 2024", b: decemberCaption }]],
    yearOutOfRange: [[{ a: "1899", b: decemberCaption }]],
    unknownMonth: [[{ a: "2024", b: "Nope" }]],
    oneColumn: [[{ a: "2024" }]],
    noRows: [[]],
    empty: []
  };
  out.resolveTopNJahrFilterValue = {};
  for (const [name, reloadResult] of Object.entries(rows)) {
    const pin = loadPeriodPin({});
    const _KDB = buildKdb({
      services: {
        tableData: {
          reloadTable: async () => reloadResult,
          readTableState: () => ({ widgetId: "leftover" })
        }
      },
      runtime: { widgetVis: { widgetsFacet: { renderWidget: async () => ({ ok: true }) } } }
    });
    out.resolveTopNJahrFilterValue[name] = await pin.resolveTopNJahrFilterValue(_KDB).then((value) => ["ok", json(value)], (err) => ["err", json(err)]);
  }
  const failing = {
    noTableData: { services: {} },
    noLeftover: { services: { tableData: { reloadTable: async () => [], readTableState: () => ({}) } } },
    noFacet: { services: { tableData: { reloadTable: async () => [], readTableState: () => ({ widgetId: "x" }) } } },
    renderFails: {
      services: { tableData: { reloadTable: async () => [], readTableState: () => ({ widgetId: "x" }) } },
      runtime: { widgetVis: { widgetsFacet: { renderWidget: async () => ({ ok: false }) } } }
    },
    reloadThrows: {
      services: { tableData: { reloadTable: async () => { throw new Error("reload boom"); }, readTableState: () => ({}) } }
    }
  };
  out.reloadFailures = {};
  for (const [name, extra] of Object.entries(failing)) {
    const pin = loadPeriodPin({});
    out.reloadFailures[name] = await pin.resolveTopNJahrFilterValue(buildKdb(extra)).then((value) => ["ok", json(value)], (err) => ["err", json(err)]);
  }

  const makePin = (readYear, calls) => ({
    readDrillthroughJahrYear: (...args) => { calls.push(args); return readYear(...args); }
  });
  const reloadFor = (caption) => ({
    services: { tableData: { reloadTable: async () => [[{ a: caption, b: decemberCaption }]], readTableState: () => ({ widgetId: "leftover" }) } },
    runtime: { widgetVis: { widgetsFacet: { renderWidget: async () => ({ ok: true }) } } },
    state: { tabs: { activeTabId: "tabA" } }
  });
  out.applyMismatch = {};
  const cases = {
    selectedUnknownReadsYear: [{}, () => 2024],
    selectedNullKeepsPin: [{}, () => null],
    selectedMismatch: [{}, () => 2022],
    knownGlobal: [{ selectedYearKnown: true, selectedYear: 2021 }, () => 2025],
    knownPage: [{ selectedYearKnown: true, scopeType: "pageContext", selectedYear: 2020 }, () => 2025],
    knownPageNoYear: [{ selectedYearKnown: true, scopeType: "pageContext" }, (_KDB, table, scope) => (scope === "global" ? 2019 : 2000)],
    knownGlobalPageYear: [{ selectedYearKnown: true, selectedYear: 2018 }, (_KDB, table, scope) => (scope === "tabA" ? 2017 : 1999)],
    knownGlobalNoPageYear: [{ selectedYearKnown: true, selectedYear: 2016 }, () => null],
    knownGlobalNoYears: [{ selectedYearKnown: true }, () => null]
  };
  for (const [name, [request, readYear]] of Object.entries(cases)) {
    const calls = [];
    const pin = loadPeriodPin({ year: makePin(readYear, calls) });
    const _KDB = buildKdb(reloadFor("2024"));
    const outcome = await pin.applyTopNJahrMismatchPin(_KDB, "Personal_KDB", request).then((value) => ["ok", json(value)], (err) => ["err", json(err)]);
    out.applyMismatch[name] = [outcome, json(calls.map((args) => args.slice(1))), json(_KDB.runtime.widgetVis.sessionPeriodPin)];
  }
  const sharedCalls = [];
  const sharedPin = loadPeriodPin({ year: makePin(() => 2024, sharedCalls) });
  let reloads = 0;
  const sharedKdb = buildKdb({
    services: { tableData: { reloadTable: async () => { reloads += 1; return [[{ a: "2024", b: decemberCaption }]]; }, readTableState: () => ({ widgetId: "l" }) } },
    runtime: { widgetVis: { widgetsFacet: { renderWidget: async () => ({ ok: true }) } } }
  });
  await Promise.all([sharedPin.applyTopNJahrMismatchPin(sharedKdb, "T", {}), sharedPin.applyTopNJahrMismatchPin(sharedKdb, "T", {})]);
  out.applyMismatchSharedRead = [reloads, sharedKdb.runtime.widgetVis.pendingPromises.periodPinRead === undefined];
  return out;
}

function createPipelineFakes(log) {
  const record = (name, value) => { log.push([name, json(value)]); };
  return {
    visProperties: {
      applyVisualizationProperties: async (_KDB, opts) => {
        record("visProperties", { widgetId: opts.widgetId, visualizationType: opts.visualizationType, phase: opts.phase, force: opts.force, reason: opts.input && opts.input.reason });
        return { diagnostics: { blockers: opts.blockers || [], phase: opts.phase } };
      }
    },
    title: {
      applyPreRenderTitle: async (opts) => { record("title", { widgetId: opts.widgetId, metric: opts.metric, settings: opts.settings }); return {}; }
    },
    postRender: {
      applyPrognoseSeriesSegmentIndexes: async (_KDB, plan, widgetId) => { record("prognose", { widgetId, reason: plan.reason }); },
      applyPostRenderCleanup: (opts) => { record("postRenderCleanup", { widgetId: opts.widgetId, opSeq: opts.opSeq }); return { titleText: "Title", diagnostics: { cleaned: true } }; },
      cleanupVisualizationContent: () => ({})
    },
    legend: {
      installLegendObserverBeforeApply: (runtime, widgetId, options) => { record("legendInstall", { widgetId, opSeq: options.opSeq, dimension: options.dimension, visType: options.visType, mode: options.mode }); return {}; },
      sweepLegendCaptions: (runtime, widgetId, ctx) => { record("legendSweep", { widgetId, opSeq: ctx.opSeq, reason: ctx.reason, dimension: ctx.dimension, visType: ctx.visType, mode: ctx.mode }); },
      disconnectLegendTextObserver: () => ({ disconnected: false })
    }
  };
}

async function computePipelineFixtures() {
  const out = {};
  const clock = createClock();
  const log = [];
  const fakes = createPipelineFakes(log);
  const run = loadPipeline(clock, fakes);
  const gates = loadGates(clock);
  const topNActions = [];
  const hierarchy = { value: HIERARCHY };
  const applyResult = { value: { status: "success", diagnostics: {} } };
  const planResult = { value: null };
  const buildKdbForPipeline = (extra) => {
    const _KDB = buildKdb(Object.assign({
      services: {
        widgetBindingPlan: {
          buildPlan: (spec) => {
            log.push(["buildPlan", { spec: sha(spec), reason: spec.reason, helperTableResult: json(spec.helperTableResult), grouping: spec.dataConfig.grouping }]);
            return planResult.value || { ok: true, status: "success", reason: spec.reason, managedFilterItemIds: ["m1"], emptyIntent: spec.emptyIntent, mirrorPatch: { visualizationType: spec.dataConfig.visualizationType } };
          }
        },
        widgetBindingApply: {
          applyBinding: async (plan, options) => {
            log.push(["applyBinding", { target: options.target, previous: options.previousManagedFilterItemIds, profile: options.timeoutProfile, renderWait: options.renderWait, aborted: options.signal.aborted }]);
            if (applyResult.value instanceof Error) throw applyResult.value;
            return applyResult.value;
          }
        }
      },
      api: {
        dienststelle: { getCurrentHierarchySnapshot: (arg) => { log.push(["hierarchyRead", arg]); return hierarchy.value; } },
        widgetTopN: {
          getState: () => ({ byOwner: {} }),
          dispatch: async (action) => {
            topNActions.push(action);
            if (action.type === "widgetTopN/resolveRequested") {
              await flush();
              gates.resolveTopN(_KDB, action.widgetId, action.opSeq, { ok: true, applied: true, topNResultValues: ["v1"], topNExcludeItemId: null, error: null });
            }
            return { ok: true };
          }
        }
      }
    }, extra || {}));
    return _KDB;
  };
  const input = (extra) => Object.assign({ widgetId: "w1", metric: METRIC, settings: SETTINGS, payload: { source: "user" }, reason: "dimension", control: "dimension" }, extra || {});
  const runCase = async (name, _KDB, runInput, options) => {
    log.length = 0;
    topNActions.length = 0;
    const { context, dispatched } = makeContext(_KDB, options && options.context);
    const pending = run(context, runInput);
    if (options && options.advance) { await flush(); clock.advance(options.advance); }
    const result = await pending;
    out[name] = json({
      result, log: log.slice(), topNActionTypes: topNActions.map((a) => a.type), dispatched: dispatched.length,
      runtime: _KDB.runtime.widgetVis && _KDB.runtime.widgetVis.byId.w1
        ? { managed: _KDB.runtime.widgetVis.byId.w1.managedFilterItemIds, lastPlan: !!_KDB.runtime.widgetVis.byId.w1.lastSuccessfulPlan, hasApplyController: !!_KDB.runtime.widgetVis.byId.w1.abortControllers.applyBinding }
        : null
    });
  };

  await runCase("plain", buildKdbForPipeline(), input({ opSeq: 2 }));
  await runCase("plainDeferRenderWait", buildKdbForPipeline(), input({ opSeq: 2, payload: { source: "historyReplay", deferRenderWait: true } }));
  await runCase("startup", buildKdbForPipeline(), input({ opSeq: 2, reason: "startup", control: "startupBatch", payload: { source: "startup" } }));
  await runCase("topN", buildKdbForPipeline(), input({ opSeq: 4, reason: "topN", settings: Object.assign({}, SETTINGS, { topNChoice: "10" }), periodPin: {
    jahrFilterValue: { d: "2023", u: "2023" }, monatFilterValue: { d: "Dez", u: "Dez" } } }));
  await runCase("cleanup", buildKdbForPipeline(), input({ opSeq: 5, reason: "cleanup", mode: "cleanup", forceEmpty: true, emptyReason: "reset",
    resetIntent: { enabled: true, scope: "widget", clearAllSlots: true, clearAllLocalFilters: true, reason: "reset" } }));
  await runCase("cleanupNoSettings", buildKdbForPipeline(), { widgetId: "w1", opSeq: 6, reason: "cleanup", mode: "cleanup", forceEmpty: true, metric: METRIC });
  await runCase("settingsIncomplete", buildKdbForPipeline(), input({ settings: { dimension: "x" } }));
  await runCase("settingsEmptyVisType", buildKdbForPipeline(), input({ settings: { dimension: "x", visType: "", topNChoice: "none" } }));

  planResult.value = { ok: false, status: "error", errorMessage: "plan boom", diagnostics: { d: 1 } };
  await runCase("planFails", buildKdbForPipeline(), input());
  planResult.value = null;

  applyResult.value = new Error("apply boom");
  await runCase("applyThrows", buildKdbForPipeline(), input());
  applyResult.value = Object.assign(new Error("aborted"), { name: "AbortError" });
  await runCase("applyAborts", buildKdbForPipeline(), input());
  applyResult.value = { status: "error", diagnostics: { errorCode: "X", errorMessage: "Y" } };
  await runCase("applyStatusError", buildKdbForPipeline(), input());
  await runCase("cleanupApplyStatusError", buildKdbForPipeline(), input({ reason: "cleanup", mode: "cleanup", forceEmpty: true, emptyReason: "r" }));
  applyResult.value = { status: "success", diagnostics: {} };

  const noApply = buildKdbForPipeline();
  delete noApply.services.widgetBindingApply;
  await runCase("noApplyService", noApply, input());
  const noApplyCleanup = buildKdbForPipeline();
  delete noApplyCleanup.services.widgetBindingApply;
  await runCase("noApplyServiceCleanup", noApplyCleanup, input({ reason: "cleanup", mode: "cleanup", forceEmpty: true, emptyReason: "r" }));
  const noPlan = buildKdbForPipeline();
  delete noPlan.services.widgetBindingPlan;
  await runCase("noPlanService", noPlan, input());

  await runCase("staleAfterProps", buildKdbForPipeline(), input({ opSeq: 7 }), { context: { isStaleOpSeq: () => true } });

  hierarchy.value = { resolution: { hasConfirmedSelection: false } };
  await runCase("dienststelleTimeout", buildKdbForPipeline(), input(), { advance: 5000 });
  hierarchy.value = HIERARCHY;

  fakes.visProperties.applyVisualizationProperties = async (_KDB, opts) => {
    log.push(["visProperties", { phase: opts.phase }]);
    return { diagnostics: { blockers: ["b1", "b2"] } };
  };
  const blocked = loadPipeline(clock, fakes);
  log.length = 0;
  out.propertyBlocked = json(await blocked(makeContext(buildKdbForPipeline()).context, input()));
  fakes.visProperties.applyVisualizationProperties = async (_KDB, opts) => ({ aborted: true, diagnostics: {} });
  out.propertyAborted = json(await loadPipeline(clock, fakes)(makeContext(buildKdbForPipeline()).context, input()));
  return out;
}

function computeWaveListFixtures() {
  const list = loadWaveList();
  const frames = {
    a: { widgetId: "a", kind: "vis", placement: "onCanvas", lifecycle: "mounted", tabId: "t1" },
    b: { widgetId: "b", kind: "vis", placement: "onCanvas", lifecycle: "mounted", tabId: "t2" },
    c: { widgetId: "c", kind: "vis", placement: "inLaunchpad", lifecycle: "mounted", tabId: "t1" },
    d: { widgetId: "d", kind: "text", placement: "onCanvas", lifecycle: "mounted", tabId: "t1" },
    e: { widgetId: "e", kind: "vis", placement: "onCanvas", lifecycle: "disposed", tabId: "t1" },
    f: { widgetId: "f", kind: "vis", placement: "onCanvas", lifecycle: "mounted", tabId: "t2" },
    g: { widgetId: "g", kind: "vis", placement: "onCanvas", lifecycle: "mounted", tabId: "t1" }
  };
  const settingsById = {
    a: { dimension: DIMENSION, topNChoice: "10" }, b: { dimension: DIMENSION, topNChoice: "5" }, c: { dimension: DIMENSION, topNChoice: "5" },
    d: { dimension: DIMENSION, topNChoice: "5" }, e: { dimension: DIMENSION, topNChoice: "5" }, f: { dimension: DIMENSION, topNChoice: "none" },
    g: { dimension: null, topNChoice: "5" }
  };
  const readSettings = (id) => settingsById[id];
  const out = {};
  for (const active of ["t1", null]) {
    const _KDB = { state: { widgets: { base: { byId: frames } }, tabs: active ? { activeTabId: active } : {} } };
    out["pageContext_t1_" + active] = json(list(_KDB, readSettings, "pageContext", "t1"));
    out["pageContext_t2_" + active] = json(list(_KDB, readSettings, "pageContext", "t2"));
    out["global_" + active] = json(list(_KDB, readSettings, "global", null));
  }
  out.noBase = json(list({ state: { tabs: { activeTabId: "t1" } } }, readSettings, "global", null));
  return out;
}

async function computeWaveFixtures() {
  const out = {};
  const calls = [];
  const topNDispatches = [];
  const pinCalls = [];
  const fakes = {
    pipeline: async (context, input) => { calls.push(json({ input, metric: context.readMetric(input.widgetId) })); return { ok: true }; },
    pin: async (_KDB, table, request) => { pinCalls.push(json({ table, request })); return { jahrFilterValue: { d: "2024", u: "2024" }, monatFilterValue: { d: "Dez", u: "Dez" } }; }
  };
  const subscribers = [];
  const settingsById = { a: { dimension: DIMENSION, topNChoice: "10" }, b: { dimension: DIMENSION, topNChoice: "5" } };
  const makeKdb = (tabs) => buildKdb({
    api: { widgetTopN: { dispatch: async (action) => { topNDispatches.push(json(action)); return { ok: true }; } }, tabs: {
      dispatch: async () => ({ ok: true, tabTargets: [] })
    } },
    events: { subscribe: (name, fn) => { subscribers.push({ name, fn }); return () => {}; } },
    state: {
      widgets: {
        base: { byId: {
          a: { widgetId: "a", kind: "vis", placement: "onCanvas", lifecycle: "mounted", tabId: "t1" },
          b: { widgetId: "b", kind: "vis", placement: "onCanvas", lifecycle: "mounted", tabId: "t2" }
        } },
        vis: { byId: { a: { derived: { code: "K" } }, b: { derived: { code: "K" } } } }
      },
      tabs
    },
    runtime: {}
  });
  const wave = loadWaveWithFakes(fakes);
  const stubSettings = (_KDB) => {
    _KDB.api.widgetSettings = { getState: () => ({ byWidget: { a: settingsById.a, b: settingsById.b } }) };
  };

  let _KDB = makeKdb({ activeTabId: "t1" });
  stubSettings(_KDB);
  out.skipFilterType = json(await wave(_KDB, { filterType: "dienststelle" }));
  out.skipFilterTypeSicht = json(await wave(_KDB, { filterType: "sicht", scopeType: "global" }));
  out.subscriptionCount = [subscribers.length, subscribers[0] && subscribers[0].name];
  out.deferredOtherTab = json(await wave(_KDB, { scopeType: "pageContext", tabId: "t2", isJahr: true, filterType: "jahr", selectedYearKnown: true, selectedYear: 2024 }));
  out.pendingAfterDefer = json(_KDB.runtime.widgetVis.pendingTopNWavesByTab);
  out.activeTabRun = json(await wave(_KDB, { scopeType: "pageContext", tabId: "t1", isJahr: true, filterType: "jahr" }));
  out.activeTabCalls = calls.splice(0).map((c) => ({ reason: c.input.reason, widgetId: c.input.widgetId, payload: c.input.payload, hasPin: !!c.input.periodPin, metric: c.metric, settings: c.input.settings }));
  out.activeTabTopN = topNDispatches.splice(0);
  out.pinCalls = pinCalls.splice(0);
  out.globalRun = json(await wave(_KDB, { scopeType: "global", filterType: "jahr", isJahr: true }));
  out.globalCalls = calls.splice(0).map((c) => c.input.widgetId);
  out.globalPending = json(_KDB.runtime.widgetVis.pendingTopNWavesByTab);
  out.noWidgets = json(await wave(_KDB, { scopeType: "pageContext", tabId: "t1", filterType: "x" }).then(() => null));
  topNDispatches.length = 0;
  calls.length = 0;
  _KDB.state.tabs.activeTabId = "t2";
  subscribers[0].fn({ tabId: "t2" });
  await flush();
  await flush();
  out.tabShownReplay = [calls.splice(0).map((c) => c.input.widgetId), json(_KDB.runtime.widgetVis.pendingTopNWavesByTab), topNDispatches.splice(0).map((a) => a.payload.reason)];
  subscribers[0].fn({ tabId: "unknown" });
  subscribers[0].fn(null);
  out.subscriptionsKept = Object.keys(_KDB.runtime.widgetVis.subscriptions);
  return out;
}

async function computeHandlerFixtures() {
  const out = {};
  const calls = [];
  const loadingStarts = [];
  const loadingFinishes = [];
  const pipelineResult = { value: { ok: true, derived: { code: "K" }, status: "success" } };
  const fakes = {
    pipeline: async (context, input) => { calls.push(json(input)); return pipelineResult.value; },
    startLoading: (_KDB, options) => { loadingStarts.push(json(Object.assign({}, options, { widgetEl: options.widgetEl && options.widgetEl.id || null }))); }
  };
  const _KDB = buildKdb({ services: { loading: { finishLoading: (opts) => loadingFinishes.push(json(opts)) } } });
  const { context, dispatched } = makeContext(_KDB, { isStaleOpSeq: () => false });
  const settingsApi = loadSettings(fakes);
  const snapshot = (extra) => Object.assign({}, SETTINGS, extra || {});
  const actions = {
    dimension: { type: "widgetVis/applyDimension", widgetId: "w1", opSeq: 2, payload: { settingsSnapshot: snapshot(), nextValue: "Geschlecht", source: "user" } },
    visTypeByKind: { type: "x", widgetId: "w1", opSeq: 3, payload: { kind: "visualization", settingsSnapshot: snapshot(), optionValue: "Pie" } },
    topN: { type: "widgetVis/applyTopNChoice", widgetId: "w1", opSeq: 4, payload: { settingsSnapshot: snapshot(), nextValue: "10", widgetEl: { nodeType: 1, id: "given" } } },
    grouping: { type: "x", widgetId: "w1", opSeq: 5, payload: { control: "grouping", settingsSnapshot: snapshot({ grouping: "jahr" }), nextValue: "stichtagProJahrV" } },
    groupingInherit: { type: "x", widgetId: "w1", opSeq: 6, payload: { control: "grouping", settingsSnapshot: snapshot({ grouping: "jahr" }), nextValue: "inherit" } },
    groupingInvalid: { type: "x", widgetId: "w1", opSeq: 7, payload: { control: "grouping", settingsSnapshot: snapshot({ grouping: "jahr" }), nextValue: "weird" } },
    groupingKept: { type: "x", widgetId: "w1", opSeq: 8, payload: { control: "dimension", settingsSnapshot: snapshot({ grouping: "jahrStichtag", showValues: true }), nextValue: "Geschlecht" } },
    noSnapshot: { type: "widgetVis/applyDimension", widgetId: "w1", opSeq: 9, payload: { nextValue: "x" } },
    incomplete: { type: "widgetVis/applyDimension", widgetId: "w1", opSeq: 10, payload: { settingsSnapshot: { dimension: "x" } } },
    startupSource: { type: "x", widgetId: "w1", opSeq: 11, payload: { source: "startup", control: "dimension", metric: METRIC } },
    replayFallback: { type: "x", widgetId: "w1", opSeq: 12, payload: { control: "visType", settingsSnapshot: snapshot(), nextValue: "Prognose", isHistoryReplay: true, source: "historyReplay" } }
  };
  out.applySetting = {};
  for (const [name, action] of Object.entries(actions)) {
    calls.length = 0;
    dispatched.length = 0;
    loadingStarts.length = 0;
    out.applySetting[name] = json({
      result: await settingsApi.handleApplySetting(context, action),
      pipelineInputs: calls.slice(),
      dispatched: dispatched.slice(),
      loadingStarts: loadingStarts.slice()
    });
  }
  pipelineResult.value = { ok: false, status: "error", errorCode: "WIDGET_VIS_BINDING_APPLY_FAILED", errorMessage: "x" };
  loadingFinishes.length = 0;
  out.applySettingFailure = json({
    result: await settingsApi.handleApplySetting(context, actions.dimension),
    finishes: loadingFinishes.slice()
  });
  pipelineResult.value = { ok: false, stale: true, status: "aborted" };
  loadingFinishes.length = 0;
  out.applySettingStale = json({ result: await settingsApi.handleApplySetting(context, actions.dimension), finishes: loadingFinishes.slice() });
  pipelineResult.value = { ok: true, derived: { code: "K" }, status: "success" };

  const readyKdb = buildKdb();
  readyKdb.runtime.widgetVis = { byId: { w1: { opSeq: 1 } } };
  readyKdb.state.widgets = { vis: { byId: { w1: { derived: { code: "K", metricsTable: "Personal_KDB" } } } } };
  const startupCtx = makeContext(readyKdb);
  out.startup = {};
  const startupActions = {
    startup: { widgetId: "w1", opSeq: 1, payload: { source: "startup", settingsSnapshot: snapshot({ grouping: "jahr", iterator: true, zoom: false, valueCaption: true, showValues: false }),
      changedControls: [{ kind: "k", control: "dimension", previousValue: "a", nextValue: "b", extra: 1 }] } },
    replay: { widgetId: "w1", opSeq: 2, payload: { source: "historyReplay", isHistoryReplay: true, settingsSnapshot: snapshot(), skipHistory: true } },
    badSource: { widgetId: "w1", opSeq: 3, payload: { source: "user", settingsSnapshot: snapshot() } },
    replayWithoutFlag: { widgetId: "w1", opSeq: 3, payload: { source: "historyReplay", settingsSnapshot: snapshot() } },
    incomplete: { widgetId: "w1", opSeq: 4, payload: { source: "startup", settingsSnapshot: { dimension: "a" } } }
  };
  for (const [name, action] of Object.entries(startupActions)) {
    calls.length = 0;
    startupCtx.dispatched.length = 0;
    out.startup[name] = json({
      result: await settingsApi.handleApplyStartupSettings(startupCtx.context, Object.assign({ type: "widgetVis/applyStartupSettings" }, action)),
      pipelineInputs: calls.slice(),
      dispatched: startupCtx.dispatched.slice()
    });
  }
  const notReady = makeContext(buildKdb());
  out.startupNotReady = json(await settingsApi.handleApplyStartupSettings(notReady.context, Object.assign({ type: "t" }, startupActions.startup)));

  const dienst = loadDienststelleChanged(fakes);
  const dKdb = buildKdb({ state: { widgets: { vis: { byId: { w1: {}, w2: {}, w3: {} } } } } });
  const dCtx = makeContext(dKdb);
  const gates = loadGates(createClock());
  const pending = track(gates.waitDienststelle(dKdb, "w2", 1));
  const dPayload = { hierarchySnapshot: HIERARCHY };
  calls.length = 0;
  out.dienststelleSingle = json({
    result: await dienst.handleDienststelleChanged(dCtx.context, { type: "widgetVis/dienststelleChanged", widgetId: "w1", opSeq: 5, payload: dPayload }),
    inputs: calls.slice(), dispatched: dCtx.dispatched.slice()
  });
  out.dienststelleMissingWidget = json(await dienst.handleDienststelleChanged(dCtx.context, { type: "x", payload: dPayload }));
  calls.length = 0;
  const broadcast = await dienst.broadcastDienststelleChanged(dCtx.context, { type: "widgetVis/dienststelleChanged", payload: dPayload });
  out.dienststelleBroadcast = json({ result: broadcast, widgets: calls.map((c) => c.widgetId).sort(), pendingWaiter: pending.state });
  calls.length = 0;
  const emptyKdb = buildKdb({ state: { widgets: { vis: { byId: {} } } } });
  out.dienststelleBroadcastEmpty = json(await dienst.broadcastDienststelleChanged(makeContext(emptyKdb).context, { type: "x", payload: dPayload }));
  return out;
}

async function computeRestoreFixtures() {
  const out = {};
  const pipelineCalls = [];
  const waitCalls = [];
  const cleanupCalls = [];
  const behaviour = { ready: () => ({ ok: true }), cleanup: () => ({ ok: true }) };
  const fakes = {
    pipeline: async (context, input) => { pipelineCalls.push(json(input)); return { ok: true, derived: { code: "K" }, status: "success" }; },
    lifecycle: { handleWaitUntilContentReady: async (ctx, action) => { waitCalls.push(json(action)); return behaviour.ready(action.widgetId); } },
    cleanup: { handleCleanupContent: async (ctx, action) => { cleanupCalls.push(json(action)); return behaviour.cleanup(action.widgetId); } }
  };
  const restore = loadRestore(fakes);
  const settingsState = { byWidget: {
    a: { dimension: DIMENSION, visType: "Line", topNChoice: "none", showValues: true, grouping: "jahr", iterator: false },
    b: { dimension: DIMENSION, visType: "Pie", topNChoice: "5" },
    c: { dimension: null }
  } };
  const makeKdb = () => {
    const _KDB = buildKdb({ api: { widgetSettings: { getState: () => settingsState } } });
    _KDB.runtime.widgetVis = { byId: { a: { opSeq: 1 }, b: { opSeq: 1 } } };
    _KDB.state.widgets = { vis: { byId: { a: { derived: { code: "K", metricsTable: "Personal_KDB" } }, b: { derived: { code: "K" } } } } };
    return _KDB;
  };
  const correlation = { 2: { kind: "vis", widgetId: "b" }, 1: { kind: "vis", widgetId: "a" }, 3: { kind: "text", widgetId: "t" }, 4: { kind: "vis", widgetId: "a" } };
  let _KDB = makeKdb();
  let ctx = makeContext(_KDB);
  out.bindOk = json({ result: await restore.handleParameterSetBinding(ctx.context, { payload: { runId: 5, widgetCorrelation: correlation, skipHistory: true } }),
    waits: waitCalls.splice(0), pipeline: pipelineCalls.splice(0).map((i) => ({ widgetId: i.widgetId, reason: i.reason, payload: i.payload, settings: i.settings })) });
  out.bindNoRunId = json(await restore.handleParameterSetBinding(ctx.context, { payload: {} }));
  out.bindStaleRun = json(await restore.handleParameterSetBinding(ctx.context, { payload: { runId: 4, widgetCorrelation: correlation } }));
  out.bindNoVis = json(await restore.handleParameterSetBinding(ctx.context, { payload: { runId: 6, widgetCorrelation: { 1: { kind: "text", widgetId: "t" } } } }));
  behaviour.ready = (id) => (id === "a" ? { ok: false, errorCode: "WIDGET_VIS_CONTENT_READY_TIMEOUT" } : { ok: true });
  out.bindReadyTimeout = json(await restore.handleParameterSetBinding(ctx.context, { payload: { runId: 7, widgetCorrelation: correlation } }));
  behaviour.ready = () => ({ ok: true });
  settingsState.byWidget.b = null;
  out.bindNoCommitted = json(await restore.handleParameterSetBinding(ctx.context, { payload: { runId: 8, widgetCorrelation: correlation } }));
  settingsState.byWidget.b = { dimension: DIMENSION, visType: "Pie", topNChoice: "5" };
  behaviour.ready = (id) => { if (id === "a") _KDB.runtime.widgetVis.parameterSetRunId = 99; return { ok: true }; };
  out.bindSupersededWhileWaiting = json(await restore.handleParameterSetBinding(ctx.context, { payload: { runId: 9, widgetCorrelation: correlation } }));
  behaviour.ready = () => ({ ok: true });
  _KDB.runtime.widgetVis.parameterSetRunId = 0;

  out.helpers = json({
    collect: [null, {}, correlation, { 1: { kind: "vis" } }].map((c) => restore.helpers.collectVisWidgets(c)),
    degraded: [null, { status: "timeout" }, { errorCode: "WIDGET_VIS_TOPN_UNAVAILABLE" }, { errorCode: "WIDGET_VIS_BINDING_TIMEOUT" }, { errorCode: "OTHER" }]
      .map((r) => restore.helpers.isDegradedFailure(r)),
    committed: ["a", "b", "zz"].map((id) => restore.helpers.readCommittedSettings(makeKdb(), id))
  });

  _KDB = makeKdb();
  _KDB.runtime.widgetVis.byId.a.abortControllers = { applyBinding: new AbortController() };
  const aborter = _KDB.runtime.widgetVis.byId.a.abortControllers.applyBinding;
  ctx = makeContext(_KDB);
  const clock = createClock();
  const gates = loadGates(clock);
  const gateWait = track(gates.waitTopN(_KDB, "a", 3));
  _KDB.runtime.widgetVis.byId.a.opSeq = 3;
  await flush();
  out.cancelNoRunId = json(await restore.handleParameterSetCancelBindings(ctx.context, { payload: {} }));
  out.cancelOk = json(await restore.handleParameterSetCancelBindings(ctx.context, { payload: { runId: 3, widgetIds: ["a", "b", "zz", "text"] } }));
  out.cancelOkCleanup = cleanupCalls.splice(0);
  out.cancelEffects = [aborter.signal.aborted, gateWait.state, json(gateWait.value)];
  out.cancelStale = json(await restore.handleParameterSetCancelBindings(ctx.context, { payload: { runId: 2, widgetIds: ["a"] } }));
  behaviour.cleanup = (id) => (id === "a" ? { ok: false, errorCode: "BOOM" } : { ok: false, skipped: true });
  out.cancelCleanupFails = json(await restore.handleParameterSetCancelBindings(ctx.context, { payload: { runId: 4, widgetIds: ["a", "b"] } }));
  return out;
}

async function computeAll() {
  return {
    specs: computeSpecFixtures(),
    specDetails: computeSpecDetails(),
    waiters: await computeWaiterFixtures(),
    gate: await computeGateFixtures(),
    period: computePeriodFixtures(),
    pin: await computePinFixtures(),
    waveList: computeWaveListFixtures(),
    wave: await computeWaveFixtures(),
    pipeline: await computePipelineFixtures(),
    handlers: await computeHandlerFixtures(),
    restore: await computeRestoreFixtures()
  };
}

const FIXTURES_URL = new URL("./fixtures/widgetVis-binding.golden.json", import.meta.url);

test("widgetVis binding golden fixtures", async (t) => {
  const actual = await computeAll();
  if (process.env.RECORD_WIDGETVIS_BINDING) {
    writeFileSync(FIXTURES_URL, JSON.stringify(actual, null, 2) + "\n");
    return;
  }
  const FIXTURES = JSON.parse(readFileSync(FIXTURES_URL, "utf8"));
  for (const key of Object.keys(actual)) {
    await t.test(key, () => assert.deepStrictEqual(actual[key], FIXTURES[key]));
  }
  assert.deepStrictEqual(Object.keys(actual), Object.keys(FIXTURES));
});
