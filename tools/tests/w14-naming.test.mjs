// W14 naming gates: magic entry names, facet adapter file names, the kdbControl panel folder, `.js` suffixes in define ids.
// Run: node --test tools/tests/w14-naming.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { JS_ROOT, listJsFiles, readSource, tokenize, isVendored, buildGraph } from "../lib/amd-graph.mjs";
import { TECHNICAL_WORDS, scanIdentifiers, splitWords } from "../german-identifiers.mjs";

const files = listJsFiles().filter((f) => !isVendored(f));

test("no __controller / __orchestrator identifiers or file names remain", () => {
  const offenders = [];
  for (const rel of files) {
    if (/(^|\/)__(controller|orchestrator)/.test(rel)) offenders.push(rel);
    for (const t of tokenize(readSource(path.join(JS_ROOT, rel)))) {
      if (t.t === "id" && /^__(controller|orchestrator)/.test(t.v)) offenders.push(`${rel}: ${t.v}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("cognosHost facets are entered through facets/<facet>/index.js", () => {
  const adapters = files.filter((f) => /^core\/services\/cognosHost\/facets\/.*create\w+Adapter\.js$/.test(f));
  assert.deepEqual(adapters, []);
  const facetDirs = fs.readdirSync(path.join(JS_ROOT, "core/services/cognosHost/facets"));
  assert.equal(facetDirs.length, 9);
  for (const dir of facetDirs) assert.ok(files.includes(`core/services/cognosHost/facets/${dir}/index.js`), dir);
});

test("kdbControl panel code lives in kdbControl/panel, not framework/", () => {
  assert.deepEqual(files.filter((f) => f.startsWith("dashboard/canvas/kdbControl/framework/")), []);
  assert.ok(files.includes("dashboard/canvas/kdbControl/panel/index.js"));
});

test("overflow-suffix file names stay out of core, workflows and dashboard", () => {
  const offenders = files.filter((f) => /(Support|Helpers|Internals)\.js$/.test(f));
  assert.deepEqual(offenders, []);
});

test("every relative define dependency id carries the .js suffix", () => {
  assert.deepEqual(buildGraph().suffixless, []);
});

test("no German or Dutch technical word inside an identifier", () => {
  assert.deepEqual(scanIdentifiers(TECHNICAL_WORDS).map((h) => h.identifier), []);
});

test("splitWords splits camelCase, snake and acronym boundaries", () => {
  assert.deepEqual(splitWords("readHTMLValue_now"), ["read", "html", "value", "now"]);
  assert.deepEqual(splitWords("ALLE_LABEL"), ["alle", "label"]);
});
