// W9b grep gates as a test: filters reach widgetVis only through its published selectors, the three widgetVis shims are gone, widgetTopN reaches
// widgetVis only through its published module.
// Run: node --test tools/tests/w9b-boundaries.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildGraph, JS_ROOT } from "../lib/amd-graph.mjs";

const graph = buildGraph();
const edgesFrom = (prefix) => graph.edges.filter((edge) => edge.from.startsWith(prefix));

test("filters import widgets/ only through widgetVis' published selectors.js (ACTION_TYPES)", () => {
  const offenders = edgesFrom("dashboard/filters/")
    .filter((edge) => edge.to.startsWith("dashboard/widgets/") && edge.to !== "dashboard/widgets/widgetVis/selectors.js");
  assert.deepEqual(offenders.map((edge) => edge.from + " -> " + edge.to), []);
});

test("the widgetVis shims of the filter and TopN couplings are deleted", () => {
  for (const rel of ["actions/runTopNFilterConfirmWave.js", "effects/readConfirmedJahrYear.js", "effects/applyVisualizationProperties.js"]) {
    assert.equal(fs.existsSync(path.join(JS_ROOT, "dashboard/widgets/widgetVis", rel)), false, rel);
  }
});

test("widgetTopN imports only published widgetVis files", () => {
  const targets = edgesFrom("dashboard/widgets/widgetTopN/")
    .filter((edge) => edge.to.startsWith("dashboard/widgets/widgetVis/"))
    .map((edge) => edge.to);
  const published = new Set(["dashboard/widgets/widgetVis/selectors.js", "dashboard/widgets/widgetVis/visualization.js"]);
  assert.deepEqual(targets.filter((to) => !published.has(to)), []);
});

test("widgetVis does not import from filters; the filter event family lives in core/events", () => {
  const offenders = edgesFrom("dashboard/widgets/widgetVis/").filter((edge) => edge.to.startsWith("dashboard/filters/"));
  assert.deepEqual(offenders.map((edge) => edge.from + " -> " + edge.to), []);
  assert.equal(fs.existsSync(path.join(JS_ROOT, "core/events/filters.js")), true);
  assert.equal(fs.existsSync(path.join(JS_ROOT, "dashboard/filters/_core/events.js")), false);
});
