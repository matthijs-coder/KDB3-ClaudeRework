// Unit tests for the cognosHost service foundation: outcome.js, errorCodes.js, hostAccess.js, runtime.js.
// Run: node --test tools/tests/ws-a-foundation.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const at = (file) => path.join(JS_ROOT, "core/services/cognosHost", file);
const outcome = loadAmd(at("outcome.js"));
const errorCodes = loadAmd(at("errorCodes.js"));
const hostAccess = loadAmd(at("hostAccess.js"));
const runtime = loadAmd(at("runtime.js"));

test("outcome builders keep the frozen shapes", () => {
  assert.deepEqual(outcome.buildOk(1), { ok: true, outcome: "ok", data: 1 });
  assert.deepEqual(outcome.buildDegraded(1, [{ code: "X", message: "m" }]), {
    ok: true, outcome: "degraded", data: 1, diagnostics: [{ code: "X", message: "m" }]
  });
  assert.deepEqual(outcome.buildDegraded(1, "nope").diagnostics, []);
  assert.deepEqual(outcome.buildAborted(), { ok: false, outcome: "aborted", reason: "aborted" });
  assert.deepEqual(outcome.buildAborted("aborted-after-effect"), { ok: false, outcome: "aborted", reason: "aborted-after-effect" });
  assert.deepEqual(outcome.buildDisposed(), { ok: false, outcome: "aborted", reason: "disposed" });
  assert.deepEqual(outcome.buildFailed("A_B"), { ok: false, outcome: "failed", errorCode: "A_B", diagnostics: [] });
  assert.deepEqual(outcome.buildDiagnostic("C", null), { code: "C", message: "" });
  assert.deepEqual(outcome.buildDiagnostic("C", 5), { code: "C", message: "5" });
  assert.deepEqual(Object.keys(outcome).sort(), ["buildAborted", "buildDegraded", "buildDiagnostic", "buildDisposed", "buildFailed", "buildOk"]);
});

test("errorCodes: nine frozen tables, values are <PREFIX>_<KEY>", () => {
  const prefixes = {
    canvas: "CANVAS", dashboard: "DASHBOARD", dataQuery: "DATAQUERY", dataSources: "DATASOURCES", filters: "FILTERS",
    messages: "MESSAGES", tabs: "TABS", visualization: "VISUALIZATION", widgets: "WIDGETS"
  };
  assert.deepEqual(Object.keys(errorCodes), Object.keys(prefixes));
  assert.ok(Object.isFrozen(errorCodes));
  for (const [facet, prefix] of Object.entries(prefixes)) {
    assert.ok(Object.isFrozen(errorCodes[facet]), facet);
    assert.ok(errorCodes[facet].HOST_UNAVAILABLE && errorCodes[facet].HOST_CAPABILITY_MISSING, facet);
    for (const [key, value] of Object.entries(errorCodes[facet])) {
      assert.equal(value, `${prefix}_${key}`, `${facet}.${key}`);
    }
  }
  assert.equal(Object.keys(errorCodes.canvas).length, 8);
  assert.equal(Object.keys(errorCodes.filters).length, 8);
  assert.equal(Object.keys(errorCodes.widgets).length, 6);
  assert.equal(Object.keys(errorCodes.visualization).length, 6);
  assert.equal(Object.keys(errorCodes.tabs).length, 6);
  assert.equal(Object.keys(errorCodes.dataQuery).length, 6);
  assert.equal(Object.keys(errorCodes.dashboard).length, 5);
  assert.equal(Object.keys(errorCodes.dataSources).length, 3);
  assert.equal(Object.keys(errorCodes.messages).length, 3);
});

test("hostAccess.resolveHostApi / resolveHostMethod", () => {
  const widgets = { getContent() {} };
  assert.equal(hostAccess.resolveHostApi({ cognosAPI: { widgets } }, "widgets"), widgets);
  assert.equal(hostAccess.resolveHostApi({ cognosAPI: {} }, "widgets"), null);
  assert.equal(hostAccess.resolveHostApi({}, "widgets"), null);
  assert.equal(hostAccess.resolveHostApi(null, "widgets"), null);
  const codes = errorCodes.widgets;
  assert.deepEqual(hostAccess.resolveHostMethod({ cognosAPI: { widgets } }, "widgets", "getContent", codes), { api: widgets });
  assert.deepEqual(hostAccess.resolveHostMethod({ cognosAPI: { widgets } }, "widgets", "nope", codes), {
    failure: { ok: false, outcome: "failed", errorCode: "WIDGETS_HOST_CAPABILITY_MISSING", diagnostics: [] }
  });
  assert.deepEqual(hostAccess.resolveHostMethod({}, "widgets", "getContent", codes), {
    failure: { ok: false, outcome: "failed", errorCode: "WIDGETS_HOST_UNAVAILABLE", diagnostics: [] }
  });
});

test("hostAccess predicates", () => {
  const controller = new AbortController();
  assert.equal(hostAccess.isAborted(undefined), false);
  assert.equal(hostAccess.isAborted({}), false);
  assert.equal(hostAccess.isAborted({ signal: controller.signal }), false);
  controller.abort();
  assert.equal(hostAccess.isAborted({ signal: controller.signal }), true);
  assert.equal(hostAccess.isValidWidgetId("w"), true);
  assert.equal(hostAccess.isValidWidgetId(""), false);
  assert.equal(hostAccess.isValidWidgetId(5), false);
  assert.equal(hostAccess.isThenable(Promise.resolve()), true);
  assert.equal(hostAccess.isThenable({ then() {} }), true);
  assert.equal(hostAccess.isThenable(() => {}), false);
  assert.equal(hostAccess.isThenable(null), false);
  assert.equal(hostAccess.isThenable("then"), false);
});

test("hostAccess.isFacetStale", () => {
  const _KDB = {};
  runtime.ensureRuntime(_KDB);
  runtime.nextGeneration(_KDB);
  let disposed = false;
  const ctx = { _KDB, generation: 1, isDisposed: () => disposed };
  assert.equal(hostAccess.isFacetStale(ctx), false);
  assert.equal(hostAccess.isFacetStale({ ...ctx, generation: 0 }), true);
  assert.equal(hostAccess.isFacetStale({ _KDB: {}, generation: 1, isDisposed: () => false }), true);
  assert.equal(hostAccess.isFacetStale(null), true);
  disposed = true;
  assert.equal(hostAccess.isFacetStale(ctx), true);
});

test("hostAccess.detachHostSubscription handles every handle shape", () => {
  const calls = [];
  const detach = hostAccess.detachHostSubscription;
  detach(null);
  detach(() => calls.push("fn"));
  detach({ remove: () => calls.push("remove") });
  detach({ off: (...a) => calls.push(["off", ...a]) }, "evt", detach);
  detach({ off: (...a) => calls.push(["off", a.length]) });
  detach({ unsubscribe: () => calls.push("unsubscribe") });
  detach({ dispose: () => calls.push("dispose") });
  detach({ unsubscribe: () => calls.push("targeted-unsubscribe") }, "evt", () => {});
  assert.deepEqual(calls, ["fn", "remove", ["off", "evt", detach], ["off", 0], "unsubscribe", "dispose", "targeted-unsubscribe"]);
});

test("hostAccess.detachHostSubscription follows a promised handle", async () => {
  const calls = [];
  hostAccess.detachHostSubscription(Promise.resolve({ remove: () => calls.push("remove") }));
  hostAccess.detachHostSubscription(Promise.reject(new Error("x")));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(calls, ["remove"]);
});

test("runtime.ensureRuntime shape and idempotence", () => {
  const _KDB = {};
  const rt = runtime.ensureRuntime(_KDB);
  assert.deepEqual(rt, {
    generation: 0, subscriptions: [], abortControllers: {}, waitSequence: 0,
    adapters: { filterItemsByKey: {}, selectionUnsubscribeByWidgetId: {}, lastSelectionDtoByWidgetId: {} },
    pendingPromises: { filterWritesByKey: {} }
  });
  rt.adapters.filterItemsByKey.k = 1;
  assert.equal(runtime.ensureRuntime(_KDB), rt);
  assert.equal(rt.adapters.filterItemsByKey.k, 1);
});

test("runtime.nextGeneration / clearRuntime keep counters, reset buckets, release everything", () => {
  const _KDB = {};
  assert.equal(runtime.nextGeneration(_KDB), 1);
  assert.equal(runtime.nextGeneration(_KDB), 2);
  let released = 0;
  runtime.addSubscription(_KDB, () => { released += 1; });
  runtime.addSubscription(_KDB, () => { throw new Error("boom"); });
  const registration = runtime.registerWait(_KDB, "queryResultWait");
  const saved = console.error;
  console.error = () => {};
  try {
    runtime.clearRuntime(_KDB);
  } finally {
    console.error = saved;
  }
  assert.equal(released, 1);
  assert.equal(registration.controller.signal.aborted, true);
  assert.deepEqual(_KDB.runtime.cognosHostService, {
    generation: 2, waitSequence: 1, subscriptions: [], abortControllers: {},
    adapters: { filterItemsByKey: {}, selectionUnsubscribeByWidgetId: {}, lastSelectionDtoByWidgetId: {} },
    pendingPromises: { filterWritesByKey: {} }
  });
  assert.equal(runtime.nextGeneration(_KDB), 3);
});

test("runtime.registerWait / releaseWait: unique keys, labelled, idempotent release", () => {
  const _KDB = {};
  const first = runtime.registerWait(_KDB, "pageContextWait");
  const second = runtime.registerWait(_KDB, "pageContextWait");
  assert.equal(first.key, "pageContextWait:1");
  assert.equal(second.key, "pageContextWait:2");
  assert.ok(first.controller instanceof AbortController);
  assert.deepEqual(Object.keys(_KDB.runtime.cognosHostService.abortControllers), ["pageContextWait:1", "pageContextWait:2"]);
  runtime.releaseWait(_KDB, first);
  runtime.releaseWait(_KDB, first);
  runtime.releaseWait(_KDB, null);
  assert.deepEqual(Object.keys(_KDB.runtime.cognosHostService.abortControllers), ["pageContextWait:2"]);
  _KDB.runtime.cognosHostService.abortControllers["pageContextWait:2"] = new AbortController();
  runtime.releaseWait(_KDB, second);
  assert.deepEqual(Object.keys(_KDB.runtime.cognosHostService.abortControllers), ["pageContextWait:2"], "foreign controller stays");
});

test("runtime.pruneSubscription removes one entry by identity", () => {
  const _KDB = {};
  const a = () => {};
  const b = () => {};
  runtime.addSubscription(_KDB, a);
  runtime.addSubscription(_KDB, b);
  assert.equal(runtime.pruneSubscription(_KDB, a), true);
  assert.equal(runtime.pruneSubscription(_KDB, a), false);
  assert.deepEqual(_KDB.runtime.cognosHostService.subscriptions, [b]);
});

test("runtime/ensureCognosHostRuntime.js shim re-exports the foundation function", () => {
  assert.equal(loadAmd(at("runtime/ensureCognosHostRuntime.js"), {}).name, "ensureRuntime");
});
