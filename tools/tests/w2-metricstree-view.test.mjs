// W2 metricsTree view: render wait ends when the tree is destroyed before jstree reports ready; search handlers have a boundary catch.
// Run: node --test tools/tests/w2-metricstree-view.test.mjs
// have a boundary catch. Run: node --test tools/tests/w2-metricstree-view.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const MT = path.join(JS_ROOT, "dashboard/metricsTree");
const config = loadAmd(path.join(MT, "config.js"));

function makeFakeJquery(options = {}) {
  const record = { oneHandlers: [], handlers: {}, searches: [] };
  function wrapper(target) {
    const api = {
      length: 1,
      find: () => api,
      off: () => api,
      one(eventName, handler) { record.oneHandlers.push({ eventName, handler }); return api; },
      data: () => undefined,
      val: () => "foo",
      on(eventName, handler) { record.handlers[eventName] = handler; return api; },
      jstree(arg) {
        if (arg === true) {
          return options.instance === undefined ? { search: (value) => record.searches.push(value), clear_search() {} } : options.instance;
        }
        return api;
      }
    };
    return api;
  }
  const $ = Object.assign(wrapper, { fn: { jstree() {} } });
  return { $, record };
}

function makeDomStub() {
  const root = { appendChild() {}, innerHTML: "" };
  const element = () => ({ setAttribute() {}, appendChild() {} });
  return { querySelector: () => root, createElement: element };
}

function loadView(fake, stubs) {
  return loadAmd(path.join(MT, "view.js"), {
    modules: { jquery: fake.$, "../../core/libraries/jstree.min.js": {} },
    stubs: { document: makeDomStub(), ...stubs }
  });
}

function makeKdb(sourceKeys) {
  const bySource = {};
  sourceKeys.forEach((key) => { bySource[key] = { sourceKey: key, nodes: [{ id: "n" }] }; });
  return {
    elements: { selectors: { metricsTree: config.DOM_SELECTORS } },
    runtime: { metricsTree: { domRefs: {} } },
    state: { metricsTree: { hasRenderableData: true, sourceOrder: sourceKeys, bySource } }
  };
}

const settled = (promise) => Promise.race([
  promise.then(() => "settled"),
  new Promise((resolve) => setImmediate(() => resolve("pending")))
]);

test("render wait: a tree that never reports ready ends the wait when the view is cleaned up", async () => {
  const fake = makeFakeJquery();
  const view = loadView(fake);
  const kdb = makeKdb(["s1", "s2"]);
  const rendered = view.renderMetricsTrees(kdb);
  assert.equal(await settled(rendered), "pending");
  view.cleanupMetricsTrees(kdb);
  assert.equal(await settled(rendered), "settled");
});

test("render wait: jstree ready still resolves the wait and drops the waiter", async () => {
  const fake = makeFakeJquery();
  const view = loadView(fake);
  const kdb = makeKdb(["s1"]);
  const rendered = view.renderMetricsTrees(kdb);
  fake.record.oneHandlers.forEach((entry) => entry.handler());
  assert.equal(await settled(rendered), "settled");
  assert.deepStrictEqual(Object.keys(kdb.runtime.metricsTree.subscriptions || {}), []);
});

test("search handlers: a failing search is logged at the boundary and does not throw into the event", () => {
  const fake = makeFakeJquery({ instance: { search() { throw new Error("jstree boom"); }, clear_search() {} } });
  const errors = [];
  const view = loadView(fake, { console: { error: (...args) => errors.push(String(args[0])), log() {}, warn() {}, debug() {} } });
  const kdb = makeKdb(["s"]);
  view.renderMetricsTrees(kdb);
  view.bindMetricsTreeSearch(kdb);
  assert.doesNotThrow(() => fake.record.handlers["click.kdbMetricsTreeSearch"]());
  assert.deepStrictEqual(errors, ["[metricsTree.search] failed"]);
});
