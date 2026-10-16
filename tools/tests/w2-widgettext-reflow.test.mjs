// W2 widgetText: the global window "resize" that follows an automatic font refit. Characterised on the old code
// (one synchronous dispatch per refit), then the dispatch is coalesced onto one animation frame.
// Behaviour delta (separate commit): the event fires on the next animation frame, once for all refits of that frame.
// Run: node --test tools/tests/w2-widgettext-reflow.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const TEXT = path.join(JS_ROOT, "dashboard/widgets/widgetText");

class FakeEvent {
  constructor(type) { this.type = type; }
}

function setup() {
  const dispatched = [];
  const frames = new Map();
  let nextFrame = 1;
  const stubs = {
    Event: FakeEvent,
    window: { dispatchEvent: (event) => dispatched.push(event.type) },
    document: {
      getElementById: () => null,
      createElement: () => ({ setAttribute() {}, parentNode: null }),
      head: { appendChild(child) { child.parentNode = {}; } }
    },
    requestAnimationFrame: (fn) => { frames.set(nextFrame, fn); return nextFrame++; },
    cancelAnimationFrame: (id) => { frames.delete(id); }
  };
  const fontSize = loadAmd(path.join(TEXT, "fontSize.js"), { stubs });
  const runFrames = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach((fn) => fn()); };
  return { fontSize, dispatched, frames, runFrames };
}

function makeNodes() {
  const editableEl = { classList: { add() {} }, style: { display: "" }, offsetHeight: 10, querySelectorAll: () => [] };
  return { editableEl, textNodeForFont: { style: {} }, spanEl: null, paragraphEl: null };
}

const KDB = () => ({ runtime: {} });

test("automatic refit dispatches the window resize event", async () => {
  const env = setup();
  const result = await env.fontSize.applyFontSize(KDB(), "w1", makeNodes(), "automatic");
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.reflow, true);
  env.runFrames();
  assert.deepStrictEqual(env.dispatched, ["resize"]);
});

test("the resize event waits for the animation frame and refits of one frame share it", async () => {
  const env = setup();
  const kdb = KDB();
  await env.fontSize.applyFontSize(kdb, "w1", makeNodes(), "automatic");
  await env.fontSize.applyFontSize(kdb, "w2", makeNodes(), "automatic");
  await env.fontSize.applyFontSize(kdb, "w3", makeNodes(), "automatic");
  assert.deepStrictEqual(env.dispatched, []);
  assert.equal(env.frames.size, 1);
  env.runFrames();
  assert.deepStrictEqual(env.dispatched, ["resize"]);
  assert.deepStrictEqual(kdb.runtime.widgetText.timers, {});
  await env.fontSize.applyFontSize(kdb, "w1", makeNodes(), "automatic");
  env.runFrames();
  assert.deepStrictEqual(env.dispatched, ["resize", "resize"]);
});

test("the DOM nudge itself stays synchronous and the frame is released with the runtime buckets", async () => {
  const env = setup();
  const kdb = KDB();
  const nodes = makeNodes();
  const displays = [];
  Object.defineProperty(nodes.editableEl.style, "display", { get: () => "", set: (value) => displays.push(value) });
  await env.fontSize.applyFontSize(kdb, "w1", nodes, "automatic");
  assert.deepStrictEqual(displays, ["none", ""]);
  assert.equal(env.frames.size, 1);
  const runtimeKit = loadAmd(path.join(JS_ROOT, "core/utils/kit/runtime.js"), { stubs: { cancelAnimationFrame: (id) => env.frames.delete(id) } });
  assert.deepStrictEqual(runtimeKit.disposeRuntimeBuckets(kdb.runtime.widgetText), []);
  assert.equal(env.frames.size, 0);
  env.runFrames();
  assert.deepStrictEqual(env.dispatched, []);
});

test("a failing DOM nudge flags the diagnostics and schedules no resize", async () => {
  const env = setup();
  const nodes = makeNodes();
  Object.defineProperty(nodes.editableEl, "offsetHeight", { get() { throw new Error("layout boom"); } });
  const saved = console.error;
  console.error = () => {};
  try {
    const result = await env.fontSize.applyFontSize(KDB(), "w1", nodes, "automatic");
    assert.equal(result.diagnostics.reflow, false);
  } finally {
    console.error = saved;
  }
  env.runFrames();
  assert.deepStrictEqual(env.dispatched, []);
});

test("a fixed font size dispatches no resize event", async () => {
  const env = setup();
  await env.fontSize.applyFontSize(KDB(), "w1", makeNodes(), "14px");
  env.runFrames();
  assert.deepStrictEqual(env.dispatched, []);
});
