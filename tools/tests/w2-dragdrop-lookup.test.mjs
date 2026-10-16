// W2: dragDrop dropbox lookup runs on the DOM selectors only (the _KDB.elements.dashboardDropboxes /
// closestBoundDropbox registry hooks were never defined). Passes on the old and the new code.
// Run: node --test tools/tests/w2-dragdrop-lookup.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const SELECTOR = loadAmd(path.join(JS_ROOT, "core/cognosHost/config/pageChromeSelectors.js")).dragDrop.strings.canvasDropboxSelector;

function load(documentStub) {
  return loadAmd(path.join(JS_ROOT, "dashboard/canvas/dragDrop/dropboxes/lookup.js"), { stubs: { document: documentStub } });
}

test("readDashboardDropboxes queries the canvas dropbox selector", () => {
  const queried = [];
  const boxes = [{ id: "a" }, { id: "b" }];
  const lookup = load({ querySelectorAll: (selector) => (queried.push(selector), boxes) });
  assert.deepEqual(lookup.readDashboardDropboxes({ elements: { selectors: {} } }), boxes);
  assert.deepEqual(queried, [SELECTOR]);
  assert.deepEqual(lookup.readDashboardDropboxes(null), boxes);
});

test("resolveClosestBoundDropbox: bound attribute, then selector, then currentTarget, then null", () => {
  const lookup = load({});
  const bound = { id: "bound" };
  const byClass = { id: "bySelector" };
  const node = (map) => ({ closest: (selector) => map[selector] || null });
  const KDB = { elements: { selectors: {} } };
  assert.equal(lookup.resolveClosestBoundDropbox(KDB, node({ "[kdb_dropbox='true']": bound, [SELECTOR]: byClass })), bound);
  assert.equal(lookup.resolveClosestBoundDropbox(KDB, node({ [SELECTOR]: byClass })), byClass);
  const current = { id: "current" };
  assert.equal(lookup.resolveClosestBoundDropbox(KDB, node({}), { currentTarget: current }), current);
  assert.equal(lookup.resolveClosestBoundDropbox(KDB, null), null);
});
