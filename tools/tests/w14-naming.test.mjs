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

const PANEL_ATTRIBUTES = ["data-kdb-input-id", "data-kdb-control-id", "data-kdb-toolbox-action"];

function scanAttributeUse(name) {
  const used = { written: [], read: [], stray: [] };
  for (const rel of files.filter((f) => f.startsWith("dashboard/canvas/kdbControl/"))) {
    const tokens = tokenize(readSource(path.join(JS_ROOT, rel)));
    tokens.forEach((t, i) => {
      if (t.t !== "str") return;
      const prev = tokens[i - 1];
      const prev2 = tokens[i - 2];
      const next = tokens[i + 1];
      const call = prev && prev.v === "(" && prev2 ? prev2.v : null;
      if (t.v === name && ((next && next.v === ":") || call === "setAttribute")) used.written.push(rel);
      if ((t.v === name && call === "getAttribute") || t.v.includes(`[${name}`)) used.read.push(rel);
    });
  }
  return used;
}

test("kdbControl panel attributes are written and read under kdbControl/ with the same spelling", () => {
  for (const name of PANEL_ATTRIBUTES) {
    const used = scanAttributeUse(name);
    assert.ok(used.written.length > 0, `${name} is never written (setAttribute / attribute-map key)`);
    assert.ok(used.read.length > 0, `${name} is never read (getAttribute / attribute selector)`);
  }
});

test("every data-kdb-input/control/toolbox literal under kdbControl/ is one of the three known attributes", () => {
  const known = new Set(PANEL_ATTRIBUTES);
  const strays = [];
  for (const rel of files.filter((f) => f.startsWith("dashboard/canvas/kdbControl/"))) {
    for (const t of tokenize(readSource(path.join(JS_ROOT, rel)))) {
      if (t.t !== "str") continue;
      for (const m of t.v.matchAll(/data-kdb-(?:input|control|toolbox)[\w-]*/g)) {
        if (!known.has(m[0])) strays.push(`${rel}: ${m[0]}`);
      }
    }
  }
  assert.deepEqual(strays, []);
});

test("the old data-placeholder-* attribute names appear nowhere in code or comments", () => {
  const offenders = files.filter((rel) => /data-placeholder|data-kdb-toolbox-placeholder/.test(readSource(path.join(JS_ROOT, rel))));
  assert.deepEqual(offenders, []);
});
