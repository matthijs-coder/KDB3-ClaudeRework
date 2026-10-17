// P2-W9a: widgetSettings handleCommitColour and the readable text colour it requests from widgetText.
// Driven through the real widgetSettings controller with fake widgetBase / widgetText APIs.
// Run: node --test tools/tests/w9a-colour-commit.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const load = (rel, options) => loadAmd(path.join(JS_ROOT, rel), options);
const flush = () => new Promise((resolve) => setImmediate(resolve));

function createEnv(options) {
  const opts = options || {};
  const logs = [];
  const quiet = { error: (...a) => logs.push(["error", ...a]), warn: (...a) => logs.push(["warn", ...a]), log() {} };
  const _KDB = { config: { options: {} }, api: {}, properties: {}, state: {}, runtime: {}, utils: {} };
  load("core/config/registerConfig.js")(_KDB);
  _KDB.state.widgets = { vis: { byId: {} }, base: { byId: {} } };
  _KDB.utils.readableTextColorForHex = load("core/utils/readableTextColorForHex.js");
  const baseCalls = [];
  const textCalls = [];
  _KDB.api.widgetBase = {
    dispatch(action) {
      baseCalls.push(action);
      return Promise.resolve(opts.baseResult || { ok: true, colour: action.payload.optionValue });
    }
  };
  if (opts.text !== false) {
    _KDB.api.widgetText = {
      dispatch(action) {
        textCalls.push(action);
        if (opts.textRejects) return Promise.reject(new Error("text boom"));
        return Promise.resolve(opts.textResult || { ok: true, widgetId: action.widgetId, status: "success" });
      }
    };
  }
  load("dashboard/widgets/widgetSettings/index.js", { stubs: { console: quiet } })(_KDB);
  _KDB.api.widgetSettings.mount();
  return { _KDB, logs, baseCalls, textCalls, record: (id) => _KDB.state.widgets.settings.byWidget[id] };
}

function commit(env, extra) {
  return env._KDB.api.widgetSettings.dispatch({
    type: "widgetSettings/commitColour",
    widgetId: "t1",
    payload: Object.assign({ optionKey: "blue", optionValue: "#0000ff", displayValue: "Blue", widgetType: "text", source: "widgetSettings" }, extra || {})
  });
}

test("text widget: colour commits, readable text colour is requested, result is ok", async () => {
  const env = createEnv();
  const result = await commit(env);
  await flush();
  assert.deepStrictEqual(result, { ok: true, widgetId: "t1", colour: "#0000ff" });
  assert.equal(env.baseCalls.length, 1);
  assert.equal(env.baseCalls[0].type, "widgetBase/setColour");
  assert.equal(env.textCalls.length, 1);
  assert.equal(env.textCalls[0].type, "widgetText/applyReadableTextColor");
  assert.equal(env.textCalls[0].widgetId, "t1");
  assert.equal(env.textCalls[0].payload.textColor, env._KDB.utils.readableTextColorForHex("#0000ff"));
  assert.equal(env.record("t1").colour, "#0000ff");
  assert.equal(env.record("t1").errorCode, null);
  assert.equal(env.record("t1").pending.kind, null);
});

test("vis widget: no readable text colour request", async () => {
  const env = createEnv();
  const result = await commit(env, { widgetType: "live" });
  await flush();
  assert.equal(result.ok, true);
  assert.equal(env.textCalls.length, 0);
});

test("widgetBase failure: record error, result not ok, no text colour request", async () => {
  const env = createEnv({ baseResult: { ok: false, errorCode: "WIDGET_BASE_X", errorMessage: "nope" } });
  const result = await commit(env);
  await flush();
  assert.deepStrictEqual(result, { ok: false, errorCode: "WIDGET_BASE_X", errorMessage: "nope" });
  assert.equal(env.record("t1").errorCode, "WIDGET_BASE_X");
  assert.equal(env.record("t1").errorMessage, "nope");
  assert.equal(env.record("t1").pending.kind, null);
  assert.equal(env.textCalls.length, 0);
  assert.equal(env.record("t1").colour, undefined);
});

test("text colour rejected by widgetText ({ok:false}): recorded on the record, background commit and result stay ok", async () => {
  const env = createEnv({ textResult: { ok: false, widgetId: "t1", status: "error", errorCode: "WIDGET_TEXT_COLOR_VALUE_INVALID", errorMessage: "bad colour" } });
  const result = await commit(env);
  await flush();
  assert.deepStrictEqual(result, { ok: true, widgetId: "t1", colour: "#0000ff" });
  assert.equal(env.record("t1").colour, "#0000ff");
  assert.equal(env.record("t1").errorCode, "WIDGET_TEXT_COLOR_VALUE_INVALID");
  assert.equal(env.record("t1").errorMessage, "bad colour");
  assert.equal(env.logs.filter((l) => l[0] === "warn" && String(l[1]).indexOf("applyReadableTextColor") >= 0).length, 1);
});

test("text colour rejected without an errorCode: fallback code", async () => {
  const env = createEnv({ textResult: { ok: false } });
  await commit(env);
  await flush();
  assert.equal(env.record("t1").errorCode, "WIDGET_SETTINGS_TEXT_COLOUR_FAILED");
  assert.equal(env.record("t1").errorMessage, null);
});

test("text colour superseded (stale) or skipped is not a failure", async () => {
  for (const textResult of [{ ok: false, stale: true, status: "aborted" }, { ok: true, skipped: true }]) {
    const env = createEnv({ textResult });
    await commit(env);
    await flush();
    assert.equal(env.record("t1").errorCode, null);
  }
});

test("text colour dispatch rejects: logged and recorded, background commit stays, result stays ok", async () => {
  const env = createEnv({ textRejects: true });
  const result = await commit(env);
  await flush();
  assert.deepStrictEqual(result, { ok: true, widgetId: "t1", colour: "#0000ff" });
  assert.equal(env.record("t1").colour, "#0000ff");
  assert.equal(env.record("t1").errorCode, "WIDGET_SETTINGS_TEXT_COLOUR_ERROR");
  assert.equal(env.record("t1").errorMessage, "text boom");
  assert.equal(env.logs.filter((l) => l[0] === "warn" && String(l[1]).indexOf("applyReadableTextColor") >= 0).length, 1);
});

test("no widgetText api: nothing requested, result ok", async () => {
  const env = createEnv({ text: false });
  const result = await commit(env);
  await flush();
  assert.equal(result.ok, true);
  assert.equal(env.record("t1").errorCode, null);
});
