// Randomised oracle for the dienststelle hierarchy index (Phase 2 W7b): outputs of
// dashboard/filters/dienststelle/restore/hierarchyIndex.js over a seeded corpus (whitespace and line-terminator variants,
// nested/unbalanced/empty brackets, no brackets, unicode, mixed cell forms), recorded on the code BEFORE the W7b migration.
// The corpus itself is a committed fixture; the test fails if the generator no longer reproduces it.
// Run: node --test tools/tests/org-tree-dienststelle-random.oracle.test.mjs
// Re-record (review the diff!): RECORD=1 node tools/tests/org-tree-dienststelle-random.oracle.test.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";
import { jsonSafe } from "./lib/org-tree-corpus.mjs";
import { buildRandomCorpus, corpusToFileText } from "./lib/org-tree-dienststelle-random.mjs";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const CORPUS_FILE = path.join(DIR, "org-tree-dienststelle.random-corpus.json");
const ORACLE_FILE = path.join(DIR, "org-tree-dienststelle.random.oracle.json");
const RECORD = process.env.RECORD === "1";
const hierarchy = loadAmd(path.join(JS_ROOT, "dashboard/filters/dienststelle/restore/hierarchyIndex.js"));
const generated = buildRandomCorpus();
const golden = RECORD ? {} : JSON.parse(readFileSync(ORACLE_FILE, "utf8"));

if (RECORD) {
  writeFileSync(CORPUS_FILE, corpusToFileText(generated));
}
const corpus = JSON.parse(readFileSync(CORPUS_FILE, "utf8"));

after(() => {
  if (RECORD) {
    const lines = Object.keys(golden).map((key) => "  " + JSON.stringify(key) + ": " + JSON.stringify(golden[key]).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029"));
    writeFileSync(ORACLE_FILE, "{\n" + lines.join(",\n") + "\n}\n");
  }
});

function check(name, actual) {
  const value = jsonSafe(actual);
  if (RECORD) {
    golden[name] = value;
    return;
  }
  assert.ok(Object.prototype.hasOwnProperty.call(golden, name), "missing oracle " + name);
  assert.deepStrictEqual(value, golden[name], name);
}

function probesOf(index) {
  const probes = ["", "unknown", null, undefined, 42];
  [index.members, index.byLeaf, index.byDisplay].forEach((map) => {
    Object.keys(map).forEach((key) => {
      probes.push(key, key.trim());
    });
  });
  return probes.filter((probe, i) => probes.indexOf(probe) === i);
}

function resolveAnswers(index) {
  return probesOf(index).map((probe) => [probe, hierarchy.hasUseValue(index, probe), hierarchy.resolveRestorePair(index, probe)]);
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(jsonSafe(value))).digest("hex");
}

test("committed corpus is reproduced by the seeded generator", () => {
  assert.deepStrictEqual(corpus, JSON.parse(JSON.stringify(generated)));
  assert.equal(corpus.strings.length, 1000);
  assert.equal(corpus.rowSets.length, 120);
});

test("corpus reaches the interesting classes", () => {
  const has = (re) => corpus.strings.some((s) => re.test(s));
  assert.ok(has(/\[\s+[^\]]*\]/), "bracket with leading whitespace");
  assert.ok(has(/\]\n.*\[/), "newline between brackets");
  assert.ok(has(/\]\u2028.*\[/), "line separator between brackets");
  assert.ok(has(/\[\[/), "nested");
  assert.ok(has(/^[^[\]]*$/), "no brackets");
  assert.ok(has(/[\u00fc\u00dc\u65e5]/), "unicode");
  assert.ok(has(/\[\]/), "empty brackets");
});

test("single use value: bare index in full, combined index and answers as digest", () => {
  corpus.strings.forEach((text, i) => {
    const index = hierarchy.buildHierarchyIndex([{ c: text }, { c: { display: "D", use: text } }, { c: { u: text, d: "" } }]);
    check("string:" + i + ":index", digest(index));
    check("string:" + i + ":resolve", digest(resolveAnswers(index)));
    const bare = hierarchy.buildHierarchyIndex([{ c: { use: text } }]);
    check("string:" + i + ":bare", bare);
  });
});

test("random row sets: index in full, answers as digest", () => {
  corpus.rowSets.forEach((rows, i) => {
    const index = hierarchy.buildHierarchyIndex(rows);
    check("rows:" + i + ":index", index);
    check("rows:" + i + ":resolve", digest(resolveAnswers(index)));
  });
});
