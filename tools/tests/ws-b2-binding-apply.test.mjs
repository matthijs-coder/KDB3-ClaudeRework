// Golden tests for core/services/widgetBindingApply (WS-B2), driven through the frozen service entry.
// Run: node --test tools/tests/ws-b2-binding-apply.test.mjs
// Re-record (only on purpose): WS_B_RECORD=1 node --test tools/tests/ws-b2-binding-apply.test.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const RECORD = process.env.WS_B_RECORD === "1";
const SNAPSHOT_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "ws-b2-binding-apply.snapshot.json");
const APPLY_DIR = "core/services/widgetBindingApply";
const FILTER_BODY_PATH = `${APPLY_DIR}/filterBody/buildFilterBody.js`;
const KEEPEXCLUDE_PATH = `${APPLY_DIR}/filterBody/keepexcludeConditions.js`;
const RUN_GUARD_MS = 2000;

const quiet = { log() {}, info() {}, warn() {}, error() {} };
const load = (rel) => loadAmd(path.join(JS_ROOT, rel), { stubs: { console: quiet } });
const registerApply = load(`${APPLY_DIR}/__orchestratorWidgetBindingApply.js`);
const buildPlan = load("core/services/widgetBindingPlan/buildPlan.js");
const buildFilterBodyModule = load(FILTER_BODY_PATH);
const buildKeepexclude = load(KEEPEXCLUDE_PATH);
const visTypes = load("core/config/visualizations/bindingSpecsVisTypes.js");

// The keepexclude builder is the optional second argument of buildFilterBody.
function callFilterBody(descriptor, withBuilder) {
  return buildFilterBodyModule(descriptor, withBuilder ? buildKeepexclude : undefined);
}

const snapshot = RECORD
  ? { plans: {}, cases: {}, matrices: {}, filterBodies: {}, keepexclude: {} }
  : JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));

// Pretty-print with short arrays/objects on one line so the snapshot stays reviewable.
function pretty(value, indent = "") {
  const inline = JSON.stringify(value);
  if (value === null || typeof value !== "object" || inline.length + indent.length <= 160) return inline;
  const next = indent + " ";
  if (Array.isArray(value)) return "[\n" + value.map((item) => next + pretty(item, next)).join(",\n") + "\n" + indent + "]";
  const entries = Object.entries(value).map(([key, item]) => next + JSON.stringify(key) + ": " + pretty(item, next));
  return "{\n" + entries.join(",\n") + "\n" + indent + "}";
}

after(() => {
  if (RECORD) writeFileSync(SNAPSHOT_PATH, pretty(snapshot) + "\n");
});

const toJson = (value) => (value === undefined ? null : JSON.parse(JSON.stringify(value)));

function check(section, name, actual) {
  const value = toJson(actual);
  if (RECORD) {
    snapshot[section][name] = value;
    return;
  }
  const expected = snapshot[section][name];
  assert.ok(expected !== undefined, `snapshot ${section}/${name} missing; re-record`);
  assert.deepStrictEqual(value, expected, `${section}/${name}`);
  assert.equal(JSON.stringify(value), JSON.stringify(expected), `${section}/${name} key order`);
}

// ---------------------------------------------------------------- plans (recorded once, then fixed input)

const GESCHLECHT = "[Personal_KDB_TM1].[Geschlecht].[Geschlecht].[Geschlecht]";
const PARAMETER_MAPPING = {
  AggregationstypId_widget_localfilter_KID: "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]",
  Geschlecht_widget_localfilter_KID: GESCHLECHT,
};
const EMPTY_INTENT = { enabled: false, reason: null, itemId: null, value: null };

function visSpec(bucket, overrides = {}, dataOverrides = {}) {
  const bucketConfig = visTypes.visTypeByBucket[bucket];
  return {
    reason: "contentCreate",
    targetKind: "vis",
    widgetId: "w1",
    ownerWidgetId: null,
    opSeq: 7,
    dataConfig: {
      kennzahlCode: "K1",
      kennzahlenTable: "Personal_KDB",
      datasourceName: "Personal_KDB",
      datasourceId: "ds1",
      visualizationType: bucket,
      cognosVisualizationTypeId: bucketConfig.cognosVisualizationTypeId || bucket,
      visPropBucketKey: bucket,
      visTypeConfig: structuredClone(bucketConfig.byKennzahlenTable.Personal_KDB),
      dataTableConfig: { dimensions: { Geschlecht: { itemId: GESCHLECHT, exclude: ["Gesamt"] } }, sorting: {} },
      kennzahlDefaults: {},
      dimension: null,
      topN: null,
      ...dataOverrides,
    },
    hierarchySnapshot: null,
    helperTableResult: null,
    emptyIntent: EMPTY_INTENT,
    resetIntent: { enabled: false },
    config: {
      filterPropObj: {},
      parameterMappingObj: PARAMETER_MAPPING,
      topNOptions: { "top-5": 5, "top-10": 10 },
      emptyDataFilter: { itemId: "[Personal_KDB_TM1].[KDB Kennzahlen].[KDB Kennzahlen].[KDB Kennzahlen]" },
    },
    ...overrides,
  };
}

function helperSpec(reason, resetIntent, topN) {
  return {
    reason,
    targetKind: "topNHelper",
    widgetId: "h1",
    ownerWidgetId: "w1",
    opSeq: 3,
    dataConfig: {
      kennzahlCode: "K1",
      kennzahlenTable: "Personal_KDB",
      datasourceId: "ds1",
      datasourceName: "Personal_KDB",
      visualizationType: "TopN",
      cognosVisualizationTypeId: "List",
      visPropBucketKey: "List",
      visTypeConfig: {
        values: "",
        categories: "",
        series: "",
        color: "",
        repeatHorizontal: "",
        repeatVertical: "",
        grid_cols: [GESCHLECHT, "[Personal_KDB_TM1].[KDB Kennzahlen].[replaceKennzahlName]"],
        dimensionSelectionAffects: "disabled",
        widgetFilter: { AggregationstypId: { include: ["Stichtag"] } },
      },
      dataTableConfig: {
        datasourceName: "Personal_KDB",
        dimensions: { Geschlecht: { itemId: GESCHLECHT, exclude: { itemId: GESCHLECHT, values: ["Gesamt", "ALLE", "^"] } } },
        sorting: {},
      },
      dimension: "Geschlecht",
      topN,
    },
    hierarchySnapshot: null,
    helperTableResult: null,
    resetIntent,
    emptyIntent: EMPTY_INTENT,
    config: { filterPropObj: {}, parameterMappingObj: PARAMETER_MAPPING, topNOptions: { "top-5": 5, "top-10": 10 } },
  };
}

const PLAN_SPECS = {
  line: () => visSpec("Line"),
  lineDimension: () => visSpec("Line", {}, { dimension: "Geschlecht" }),
  listDimension: () => visSpec("List", {}, { dimension: "Geschlecht" }),
  lineTopnReason: () => visSpec("Line", { reason: "topn" }),
  lineForceEmpty: () => visSpec("Line", {
    reason: "forceEmpty",
    emptyIntent: { enabled: true, reason: "noData", itemId: "[Personal_KDB_TM1].[KDB Kennzahlen].[KDB Kennzahlen].[KDB Kennzahlen]", value: "1" },
  }),
  visParameterSetReset: () => visSpec("Line", {
    reason: "cleanup",
    resetIntent: { enabled: true, scope: "visTarget", clearAllSlots: true, clearAllLocalFilters: true, reason: "parameterSetReset" },
  }),
  visSettingsDelete: () => visSpec("Line", {
    reason: "cleanup",
    resetIntent: { enabled: true, scope: "visTarget", clearAllSlots: true, clearAllLocalFilters: true, reason: "settingsDelete" },
  }),
  helperPreApply: () => helperSpec("topN", {
    enabled: true, scope: "helperTarget", clearAllSlots: true, clearAllLocalFilters: true, reason: "topNHelperPreApply",
  }, "top-5"),
  helperCleanup: () => helperSpec("cleanup", {
    enabled: true, scope: "helperTarget", clearAllSlots: true, clearAllLocalFilters: true, reason: "postResolution",
  }, null),
  invalidPlan: () => visSpec("Line", {}, { datasourceId: null }),
};

const plans = {};
for (const [name, makeSpec] of Object.entries(PLAN_SPECS)) {
  if (RECORD) snapshot.plans[name] = toJson(buildPlan(makeSpec()));
  plans[name] = snapshot.plans[name];
}

test("recorded plans have the expected status", () => {
  for (const [name, plan] of Object.entries(plans)) {
    assert.ok(plan, `plan ${name} recorded`);
    assert.equal(plan.status, name === "invalidPlan" ? "error" : "success", name);
  }
});

// ---------------------------------------------------------------- fake host

const FACET_METHODS = {
  visualization: [
    "getVisType", "setDataSource", "setVisType", "clearAllLocalFilters", "removeLocalFilter", "clearAllSlots",
    "addDataItemsToSlot", "setTopBottomOnSlot", "setCustomLabelInSlot", "sortDataItemInSlot", "addOrReplaceLocalFilter",
  ],
  widgets: ["renderWidget"],
  canvas: ["whenRenderStart", "whenRenderComplete"],
};

function sanitizeArg(arg, ctx) {
  if (arg && typeof arg === "object" && !Array.isArray(arg) && "signal" in arg) {
    const copy = { ...arg };
    copy.signal = arg.signal === ctx.signal ? "[signal]" : "[other-signal]";
    return toJson(copy);
  }
  return toJson(arg);
}

function defaultFacetResult(name, ctx) {
  if (name === "getVisType") return Promise.resolve({ ok: true, data: ctx.currentVisType });
  return Promise.resolve({ ok: true });
}

function createHost({ behaviour, omit = [], noCognosHost = false, currentVisType = "Bar", signal } = {}) {
  const controller = new AbortController();
  const ctx = { calls: [], callCount: 0, controller, currentVisType, behaviour };
  ctx.signal = signal === undefined ? controller.signal : signal;
  const facets = {};
  for (const [facetName, methods] of Object.entries(FACET_METHODS)) {
    facets[facetName] = {};
    for (const method of methods) {
      if (omit.includes(method)) continue;
      facets[facetName][method] = function (...args) {
        ctx.callCount += 1;
        ctx.calls.push([method, ...args.map((arg) => sanitizeArg(arg, ctx))]);
        const custom = ctx.behaviour ? ctx.behaviour({ k: ctx.callCount, method, args, ctx }) : undefined;
        return custom !== undefined ? custom : defaultFacetResult(method, ctx);
      };
    }
  }
  const _KDB = {
    runtime: {},
    state: {},
    services: {
      loading: { finishLoading(options) { ctx.calls.push(["loading.finishLoading", toJson(options)]); } },
    },
  };
  if (!noCognosHost) _KDB.services.cognosHost = facets;
  ctx.facets = facets;
  ctx._KDB = _KDB;
  ctx.service = registerApply(_KDB);
  ctx.runtime = _KDB.runtime.widgetBindingApply;
  return ctx;
}

function targetFor(plan) {
  return {
    widgetId: plan.widgetId,
    targetKind: plan.targetKind,
    ownerWidgetId: plan.ownerWidgetId,
    opSeq: plan.opSeq,
    reason: plan.reason,
  };
}

function baseOptions(plan, ctx, extra = {}) {
  return {
    target: targetFor(plan),
    signal: ctx.signal,
    previousManagedFilterItemIds: plan.targetKind === "vis" ? ["[old].[managed]"] : [],
    ...extra,
  };
}

function withGuard(promise) {
  let timer;
  const guard = new Promise((resolve) => { timer = setTimeout(() => resolve("HANG"), RUN_GUARD_MS); });
  return Promise.race([promise, guard]).finally(() => clearTimeout(timer));
}

function stripDiagnostics(diagnostics) {
  if (!diagnostics || typeof diagnostics !== "object") return diagnostics;
  const copy = { ...diagnostics };
  delete copy.elapsedMs;
  delete copy.renderWaitMs;
  return copy;
}

async function runApply(planName, { host = {}, options, plan: planOverride } = {}) {
  const ctx = createHost(host);
  const plan = planOverride !== undefined ? planOverride : structuredClone(plans[planName]);
  const applyOptions = options === undefined ? baseOptions(plan || plans.line, ctx) : options(plan, ctx);
  let outcome;
  try {
    const result = await withGuard(ctx.service.applyBinding(plan, applyOptions));
    outcome = result === "HANG"
      ? { hang: true }
      : { status: result.status, mirrorPatch: result.mirrorPatch, diagnostics: stripDiagnostics(result.diagnostics) };
  } catch (err) {
    outcome = { rejected: String(err && err.message) };
  }
  return {
    ctx,
    record: {
      ...outcome,
      calls: ctx.calls,
      timers: Object.keys(ctx.runtime.timers),
      timerScopeId: applyOptions ? applyOptions.timerScopeId : null,
    },
  };
}

function compactRecord(record) {
  const diagnostics = record.diagnostics || {};
  return {
    status: record.status || null,
    hang: record.hang === true,
    completed: diagnostics.completedSteps,
    skipped: diagnostics.skippedSteps,
    failedStep: diagnostics.failedStep,
    errorCode: diagnostics.errorCode,
    errorMessage: diagnostics.errorMessage,
    aborted: diagnostics.aborted,
    timedOut: diagnostics.timedOut,
    warnings: (diagnostics.warnings || []).map((warning) => warning.code + "@" + warning.step),
    cognos: diagnostics.cognos,
    calls: record.calls.map((call) => call[0]).join(","),
    timers: record.timers,
  };
}

// ---------------------------------------------------------------- service surface

test("register: service surface, runtime buckets and facet stamps", () => {
  const ctx = createHost();
  const rt = ctx.runtime;
  check("cases", "registerSurface", {
    serviceKeys: Object.keys(ctx.service),
    registered: ctx._KDB.services.widgetBindingApply === ctx.service,
    buckets: ["abortControllers", "pendingPromises", "timers"].map((key) => [key, JSON.stringify(rt[key])]),
    stamps: [
      rt.visualizationFacet === ctx.facets.visualization,
      rt.widgetsFacet === ctx.facets.widgets,
      rt.canvasFacet === ctx.facets.canvas,
    ],
  });
});

test("register without cognosHost stamps null facets and validateInputs fails", async () => {
  const { ctx, record } = await runApply("line", { host: { noCognosHost: true } });
  check("cases", "noCognosHost", {
    stamps: [ctx.runtime.visualizationFacet, ctx.runtime.widgetsFacet, ctx.runtime.canvasFacet],
    record,
  });
});

// ---------------------------------------------------------------- paths

const PATH_CASES = {
  lineSuccess: { plan: "line" },
  lineVisTypeUnchanged: { plan: "line", host: { currentVisType: "Line" } },
  lineDimension: { plan: "lineDimension" },
  listDimension: { plan: "listDimension" },
  lineTopnReason: { plan: "lineTopnReason" },
  lineForceEmpty: { plan: "lineForceEmpty" },
  visParameterSetReset: { plan: "visParameterSetReset" },
  visSettingsDelete: { plan: "visSettingsDelete" },
  helperPreApply: { plan: "helperPreApply" },
  helperCleanupRealSignal: { plan: "helperCleanup" },
  helperCleanupPlainSignal: { plan: "helperCleanup", host: { signal: { aborted: false } } },
  helperPreApplyPlainSignal: { plan: "helperPreApply", host: { signal: { aborted: false } } },
  lineRenderDeferred: {
    plan: "line",
    options: (plan, ctx) => baseOptions(plan, ctx, { renderWait: { waitForStart: false, waitForComplete: false } }),
  },
  lineRenderDeferredPlainSignal: {
    plan: "line",
    host: { signal: { aborted: false } },
    options: (plan, ctx) => baseOptions(plan, ctx, { renderWait: { waitForStart: false, waitForComplete: false } }),
  },
  lineRenderNoStart: {
    plan: "line",
    options: (plan, ctx) => baseOptions(plan, ctx, { renderWait: { waitForStart: false, intervalMs: 25 } }),
  },
  lineHelperProfile: { plan: "line", options: (plan, ctx) => baseOptions(plan, ctx, { timeoutProfile: "helper" }) },
  lineNoPreviousManaged: { plan: "line", options: (plan, ctx) => baseOptions(plan, ctx, { previousManagedFilterItemIds: [] }) },
  lineThreePreviousManaged: {
    plan: "line",
    options: (plan, ctx) => baseOptions(plan, ctx, { previousManagedFilterItemIds: ["a", 2, "c"] }),
  },
  lineNoWhenRenderStart: { plan: "line", host: { omit: ["whenRenderStart"] } },
  lineMissingSetTopBottom: { plan: "line", host: { omit: ["setTopBottomOnSlot"] } },
  helperMissingSetCustomLabel: { plan: "helperPreApply", host: { omit: ["setCustomLabelInSlot"] } },
  preAborted: { plan: "line", host: { signal: { aborted: true } } },
  preAbortedRealSignal: {
    plan: "line",
    options: (plan, ctx) => {
      ctx.controller.abort();
      return baseOptions(plan, ctx);
    },
  },
  invalidPlan: { plan: "invalidPlan" },
  nullPlan: { plan: null },
  missingSignal: { plan: "line", options: (plan, ctx) => ({ ...baseOptions(plan, ctx), signal: null }) },
  missingWidgetId: {
    plan: "line",
    options: (plan, ctx) => ({ ...baseOptions(plan, ctx), target: { ...targetFor(plan), widgetId: "" } }),
  },
  noOptions: { plan: "line", options: () => undefined },
  planMissingDatasource: { plan: "line", mutate: (plan) => { plan.datasource = { id: "" }; } },
  planMissingVisualization: { plan: "line", mutate: (plan) => { plan.visualization = null; } },
  planMissingVisType: { plan: "line", mutate: (plan) => { plan.visualization = { visType: " " }; } },
  planCanonicalVisType: { plan: "line", mutate: (plan) => { plan.visualization = { visType: "x", canonicalVisType: "stackedbar" }; } },
  planSlotLimit: {
    plan: "listDimension",
    mutate: (plan) => {
      plan.slots[0].options = { limit: 1, customLabel: { label: "L", columnId: plan.slots[0].columnIds[0] } };
      plan.slots[0].sortSpecs = [{ columnId: " c1 ", order: "descending" }, { columnId: "" }, { columnId: "c2", priority: 9 }];
    },
  },
  planSlotLimitInvalid: { plan: "line", mutate: (plan) => { plan.slots[1].options = { limit: -1 }; } },
  planSlotKeepOnlyFirst: { plan: "listDimension", mutate: (plan) => { plan.slots[0].options = { keepOnlyFirst: true }; } },
  planSlotBadCustomLabel: { plan: "line", mutate: (plan) => { plan.slots[0].options = { customLabel: { label: "", columnId: "x" } }; } },
  planEmptySlot: { plan: "line", mutate: (plan) => { plan.slots[1].columnIds = []; } },
  planFilterSkipDisplayType: {
    plan: "line",
    mutate: (plan) => { plan.localFilters[0].options = { skipDisplayType: true }; },
  },
  planFilterUnknownMode: { plan: "line", mutate: (plan) => { plan.localFilters[1].mode = "bogus"; } },
  planFilterEmptyValues: { plan: "line", mutate: (plan) => { plan.localFilters[0].values = []; } },
  planEmptyDataDescriptor: {
    plan: "line",
    mutate: (plan) => {
      plan.localFilters.push({ kind: "emptyData", mode: "forceEmpty", itemId: "[E]", values: ["1"], reason: "viaFilter" });
    },
  },
  planNotSlotsChangedButSlotsToClear: {
    plan: "lineTopnReason",
    mutate: (plan) => { plan.slotsToClear = ["all"]; },
  },
  planResetIntentClearFiltersOnly: {
    plan: "lineTopnReason",
    mutate: (plan) => { plan.resetIntent = { enabled: true, clearAllSlots: false, clearAllLocalFilters: true }; },
  },
  helperTopBottomTwoSlots: {
    plan: "helperPreApply",
    mutate: (plan) => {
      plan.slots.push({ slotName: "extra", columnIds: [], options: { topBottom: { value: 3 } } });
    },
  },
};

for (const [name, spec] of Object.entries(PATH_CASES)) {
  test(`path: ${name}`, async () => {
    let plan;
    if (spec.plan !== null) {
      plan = structuredClone(plans[spec.plan]);
      if (spec.mutate) spec.mutate(plan);
    } else {
      plan = null;
    }
    const { record } = await runApply(spec.plan || "line", { host: spec.host, options: spec.options, plan });
    check("cases", name, record);
  });
}

// ---------------------------------------------------------------- render wait and timers

test("render: whenRenderComplete never resolves -> timeout", async () => {
  const { record } = await runApply("line", {
    host: { behaviour: ({ method }) => (method === "whenRenderComplete" ? new Promise(() => {}) : undefined) },
    options: (plan, ctx) => baseOptions(plan, ctx, { timeoutMs: 30 }),
  });
  check("cases", "renderCompleteTimeout", record);
});

test("render: whenRenderStart never resolves -> timeout in the start race", async () => {
  const { record } = await runApply("line", {
    host: { behaviour: ({ method }) => (method === "whenRenderStart" ? new Promise(() => {}) : undefined) },
    options: (plan, ctx) => baseOptions(plan, ctx, { timeoutMs: 30 }),
  });
  check("cases", "renderStartTimeout", record);
});

test("render: start and complete share one budget", async () => {
  const { record } = await runApply("line", {
    host: {
      behaviour: ({ method }) => {
        if (method === "whenRenderStart") return new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 40));
        if (method === "whenRenderComplete") return new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 90));
        return undefined;
      },
    },
    options: (plan, ctx) => baseOptions(plan, ctx, { timeoutMs: 70 }),
  });
  check("cases", "renderSharedBudget", record);
});

test("render: timer keys while waiting, and no race timer when timeoutMs is 0", async () => {
  const seen = {};
  function delayedComplete(label) {
    return ({ method, ctx }) => {
      if (method !== "whenRenderComplete" && method !== "whenRenderStart") return undefined;
      return new Promise((resolve) => setTimeout(() => {
        seen[label + ":" + method] = Object.keys(ctx.runtime.timers);
        resolve({ ok: true });
      }, 5));
    };
  }
  const withTimeout = await runApply("line", { host: { behaviour: delayedComplete("default") } });
  const zeroTimeout = await runApply("line", {
    host: { behaviour: delayedComplete("zero") },
    options: (plan, ctx) => baseOptions(plan, ctx, { timeoutMs: 0 }),
  });
  const helper = await runApply("helperPreApply", { host: { behaviour: delayedComplete("helper") } });
  check("cases", "renderTimerKeys", {
    seen,
    records: [withTimeout.record, zeroTimeout.record, helper.record].map(compactRecord),
  });
});

test("render: abort while waiting for render complete", async () => {
  const { record } = await runApply("line", {
    host: {
      behaviour: ({ method, ctx }) => {
        if (method !== "whenRenderComplete") return undefined;
        setTimeout(() => ctx.controller.abort(), 10);
        return new Promise(() => {});
      },
    },
  });
  check("cases", "renderAbortWhileWaiting", record);
});

test("render: complete outcome variants", async () => {
  const variants = {
    failed: () => Promise.resolve({ ok: false, errorCode: "RC_FAILED", diagnostics: [{ message: "render broke" }] }),
    failedNoCode: () => Promise.resolve({ ok: false }),
    undefinedValue: () => Promise.resolve(undefined),
    abortedOutcome: () => Promise.resolve({ ok: false, outcome: "aborted" }),
    disposedOutcome: () => Promise.resolve({ ok: false, reason: "disposed" }),
    abortedAfterEffect: () => Promise.resolve({ ok: false, reason: "aborted-after-effect" }),
    abortedFlag: () => Promise.resolve({ aborted: true }),
    rejects: () => Promise.reject(new Error("complete rejected")),
    rejectsAbortError: () => Promise.reject(new DOMException("x", "AbortError")),
  };
  const out = {};
  for (const [name, make] of Object.entries(variants)) {
    const { record } = await runApply("line", {
      host: { behaviour: ({ method }) => (method === "whenRenderComplete" ? make() : undefined) },
    });
    out[name] = compactRecord(record);
  }
  check("cases", "renderCompleteVariants", out);
});

test("render: start outcome variants", async () => {
  const variants = {
    failed: () => Promise.resolve({ ok: false, errorCode: "RS_FAILED" }),
    abortedOutcome: () => Promise.resolve({ ok: false, reason: "aborted" }),
    rejects: () => Promise.reject(new Error("start rejected")),
  };
  const out = {};
  for (const [name, make] of Object.entries(variants)) {
    const { record } = await runApply("line", {
      host: { behaviour: ({ method }) => (method === "whenRenderStart" ? make() : undefined) },
    });
    out[name] = compactRecord(record);
  }
  check("cases", "renderStartVariants", out);
});

// ---------------------------------------------------------------- matrices: one entry per facet call k

function failAtK(mode, k) {
  return ({ k: callK, ctx }) => {
    if (callK !== k) return undefined;
    switch (mode) {
      case "abortInside":
        ctx.controller.abort();
        return undefined;
      case "abortedOutcome":
        return Promise.resolve({ ok: false, reason: "aborted" });
      case "errorOutcome":
        return Promise.resolve({ ok: false, errorCode: "E" + k, diagnostics: [{ message: "m" + k }] });
      case "throw":
        throw new Error("boom" + k);
      case "reject":
        return Promise.reject(new Error("rej" + k));
      case "throwAbortError":
        throw new DOMException("x" + k, "AbortError");
      case "rejectAbortError":
        return Promise.reject(new DOMException("x" + k, "AbortError"));
      default:
        throw new Error("unknown mode " + mode);
    }
  };
}

const MATRIX_MODES = ["abortInside", "abortedOutcome", "errorOutcome", "throw", "reject", "throwAbortError", "rejectAbortError"];
const MATRIX_PLANS = ["line", "listDimension", "helperPreApply", "helperCleanup", "visParameterSetReset", "visSettingsDelete"];

for (const planName of MATRIX_PLANS) {
  test(`matrix: ${planName}`, async () => {
    const baseline = await runApply(planName);
    const callCount = baseline.ctx.callCount;
    const out = { callCount, baseline: compactRecord(baseline.record) };
    for (const mode of MATRIX_MODES) {
      out[mode] = [];
      for (let k = 1; k <= callCount; k += 1) {
        const { record } = await runApply(planName, { host: { behaviour: failAtK(mode, k) } });
        out[mode].push(compactRecord(record));
      }
    }
    check("matrices", planName, out);
  });
}

// ---------------------------------------------------------------- destroy

test("destroy: rejects afterwards, aborts runtime controllers, clears timers, keeps stamps", async () => {
  const ctx = createHost({ behaviour: ({ method }) => (method === "whenRenderComplete" ? new Promise(() => {}) : undefined) });
  const plan = structuredClone(plans.line);
  const options = baseOptions(plan, ctx);
  let settled = "pending";
  ctx.service.applyBinding(plan, options).then(
    (result) => { settled = "resolved:" + result.status; },
    (err) => { settled = "rejected:" + err.message; },
  );
  for (let attempt = 0; attempt < 200 && !Object.keys(ctx.runtime.timers).length; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  const timersBefore = Object.keys(ctx.runtime.timers);
  const external = new AbortController();
  ctx.runtime.abortControllers.external = external;
  ctx.runtime.pendingPromises.p = Promise.resolve();
  ctx.service.destroy();
  ctx.service.destroy();
  await new Promise((resolve) => setTimeout(resolve, 30));
  let rejection = null;
  try {
    await ctx.service.applyBinding(structuredClone(plans.line), baseOptions(plans.line, ctx));
  } catch (err) {
    rejection = err.message;
  }
  check("cases", "destroy", {
    timersBefore,
    timersAfter: Object.keys(ctx.runtime.timers),
    abortControllersAfter: Object.keys(ctx.runtime.abortControllers),
    pendingPromisesAfter: Object.keys(ctx.runtime.pendingPromises),
    externalAborted: external.signal.aborted,
    stamps: [
      ctx.runtime.visualizationFacet === ctx.facets.visualization,
      ctx.runtime.widgetsFacet === ctx.facets.widgets,
      ctx.runtime.canvasFacet === ctx.facets.canvas,
    ],
    inFlight: settled,
    rejection,
    calls: ctx.calls.map((call) => call[0]),
  });
});

// ---------------------------------------------------------------- pure filter bodies

const FILTER_DESCRIPTORS = {
  forceEmpty: { mode: "forceEmpty", itemId: "[E]", values: ["1"] },
  forceEmptyNoValues: { mode: "forceEmpty", itemId: "[E]", values: [] },
  forceEmptyNoItem: { mode: "forceEmpty", values: ["1"] },
  hierarchy: { mode: "hierarchyKeepexclude", itemId: "[H]", values: [{ d: "A", u: "[a]" }, "B"] },
  hierarchyOptions: {
    mode: "hierarchykeepexclude", itemId: "[H]", values: ["A"],
    options: { overrideHierarchyDefaultSelection: false, action: "keep" },
  },
  hierarchyNoValues: { mode: "hierarchyKeepexclude", itemId: "[H]", values: [] },
  include: { mode: "include", itemId: " [I] ", values: ["a", " b ", "", null, 5] },
  includeObjects: { mode: "INCLUDE", itemId: "[I]", values: [{ display: "D" }, { u: "U" }, {}, { d: "x", use: "y" }, { displayValue: "dv", useValue: "uv" }] },
  includeSingleValue: { mode: "include", itemId: "[I]", values: "solo" },
  includeEmpty: { mode: "include", itemId: "[I]", values: [] },
  includeNoItem: { mode: "include", values: ["a"] },
  reverse: { mode: "reverse", itemId: "[R]", values: ["a", "b"] },
  reverseEmpty: { mode: "reverse", itemId: "[R]" },
  exclude: { mode: "exclude", itemId: "[X]", values: ["Gesamt", "ALLE"] },
  excludeSingle: { mode: "exclude", itemId: "[X]", values: ["Gesamt"] },
  excludeOptions: {
    mode: "exclude", itemId: "[X]", values: ["a"],
    options: { operator: "contains", exclude: false, ignoreCase: false, valueType: "use" },
  },
  excludeObjects: { mode: "exclude", itemId: "[X]", values: [{ d: "A", u: "a" }] },
  excludeEmpty: { mode: "exclude", itemId: "[X]", values: [] },
  excludeNoItem: { mode: "exclude", values: ["a"] },
  contains: { mode: "contains", itemId: "[C]", values: ["a", "b"] },
  containsSingleIgnoreCase: { mode: "contains", itemId: "[C]", values: ["a"], options: { ignoreCase: true } },
  beginsWith: { mode: "beginsWith", itemId: "[B]", values: ["a"] },
  beginsWithMany: { mode: "beginswith", itemId: "[B]", values: ["a", "b", "c"] },
  containsEmpty: { mode: "contains", itemId: "[C]", values: [] },
  includeExcludeOrBoth: {
    mode: "includeExcludeOr", itemId: "[O]",
    options: { includeValues: ["i1", "i2"], excludeValues: ["e1", "e2"] },
  },
  includeExcludeOrIncludeOnly: { mode: "includeexcludeor", itemId: "[O]", options: { includeValues: ["i1"] } },
  includeExcludeOrExcludeOnly: {
    mode: "includeexcludeor", itemId: "[O]",
    options: { excludeValues: "e1", excludeOperator: "contains", excludeIgnoreCase: false },
  },
  includeExcludeOrEmpty: { mode: "includeexcludeor", itemId: "[O]", options: {} },
  unknown: { mode: "bogus", itemId: "[U]", values: ["a"] },
  emptyMode: { itemId: "[U]", values: ["a"] },
  nullDescriptor: null,
};

test("filter bodies: every mode with and without the keepexclude builder", () => {
  for (const [name, descriptor] of Object.entries(FILTER_DESCRIPTORS)) {
    check("filterBodies", name, {
      withBuilder: callFilterBody(structuredClone(descriptor), true),
      withoutBuilder: callFilterBody(structuredClone(descriptor), false),
    });
  }
});

const KEEPEXCLUDE_CASES = {
  emptyItem: ["", { values: ["a"] }],
  noOptions: ["[K]", undefined],
  includeIn: ["[K]", { mode: "include", values: ["a", null, "", "b"] }],
  includeContainsMany: ["[K]", { mode: "include", operator: "contains", values: ["a", "b"], valueType: "use" }],
  excludeDefault: ["[K]", { mode: "exclude", values: ["a"] }],
  excludeEndsWithMany: ["[K]", { mode: "EXCLUDE", values: ["a", "b"], ignoreCase: false }],
  excludeIn: ["[K]", { mode: "exclude", operator: "in", values: ["a", "b"] }],
  objectValues: ["[K]", { mode: "include", values: [{ d: "A" }] }],
};

test("keepexclude conditions builder", () => {
  for (const [name, args] of Object.entries(KEEPEXCLUDE_CASES)) {
    check("keepexclude", name, buildKeepexclude(...structuredClone(args)));
  }
});
