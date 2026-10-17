// W10/W11: check-imports fails on core -> dashboard, core -> workflows, dashboard -> workflows and on imports of the
// composition root (bootstrap/) from anywhere but KDB.js; there is no allow-list.
// Run: node --test tools/tests/w11-layering-gate.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { LAYERING_RULES, findLayeringViolations, findWorkflowsToDashboard } from "../lib/layering.mjs";
import { REPO_ROOT } from "../lib/amd-graph.mjs";

const edge = (from, to) => ({ from, to, line: 1 });

test("rules flag exactly the forbidden directions and name the rule", () => {
  const edges = [
    edge("core/services/tableData/index.js", "dashboard/tabs/index.js"),
    edge("core/utils/a.js", "workflows/parameterSet/index.js"),
    edge("dashboard/widgets/widgetBase/index.js", "workflows/pdfExport/index.js"),
    edge("core/utils/a.js", "bootstrap/featureManifest.js"),
    edge("dashboard/tabs/index.js", "bootstrap/registerServices.js"),
    edge("workflows/parameterSet/index.js", "bootstrap/registerServices.js"),
    edge("core/utils/a.js", "core/utils/b.js"),
    edge("dashboard/tabs/index.js", "core/utils/b.js"),
    edge("dashboard/tabs/index.js", "dashboard/tabs/state.js"),
    edge("workflows/parameterSet/index.js", "core/utils/b.js"),
    edge("KDB.js", "bootstrap/featureManifest.js"),
    edge("bootstrap/featureManifest.js", "dashboard/tabs/index.js"),
    edge("bootstrap/registerServices.js", "workflows/parameterSet/index.js"),
    edge("bootstrap/registerServices.js", "core/services/history/index.js"),
    edge("workflows/parameterSet/index.js", "dashboard/tabs/selectors.js")
  ];
  assert.deepStrictEqual(findLayeringViolations(edges).map((v) => [v.rule, v.from, v.to]), [
    ["core->dashboard", "core/services/tableData/index.js", "dashboard/tabs/index.js"],
    ["core->workflows", "core/utils/a.js", "workflows/parameterSet/index.js"],
    ["dashboard->workflows", "dashboard/widgets/widgetBase/index.js", "workflows/pdfExport/index.js"],
    ["composition-root", "core/utils/a.js", "bootstrap/featureManifest.js"],
    ["composition-root", "dashboard/tabs/index.js", "bootstrap/registerServices.js"],
    ["composition-root", "workflows/parameterSet/index.js", "bootstrap/registerServices.js"]
  ]);
  assert.deepStrictEqual(findWorkflowsToDashboard(edges).map((e) => e.to), ["dashboard/tabs/selectors.js"]);
  assert.deepStrictEqual(LAYERING_RULES.map((r) => r.id), ["core->dashboard", "core->workflows", "dashboard->workflows", "composition-root"]);
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

test("the real tree passes with zero violations and no workflows -> dashboard edge", () => {
  const { status, json } = runCheck(REPO_ROOT);
  assert.equal(status, 0);
  assert.equal(json.summary.layeringViolations, 0);
  assert.deepStrictEqual(json.summary.layering, { "core->dashboard": 0, "core->workflows": 0, "dashboard->workflows": 0, "composition-root": 0 });
  assert.deepStrictEqual(json.coreToDashboard, []);
  assert.deepStrictEqual(json.workflowsToDashboard, []);
});

const PLANTED = [
  { rule: "core->dashboard", file: "core/utils/convertUnitToPx.js", dep: "../../dashboard/tabs/config/mutationCodes.js", to: "dashboard/tabs/config/mutationCodes.js" },
  { rule: "core->workflows", file: "core/utils/convertUnitToPx.js", dep: "../../workflows/pdfExport/config.js", to: "workflows/pdfExport/config.js" },
  { rule: "dashboard->workflows", file: "dashboard/tabs/config/mutationCodes.js", dep: "../../../workflows/pdfExport/config.js", to: "workflows/pdfExport/config.js" },
  { rule: "composition-root", file: "core/utils/convertUnitToPx.js", dep: "../../bootstrap/registerServices.js", to: "bootstrap/registerServices.js" },
  { rule: "workflows->dashboard is only reported", file: "workflows/pdfExport/config.js", dep: "../../dashboard/tabs/config/mutationCodes.js", to: null }
];

for (const planted of PLANTED) {
  test(`planted ${planted.rule} import ${planted.to ? "fails" : "passes"} check-imports`, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "w11-gate-"));
    try {
      copyTree(root);
      const file = path.join(root, "_____________KDB3API", "KDB3", "js", ...planted.file.split("/"));
      const source = fs.readFileSync(file, "utf8");
      const match = source.match(/^define\(\[([^\]]*)\]/);
      assert.ok(match, "file starts with define([...");
      const deps = match[1].trim();
      fs.writeFileSync(file, source.replace(match[0], `define([${deps ? deps + ", " : ""}${JSON.stringify(planted.dep)}]`));
      const { status, json } = runCheck(root);
      if (planted.to === null) {
        assert.equal(status, 0);
        assert.equal(json.summary.layeringViolations, 0);
        assert.deepStrictEqual(json.workflowsToDashboard.map((v) => v.to.replace(/^.*\/js\//, "")), ["dashboard/tabs/config/mutationCodes.js"]);
        return;
      }
      assert.equal(status, 1);
      assert.equal(json.pass, false);
      assert.deepStrictEqual(json.layeringViolations.map((v) => [v.rule, v.from.replace(/^.*\/js\//, ""), v.to.replace(/^.*\/js\//, "")]), [[planted.rule, planted.file, planted.to]]);
      assert.ok(json.failures.some((message) => message.includes(planted.rule)));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}
