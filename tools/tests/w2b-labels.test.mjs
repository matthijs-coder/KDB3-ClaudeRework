// W2b label move: the history replay failure texts stay byte-identical when they move to config.labels.
// fixtures/w2b-labels.old.json holds the literals as they were in replay.js before the move.
// Run: node --test tools/tests/w2b-labels.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const old = JSON.parse(fs.readFileSync(path.join(HERE, "fixtures/w2b-labels.old.json"), "utf8"));

test("history replay failure literals are present in the old source", () => {
  const source = fs.readFileSync(path.join(JS_ROOT, old.history.file), "utf8");
  for (const literal of Object.values(old.history.labels)) {
    assert.ok(source.includes(JSON.stringify(literal)), literal);
  }
});
