// Golden test: drillthrough BuildResult for org selections taken from every corpus tree, in both ways the tree reaches
// the service (built by the service from readRows, or built by widgetVis and passed as spec.orgTree). Phase 2 W7.
// Quirks pinned on purpose: ids ending in "#" (e.g. "GGF#") give "---"; see ws-d-drillthrough-url for the rest.
// Run: node --test tools/tests/org-tree-url.golden.test.mjs
// Re-record (review the diff!): RECORD=1 node tools/tests/org-tree-url.golden.test.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";
import { ROW_SETS, selectionsOf, jsonSafe } from "./lib/org-tree-corpus.mjs";

const GOLDEN_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/org-tree-url.golden.json");
const RECORD = process.env.RECORD === "1";
const golden = RECORD ? {} : JSON.parse(readFileSync(GOLDEN_FILE, "utf8"));
const KEYS = { BW: "dienststelle_bw_hierarchy", DEZPV: "dienststelle_dezpv_hierarchy" };
const LINKS = { pkzAnalysetool: { test: "https://test.example/pkz?run=1" } };
const SET_NAMES = ["bw realistic", "ids ending in hash", "deep chain", "widgetVis fixture", "dezpv realistic", "dezpv DS_ prefixes", "cognos use values", "same text different source ids"];

after(() => {
  if (RECORD) {
    const lines = Object.keys(golden).map((key) => "  " + JSON.stringify(key) + ": " + JSON.stringify(golden[key]));
    writeFileSync(GOLDEN_FILE, "{\n" + lines.join(",\n") + "\n}\n");
  }
});

const quiet = { error() {}, log() {}, warn() {} };
const rowsByName = Object.fromEntries(ROW_SETS);

function loadImpls() {
  const options = { stubs: { console: quiet } };
  const vis = loadAmd(path.join(JS_ROOT, "dashboard/widgets/widgetVis/drillthrough/orgTree.js"), options);
  const build = loadAmd(path.join(JS_ROOT, "core/services/drillthrough/org/buildOrgTreeFromRows.js"), options);
  return { visBuild: vis.buildOrgTree, coreBuild: build };
}

function loadService(readRows) {
  const register = loadAmd(path.join(JS_ROOT, "core/services/drillthrough/index.js"), {
    stubs: { window: { location: { href: "https://cognos-test.example/x" }, open: () => ({}) }, console: quiet }
  });
  return register({ services: { tableData: { readRows } }, config: { links: LINKS } });
}

function summarize(result) {
  const cfg = result.drillConfig || {};
  return {
    ok: result.ok,
    errorCode: result.errorCode,
    org: [cfg.p_gruppe_drillFromGDB, cfg.p_dienststelle_drillFromGDB, cfg.p_dezpv_drillFromGDB],
    warnings: ((result.diagnostics && result.diagnostics.warnings) || []).map((w) => w.code),
    urlSha: result.url ? createHash("sha1").update(result.url).digest("hex") : null
  };
}

function check(name, actual) {
  const value = jsonSafe(actual);
  if (RECORD) {
    golden[name] = value;
    return;
  }
  assert.ok(Object.prototype.hasOwnProperty.call(golden, name), "missing golden " + name);
  assert.deepStrictEqual(value, golden[name], name);
}

const spec = (sicht, selectedValues, extra) => ({
  source: "icon",
  widgetId: "w1",
  kennzahlCode: "KZ_100",
  sicht: sicht,
  visType: "bar",
  selectedDimension: "Geschlecht",
  yearContext: { defaultYear: 2023 },
  orgSelection: { selectedValues: selectedValues },
  ...extra
});

for (const sicht of ["BW", "DEZPV"]) {
  for (const setName of SET_NAMES) {
    test("url: " + sicht + " / " + setName, () => {
      const impl = loadImpls();
      const rows = rowsByName[setName];
      const readRows = (descriptors) => (descriptors[0].tableName === KEYS[sicht] ? rows : []);
      const service = loadService(readRows);
      const tree = impl.coreBuild(rows, sicht, KEYS[sicht]);
      const groups = selectionsOf(tree);
      const visTree = impl.visBuild({ readRows: readRows, sicht: sicht });
      let n = 0;
      for (const kind of ["singles", "pairs", "children", "all"]) {
        for (const selection of groups[kind]) {
          const fromService = summarize(service.buildDrillthroughUrl(spec(sicht, selection)));
          const fromVis = summarize(service.buildDrillthroughUrl(spec(sicht, selection, { orgTree: visTree })));
          assert.deepStrictEqual(fromVis, fromService, "service-built and widgetVis-built trees give the same URL");
          check("url:" + sicht + ":" + setName + ":" + kind + ":" + n, fromService);
          n += 1;
        }
      }
      check("url:" + sicht + ":" + setName + ":count", n);
    });
  }
}

test("url quirk: a group id ending in # gives --- in the Dienststelle prompt", () => {
  const service = loadService((descriptors) => (descriptors[0].tableName === KEYS.BW ? rowsByName["ids ending in hash"] : []));
  const result = summarize(service.buildDrillthroughUrl(spec("BW", [{ idValue: "SX1#", displayValue: "Stelle X1", level: 2 }])));
  check("quirk:trailing hash", result);
  assert.deepStrictEqual(result.org, ["", "---", ""]);
});
