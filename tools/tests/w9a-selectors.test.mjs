// P2-W9a: selectors and facades the widget folders publish to each other.
// Run: node --test tools/tests/w9a-selectors.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const QUIET = { error() {}, warn() {}, log() {} };
const load = (rel, options) => loadAmd(path.join(JS_ROOT, rel), Object.assign({ stubs: { console: QUIET } }, options || {}));

test("widgetTopN readOwnerState: copy of one owner record", () => {
  const selectors = load("dashboard/widgets/widgetTopN/selectors.js");
  const state = { lifecycle: "ready", byOwner: { a: { ownerVisId: "a", resolutionStatus: "success", resultValues: ["x"] }, b: { ownerVisId: "b", resolutionStatus: "idle" } } };
  const _KDB = { state: { widgets: { topN: state } } };
  const record = selectors.readOwnerState(_KDB, "a");
  assert.deepStrictEqual(record, { ownerVisId: "a", resolutionStatus: "success", resultValues: ["x"] });
  assert.notStrictEqual(record, state.byOwner.a);
  record.resultValues.push("y");
  record.resolutionStatus = "error";
  assert.deepStrictEqual(state.byOwner.a.resultValues, ["x"]);
  assert.equal(state.byOwner.a.resolutionStatus, "success");
  assert.equal(selectors.readOwnerState(_KDB, "missing"), undefined);
  assert.equal(selectors.readOwnerState(_KDB, ""), undefined);
  assert.equal(selectors.readOwnerState(_KDB), undefined);
  assert.equal(selectors.readOwnerState({}, "a"), undefined);
  assert.equal(selectors.readOwnerState({ state: { widgets: {} } }, "a"), undefined);
  state.lifecycle = "disposed";
  assert.equal(selectors.readOwnerState(_KDB, "a"), undefined);
});

test("widgetTopN readOwnerState does not clone the other owners", () => {
  const selectors = load("dashboard/widgets/widgetTopN/selectors.js");
  let reads = 0;
  const byOwner = {};
  for (let index = 0; index < 50; index += 1) {
    byOwner["o" + index] = Object.defineProperty({ ownerVisId: "o" + index, resolutionStatus: "success" }, "poison", {
      enumerable: true, get() { reads += 1; return 1; }
    });
  }
  const _KDB = { state: { widgets: { topN: { lifecycle: "ready", byOwner } } } };
  selectors.readOwnerState(_KDB, "o7");
  assert.equal(reads, 1);
});

test("widgetSettings downstream maximize intent: nextMaximized from the widgetVis record", () => {
  const downstream = load("dashboard/widgets/widgetSettings/intent/downstream.js");
  const byId = { on: { maximized: true }, off: { maximized: false }, bare: {} };
  const _KDB = {
    state: { widgets: { vis: { lifecycle: "ready", byId: byId } } },
    api: { widgetVis: { getState: () => ({ lifecycle: "ready", byId: JSON.parse(JSON.stringify(byId)) }) } }
  };
  const nextOf = (kdb, widgetId, kind) => downstream.buildDownstreamIntentAction(kdb, {
    type: "widgetVis/maximizeToggle", widgetId: widgetId, kind: kind, interaction: "iconClick", target: "widgetBase"
  }).payload.nextMaximized;
  assert.equal(nextOf(_KDB, "on", "maximize"), false);
  assert.equal(nextOf(_KDB, "off", "maximize"), true);
  assert.equal(nextOf(_KDB, "bare", "maximize"), true);
  assert.equal(nextOf(_KDB, "unknown", "maximize"), true);
  assert.equal(nextOf(_KDB, "on", "unmaximize"), false);
  assert.equal(nextOf({ state: {}, api: {} }, "on", "maximize"), true);
});
