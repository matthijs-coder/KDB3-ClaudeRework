// W10: check-imports fails when a core file other than the composition root imports dashboard/**.
// Run: node --test tools/tests/w10-layering-gate.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ALLOWED_CORE_IMPORTERS, findLayeringViolations } from "../lib/layering.mjs";
import { REPO_ROOT } from "../lib/amd-graph.mjs";

test("only core files outside the allowed composition root importing dashboard files are violations", () => {
  const edges = [
    { from: "core/bootstrap/featureManifest.js", to: "dashboard/tabs/__orchestratorTabs.js", line: 20 },
    { from: "core/services/tableData/readTabs.js", to: "dashboard/tabs/state/selectors.js", line: 3 },
    { from: "core/utils/a.js", to: "core/utils/b.js", line: 1 },
    { from: "dashboard/tabs/index.js", to: "core/utils/b.js", line: 1 },
    { from: "dashboard/tabs/index.js", to: "dashboard/tabs/state.js", line: 2 }
  ];
  assert.deepStrictEqual(findLayeringViolations(edges).map((e) => e.from), ["core/services/tableData/readTabs.js"]);
  assert.deepStrictEqual(findLayeringViolations(edges, []).map((e) => e.from), [
    "core/bootstrap/featureManifest.js", "core/services/tableData/readTabs.js"
  ]);
  assert.deepStrictEqual(ALLOWED_CORE_IMPORTERS, ["core/bootstrap/featureManifest.js"]);
});

function copyTree(target) {
  fs.mkdirSync(path.join(target, "tools"), { recursive: true });
  for (const name of ["check-imports.mjs", "orphan-allowlist.txt"]) fs.copyFileSync(path.join(REPO_ROOT, "tools", name), path.join(target, "tools", name));
  fs.cpSync(path.join(REPO_ROOT, "tools", "lib"), path.join(target, "tools", "lib"), { recursive: true });
  fs.mkdirSync(path.join(target, "_____________KDB3API", "KDB3"), { recursive: true });
  fs.copyFileSync(path.join(REPO_ROOT, "_____________KDB3API", "KDB3", "spec.json"), path.join(target, "_____________KDB3API", "KDB3", "spec.json"));
  fs.cpSync(path.join(REPO_ROOT, "_____________KDB3API", "KDB3", "js"), path.join(target, "_____________KDB3API", "KDB3", "js"), { recursive: true });
}

function runCheck(root) {
  const result = spawnSync(process.execPath, [path.join(root, "tools", "check-imports.mjs"), "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { status: result.status, json: JSON.parse(result.stdout) };
}

test("the real tree passes: the manifest is the only core file importing dashboard", () => {
  const { status, json } = runCheck(REPO_ROOT);
  assert.equal(status, 0);
  assert.equal(json.summary.layeringViolations, 0);
  assert.ok(json.coreToDashboard.length > 0);
  assert.deepStrictEqual([...new Set(json.coreToDashboard.map((e) => e.from))], [
    "_____________KDB3API/KDB3/js/core/bootstrap/featureManifest.js"
  ]);
});

test("a core file importing a dashboard file fails check-imports with a layering failure", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "w10-gate-"));
  try {
    copyTree(root);
    const file = path.join(root, "_____________KDB3API", "KDB3", "js", "core", "utils", "convertUnitToPx.js");
    const source = fs.readFileSync(file, "utf8");
    assert.ok(source.startsWith("define([], function () {"));
    fs.writeFileSync(file, source.replace("define([], function () {", 'define(["../../dashboard/tabs/config/mutationCodes.js"], function () {'));
    const { status, json } = runCheck(root);
    assert.equal(status, 1);
    assert.equal(json.pass, false);
    assert.deepStrictEqual(json.layeringViolations.map((v) => [v.from.replace(/^.*\/js\//, ""), v.to.replace(/^.*\/js\//, "")]),
      [["core/utils/convertUnitToPx.js", "dashboard/tabs/config/mutationCodes.js"]]);
    assert.ok(json.failures.some((message) => /core -> dashboard import/.test(message)));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
