// services.widgetBinding.run / checkAvailable: plan then apply behind one entry, envelopes unchanged (W3, additive).
// Run: node --test tools/tests/w3-widgetBinding.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const quiet = { log() {}, info() {}, warn() {}, error() {}, debug() {} };
const load = (rel) => loadAmd(path.join(JS_ROOT, rel), { stubs: { console: quiet } });
const registerWidgetBinding = load("core/services/widgetBinding/index.js");

const SUCCESS_PLAN = { ok: true, status: "success", reason: "contentCreate", widgetId: "w1" };

function fakeKdb(overrides = {}, log = []) {
  const plan = "plan" in overrides ? overrides.plan : SUCCESS_PLAN;
  const apply = "apply" in overrides ? overrides.apply : { status: "success" };
  const _KDB = {
    services: {
      widgetBindingPlan: { buildPlan: (spec) => { log.push(["buildPlan", spec]); return typeof plan === "function" ? plan(spec) : plan; } },
      widgetBindingApply: {
        applyBinding: (...args) => {
          log.push(["applyBinding", ...args]);
          return typeof apply === "function" ? apply(...args) : Promise.resolve(apply);
        }
      }
    }
  };
  return { _KDB, log, service: registerWidgetBinding(_KDB) };
}

test("registration is idempotent and publishes run and checkAvailable only", () => {
  const _KDB = {};
  const service = registerWidgetBinding(_KDB);
  assert.equal(_KDB.services.widgetBinding, service);
  assert.equal(registerWidgetBinding(_KDB), service);
  assert.deepEqual(Object.keys(service).sort(), ["checkAvailable", "run"]);
});

test("applied: spec, plan, options and the apply result pass through by reference", async () => {
  const applyResult = { status: "success", diagnostics: { x: 1 } };
  const { service, log } = fakeKdb({ apply: applyResult });
  const spec = { reason: "contentCreate" };
  const options = { target: { widgetId: "w1" }, signal: {}, timeoutProfile: "default" };
  const result = await service.run(spec, { applyOptions: options });
  assert.equal(result.stage, "applied");
  assert.equal(result.plan, SUCCESS_PLAN);
  assert.equal(result.applyResult, applyResult);
  assert.equal(log[0][1], spec);
  assert.equal(log[1][1], SUCCESS_PLAN);
  assert.equal(log[1][2], options);
});

test("applyOptions as a function receives the plan; missing applyOptions passes undefined", async () => {
  const { service, log } = fakeKdb();
  await service.run({}, { applyOptions: (plan) => ({ reason: plan.reason }) });
  assert.deepEqual(log[1][2], { reason: "contentCreate" });
  await service.run({});
  assert.equal(log[3][2], undefined);
});

test("an apply result with a failing status is still stage applied (not interpreted)", async () => {
  for (const status of ["error", "timeout", "aborted"]) {
    const { service } = fakeKdb({ apply: { status } });
    const result = await service.run({}, {});
    assert.equal(result.stage, "applied");
    assert.equal(result.applyResult.status, status);
  }
  const { service } = fakeKdb({ apply: undefined });
  assert.equal((await service.run({}, {})).applyResult, undefined);
});

test("plan failure: raw plan returned, apply and hook not called", async () => {
  for (const plan of [{ ok: false, status: "error", errorCode: "X" }, { ok: true, status: "error" }, { ok: false, status: "success" }, undefined, null]) {
    let hooked = false;
    const { service, log } = fakeKdb({ plan });
    const result = await service.run({ a: 1 }, { beforeApply: () => { hooked = true; } });
    assert.deepEqual(result, { stage: "plan", plan, applyResult: null });
    assert.equal(result.plan, plan);
    assert.deepEqual(log.map((entry) => entry[0]), ["buildPlan"]);
    assert.equal(hooked, false);
  }
});

test("beforeApply runs after the plan with the plan; false cancels, anything else continues", async () => {
  const seen = [];
  const cancelled = fakeKdb();
  const cancelResult = await cancelled.service.run({}, { beforeApply: (plan) => { seen.push(plan); return false; } });
  assert.deepEqual(cancelResult, { stage: "cancelled", plan: SUCCESS_PLAN, applyResult: null });
  assert.deepEqual(seen, [SUCCESS_PLAN]);
  assert.deepEqual(cancelled.log.map((entry) => entry[0]), ["buildPlan"]);
  for (const ret of [undefined, true, 0, null, "no"]) {
    const kept = fakeKdb();
    assert.equal((await kept.service.run({}, { beforeApply: () => ret })).stage, "applied");
  }
});

test("unavailable: each missing service is named and nothing is called", async () => {
  const noPlan = fakeKdb();
  delete noPlan._KDB.services.widgetBindingPlan;
  assert.deepEqual(await noPlan.service.run({}), { stage: "unavailable", plan: null, applyResult: null, missing: "widgetBindingPlan" });
  assert.deepEqual(noPlan.service.checkAvailable(), { ok: false, missing: "widgetBindingPlan" });
  const noApply = fakeKdb();
  noApply._KDB.services.widgetBindingApply = {};
  assert.deepEqual(await noApply.service.run({}), { stage: "unavailable", plan: null, applyResult: null, missing: "widgetBindingApply" });
  assert.deepEqual(noApply.service.checkAvailable(), { ok: false, missing: "widgetBindingApply" });
  assert.deepEqual(noApply.log, []);
  const bareKdb = registerWidgetBinding({});
  assert.deepEqual(bareKdb.checkAvailable(), { ok: false, missing: "widgetBindingPlan" });
  assert.deepEqual(fakeKdb().service.checkAvailable(), { ok: true, missing: null });
});

test("services are looked up per call (a replaced service is used)", async () => {
  const { service, _KDB } = fakeKdb();
  const calls = [];
  _KDB.services.widgetBindingApply = { applyBinding: (plan) => { calls.push(plan); return { status: "success" }; } };
  assert.equal((await service.run({}, {})).stage, "applied");
  assert.deepEqual(calls, [SUCCESS_PLAN]);
});

test("throws propagate: buildPlan, hook, options function and a rejected or throwing apply", async () => {
  await assert.rejects(fakeKdb({ plan: () => { throw new Error("plan boom"); } }).service.run({}), /plan boom/);
  await assert.rejects(fakeKdb().service.run({}, { beforeApply: () => { throw new Error("hook boom"); } }), /hook boom/);
  await assert.rejects(fakeKdb().service.run({}, { applyOptions: () => { throw new Error("opts boom"); } }), /opts boom/);
  await assert.rejects(fakeKdb({ apply: () => Promise.reject(new Error("apply rejected")) }).service.run({}), /apply rejected/);
  await assert.rejects(fakeKdb({ apply: () => { throw new Error("apply threw"); } }).service.run({}), /apply threw/);
});

test("plan, hook and options run synchronously before the first await (call-site ordering)", () => {
  const order = [];
  const { service } = fakeKdb({ plan: () => { order.push("plan"); return SUCCESS_PLAN; }, apply: () => { order.push("apply"); return Promise.resolve({ status: "success" }); } });
  const pending = service.run({}, { beforeApply: () => order.push("hook"), applyOptions: () => { order.push("options"); return {}; } });
  order.push("after run() returned");
  assert.deepEqual(order, ["plan", "hook", "options", "apply", "after run() returned"]);
  return pending;
});

test("the services orchestrator registers widgetBinding right after widgetBindingApply", () => {
  const orchestrator = load("bootstrap/registerServices.js");
  const _KDB = { elements: { selectors: {} }, runtime: {}, state: {}, events: { emit() {}, subscribe() {} }, config: {} };
  load("core/cognosHost/registerCognosHostSelectors.js")(_KDB);
  orchestrator(_KDB);
  const keys = Object.keys(_KDB.services);
  assert.equal(keys.indexOf("widgetBinding"), keys.indexOf("widgetBindingApply") + 1);
  assert.equal(typeof _KDB.services.widgetBinding.run, "function");
});

// ---- against the real plan and apply services ----

const registerPlan = load("core/services/widgetBindingPlan/index.js");
const registerApply = load("core/services/widgetBindingApply/index.js");
const visTypes = load("core/config/visualizations/bindingSpecsVisTypes.js");

const GESCHLECHT = "[Personal_KDB_TM1].[Geschlecht].[Geschlecht].[Geschlecht]";
const EMPTY_ITEM = "[Personal_KDB_TM1].[KDB Kennzahlen].[KDB Kennzahlen].[KDB Kennzahlen]";

function realSpec(overrides = {}) {
  const bucketConfig = visTypes.visTypeByBucket.Line;
  return {
    reason: "contentCreate", targetKind: "vis", widgetId: "w1", ownerWidgetId: null, opSeq: 7,
    dataConfig: {
      kennzahlCode: "K1", kennzahlenTable: "Personal_KDB", datasourceName: "Personal_KDB", datasourceId: "ds1",
      visualizationType: "Line", cognosVisualizationTypeId: bucketConfig.cognosVisualizationTypeId || "Line", visPropBucketKey: "Line",
      visTypeConfig: structuredClone(bucketConfig.byKennzahlenTable.Personal_KDB),
      dataTableConfig: { dimensions: { Geschlecht: { itemId: GESCHLECHT, exclude: ["Gesamt"] } }, sorting: {} },
      kennzahlDefaults: {}, dimension: null, topN: null
    },
    hierarchySnapshot: null, helperTableResult: null,
    emptyIntent: { enabled: false, reason: null, itemId: null, value: null }, resetIntent: { enabled: false },
    config: {
      filterPropObj: {},
      parameterMappingObj: {
        AggregationstypId_widget_localfilter_KID: "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]",
        Geschlecht_widget_localfilter_KID: GESCHLECHT
      },
      topNOptions: { "top-5": 5 }, emptyDataFilter: { itemId: EMPTY_ITEM }
    },
    ...overrides
  };
}

// Only measured wall-clock readings vary between runs (renderWaitMs is the measured wait); configured timeouts (timeoutMs, ...) stay compared.
const WALL_CLOCK_KEYS = new Set(["elapsedMs", "remainingBudgetMs", "renderWaitMs"]);
const withoutTiming = (value) => JSON.parse(JSON.stringify(value, (key, item) => (WALL_CLOCK_KEYS.has(key) ? undefined : item)));

function realKdb() {
  const calls = [];
  const facet = (names) => Object.fromEntries(names.map((name) => [name, (...args) => {
    calls.push([name, ...args.map((arg) => (arg && typeof arg === "object" && "signal" in arg ? { ...arg, signal: "[signal]" } : arg))]);
    return Promise.resolve(name === "getVisType" ? { ok: true, data: "Bar" } : { ok: true });
  }]));
  const _KDB = {
    runtime: {}, state: {},
    services: {
      loading: { finishLoading() {} },
      cognosHost: {
        visualization: facet(["getVisType", "setDataSource", "setVisType", "clearAllLocalFilters", "removeLocalFilter", "clearAllSlots",
          "addDataItemsToSlot", "setTopBottomOnSlot", "setCustomLabelInSlot", "sortDataItemInSlot", "addOrReplaceLocalFilter"]),
        widgets: facet(["renderWidget"]),
        canvas: facet(["whenRenderStart", "whenRenderComplete"])
      }
    }
  };
  registerPlan(_KDB);
  registerApply(_KDB);
  registerWidgetBinding(_KDB);
  return { _KDB, calls };
}

test("real services: run returns the same plan and apply envelopes as the direct calls", async () => {
  const direct = realKdb();
  const spec = realSpec();
  const plan = direct._KDB.services.widgetBindingPlan.buildPlan(structuredClone(spec));
  const options = (p) => ({
    target: { widgetId: p.widgetId, targetKind: p.targetKind, ownerWidgetId: p.ownerWidgetId, opSeq: p.opSeq, reason: p.reason },
    signal: new AbortController().signal, previousManagedFilterItemIds: [], timeoutProfile: "default"
  });
  const applied = await direct._KDB.services.widgetBindingApply.applyBinding(plan, options(plan));

  const viaRun = realKdb();
  const result = await viaRun._KDB.services.widgetBinding.run(structuredClone(spec), { applyOptions: options });
  assert.equal(plan.status, "success", JSON.stringify(plan));
  assert.equal(result.stage, "applied");
  assert.deepEqual(result.plan, plan);
  assert.equal(JSON.stringify(result.plan), JSON.stringify(plan));
  assert.equal(result.applyResult.status, applied.status);
  assert.deepEqual(withoutTiming(result.applyResult), withoutTiming(applied));
  assert.deepEqual(viaRun.calls, direct.calls);
  assert.ok(direct.calls.length > 0);
});

test("real services: an invalid spec stops at the plan stage with the raw plan envelope", async () => {
  const { _KDB, calls } = realKdb();
  const spec = realSpec();
  spec.dataConfig.datasourceId = null;
  const expected = _KDB.services.widgetBindingPlan.buildPlan(structuredClone(spec));
  const result = await _KDB.services.widgetBinding.run(spec, { applyOptions: {} });
  assert.equal(result.stage, "plan");
  assert.equal(expected.status, "error");
  assert.deepEqual(result.plan, expected);
  assert.deepEqual(calls, []);
});
