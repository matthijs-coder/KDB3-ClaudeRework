// P2-W11: the order in which the services are registered on _KDB.services (cognosHost ... drillthrough). dashboardPdf
// and the writeback services sit between core services (history registers after dashboardPdf and before writeback),
// so moving them out of core/ must not move them in this list. Recorded on main before the move.
// Run: node --test tools/tests/w11-services-registration.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const QUIET = { error() {}, warn() {}, log() {}, info() {}, debug() {} };
const REGISTRAR = "bootstrap/registerServices.js";

function register(preset) {
  const registerServices = loadAmd(path.join(JS_ROOT, REGISTRAR), { stubs: { console: QUIET } });
  const _KDB = { elements: { selectors: {} }, runtime: {}, state: {}, events: { emit() {}, subscribe() {} }, config: {}, services: preset || {} };
  loadAmd(path.join(JS_ROOT, "core/cognosHost/registerCognosHostSelectors.js"))(_KDB);
  const returned = registerServices(_KDB);
  return { _KDB, returned };
}

test("services are registered in the recorded order and the registrar returns _KDB.services", () => {
  const { _KDB, returned } = register();
  assert.strictEqual(returned, _KDB.services);
  assert.deepStrictEqual(Object.keys(_KDB.services), [
    "cognosHost", "chrome", "tableData", "loading", "message", "widgetBindingPlan", "widgetBindingApply", "widgetBinding",
    "dashboardPdf", "history", "writebackGet", "writebackSet", "writebackMap", "writebackBridge", "drillthrough"
  ]);
});

test("a history service registered earlier is kept and stays first in the list", () => {
  const history = { marker: true };
  const { _KDB } = register({ history });
  assert.strictEqual(_KDB.services.history, history);
  assert.deepStrictEqual(Object.keys(_KDB.services).slice(0, 2), ["history", "cognosHost"]);
  assert.equal(Object.keys(_KDB.services).indexOf("dashboardPdf") < Object.keys(_KDB.services).indexOf("writebackGet"), true);
});
