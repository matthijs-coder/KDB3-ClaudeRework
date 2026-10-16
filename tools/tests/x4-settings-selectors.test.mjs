// P2-X4: widgetSettings/selectors.readWidgetSettings equals getState().byWidget[id] and never clones other widgets.
// Run: node --test tools/tests/x4-settings-selectors.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";
import { createCounter } from "./lib/x4-clone-bench.mjs";

const QUIET = { error() {}, warn() {}, log() {} };

function setup(counter) {
  const stubs = { console: QUIET, JSON: (counter || createCounter()).JSON };
  const load = (rel) => loadAmd(path.join(JS_ROOT, rel), { stubs });
  const _KDB = { config: { options: {} }, api: {}, properties: {}, state: {}, runtime: {} };
  load("core/config/__orchestratorConfig.js")(_KDB);
  load("dashboard/widgets/widgetSettings/index.js")(_KDB);
  _KDB.api.widgetSettings.mount();
  _KDB.state.widgets.settings.byWidget.a = { pending: { kind: null }, deferred: { grouping: { kind: "grouping" } }, dimension: "D", dimensionMeta: { optionKey: "k", displayValue: "v" }, gone: undefined };
  _KDB.state.widgets.settings.byWidget.b = { pending: { kind: null }, deferred: {}, visType: "Line" };
  return { _KDB, selectors: load("dashboard/widgets/widgetSettings/selectors.js") };
}

test("readWidgetSettings equals the record of getState()", () => {
  const { _KDB, selectors } = setup();
  const state = _KDB.api.widgetSettings.getState();
  ["a", "b"].forEach((id) => assert.deepStrictEqual(selectors.readWidgetSettings(_KDB, id), state.byWidget[id]));
  assert.equal("gone" in selectors.readWidgetSettings(_KDB, "a"), false);
});

test("missing id, empty id, missing subtree and bare _KDB read undefined", () => {
  const { _KDB, selectors } = setup();
  [undefined, null, "", "zz", "constructor"].forEach((id) => assert.equal(selectors.readWidgetSettings(_KDB, id), undefined));
  assert.equal(selectors.readWidgetSettings({ state: {} }, "a"), undefined);
  assert.equal(selectors.readWidgetSettings({ state: { widgets: {} } }, "a"), undefined);
  assert.equal(selectors.readWidgetSettings(undefined, "a"), undefined);
});

test("the result is a copy: mutations never reach the live record", () => {
  const { _KDB, selectors } = setup();
  const copy = selectors.readWidgetSettings(_KDB, "a");
  copy.dimension = "changed";
  copy.pending.kind = "x";
  copy.deferred.grouping.kind = "y";
  copy.dimensionMeta.optionKey = "z";
  const live = _KDB.state.widgets.settings.byWidget.a;
  assert.deepStrictEqual([live.dimension, live.pending.kind, live.deferred.grouping.kind, live.dimensionMeta.optionKey], ["D", null, "grouping", "k"]);
  assert.notStrictEqual(selectors.readWidgetSettings(_KDB, "a"), selectors.readWidgetSettings(_KDB, "a"));
});

test("destroyed module reads undefined like getState(); remount reads again", () => {
  const { _KDB, selectors } = setup();
  _KDB.api.widgetSettings.destroy();
  assert.equal(selectors.readWidgetSettings(_KDB, "a"), undefined);
  assert.equal(_KDB.api.widgetSettings.getState(), undefined);
  _KDB.state.widgets.settings.lifecycle = "ready";
  assert.equal(selectors.readWidgetSettings(_KDB, "a").dimension, "D");
});

test("a read clones one record, not the whole state", () => {
  const counter = createCounter();
  const { _KDB, selectors } = setup(counter);
  for (let index = 0; index < 50; index += 1) {
    _KDB.state.widgets.settings.byWidget["w" + index] = { pending: { kind: null }, deferred: {}, dimension: "D" + index };
  }
  counter.reset();
  selectors.readWidgetSettings(_KDB, "w7");
  assert.deepStrictEqual([counter.calls, counter.wholeStateCalls, counter.bytes < 120], [1, 0, true]);
  counter.reset();
  _KDB.api.widgetSettings.getState();
  assert.deepStrictEqual([counter.calls, counter.wholeStateCalls], [1, 1]);
});
