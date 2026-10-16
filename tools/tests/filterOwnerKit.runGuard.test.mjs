// Unit tests of dashboard/filters/_core/parameterSetRun.js (the parameterSet run guard of the filter owner kit).
// Run: node --test tools/tests/filterOwnerKit.runGuard.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

function loadKit(file) {
  return loadAmd(path.join(JS_ROOT, "dashboard/filters/_core", file));
}

test("run guard: invalid, stale, accepted, equal id, onAdvance", () => {
  const kit = loadKit("parameterSetRun.js");
  const runtime = { parameterSetRunId: null };
  for (const bad of [undefined, null, "3", NaN, Infinity, {}]) {
    const rejection = kit.claimParameterSetRun(runtime, bad, { invalidMessage: "needs a number" });
    assert.equal(rejection.reason, "invalid");
    assert.equal(rejection.message, "needs a number");
    assert.equal(Object.is(rejection.runId, bad), true);
  }
  assert.strictEqual(runtime.parameterSetRunId, null);
  const advanced = [];
  assert.strictEqual(kit.claimParameterSetRun(runtime, 3, { onAdvance: (prev) => advanced.push(prev) }), null);
  assert.equal(runtime.parameterSetRunId, 3);
  assert.deepEqual(advanced, []);
  assert.strictEqual(kit.claimParameterSetRun(runtime, 3, { onAdvance: (prev) => advanced.push(prev) }), null);
  assert.deepEqual(advanced, []);
  assert.deepEqual(kit.claimParameterSetRun(runtime, 2), {
    reason: "stale", runId: 2, current: 3, message: "stale parameterSet runId 2 superseded by 3"
  });
  assert.equal(runtime.parameterSetRunId, 3);
  assert.strictEqual(kit.claimParameterSetRun(runtime, 7, { onAdvance: (prev) => advanced.push(prev) }), null);
  assert.deepEqual(advanced, [3]);
  assert.equal(kit.isStaleParameterSetRun(runtime, 6), true);
  assert.equal(kit.isStaleParameterSetRun(runtime, 7), false);
  assert.equal(kit.isStaleParameterSetRun({ parameterSetRunId: null }, 1), false);
  assert.equal(kit.isStaleParameterSetRun({}, 1), false);
});

test("run guard: a numeric 0 stamp (dienststelle/NMS defaults) rejects negative ids and accepts 0 and up", () => {
  const kit = loadKit("parameterSetRun.js");
  const runtime = { parameterSetRunId: 0 };
  assert.equal(kit.claimParameterSetRun(runtime, -1).reason, "stale");
  assert.strictEqual(kit.claimParameterSetRun(runtime, 0), null);
  assert.strictEqual(kit.claimParameterSetRun(runtime, 1), null);
});
