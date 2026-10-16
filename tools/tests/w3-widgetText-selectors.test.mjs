// widgetText published reads: readTextById / readTextRecord replace (api.widgetText.getState() || {}).byId[widgetId] (W3, additive).
// Also pins the dragDrop event name consumers import.
// Run: node --test tools/tests/w3-widgetText-selectors.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const quiet = { log() {}, info() {}, warn() {}, error() {}, debug() {} };
const TEXT = path.join(JS_ROOT, "dashboard/widgets/widgetText");
const selectors = loadAmd(path.join(TEXT, "selectors.js"));
const stateModule = loadAmd(path.join(TEXT, "state.js"));
const actionTypes = loadAmd(path.join(TEXT, "config/actionTypes.js"));

function recordedState() {
  let state = stateModule.createInitialWidgetTextState();
  state = stateModule.reduceWidgetText(state, { type: actionTypes.REGISTER_CONTENT, widgetId: "w1", payload: { text: "Hello" } });
  state = stateModule.reduceWidgetText(state, { type: actionTypes.REGISTER_CONTENT, widgetId: "w2", payload: { text: "World" } });
  return state;
}

test("readTextById is a clone of byId and equals what the writeback readers take from getState().byId", () => {
  const state = recordedState();
  const _KDB = { state: { widgets: { text: state } } };
  const byId = selectors.readTextById(_KDB);
  assert.deepEqual(byId, state.byId);
  assert.deepEqual(Object.keys(byId).sort(), ["w1", "w2"]);
  assert.notEqual(byId, state.byId);
  byId.w1.content = "mutated";
  assert.notEqual(state.byId.w1.content, "mutated");
});

test("readTextRecord equals getState().byId[widgetId] per widget, undefined for unknown widgets", () => {
  const state = recordedState();
  const _KDB = { state: { widgets: { text: state } } };
  const viaApiState = JSON.parse(JSON.stringify(state)).byId;
  for (const id of ["w1", "w2", "missing"]) {
    assert.deepEqual(selectors.readTextRecord(_KDB, id), viaApiState[id], id);
  }
  assert.equal(selectors.readTextRecord(_KDB, ""), undefined);
  assert.equal(selectors.readTextContent(_KDB, "w1"), "Hello");
});

test("missing state gives {} / undefined without throwing", () => {
  for (const _KDB of [undefined, null, {}, { state: {} }, { state: { widgets: {} } }, { state: { widgets: { text: {} } } }]) {
    assert.deepEqual(selectors.readTextById(_KDB), {});
    assert.equal(selectors.readTextRecord(_KDB, "w1"), undefined);
    assert.equal(selectors.readTextContent(_KDB, "w1"), undefined);
    assert.equal(selectors.readTextPending(_KDB, "w1"), undefined);
  }
});

test("against the real controller: reads agree with getState() while mounted, and are empty after destroy like getState()", () => {
  const register = loadAmd(path.join(TEXT, "index.js"), { stubs: { console: quiet } });
  const _KDB = { state: { widgets: {} }, runtime: {}, api: {}, services: { cognosHost: { widgets: {} } } };
  const controller = register(_KDB, {});
  _KDB.state.widgets.text = recordedState();
  const apiState = controller.getState();
  assert.deepEqual(selectors.readTextById(_KDB), apiState.byId);
  assert.deepEqual(selectors.readTextRecord(_KDB, "w2"), apiState.byId.w2);
  assert.deepEqual(selectors.readWidgetTextState(_KDB), apiState);
  controller.destroy();
  assert.equal(controller.getState(), undefined);
  assert.deepEqual(selectors.readTextById(_KDB), {});
  assert.equal(selectors.readTextRecord(_KDB, "w1"), undefined);
});

test("dragDrop events.js exports the canvas:dropValidated name", () => {
  const events = loadAmd(path.join(JS_ROOT, "dashboard/canvas/dragDrop/events.js"));
  assert.equal(events.DROP_VALIDATED, "canvas:dropValidated");
  assert.deepEqual(Object.keys(events), ["DROP_VALIDATED"]);
});
