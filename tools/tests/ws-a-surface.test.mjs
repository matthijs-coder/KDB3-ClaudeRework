// Golden test: public surface of the cognosHost ring-1 service (_KDB.services.cognosHost).
// Run: node --test tools/tests/ws-a-surface.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const ORCHESTRATOR = path.join(JS_ROOT, "core/services/cognosHost/__orchestratorCognosHost.js");

const FACET_KEYS = {
  filters: ["clearFilter", "findFilterItem", "listFilterItems", "listPageContextScopes", "readFilterValues", "waitForPageContextReady", "writeFilter"],
  widgets: ["enterFocusMode", "exitFocusMode", "hasContent", "renderWidget", "setWidgetLayout", "setWidgetProperty"],
  canvas: ["listCanvasWidgets", "setCanvasPageSize", "whenCanvasReady", "whenRenderComplete", "whenRenderStart", "whenWidgetReady"],
  visualization: [
    "addDataItemsToSlot", "addOrReplaceLocalFilter", "clearAllLocalFilters", "clearAllSlots", "getSelections", "getVisTitle", "getVisType",
    "removeLocalFilter", "setContentProperty", "setCustomLabelInSlot", "setDataSource", "setTopBottomOnSlot", "setVisTitle", "setVisType",
    "sortDataItemInSlot", "subscribeSelections"
  ],
  dataQuery: ["peekQueryRows", "readQueryRows", "waitForQueryResult"],
  dashboard: [
    "getBoardId", "getDashboardBiBaseUrl", "getEnvironmentSource", "getFileName", "getDashboardVersion", "getLanguage", "getMode", "getUserName",
    "openAppView", "replaceWithBiHomePerspective", "subscribeUiState"
  ],
  dataSources: ["hasErrorDataSource"],
  messages: ["showToast"],
  tabs: ["getTabName", "listTabs", "setTabName"]
};
const SERVICE_KEYS = ["destroy", "getGeneration", "isCurrentGeneration", "isDisposed", ...Object.keys(FACET_KEYS)];

// One representative op per facet, with valid-looking arguments.
const PROBES = [
  ["filters", "listFilterItems", [{}], "FILTERS_HOST_UNAVAILABLE"],
  ["widgets", "hasContent", ["w1"], "WIDGETS_HOST_UNAVAILABLE"],
  ["canvas", "listCanvasWidgets", [{}], "CANVAS_HOST_UNAVAILABLE"],
  ["visualization", "getVisType", ["w1"], "VISUALIZATION_HOST_UNAVAILABLE"],
  ["dataQuery", "peekQueryRows", ["w1"], "DATAQUERY_HOST_UNAVAILABLE"],
  ["dashboard", "getFileName", [], "DASHBOARD_HOST_UNAVAILABLE"],
  ["dataSources", "hasErrorDataSource", [], null],
  ["messages", "showToast", ["hello", "info"], "MESSAGES_HOST_UNAVAILABLE"],
  ["tabs", "listTabs", [{}], "TABS_HOST_UNAVAILABLE"]
];

function create(cognosAPI) {
  const _KDB = { cognosAPI, services: {}, runtime: {} };
  const factory = loadAmd(ORCHESTRATOR);
  const svc = factory(_KDB);
  return { _KDB, svc };
}

const quiet = (fn) => async () => {
  const saved = console.error;
  console.error = () => {};
  try {
    await fn();
  } finally {
    console.error = saved;
  }
};

test("service and facet key lists are frozen", () => {
  const { _KDB, svc } = create({});
  assert.deepEqual(Object.keys(svc).sort(), [...SERVICE_KEYS].sort());
  for (const [facet, keys] of Object.entries(FACET_KEYS)) {
    assert.deepEqual(Object.keys(svc[facet]).sort(), [...keys].sort(), `facet ${facet}`);
  }
  assert.equal(_KDB.services.cognosHost, svc);
});

test("facet identity is stable and the service is registered once", async () => {
  const { _KDB, svc } = create({});
  const before = Object.fromEntries(Object.keys(FACET_KEYS).map((f) => [f, svc[f]]));
  await svc.tabs.listTabs({});
  svc.dashboard.getFileName();
  for (const f of Object.keys(FACET_KEYS)) {
    assert.equal(svc[f], before[f], `facet ${f} identity`);
  }
  assert.equal(Object.getOwnPropertyDescriptor(svc, "filters").get, undefined, "facets are plain values, not lazy getters");
  const factory = loadAmd(ORCHESTRATOR);
  assert.equal(factory(_KDB), svc, "second call returns the registered service");
});

test("generation tokens", () => {
  const { svc } = create({});
  const generation = svc.getGeneration();
  assert.equal(typeof generation, "number");
  assert.equal(svc.isCurrentGeneration(generation), true);
  assert.equal(svc.isCurrentGeneration(generation + 1), false);
  svc.destroy();
  assert.equal(svc.isCurrentGeneration(generation), false);
});

test("HOST_UNAVAILABLE when _KDB.cognosAPI has no theme", quiet(async () => {
  const { svc } = create({});
  for (const [facet, op, args, code] of PROBES) {
    const outcome = await svc[facet][op](...args);
    if (code === null) {
      // dataSources.hasErrorDataSource treats a missing host as "no error data source".
      assert.deepEqual(outcome, { ok: true, outcome: "ok", data: false }, `${facet}.${op}`);
      continue;
    }
    assert.equal(outcome.ok, false, `${facet}.${op}`);
    assert.equal(outcome.outcome, "failed", `${facet}.${op}`);
    assert.equal(outcome.errorCode, code, `${facet}.${op}`);
  }
}));

test("disposed Outcome after destroy; facets stay callable", quiet(async () => {
  const { _KDB, svc } = create({});
  svc.destroy();
  assert.equal(svc.isDisposed(), true);
  assert.equal(_KDB.services.cognosHost, null);
  for (const [facet, op, args] of PROBES) {
    const outcome = await svc[facet][op](...args);
    assert.deepEqual(outcome, { ok: false, outcome: "aborted", reason: "disposed" }, `${facet}.${op}`);
  }
}));

test("destroy is idempotent and keeps a newer registration", () => {
  const { _KDB, svc } = create({});
  svc.destroy();
  svc.destroy();
  const { _KDB: other, svc: replacement } = create({});
  const marker = {};
  other.services.cognosHost = marker;
  replacement.destroy();
  assert.equal(other.services.cognosHost, marker);
  assert.equal(_KDB.services.cognosHost, null);
});

test("runtime shape after create and after destroy", () => {
  const { _KDB, svc } = create({});
  const empty = () => ({
    subscriptions: [],
    abortControllers: {},
    adapters: { filterItemsByKey: {}, selectionUnsubscribeByWidgetId: {}, lastSelectionDtoByWidgetId: {} },
    pendingPromises: { filterWritesByKey: {} }
  });
  const generation = svc.getGeneration();
  assert.deepEqual(_KDB.runtime.cognosHostService, { generation, waitSequence: 0, ...empty() });
  svc.destroy();
  assert.deepEqual(_KDB.runtime.cognosHostService, { generation, waitSequence: 0, ...empty() });
});

test("destroy releases subscriptions and aborts pending waits", () => {
  const { _KDB, svc } = create({});
  const rt = _KDB.runtime.cognosHostService;
  let released = 0;
  const controller = new AbortController();
  rt.subscriptions.push(() => { released += 1; });
  rt.abortControllers["1"] = controller;
  svc.destroy();
  assert.equal(released, 1);
  assert.equal(controller.signal.aborted, true);
  assert.deepEqual(_KDB.runtime.cognosHostService.subscriptions, []);
});

test("a second service never reuses a generation token", () => {
  const { _KDB, svc } = create({});
  const first = svc.getGeneration();
  svc.destroy();
  const second = loadAmd(ORCHESTRATOR)(_KDB);
  assert.ok(second.getGeneration() > first);
});

test("error-code values stay exact (stubbed missing capability)", quiet(async () => {
  const { svc } = create({ widgets: {}, tabs: {}, dashboard: {}, dataSources: {}, glassMessages: {} });
  assert.equal((await svc.widgets.hasContent("w1")).errorCode, "WIDGETS_HOST_CAPABILITY_MISSING");
  assert.equal((await svc.tabs.listTabs({})).errorCode, "TABS_HOST_CAPABILITY_MISSING");
  assert.equal((await svc.dashboard.getFileName()).errorCode, "DASHBOARD_HOST_CAPABILITY_MISSING");
  assert.equal((await svc.messages.showToast("x", "info")).errorCode, "MESSAGES_HOST_CAPABILITY_MISSING");
  assert.deepEqual(await svc.widgets.hasContent(""), { ok: true, outcome: "ok", data: false });
  assert.equal((await svc.widgets.setWidgetProperty("", "a", 1)).errorCode, "WIDGETS_INVALID_ID");
}));

test("aborted signal short-circuits before touching the host", quiet(async () => {
  const { svc } = create({});
  const controller = new AbortController();
  controller.abort();
  assert.deepEqual(await svc.tabs.listTabs({ signal: controller.signal }), { ok: false, outcome: "aborted", reason: "aborted" });
}));

test("tabs ok path through a stub host", async () => {
  const { svc } = create({ tabs: { getTabsContainers: () => [] } });
  assert.deepEqual(await svc.tabs.listTabs({}), { ok: true, outcome: "ok", data: [] });
});
