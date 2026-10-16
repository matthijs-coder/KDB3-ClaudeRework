// W2 label move: user-visible German text must stay byte-identical when it moves to config.labels.
// fixtures/w2-labels.old.json holds the literals as they were in the code before the move.
// Run: node --test tools/tests/w2-labels.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const old = JSON.parse(fs.readFileSync(path.join(HERE, "fixtures/w2-labels.old.json"), "utf8"));

function sourceOf(relPath) {
  return fs.readFileSync(path.join(JS_ROOT, relPath), "utf8");
}

test("chrome flush text literals are present in the old source", () => {
  const source = sourceOf(old.chrome.file);
  for (const literal of Object.values(old.chrome.labels)) {
    assert.ok(source.includes(JSON.stringify(literal)), literal);
  }
});

test("dashboardPdf text literals are present in the old sources", () => {
  for (const [file, labels] of Object.entries(old.dashboardPdf.files)) {
    const source = sourceOf(file);
    for (const literal of Object.values(labels)) {
      assert.ok(source.includes(JSON.stringify(literal)), `${file}: ${literal}`);
    }
  }
});
