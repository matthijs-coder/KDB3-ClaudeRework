// Unit tests for tools/check-doc-paths.mjs (citation detection, resolution, allow-list evaluation) plus the live gate.
// Run: node --test tools/tests/w14-doc-paths.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { findCitations, citedExists, collectStale, evaluate, parseAllowlist, listLivingDocs, suggestPath } from "../check-doc-paths.mjs";

const toolsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function makeRepo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "w14-docs-"));
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  }
  return root;
}

test("findCitations: prefixed, bare and tools paths; prose, URLs and legacy: forms are not citations", () => {
  const text = [
    "See `KDB3/js/core/events/tabs.js:12` and `dashboard/tabs/index.js`.",
    "Full `_____________KDB3API/KDB3/js/workflows/parameterSet/index.js`, then tools/check-all.mjs.",
    "Glob dashboard/filters/*/state.js and core/utils/{a,b}.js.",
    "https://example.com/dashboard/x.js and legacy:js/core/bootstrap/old.js and mydashboard/x.js",
    "Trailing dot core/services/writeback."
  ].join("\n");
  assert.deepEqual(findCitations(text).map((c) => `${c.line}:${c.path}`), [
    "1:KDB3/js/core/events/tabs.js",
    "1:dashboard/tabs/index.js",
    "2:_____________KDB3API/KDB3/js/workflows/parameterSet/index.js",
    "2:tools/check-all.mjs",
    "3:dashboard/filters/*/state.js",
    "3:core/utils/{a,b}.js",
    "5:core/services/writeback"
  ]);
});

test("citedExists: resolves under repo root, app dir and js root, with or without .js, wildcard prefixes", () => {
  const root = makeRepo({
    "tools/check-all.mjs": "",
    "_____________KDB3API/KDB3/js/core/a/b.js": "",
    "_____________KDB3API/KDB3/js/dashboard/x/index.js": ""
  });
  for (const ok of ["tools/check-all.mjs", "core/a/b.js", "core/a/b", "KDB3/js/core/a/b.js", "_____________KDB3API/KDB3/js/core/a/", "dashboard/x/*/index.js", "core/a/{b,c}.js"]) {
    assert.equal(citedExists(ok, root), true, ok);
  }
  for (const bad of ["core/a/missing.js", "dashboard/y/index.js", "tools/nope.mjs", "core/a/b.js.map"]) {
    assert.equal(citedExists(bad, root), false, bad);
  }
});

test("collectStale reads only the living doc set (archive and futureTodo excluded)", () => {
  const root = makeRepo({
    "_____________KDB3API/KDB3/js/core/a.js": "",
    "_____________KDB3API/contracts/live.md": "ok core/a.js\nbad core/gone.js\n",
    "_____________KDB3API/contracts/_archive/old.md": "bad core/gone.js\n",
    "_____________KDB3API/contracts/futureTodo/todo.md": "bad core/gone.js\n",
    "_____________KDB3API/architecture/arch.md": "bad dashboard/gone/index.js\n",
    "_____________KDB3API/architecture/_archive/old.md": "bad core/gone.js\n",
    "_____________KDB3API/.cursor/rules/r.mdc": "bad workflows/gone.js\n",
    "_____________KDB3API/AGENTS.md": "ok core/a.js\n",
    "tools/README.md": "bad tools/gone.mjs\n"
  });
  assert.deepEqual(listLivingDocs(root).sort(), [
    "_____________KDB3API/.cursor/rules/r.mdc",
    "_____________KDB3API/AGENTS.md",
    "_____________KDB3API/architecture/arch.md",
    "_____________KDB3API/contracts/live.md",
    "tools/README.md"
  ]);
  assert.deepEqual(collectStale(root).map((s) => `${s.doc}:${s.line}:${s.path}`).sort(), [
    "_____________KDB3API/.cursor/rules/r.mdc:1:workflows/gone.js",
    "_____________KDB3API/architecture/arch.md:1:dashboard/gone/index.js",
    "_____________KDB3API/contracts/live.md:2:core/gone.js",
    "tools/README.md:1:tools/gone.mjs"
  ]);
});

test("evaluate: allow-listed stale citations pass, unknown ones fail, unused entries are reported", () => {
  const stale = [{ doc: "a.md", line: 1, path: "core/x.js" }, { doc: "a.md", line: 2, path: "core/y.js" }];
  const allowlist = parseAllowlist("# comment\n\na.md | core/x.js  # historical\nb.md | core/z.js  # fixed since\n");
  assert.deepEqual(allowlist, [
    { doc: "a.md", path: "core/x.js", reason: "historical" },
    { doc: "b.md", path: "core/z.js", reason: "fixed since" }
  ]);
  const r = evaluate(stale, allowlist);
  assert.deepEqual(r.failing.map((s) => s.path), ["core/y.js"]);
  assert.deepEqual(r.allowlisted.map((s) => s.path), ["core/x.js"]);
  assert.deepEqual(r.staleAllowlist.map((a) => a.path), ["core/z.js"]);
});

test("suggestPath follows a rename map and keeps the citation's prefix style", () => {
  const root = makeRepo({ "_____________KDB3API/KDB3/js/core/new/a.js": "" });
  const map = new Map([["_____________KDB3API/KDB3/js/core/old/a.js", "_____________KDB3API/KDB3/js/core/new/a.js"]]);
  assert.equal(suggestPath("core/old/a.js", map, root), "core/new/a.js");
  assert.equal(suggestPath("KDB3/js/core/old/a.js", map, root), "KDB3/js/core/new/a.js");
  assert.equal(suggestPath("core/old/a", map, root), "core/new/a");
  assert.equal(suggestPath("core/unknown/a.js", map, root), null);
});

test("live gate: the repository's living docs have no stale code-path citation and no unused allow-list entry", () => {
  const r = spawnSync(process.execPath, [path.join(toolsDir, "check-doc-paths.mjs"), "--json"], { encoding: "utf8" });
  const report = JSON.parse(r.stdout);
  assert.deepEqual(report.failing, []);
  assert.deepEqual(report.staleAllowlist, []);
  assert.equal(r.status, 0);
});
