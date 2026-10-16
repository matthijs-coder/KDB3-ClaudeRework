// Golden test: shape of the pure Cognos wrapper (_KDB.cognosAPI.<theme>.<fn>).
// Run: node --test tools/tests/ws-a-cognosapi.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const ORCHESTRATOR = path.join(JS_ROOT, "core/cognosAPI/__orchestratorCognosAPI.js");

const EXPECTED = {
  glassMessages: [
    "showErrorDialog", "showMessageDialog", "showToast"
  ],
  dashboard: [
    "getBoardId", "getCurrentDashboardUiState", "getDashboardBiBaseUrl", "getDashboardState", "getDashboardVersion", "getEnvironmentSource",
    "getFileName", "getLanguage", "getMode", "getUserInfo", "getUserName", "onDashboardUiStateChange", "openAppView", "resolveCaptureRoot",
    "setDashboardZoom", "setFullScreen", "setMode"
  ],
  canvas: [
    "findCanvasContent", "getCanvas", "getCanvasFeature", "getCanvasPropertiesList", "getCanvasPropertyValue", "getCanvasWhenReady",
    "setCanvasPropertyValue"
  ],
  dataSources: [
    "getActiveDataSourceId", "getDataSource", "getDataSourceList", "getDataSourcesArray", "getDataSourcesFeature", "setActiveDataSourceId"
  ],
  widgets: [
    "enterWidgetFocusMode", "exitWidgetFocusMode", "getContainer", "getContent", "getContentPropertyNameList", "getContentPropertyValue",
    "getPropertyLayoutList", "getScope", "getType", "getWidget", "renderWidget", "setLayoutPosition"
  ],
  visualization: [
    "getCategoriesDataArr", "getContentPropertyValue", "getLocalFilters", "getLocalFiltersList", "getSlotList", "getSlotValues", "getSlots",
    "getVisApi", "getVisTitle", "getVisType", "getVisualization", "getVizDataSource", "getVizDataSourceId", "getVizDataSourceName", "getVizFeature",
    "removeLocalFilter", "setContentPropertyValue", "setCustomLabel", "setVisTitle", "setVisType", "setVizDataSource"
  ],
  dataQuery: [
    "getDataQueryResult", "peekCurrentQueryResult"
  ],
  filters: [
    "clearPageContextFilter", "deleteAllPageContextItems", "getAllGlobalFilterItems", "getAllPageContextFilterItems", "getFilterCommand",
    "getFilterItemId", "getFilterItemLabel", "getFilterScope", "getFilterSourceId", "getFilterValues", "getPageContext", "getPageContextItemsArr",
    "getPageContextService", "removePageContextFilter", "replaceFilterContext", "triggerDashboardEvent", "updateFilter", "updateFilterContext",
    "updateFilterContextRaw"
  ],
  tabs: [
    "getTabName", "getTabsContainers", "getTabsContent", "setTabName"
  ],
  async: [
    "getCanvasWhenReady", "getWidgetWhenReady", "whenRenderComplete", "whenRenderStart"
  ],
};

function build(stubs = {}) {
  const _KDB = {};
  loadAmd(ORCHESTRATOR, { stubs })(_KDB);
  return _KDB;
}

test("ten themes in a stable order", () => {
  const _KDB = build();
  assert.deepEqual(Object.keys(_KDB.cognosAPI), Object.keys(EXPECTED));
});

test("theme -> method key list is frozen", () => {
  const _KDB = build();
  const actual = {};
  for (const theme of Object.keys(_KDB.cognosAPI)) {
    actual[theme] = Object.keys(_KDB.cognosAPI[theme]).sort();
    for (const name of actual[theme]) {
      assert.equal(typeof _KDB.cognosAPI[theme][name], "function", `${theme}.${name}`);
    }
  }
  assert.deepEqual(actual, EXPECTED);
});

test("dynamic method names read by ring 1 exist", () => {
  const api = build().cognosAPI;
  for (const name of ["getFileName", "getDashboardVersion", "getEnvironmentSource", "getBoardId", "getDashboardBiBaseUrl", "getLanguage", "getUserName", "getMode"]) {
    assert.equal(typeof api.dashboard[name], "function", `dashboard.${name}`);
  }
  for (const name of ["whenRenderStart", "whenRenderComplete", "getCanvasWhenReady", "getWidgetWhenReady"]) {
    assert.equal(typeof api.async[name], "function", `async.${name}`);
  }
  assert.equal(typeof api.dashboard.resolveCaptureRoot, "function");
});

test("getDashboardBiBaseUrl: cognos/bi prefix from href, origin fallback, no document", () => {
  const withLocation = (location) => build({ document: { location } }).cognosAPI.dashboard.getDashboardBiBaseUrl();
  assert.equal(withLocation({ href: "https://host.example/p2pd/cognos/bi/v1/disp?x=1", origin: "https://host.example" }), "https://host.example/p2pd/cognos/bi/");
  assert.equal(withLocation({ href: "https://host.example/other/page", origin: "https://host.example" }), "https://host.example/cognos/bi/");
  assert.equal(withLocation({ href: "https://h/COGNOS/BI/x", origin: "https://h" }), "https://h/COGNOS/BI/");
  assert.equal(build({ document: { location: null } }).cognosAPI.dashboard.getDashboardBiBaseUrl(), null);
});

test("getBoardId flattens the host board id", () => {
  const api = build({ __getDashboardAPI: () => ({ getDashboardInfo: () => ({ boardId: 42 }) }) }).cognosAPI.dashboard;
  assert.equal(api.getBoardId(), "42");
});
