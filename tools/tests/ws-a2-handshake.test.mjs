// Test: cognosHost registration no longer talks to authoring (authoring registers after the services and reads the facet itself).
// Run: node --test tools/tests/ws-a2-handshake.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const ORCHESTRATOR = path.join(JS_ROOT, "core/services/cognosHost/index.js");
const AUTHORING = path.join(JS_ROOT, "core/authoring/index.js");

function uiStateHost() {
  const host = { subscribed: 0, getCurrentDashboardUiState: () => ({ authoring: true, mode: "edit" }) };
  host.onDashboardUiStateChange = () => { host.subscribed += 1; return { remove() {} }; };
  return host;
}

test("authoring registered after the service stamps the facet and subscribes once", () => {
  const host = uiStateHost();
  const events = [];
  const _KDB = { cognosAPI: { dashboard: host }, services: {}, runtime: {}, api: {}, state: {}, events: { emit: (name, payload) => events.push([name, payload]) } };
  const service = loadAmd(ORCHESTRATOR)(_KDB);
  assert.equal(host.subscribed, 0, "registering the service does not subscribe anything");
  loadAmd(AUTHORING)(_KDB);
  assert.equal(_KDB.runtime.authoring.dashboardFacet, service.dashboard);
  assert.equal(host.subscribed, 1);
  assert.deepEqual(events, [["authoring:entered", { isAuthoring: true, source: "cognos-ui" }]]);
});

test("a registered authoring runtime is left alone by the service registration", () => {
  for (const runtime of [{}, { authoring: {} }, { authoring: { pendingDashboardFacetStamp() { throw new Error("must not be called"); } } }]) {
    const _KDB = { cognosAPI: {}, services: {}, runtime };
    const service = loadAmd(ORCHESTRATOR)(_KDB);
    assert.equal(_KDB.services.cognosHost, service);
    assert.equal(typeof service.dashboard.getFileName, "function");
  }
  const bare = { cognosAPI: {} };
  assert.equal(typeof loadAmd(ORCHESTRATOR)(bare).destroy, "function");
  assert.ok(bare.services.cognosHost);
});

test("a second registration call returns the registered service and does not create another", () => {
  const _KDB = { cognosAPI: {}, services: {}, runtime: {} };
  const factory = loadAmd(ORCHESTRATOR);
  const first = factory(_KDB);
  assert.equal(factory(_KDB), first);
  assert.equal(first.getGeneration(), _KDB.runtime.cognosHostService.generation);
});
