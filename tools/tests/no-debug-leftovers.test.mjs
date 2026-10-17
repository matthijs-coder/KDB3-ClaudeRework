// Guards against debug leftovers coming back: TEMP probes, console.log, red outline, helper parking and inspection switches.
// Run: node --test tools/tests/no-debug-leftovers.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { JS_ROOT, listJsFiles, readSource, isVendored } from "../lib/amd-graph.mjs";

const files = listJsFiles().filter((f) => !isVendored(f));
const sources = files.map((rel) => ({ rel, text: readSource(path.join(JS_ROOT, rel)) }));

function find(pattern) {
  const hits = [];
  for (const { rel, text } of sources) {
    text.split("\n").forEach((line, index) => {
      if (pattern.test(line)) hits.push(`${rel}:${index + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
  return hits;
}

test("no console.log, console.trace or debugger statement in production JS", () => {
  assert.deepEqual(find(/\bconsole\.(log|trace)\s*\(|^\s*debugger\b/), []);
});

test("no TEMP or [sicht-jahr] probe and no debug outline", () => {
  assert.deepEqual(find(/\bTEMP\b|\[sicht-jahr\]|#c0392b/), []);
});

test("no TopN helper parking or inspection switch", () => {
  assert.deepEqual(find(/leaveHelperOnCanvas|preserveHelperBindingForInspection|skipPostResolutionHelperCleanup|topNReady|shouldSkipPostResolutionCleanup/), []);
});
