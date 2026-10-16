// W9b: widgetVis side of the `filters:confirmed` event: payload mapping, subscription lifetime, fire-and-forget wave.
// Run: node --test tools/tests/w9b-filters-confirmed.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const W = "dashboard/widgets/widgetVis/";
const load = (rel, options) => loadAmd(path.join(JS_ROOT, rel), options);
const createBus = () => load("core/events/createEventBus.js")();
const JAHR = "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]";
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test("filters events file: name and emit guard", () => {
  const events = load("dashboard/filters/_core/events.js");
  assert.equal(events.CONFIRMED, "filters:confirmed");
  assert.doesNotThrow(() => events.emitConfirmed({}, { a: 1 }));
  assert.doesNotThrow(() => events.emitConfirmed(null, { a: 1 }));
  const seen = [];
  events.emitConfirmed({ events: { emit: (name, payload) => seen.push([name, payload]) } }, { a: 1 });
  assert.deepEqual(seen, [["filters:confirmed", { a: 1 }]]);
});

test("waveRequest: Jahr decision, year parsing and key presence follow the event", () => {
  const { buildWavePayload } = load(W + "topN/waveRequest.js");
  const values = [{ d: "2021", u: "[J].[2021]" }, { d: "Jahr 2024", u: "x" }, "2019"];
  assert.deepEqual(buildWavePayload({ filterType: "singleSelect", scopeType: "global", tabId: "t1" }),
    { scopeType: "global", tabId: "t1", isJahr: false, filterType: "singleSelect" });
  assert.deepEqual(buildWavePayload({ filterType: "singleSelect", scopeType: "pageContext", scopeId: "p1", columnId: JAHR }),
    { scopeType: "pageContext", scopeId: "p1", isJahr: true, filterType: "singleSelect" });
  assert.deepEqual(buildWavePayload({ filterType: "nativeMultiSelect", scopeType: "global", tabId: null, scopeId: null, columnId: JAHR, confirmedValues: values }),
    { scopeType: "global", tabId: null, scopeId: null, isJahr: true, selectedYearKnown: true, selectedYear: 2024, filterType: "nativeMultiSelect" });
  assert.deepEqual(buildWavePayload({ filterType: "nativeMultiSelect", scopeType: "global", columnId: "[X]", confirmedValues: values }),
    { scopeType: "global", isJahr: false, selectedYearKnown: false, selectedYear: null, filterType: "nativeMultiSelect" });
  assert.equal(buildWavePayload({ filterType: "nativeMultiSelect", scopeType: "global", columnId: "", confirmedValues: [] }).isJahr, false);
  assert.equal(buildWavePayload({ filterType: "singleSelect", scopeType: "global", columnId: undefined }).isJahr, false);
  assert.equal("tabId" in buildWavePayload({ scopeType: "global", tabId: undefined }), true);
  assert.equal("scopeId" in buildWavePayload({ scopeType: "global" }), false);
});

function loadSubscriber(runWave, errors) {
  return load(W + "topN/filtersConfirmed.js", {
    stubs: { console: { log() {}, warn() {}, error: (...a) => errors.push(a) } },
    overrides: { [W + "topN/wave.js"]: { runTopNFilterConfirmWave: runWave } }
  });
}

test("subscribe: one subscription per runtime, events start the wave with the mapped payload, unsubscribe stops it", async () => {
  const calls = [];
  const errors = [];
  const subscriber = loadSubscriber((_KDB, payload) => { calls.push(payload); return Promise.resolve({ ok: true }); }, errors);
  const _KDB = { events: createBus(), runtime: {} };
  const unsubscribe = subscriber.subscribe(_KDB);
  assert.equal(typeof unsubscribe, "function");
  assert.equal(subscriber.subscribe(_KDB), unsubscribe);
  _KDB.events.emit("filters:confirmed", { filterType: "singleSelect", scopeType: "global", tabId: "t1" });
  assert.deepEqual(calls, [{ scopeType: "global", tabId: "t1", isJahr: false, filterType: "singleSelect" }]);
  unsubscribe();
  _KDB.events.emit("filters:confirmed", { filterType: "singleSelect", scopeType: "global", tabId: "t1" });
  assert.equal(calls.length, 1);
  assert.deepEqual(errors, []);
});

test("subscribe: without an event bus nothing is subscribed", () => {
  const subscriber = loadSubscriber(() => Promise.resolve(), []);
  assert.equal(subscriber.subscribe({ runtime: {} }), null);
  assert.equal(subscriber.subscribe({ events: {}, runtime: {} }), null);
});

test("handler: wave failures are logged, never thrown into the emitter; the wave result is not awaited", async () => {
  const errors = [];
  let mode = "reject";
  const subscriber = loadSubscriber(() => {
    if (mode === "throw") { throw new Error("sync"); }
    return mode === "reject" ? Promise.reject(new Error("async")) : new Promise(() => {});
  }, errors);
  const _KDB = { events: createBus(), runtime: {} };
  subscriber.subscribe(_KDB);
  for (mode of ["reject", "throw", "hang"]) {
    assert.doesNotThrow(() => _KDB.events.emit("filters:confirmed", { filterType: "singleSelect", scopeType: "global", tabId: "t1" }));
    await tick();
  }
  assert.deepEqual(errors.map((args) => args[0]), ["[widgetVis.filtersConfirmed] topN wave failed", "[widgetVis.filtersConfirmed] topN wave failed"]);
});

test("controller: mount subscribes, destroy releases the subscription", () => {
  const calls = [];
  const register = load(W + "index.js", {
    stubs: { document: {}, window: {}, console: { log() {}, warn() {}, error() {} } },
    overrides: { [W + "topN/wave.js"]: { runTopNFilterConfirmWave: (_KDB, payload) => { calls.push(payload); return Promise.resolve({ ok: true }); } } }
  });
  const _KDB = { events: createBus(), services: {} };
  const api = register(_KDB, {});
  _KDB.events.emit("filters:confirmed", { filterType: "singleSelect", scopeType: "global", tabId: "t1" });
  assert.equal(calls.length, 0, "no wave before mount");
  assert.equal(api.mount({}), true);
  assert.equal(api.mount({}), true);
  _KDB.events.emit("filters:confirmed", { filterType: "singleSelect", scopeType: "global", tabId: "t1" });
  assert.equal(calls.length, 1, "one wave per event after repeated mounts");
  api.destroy();
  _KDB.events.emit("filters:confirmed", { filterType: "singleSelect", scopeType: "global", tabId: "t1" });
  assert.equal(calls.length, 1, "no wave after destroy");
});
