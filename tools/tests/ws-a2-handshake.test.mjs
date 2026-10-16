// Test: cognosHost side of the authoring handshake (index.js registers, then calls runtime.authoring.pendingDashboardFacetStamp).
// Run: node --test tools/tests/ws-a2-handshake.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const ORCHESTRATOR = path.join(JS_ROOT, "core/services/cognosHost/__orchestratorCognosHost.js");

function uiStateHost() {
  const host = { subscribed: 0, getCurrentDashboardUiState: () => ({ authoring: true, mode: "edit" }) };
  host.onDashboardUiStateChange = () => { host.subscribed += 1; return { remove() {} }; };
  return host;
}

test("the service is registered before pendingDashboardFacetStamp runs; authoring subscribes once", () => {
  const host = uiStateHost();
  const _KDB = { cognosAPI: { dashboard: host }, services: {}, runtime: {} };
  const seen = [];
  const snapshots = [];
  let stamps = 0;
  _KDB.runtime.authoring = {
    pendingDashboardFacetStamp() {
      stamps += 1;
      const service = _KDB.services.cognosHost;
      seen.push(service);
      assert.ok(service, "services.cognosHost is published before the stamp");
      assert.equal(typeof service.dashboard.subscribeUiState, "function", "dashboard facet is usable");
      service.dashboard.subscribeUiState((snapshot) => snapshots.push(snapshot));
    }
  };
  const service = loadAmd(ORCHESTRATOR)(_KDB);
  assert.equal(stamps, 1);
  assert.equal(seen[0], service);
  assert.equal(host.subscribed, 1);
  assert.deepEqual(snapshots, [{ authoring: true, mode: "edit" }]);
});

test("no authoring runtime or a non-function stamp: registration still works", () => {
  for (const runtime of [{}, { authoring: {} }, { authoring: { pendingDashboardFacetStamp: null } }, { authoring: { pendingDashboardFacetStamp: "x" } }]) {
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
