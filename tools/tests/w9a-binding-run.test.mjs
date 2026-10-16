// P2-W9a: pins the plan+apply glue in widgetVis binding/pipeline.js (applyPlan) and widgetTopN helperBinding.js
// (runHelperBinding): call order, option handling, abort/stale handling, which throws escape and which become result
// envelopes. Recorded on the code before the services.widgetBinding.run migration and unchanged by it.
// Run: node --test tools/tests/w9a-binding-run.test.mjs
// Re-record: RECORD_W9A_BINDING=1 node --test tools/tests/w9a-binding-run.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const load = (rel, options) => loadAmd(path.join(JS_ROOT, rel), options);
const json = (value) => (value === undefined ? "<undefined>" : JSON.parse(JSON.stringify(value)));
const FIXTURES_URL = new URL("./fixtures/w9a-binding-run.golden.json", import.meta.url);
const METRIC = { code: "P_A_MOA_01", display: "Kennzahl 1", metricsTable: "Personal_KDB" };
const SETTINGS = { dimension: "Altersgruppe", visType: "Line", topNChoice: "none" };
const HIERARCHY = {
  activeDownstreamName: "Dienststelle_Ebene",
  hierarchyItemId: 42,
  resolution: { hasConfirmedSelection: true, downstreamValues: ["A"], dominantValues: [], displayValues: ["A"] }
};
function createConsole(lines) {
  const line = (level) => (...args) => {
    const err = args.find((a) => a instanceof Error);
    lines.push([level, String(args[0]), err ? err.message : null]);
  };
  return { error: line("error"), warn: line("warn"), log() {} };
}
const settle = (promise) => promise.then((value) => ["resolved", json(value)], (err) => ["rejected", String(err && err.message || err)]);

function buildKdb(services, extra) {
  const _KDB = Object.assign({ config: { options: {} }, api: {}, properties: {}, state: {}, runtime: {}, services: services }, extra || {});
  load("core/config/__orchestratorConfig.js")(_KDB);
  load("core/services/widgetBinding/index.js")(_KDB);
  return _KDB;
}

// ---- widgetVis pipeline -------------------------------------------------------------------------------------------

function loadPipeline(log, flags, consoleStub, hooks) {
  const record = (name, value) => { log.push([name, json(value)]); };
  const modules = {
    "../render/visProperties.js": { applyVisualizationProperties: async () => { if (hooks.inProps) hooks.inProps(); return { diagnostics: { blockers: [] } }; } },
    "../render/title.js": { applyPreRenderTitle: async () => ({}) },
    "../render/postRender.js": {
      applyPrognoseSeriesSegmentIndexes: async () => {},
      applyPostRenderCleanup: () => ({ titleText: "Title", diagnostics: { cleaned: true } }),
      cleanupVisualizationContent: () => ({})
    },
    "../legend/sweep.js": {
      installLegendObserverBeforeApply: (runtime, widgetId, options) => {
        record("legendInstall", { widgetId, opSeq: options.opSeq, dimension: options.dimension, visType: options.visType, mode: options.mode,
          staleFn: typeof options.isStaleOpSeq, managedAtInstall: runtime.managedFilterItemIds });
        if (flags.legendThrows) throw new Error("legend boom");
        return {};
      },
      sweepLegendCaptions: () => {},
      disconnectLegendTextObserver: () => ({ disconnected: false })
    }
  };
  return load("dashboard/widgets/widgetVis/binding/pipeline.js", { stubs: { console: consoleStub }, modules }).runBindingPipeline;
}

function pipelineCase(name, opts) {
  return async () => {
    const log = [];
    const consoleLines = [];
    const flags = { legendThrows: opts.legendThrows === true };
    let planBuilt = false;
    const services = {
      widgetBindingPlan: {
        buildPlan: (spec) => {
          log.push(["buildPlan", { reason: spec.reason, widgetId: spec.widgetId, opSeq: spec.opSeq }]);
          if (opts.planThrows) throw new Error("plan boom");
          if (opts.optionsThrow) {
            Object.defineProperty(_KDB.runtime.widgetVis.byId.w1, "managedFilterItemIds", { configurable: true, get() { throw new Error("options boom"); } });
          }
          planBuilt = true;
          return "plan" in opts ? opts.plan : { ok: true, status: "success", reason: spec.reason, managedFilterItemIds: ["m1"], emptyIntent: spec.emptyIntent,
            mirrorPatch: { visualizationType: spec.dataConfig.visualizationType } };
        }
      },
      widgetBindingApply: {
        applyBinding: async (plan, options) => {
          log.push(["applyBinding", { reason: options.target.reason, target: options.target, previous: options.previousManagedFilterItemIds,
            profile: options.timeoutProfile, renderWait: options.renderWait, signalAborted: options.signal.aborted, signalIsAbortSignal: options.signal instanceof AbortSignal,
            keys: Object.keys(options) }]);
          if (opts.onApply) opts.onApply(_KDB);
          if (opts.teardownInApply) _KDB.services = null;
          if (opts.applyThrows) throw new Error("apply boom");
          return opts.applyResult || { status: "success", diagnostics: {} };
        }
      }
    };
    if (opts.noApply) delete services.widgetBindingApply;
    const _KDB = buildKdb(services, { api: { dienststelle: { getCurrentHierarchySnapshot: () => HIERARCHY } } });
    const dispatched = [];
    let opSeq = 0;
    const context = {
      _KDB,
      selectors: { readVisRecord: () => undefined },
      dispatchInternal: (action) => { dispatched.push(action.type); },
      ensureOpSeq: (id, requested) => (typeof requested === "number" ? requested : ++opSeq),
      isStaleOpSeq: () => {
        if (opts.staleAfterPlan && planBuilt) return true;
        if (opts.staleThrowsAfterPlan && planBuilt) throw new Error("stale boom");
        return false;
      },
      readMetric: () => METRIC,
      readSettingsSnapshot: () => SETTINGS,
      isDisposed: false
    };
    const run = loadPipeline(log, flags, createConsole(consoleLines), { inProps: opts.teardownInProps ? () => { _KDB.services = null; } : null });
    const input = Object.assign({ widgetId: "w1", opSeq: 2, metric: METRIC, settings: SETTINGS, payload: { source: "user" }, reason: "dimension", control: "dimension" }, opts.input || {});
    const outcome = await settle(run(context, input));
    const widgetRuntime = _KDB.runtime.widgetVis && _KDB.runtime.widgetVis.byId.w1;
    return {
      outcome, log,
      dispatched,
      managed: widgetRuntime && !opts.optionsThrow ? widgetRuntime.managedFilterItemIds : null,
      console: consoleLines,
      name
    };
  };
}

const PIPELINE_CASES = {
  plain: { },
  deferRenderWait: { input: { payload: { source: "historyReplay", deferRenderWait: true } } },
  startup: { input: { reason: "startup", control: "startupBatch", payload: { source: "startup" } } },
  cleanup: { input: { reason: "cleanup", mode: "cleanup", forceEmpty: true, emptyReason: "reset" } },
  planThrows: { planThrows: true },
  planFails: { plan: { ok: false, status: "error", errorMessage: "plan boom", diagnostics: { d: 1 } } },
  planUndefined: { plan: undefined },
  staleAfterPlan: { staleAfterPlan: true },
  staleThrowsAfterPlan: { staleThrowsAfterPlan: true },
  legendInstallThrows: { legendThrows: true },
  applyThrows: { applyThrows: true },
  applyStatusError: { applyResult: { status: "error", diagnostics: { errorCode: "X", errorMessage: "Y" } } },
  abortedDuringApply: { onApply: (_KDB) => { _KDB.runtime.widgetVis.byId.w1.abortControllers.applyBinding.abort(); } },
  noApplyService: { noApply: true },
  noApplyServiceCleanup: { noApply: true, input: { reason: "cleanup", mode: "cleanup", forceEmpty: true, emptyReason: "r" } },
  noApplyServicePlanFails: { noApply: true, plan: { ok: false, status: "error", errorMessage: "plan boom" } },
  noApplyServiceStale: { noApply: true, staleAfterPlan: true },
  optionsThrow: { optionsThrow: true },
  teardownInProps: { teardownInProps: true },
  teardownInPropsPlanFails: { teardownInProps: true, plan: { ok: false, status: "error", errorMessage: "plan boom" } },
  teardownInPropsStale: { teardownInProps: true, staleAfterPlan: true },
  teardownInApply: { teardownInApply: true }
};

// ---- widgetTopN helper binding ------------------------------------------------------------------------------------

function loadHelperBinding(log, props, consoleStub) {
  const modules = {
    "../widgetVis/visualization.js": {
      applyVisualizationProperties: async (_KDB, options) => {
        log.push(["properties", { phase: options.phase, force: options.force, widgetId: options.widgetId }]);
        if (props.onProperties) props.onProperties(options.phase);
        return props.result(options.phase);
      }
    },
    "./helperPlacement.js": { dismissHelperTitleEdit: (_KDB, helperId) => { log.push(["dismiss", helperId]); } }
  };
  return load("dashboard/widgets/widgetTopN/helperBinding.js", { stubs: { console: consoleStub }, modules });
}

function helperCase(name, opts) {
  return async () => {
    const log = [];
    const consoleLines = [];
    const controller = new AbortController();
    const services = {
      widgetBindingPlan: {
        buildPlan: (spec) => {
          log.push(["buildPlan", { reason: spec.reason }]);
          if (opts.planThrows) throw new Error("plan boom");
          if (opts.abortInPlan || opts.abortInPlanFail) controller.abort();
          return "plan" in opts ? opts.plan : { ok: true, status: "success", reason: spec.reason, managedFilterItemIds: ["f1"] };
        }
      },
      widgetBindingApply: {
        applyBinding: async (plan, options) => {
          log.push(["applyBinding", { target: options.target, previous: options.previousManagedFilterItemIds, profile: options.timeoutProfile,
            signalSame: options.signal === controller.signal, keys: Object.keys(options) }]);
          if (opts.abortInApply) controller.abort();
          if (opts.applyThrows) throw opts.applyThrows;
          return "applyResult" in opts ? opts.applyResult : { status: "success", diagnostics: { x: 1 } };
        }
      }
    };
    if (opts.noPlan) delete services.widgetBindingPlan;
    if (opts.noApply) delete services.widgetBindingApply;
    const _KDB = buildKdb(services);
    const binding = loadHelperBinding(log, {
      result: (phase) => (phase === "preBinding" && opts.blockers ? { diagnostics: { blockers: ["b1"] } } : { diagnostics: { phase } }),
      onProperties: (phase) => { if (opts.teardownInProps && phase === "preBinding") _KDB.services = null; }
    }, createConsole(consoleLines));
    const context = {
      ownerVisId: "owner", helperWidgetId: "helper", opSeq: 4, signal: controller.signal, spec: { reason: "topN", dataConfig: { visualizationType: "TopN" } },
      ownerRuntime: { helperManagedFilterItemIds: ["old"] }
    };
    if (opts.optionsThrow) {
      Object.defineProperty(context.ownerRuntime, "helperManagedFilterItemIds", { get() { throw new Error("options boom"); } });
    }
    if (opts.abortFirst) controller.abort();
    return { name, outcome: await settle(binding.runHelperBinding(_KDB, context)), log, console: consoleLines };
  };
}

const HELPER_CASES = {
  success: {},
  noPlanService: { noPlan: true },
  noApplyService: { noApply: true },
  blockers: { blockers: true },
  planFails: { plan: { ok: false, status: "error", errorMessage: "helper plan boom", diagnostics: { d: 1 } } },
  planFailsNoMessage: { plan: { ok: false, status: "error", errorCode: "PLAN_CODE" } },
  planUndefined: { plan: undefined },
  abortBeforeApply: { abortInPlan: true },
  abortFirst: { abortFirst: true },
  abortDuringApply: { abortInApply: true },
  applyAbortedStatus: { applyResult: { status: "aborted" } },
  applyError: { applyResult: { status: "error", diagnostics: { errorMessage: "apply failed here" } } },
  applyTimeout: { applyResult: { status: "timeout", diagnostics: {} } },
  applyOther: { applyResult: { status: "weird" } },
  applyEmpty: { applyResult: null },
  planThrows: { planThrows: true },
  applyThrows: { applyThrows: new Error("apply boom") },
  applyThrowsAbortError: { applyThrows: Object.assign(new Error("x"), { name: "AbortError" }) },
  optionsThrow: { optionsThrow: true },
  planFailsAborted: { plan: { ok: false, status: "error", errorMessage: "helper plan boom" }, abortInPlanFail: true },
  teardownInProps: { teardownInProps: true },
  teardownInPropsPlanFails: { teardownInProps: true, plan: { ok: false, status: "error", errorMessage: "helper plan boom" } },
  teardownInPropsApplyError: { teardownInProps: true, applyResult: { status: "error", diagnostics: { errorMessage: "apply failed here" } } },
  teardownInPropsApplyTimeout: { teardownInProps: true, applyResult: { status: "timeout", diagnostics: {} } },
  teardownInPropsAbortFirst: { teardownInProps: true, abortFirst: true }
};

async function computeAll() {
  const out = { pipeline: {}, helper: {} };
  for (const [name, opts] of Object.entries(PIPELINE_CASES)) out.pipeline[name] = json(await pipelineCase(name, opts)());
  for (const [name, opts] of Object.entries(HELPER_CASES)) out.helper[name] = json(await helperCase(name, opts)());
  return out;
}

test("widgetVis pipeline and widgetTopN helper binding: plan+apply glue", async (t) => {
  const actual = await computeAll();
  if (process.env.RECORD_W9A_BINDING) {
    writeFileSync(FIXTURES_URL, JSON.stringify(actual, null, 2) + "\n");
    return;
  }
  const expected = JSON.parse(readFileSync(FIXTURES_URL, "utf8"));
  for (const group of Object.keys(actual)) {
    for (const name of Object.keys(actual[group])) {
      await t.test(group + "/" + name, () => assert.deepStrictEqual(actual[group][name], expected[group][name]));
    }
    assert.deepStrictEqual(Object.keys(actual[group]), Object.keys(expected[group]));
  }
});

test("pins the throw scope and ordering the run migration must keep", async () => {
  const actual = await computeAll();
  assert.equal(actual.pipeline.planThrows.outcome[0], "rejected");
  assert.equal(actual.pipeline.staleThrowsAfterPlan.outcome[0], "rejected");
  assert.equal(actual.pipeline.legendInstallThrows.outcome[0], "rejected");
  assert.equal(actual.pipeline.applyThrows.outcome[0], "resolved");
  assert.equal(actual.pipeline.applyThrows.outcome[1].status, "error");
  const order = (name) => actual.pipeline[name].log.map((entry) => entry[0]);
  assert.deepStrictEqual(order("plain"), ["buildPlan", "legendInstall", "applyBinding"]);
  assert.deepStrictEqual(order("cleanup"), ["buildPlan", "applyBinding"]);
  assert.deepStrictEqual(order("staleAfterPlan"), ["buildPlan"]);
  assert.deepStrictEqual(order("noApplyServicePlanFails"), ["buildPlan"]);
  assert.equal(actual.pipeline.noApplyServicePlanFails.outcome[1].errorCode, "WIDGET_VIS_BINDING_PLAN_FAILED");
  assert.equal(actual.pipeline.noApplyService.outcome[1].status, "skipped");
  assert.equal(actual.pipeline.noApplyServiceStale.outcome[1].status, "aborted");
  assert.equal(actual.helper.planThrows.outcome[1].errorCode, "WIDGET_TOPN_HELPER_APPLY_FAILED");
  assert.deepStrictEqual(actual.helper.abortBeforeApply.log.map((entry) => entry[0]), ["properties", "buildPlan", "dismiss"]);
  assert.deepStrictEqual(actual.helper.noPlanService.log, [["dismiss", "helper"]]);
  assert.equal(actual.pipeline.optionsThrow.outcome[0], "rejected");
  assert.equal(actual.helper.optionsThrow.outcome[1].errorCode, "WIDGET_TOPN_HELPER_APPLY_FAILED");
  assert.equal(actual.helper.planFailsAborted.outcome[1].errorCode, "WIDGET_TOPN_HELPER_PLAN_FAILED");
  assert.ok(actual.pipeline.applyThrows.console.some((l) => l[0] === "error"));
  assert.equal(actual.helper.planUndefined.outcome[1].errorCode, "WIDGET_TOPN_HELPER_PLAN_FAILED");
  assert.equal(actual.helper.applyEmpty.outcome[1].errorCode, "WIDGET_TOPN_HELPER_APPLY_FAILED");
});
