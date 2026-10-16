// P2-W9a: widgetBase toggles the KDB_absoluteLayoutGrid class on every page template element during move/resize
// gestures (dragDrop toggles the same class during a drag session). Pins widgetBase's side of the DOM outcome.
// Run: node --test tools/tests/w9a-layout-grid.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

function createPage(initial) {
  const classes = new Set(initial || []);
  return { classes, classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) } };
}

function load(doc, errors) {
  return loadAmd(path.join(JS_ROOT, "dashboard/widgets/widgetBase/interaction/interactionRuntime.js"), {
    stubs: { document: doc, window: {}, console: { error: (...a) => errors.push(a), warn() {}, log() {} } }
  });
}

test("toggleGridOverlay adds and removes the class on all page elements of the configured selector", () => {
  const pages = [createPage(), createPage(["other"])];
  const queries = [];
  const doc = { querySelectorAll: (selector) => { queries.push(selector); return pages; } };
  const runtime = load(doc, []);
  const _KDB = { elements: { selectors: { dragDrop: { pageTemplateSelector: ".custom-page" } } } };
  runtime.toggleGridOverlay({}, true, _KDB);
  assert.deepStrictEqual(pages.map((p) => [...p.classes].sort()), [["KDB_absoluteLayoutGrid"], ["KDB_absoluteLayoutGrid", "other"]]);
  runtime.toggleGridOverlay({}, true, _KDB);
  assert.equal(pages[0].classes.size, 1);
  runtime.toggleGridOverlay({}, false, _KDB);
  assert.deepStrictEqual(pages.map((p) => [...p.classes].sort()), [[], ["other"]]);
  assert.deepStrictEqual(queries, [".custom-page", ".custom-page", ".custom-page"]);
});

test("toggleGridOverlay falls back to the page chrome selector and logs instead of throwing", () => {
  const queries = [];
  const errors = [];
  const doc = { querySelectorAll: (selector) => { queries.push(selector); return []; } };
  load(doc, errors).toggleGridOverlay({}, true, {});
  assert.equal(queries.length, 1);
  assert.equal(queries[0], ".page.pagetemplateIndicator");
  const throwingDoc = { querySelectorAll: () => { throw new Error("dom boom"); } };
  load(throwingDoc, errors).toggleGridOverlay({}, true, {});
  assert.equal(errors.length, 1);
});
