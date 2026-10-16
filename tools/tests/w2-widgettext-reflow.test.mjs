// W2 widgetText: the global window "resize" that follows an automatic font refit. Characterised on the old code
// (one synchronous dispatch per refit), then the dispatch is coalesced onto one animation frame.
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

test("a fixed font size dispatches no resize event", async () => {
  const env = setup();
  await env.fontSize.applyFontSize(KDB(), "w1", makeNodes(), "14px");
  env.runFrames();
  assert.deepStrictEqual(env.dispatched, []);
});
