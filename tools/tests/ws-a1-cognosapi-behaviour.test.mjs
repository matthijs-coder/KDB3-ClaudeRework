// Behaviour golden test for core/cognosAPI (pure Cognos wrapper): recorded against the pre-refactor code,
// must stay green after the merge-per-namespace cleanup.
// Run: node --test tools/tests/ws-a1-cognosapi-behaviour.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const ORCHESTRATOR = path.join(JS_ROOT, "core/cognosAPI/__orchestratorCognosAPI.js");

function build(stubs = {}) {
  const _KDB = {};
  loadAmd(ORCHESTRATOR, { stubs })(_KDB);
  return _KDB.cognosAPI;
}

function silenceConsole(fn) {
  const original = console.error;
  console.error = () => {};
  try {
    return fn();
  } finally {
    console.error = original;
  }
}

function makeNode({ attrs = {}, matches = [], hidden = false, children = [], parent = null, rects = 1 } = {}) {
  const node = {
    hidden,
    getAttribute: (name) => (name in attrs ? attrs[name] : null),
    matches: (selector) => matches.includes(selector),
    closest: (selector) => {
      for (let cur = node; cur; cur = cur.parent) if (cur.matches(selector)) return cur;
      return null;
    },
    querySelectorAll: (selector) => children.filter((child) => child.matches(selector)),
    getClientRects: () => new Array(rects),
    contains: (other) => children.includes(other),
    parent,
    children,
  };
  children.forEach((child) => { child.parent = node; });
  return node;
}

test("dataQuery: sync/async result, missing chain, string id, peek semantics", async () => {
  const result = { rows: [1] };
  const widgetWith = (getResult) => ({ getFeature: () => ({ getCurrentQueryResults: () => ({ getResult }) }) });
  const calls = [];
  const api = build({
    __getDashboardAPI: () => ({ getCanvas: () => ({ getContent: (id) => { calls.push(id); return widgetWith(() => result); } }) }),
  }).dataQuery;
  assert.equal(await api.getDataQueryResult(widgetWith(() => result)), result);
  assert.equal(await api.getDataQueryResult(widgetWith(() => Promise.resolve(result))), result);
  assert.equal(await api.getDataQueryResult(widgetWith(() => undefined)), null);
  assert.equal(await api.getDataQueryResult(null), null);
  assert.equal(await api.getDataQueryResult({}), null);
  assert.equal(await api.getDataQueryResult({ getFeature: () => null }), null);
  assert.equal(await api.getDataQueryResult({ getFeature: () => ({}) }), null);
  assert.equal(await api.getDataQueryResult({ getFeature: () => ({ getCurrentQueryResults: () => ({}) }) }), null);
  assert.equal(await api.getDataQueryResult("w1"), result);
  assert.deepEqual(calls, ["w1"]);
  assert.equal(api.peekCurrentQueryResult(widgetWith(() => result)), result);
  assert.equal(api.peekCurrentQueryResult(widgetWith(() => Promise.resolve(result))), null);
  silenceConsole(() => assert.equal(api.peekCurrentQueryResult(widgetWith(() => { throw new Error("boom"); })), null));
  await assert.rejects(api.getDataQueryResult(widgetWith(() => { throw new Error("boom"); })), /boom/);
});

test("filters: scope split, value clone, update payloads, non-array page context", () => {
  const item = (scope) => ({ getScope: () => scope });
  const items = [item("global"), item("page"), item("tab")];
  const updates = [];
  let pageContextItems = items;
  const api = build({
    __getDashboardAPI: () => ({
      getFeature: (name) => {
        assert.equal(name, "PageContextService");
        return {
          getPageContext: () => ({
            getPageContextItems: () => pageContextItems,
            updateFilterContext: (a, b) => { updates.push([a, b]); return "updated"; },
            deletePageContextItems: () => "deleted",
          }),
        };
      },
    }),
  }).filters;
  assert.deepEqual(api.getAllGlobalFilterItems(), [items[0]]);
  assert.deepEqual(api.getAllPageContextFilterItems(), [items[1], items[2]]);
  assert.equal(api.getPageContextItemsArr(true), items);
  pageContextItems = undefined;
  assert.deepEqual(api.getPageContextItemsArr(), []);
  assert.deepEqual(api.getAllGlobalFilterItems(), []);
  assert.equal(api.deleteAllPageContextItems(), "deleted");
  assert.deepEqual(api.getFilterValues({ getValues: () => [{ d: "a", u: "[x].[a]", extra: 1 }, {}, null] }), [
    { d: "a", u: "[x].[a]" }, { d: null, u: null }, { d: null, u: null },
  ]);
  assert.deepEqual(api.getFilterValues({ getValues: () => [] }), []);
  assert.deepEqual(api.getFilterValues({ getValues: () => null }), []);
  assert.equal(api.getFilterCommand({ getExclude: () => true }), "notin");
  assert.equal(api.getFilterCommand({ getExclude: () => false }), "in");
  const filter = new Proxy({}, { get: (_t, name) => () => `<${String(name)}>` });
  assert.equal(api.clearPageContextFilter(filter), "updated");
  assert.equal(api.replaceFilterContext(filter, ["v"]), "updated");
  api.updateFilterContext(filter, ["v"]);
  api.removePageContextFilter(filter);
  api.updateFilterContextRaw({ a: 1 });
  api.updateFilterContextRaw({ a: 1 }, { command: "x" });
  api.updateFilter("s", "c");
  assert.deepEqual(updates[0], [{ sourceId: "<getSourceId>", itemId: "<getItemId>", scope: "<getScope>" }, { command: "clearValues" }]);
  assert.deepEqual(updates[1][1], { command: "replace", exclude: false, values: ["v"] });
  assert.deepEqual(Object.keys(updates[1][0]), ["dataType", "eventSourceId", "isHierarchy", "isNamedSet", "itemId", "itemName", "scope", "sourceId"]);
  assert.deepEqual(updates[2][1], { command: "update", values: ["v"] });
  assert.deepEqual(Object.keys(updates[2][0]), [
    "sourceId", "itemId", "itemName", "dataType", "usage", "scope", "openViewOnLoad", "isHierarchy", "isModeledFilter", "isNamedSet",
  ]);
  assert.deepEqual(updates[3], [{ item: filter, scope: "<getScope>", origin: "filter" }, { command: "delete" }]);
  assert.deepEqual(updates[4], [{ a: 1 }, { command: "update", values: [] }]);
  assert.deepEqual(updates[5], [{ a: 1 }, { command: "x" }]);
  assert.deepEqual(updates[6], ["s", "c"]);
});

test("filters: host errors propagate without being swallowed", () => {
  const api = build({ __getDashboardAPI: () => { throw new Error("host down"); } }).filters;
  silenceConsole(() => assert.throws(() => api.getPageContextItemsArr(), /host down/));
  silenceConsole(() => assert.throws(() => api.getAllGlobalFilterItems(), /host down/));
});

test("dashboard: user name, board id, version, ui state", () => {
  const dashboard = (host, extra = {}) => build({ __getDashboardAPI: () => host, ...extra }).dashboard;
  const account = (a) => ({ getFeature: () => ({ getUserAccount: () => a }) });
  assert.equal(dashboard(account({ userName: "  Ann  " })).getUserName(), "Ann");
  assert.equal(dashboard(account({ userName: 7 })).getUserName(), "7");
  assert.equal(dashboard(account({ userName: "   " })).getUserName(), null);
  assert.equal(dashboard(account(null)).getUserName(), null);
  assert.equal(dashboard(account(Promise.resolve({ userName: "x" }))).getUserName(), null);
  assert.equal(dashboard(account({})).getUserName(), null);
  const info = (i) => ({ getDashboardInfo: () => i });
  assert.equal(dashboard(info({ boardId: "b1" })).getBoardId(), "b1");
  assert.equal(dashboard(info({ boardId: "" })).getBoardId(), null);
  assert.equal(dashboard(info({ boardId: {} })).getBoardId(), null);
  assert.equal(dashboard(info(null)).getBoardId(), null);
  assert.equal(dashboard(info(Promise.resolve({ boardId: 1 }))).getBoardId(), null);
  const version = (spec, window) => dashboard({ getSpec: () => spec }, { window }).getDashboardVersion();
  assert.equal(version({ version: "9" }, { __glassAppController: { versionInfo: "11.2.4-2023" } }), "11.2.4");
  assert.equal(version({ version: "9" }, { __glassAppController: { versionInfo: "11.2" } }), "11.2");
  assert.equal(version({ version: "9" }, { top: { __glassAppController: { versionInfo: { productVersion: "12.0.1-x" } } } }), "12.0.1");
  assert.equal(version({ version: "9" }, {}), "9");
  assert.equal(version({ schemaVersion: "s" }, {}), "s");
  assert.equal(version({}, {}), null);
  const state = (s) => dashboard({ getFeature: () => s }).getCurrentDashboardUiState();
  assert.equal(state(null), null);
  assert.equal(state({ getUiState: () => "ui", getState: () => "st" }), "ui");
  assert.equal(state({ getState: () => "st" }), "st");
  assert.equal(state({}), null);
  assert.equal(dashboard({}, { document: { location: { href: "https://h/x" } } }).getEnvironmentSource(), "https://h/x");
  assert.equal(dashboard({}, { document: undefined }).getEnvironmentSource(), null);
});

test("dashboard: setDashboardZoom default + openAppView/getFileName pass-through", async () => {
  const sets = [];
  const api = build({
    __getDashboardAPI: () => ({
      getCanvasWhenReady: () => Promise.resolve({ setPropertyValue: (k, v) => sets.push([k, v]) }),
      openAppView: (v) => `open:${v}`,
      getSpec: () => ({ name: "file" }),
    }),
  }).dashboard;
  await api.setDashboardZoom();
  await api.setDashboardZoom("fitWidth");
  assert.deepEqual(sets, [["defaultZoom", "fitPage"], ["defaultZoom", "fitWidth"]]);
  assert.equal(api.openAppView("home"), "open:home");
  assert.equal(api.getFileName(), "file");
});

test("widgets: layout position, render, container/scope/value accessors", async () => {
  const sets = [];
  const content = {
    setPropertyValue: (k, v) => sets.push([k, v]),
    getPropertyValue: (k) => `v:${k}`,
    getContainer: () => "container",
  };
  let widget = { render: () => "rendered", getType: () => "t", getScope: () => "s" };
  const api = build({
    __getDashboardAPI: () => ({ getCanvas: () => ({ getContent: () => content, getWidget: () => widget }) }),
  }).widgets;
  api.setLayoutPosition("w", { left: 1, top: undefined, height: 0, ignored: 5 });
  api.setLayoutPosition("w");
  assert.deepEqual(sets, [["left", 1], ["height", 0]]);
  assert.equal(await api.renderWidget("w"), "rendered");
  widget = {};
  assert.equal(await api.renderWidget("w"), undefined);
  widget = { getType: () => "t", getScope: () => "s" };
  assert.deepEqual([api.getType("w"), api.getScope("w"), api.getContainer("w"), api.getContentPropertyValue("p", "w")], ["t", "s", "container", "v:p"]);
  assert.equal(api.getContent("w"), content);
  assert.equal(api.getWidget("w"), widget);
});

test("widgets: focus mode DOM clicks", () => {
  const clicks = [];
  const button = (name) => ({ click: () => clicks.push(name) });
  const widgetEl = { querySelector: (sel) => (sel === "div.resizeEdge.topRight > *" ? button("max") : null) };
  const api = build({ document: { getElementById: (id) => (id === "w1" ? widgetEl : null), querySelector: () => null } }).widgets;
  assert.equal(api.enterWidgetFocusMode("w1"), true);
  assert.equal(api.enterWidgetFocusMode("nope"), false);
  assert.equal(api.enterWidgetFocusMode(), false);
  assert.deepEqual(clicks, ["max"]);
  assert.equal(api.exitWidgetFocusMode(""), false);
  assert.equal(api.exitWidgetFocusMode("w1"), false);

  const exitWith = (container, globalContainer) => {
    const expanded = { closest: () => container };
    const doc = {
      querySelector: (sel) => (sel.endsWith('[id="w1"]') ? expanded : globalContainer),
    };
    return build({ document: doc }).widgets.exitWidgetFocusMode("w1");
  };
  const focusButton = button("focus-collapse");
  assert.equal(exitWith({ querySelector: (sel) => (sel === '[role="button"].collapseSvg.focusMode' ? focusButton : null) }, null), true);
  const fallback = button("fallback-collapse");
  assert.equal(exitWith({ querySelector: () => null }, { querySelector: (sel) => (sel === ".collapseSvg" ? fallback : null) }), true);
  assert.equal(exitWith({ querySelector: () => null }, null), false);
  assert.equal(exitWith(null, null), false);
  assert.deepEqual(clicks, ["max", "focus-collapse", "fallback-collapse"]);
});

test("visualization: arg order, content property guards, custom label, data source helpers", async () => {
  const log = [];
  const slotItems = [
    { getColumnId: () => "c1", getId: () => "i1", setCustomLabel: (l) => log.push(["label", "c1", l]) },
    { getId: () => "i2", setCustomLabel: (l) => log.push(["label", "i2", l]) },
    { getColumnId: () => "c3", getId: () => "c4" },
  ];
  const dataSource = { getId: () => "ds1", getModule: () => Promise.resolve({ getSourceName: () => "Cube" }) };
  let noDs = false;
  const feature = {
    getType: () => "bar",
    setType: (t) => log.push(["setType", t]),
    setDataSource: (d) => log.push(["setDs", d]),
    getDataSource: () => (noDs ? null : dataSource),
    getSlots: () => ({
      getSlotList: () => ["slots"],
      getSlot: (id) => (id === "categories" ? { getDataItemList: () => ["cat"] } : id === "plain" ? {} : { getDataItemList: () => slotItems }),
    }),
    getLocalFilters: () => ({ getFilterList: () => ["f"], removeFilter: (id) => log.push(["rm", id]) }),
  };
  let content = { getFeature: () => feature, setPropertyValue: (k, v) => log.push(["set", k, v]), getPropertyValue: (k) => `v:${k}` };
  const visApi = { getTitle: () => "title", setTitle: (t) => log.push(["setTitle", t]) };
  const api = build({
    __getDashboardAPI: () => ({
      getCanvas: () => ({ getContent: () => content, getWidget: () => ({ getVisApi: () => visApi, getVisualization: () => "viz" }) }),
    }),
  }).visualization;
  assert.equal(api.getVisType("w"), "bar");
  api.setVisType("pie", "w");
  api.setVisTitle("T", "w");
  api.setVizDataSource("ds", "w");
  api.removeLocalFilter("w", "f1");
  assert.deepEqual(log.splice(0), [["setType", "pie"], ["setTitle", "T"], ["setDs", "ds"], ["rm", "f1"]]);
  assert.equal(api.getVisTitle("w"), "title");
  assert.equal(api.getVisApi("w"), visApi);
  assert.equal(api.getVisualization("w"), "viz");
  assert.equal(api.getVizFeature("w"), feature);
  assert.deepEqual([api.getSlotList("w"), api.getCategoriesDataArr("w"), api.getLocalFiltersList("w")], [["slots"], ["cat"], ["f"]]);
  assert.equal(api.getSlotValues("w").getDataItemList()[0], slotItems[0]);
  assert.equal(api.getVizDataSourceId("w"), "ds1");
  assert.equal(await api.getVizDataSourceName("w"), "Cube");
  noDs = true;
  assert.equal(api.getVizDataSourceId("w"), undefined);
  assert.equal(await api.getVizDataSourceName("w"), null);
  api.setCustomLabel("w", "values", "c1", "L1");
  api.setCustomLabel("w", "values", "i2", "L2");
  api.setCustomLabel("w", "values", "c1", "");
  api.setCustomLabel("w", "values", "c1", 5);
  assert.deepEqual(log.splice(0), [["label", "c1", "L1"], ["label", "i2", "L2"]]);
  assert.throws(() => api.setCustomLabel("w", "values", "missing", "L"), /^Error: ITEM_NOT_FOUND$/);
  assert.throws(() => api.setCustomLabel("w", "values", "c4", "L"), /^Error: HOST_CAPABILITY_MISSING$/);
  api.setContentPropertyValue("w", "p", 1);
  assert.deepEqual(log.splice(0), [["set", "p", 1]]);
  assert.equal(api.getContentPropertyValue("w", "p"), "v:p");
  content = null;
  assert.throws(() => api.setContentPropertyValue("w", "p", 1), /dashboard content not found for widgetId "w"/);
  assert.equal(api.getContentPropertyValue("w", "p"), undefined);
  content = {};
  assert.throws(() => api.setContentPropertyValue("w", "p", 1), /content has no setPropertyValue for widgetId "w"/);
  assert.equal(api.getContentPropertyValue("w", "p"), undefined);
});

test("tabs, canvas, dataSources, async, glassMessages pass-throughs", async () => {
  const container = { props: { title: "A" }, getPropertyValue(k) { return this.props[k]; }, setPropertyValue(k, v) { this.props[k] = v; } };
  const toasts = [];
  const host = {
    getSpec: () => ({ layout: { items: [{ items: [1] }, { items: [2] }] }, dataSources: { sources: ["s"] } }),
    getCanvas: () => ({
      getContent: () => ({ getContainer: () => container }),
      getWidget: () => ({ whenRenderStart: () => Promise.resolve("start"), whenRenderComplete: () => Promise.resolve("done") }),
      getWidgetWhenReady: (id) => Promise.resolve(`ready:${id}`),
      getPropertyValue: (k) => `cv:${k}`,
      setPropertyValue: () => {},
    }),
    getCanvasWhenReady: () => Promise.resolve("canvasReady"),
    getFeature: (name) => ({ getDataSourceList: () => `list:${name}` }),
  };
  const api = build({
    __getDashboardAPI: () => host,
    window: { __glassAppController: { glassContext: { showToast: (t, o) => toasts.push([t, o]), showErrorMessage: (t, h) => `e:${t}:${h}`, showMessage: (...a) => a } } },
  });
  assert.deepEqual(api.tabs.getTabsContainers(), [{ items: [1] }, { items: [2] }]);
  assert.deepEqual(api.tabs.getTabsContent(), [[1], [2]]);
  assert.equal(api.tabs.getTabName("t"), "A");
  assert.equal(api.tabs.setTabName("t", "B"), "B");
  assert.equal(container.props.title, "B");
  assert.equal(api.canvas.setCanvasPropertyValue("p", 1), "cv:p");
  assert.equal(await api.canvas.getCanvasWhenReady(), "canvasReady");
  assert.equal(await api.async.getCanvasWhenReady(), "canvasReady");
  assert.equal(await api.async.getWidgetWhenReady("w"), "ready:w");
  assert.equal(await api.async.whenRenderStart("w"), "start");
  assert.equal(await api.async.whenRenderComplete("w"), "done");
  assert.equal(api.dataSources.getDataSourceList(), "list:DataSources");
  assert.deepEqual(api.dataSources.getDataSourcesArray(), ["s"]);
  api.glassMessages.showToast("hi", "info");
  assert.deepEqual(toasts, [["hi", { type: "info" }]]);
  assert.equal(api.glassMessages.showErrorDialog("m", "t"), "e:m:t");
});

test("resolveCaptureRoot: identity resolution over a fake DOM", () => {
  const ROOT = ".pagegenericPage";
  const pageA = makeNode({ attrs: { "data-cv-page-id": "pA" }, matches: [ROOT] });
  const pageB = makeNode({ attrs: { "data-cv-page-id": "pB" }, matches: [ROOT] });
  const tabNode = makeNode({ attrs: { "data-tab-id": "tA" }, children: [pageA] });
  const tabAmbiguous = makeNode({ attrs: { "data-tab-id": "tAmb" }, children: [pageA, pageB] });
  const hiddenPage = makeNode({ attrs: { "data-cv-page-id": "pH" }, matches: [ROOT], hidden: true });
  const all = [pageA, pageB, tabNode, tabAmbiguous, hiddenPage];
  const byIdentity = (selector) => all.filter((node) => [...selector.matchAll(/\[([^=\]]+)="([^"]*)"\]/g)].some((m) => node.getAttribute(m[1]) === m[2]));
  const document = { querySelectorAll: byIdentity };
  const resolve = build({ document }).dashboard.resolveCaptureRoot;
  assert.equal(resolve({ pageId: "pA" }), pageA);
  assert.equal(resolve({ tabId: "tA" }), pageA);
  assert.equal(resolve({ pageId: "pA", tabId: "tA" }), pageA);
  assert.equal(resolve({ pageId: "pB", tabId: "tA" }), null);
  assert.equal(resolve({ tabId: "tAmb" }), null);
  assert.equal(resolve({ pageId: "pH" }), null);
  assert.equal(resolve({ pageId: "unknown" }), null);
  assert.equal(resolve({}), null);
  assert.equal(resolve(null), null);
  assert.equal(resolve({ pageId: "" }), null);
  assert.equal(build({ document: undefined }).dashboard.resolveCaptureRoot({ pageId: "pA" }), null);
});
