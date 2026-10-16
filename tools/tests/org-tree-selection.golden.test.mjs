// Golden test for widgetVis drillthrough spec `orgSelection` (use value -> idValue token and level), Phase 2 W7.
// Recorded on the code before spec.js reused the org-tree owner's bracket/level helpers.
// Run: node --test tools/tests/org-tree-selection.golden.test.mjs
// Re-record (review the diff!): RECORD=1 node tools/tests/org-tree-selection.golden.test.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";
import { jsonSafe } from "./lib/org-tree-corpus.mjs";

const GOLDEN_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/org-tree-selection.golden.json");
const RECORD = process.env.RECORD === "1";
const golden = RECORD ? {} : JSON.parse(readFileSync(GOLDEN_FILE, "utf8"));
const spec = loadAmd(path.join(JS_ROOT, "dashboard/widgets/widgetVis/drillthrough/spec.js"), { stubs: { console: { error() {}, log() {} } } });

after(() => {
  if (RECORD) {
    const lines = Object.keys(golden).map((key) => "  " + JSON.stringify(key) + ": " + JSON.stringify(golden[key]));
    writeFileSync(GOLDEN_FILE, "{\n" + lines.join(",\n") + "\n}\n");
  }
});

const USE_VALUES = [
  "[Org].[level02].[Abt 7]", "[Org].[Org].[Org].&[1].&[10]", "[a]", "  [a]  ", "[ a ]", "[ ]", "[a]\n[b]", "[a]\n", "[a", "[a[b]]", "prefix [a] mid [b] suffix",
  "Plain", "", "   ", null, undefined, 42, "GGF#", "[Org].[level00].[Magistrat]", "[Org].[LEVEL010].[x]", "[Org].[level].[x]", "level0", "level00",
  "[level1].[level2]", "x level3 y level04", "DS_KAV|ALLE", "[Org].[level02].[]", "[Org].[level02].[ # ]", "[A].[B]\r\n[C]", "[x]\t"
];

function selectionOf(dominant, displays) {
  const snapshot = { resolution: { dominantValues: dominant, displayValues: displays } };
  const _KDB = { state: { widgets: { vis: { byId: { w1: { derived: {} } } }, settings: { lifecycle: "ready", byWidget: { w1: {} } } } }, runtime: { widgetVis: {} }, api: {}, config: { options: {} } };
  const result = spec.assembleDatapointDrillthroughSpec({
    _KDB, widgetId: "w1", categories: [{ c: 1 }],
    sichtApi: { getState: () => ({ activeSichtValue: "BW" }) },
    dienststelleApi: { getCurrentHierarchySnapshot: () => snapshot }
  });
  return result.orgSelection;
}

USE_VALUES.forEach((value, index) => {
  test("orgSelection use value #" + index + " " + JSON.stringify(value), () => {
    const actual = jsonSafe(selectionOf([value], [null]));
    if (RECORD) {
      golden["use:" + index] = actual;
      return;
    }
    assert.deepStrictEqual(actual, golden["use:" + index]);
  });
});

test("orgSelection sources: dominant, downstream fallback, display values, non-array resolution", () => {
  const cases = {
    dominant: { dominantValues: ["[a].[b]"], downstreamValues: ["[c].[d]"], displayValues: ["Disp"] },
    downstreamFallback: { dominantValues: [], downstreamValues: ["[c].[level03].[d]"], displayValues: [] },
    notArrays: { dominantValues: "x", downstreamValues: null, displayValues: "y" },
    displayShorter: { dominantValues: ["[a]", "b", "[level1].[c]"], displayValues: ["A"] },
    empty: {}
  };
  Object.keys(cases).forEach((name) => {
    const _KDB = { state: { widgets: { vis: { byId: { w1: { derived: {} } } }, settings: { lifecycle: "ready", byWidget: { w1: {} } } } }, runtime: { widgetVis: {} }, api: {}, config: { options: {} } };
    const result = spec.assembleDatapointDrillthroughSpec({
      _KDB, widgetId: "w1", categories: [{ c: 1 }], sichtApi: null,
      dienststelleApi: { getCurrentHierarchySnapshot: () => ({ resolution: cases[name] }) }
    });
    const actual = jsonSafe(result.orgSelection);
    if (RECORD) {
      golden["source:" + name] = actual;
      return;
    }
    assert.deepStrictEqual(actual, golden["source:" + name], name);
  });
});
