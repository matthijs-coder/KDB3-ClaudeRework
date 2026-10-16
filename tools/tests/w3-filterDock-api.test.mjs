// filterDock additions (W3, additive): api.getActiveFilterEl, api.isFiltersReady, dispatch(clickOriginalButtonRequested) -> {ok}.
// Run: node --test tools/tests/w3-filterDock-api.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const FD = path.join(JS_ROOT, "dashboard/filters/filterDock");
const CSS = { escape: (value) => String(value) };
const SELECTORS = {
  rootSelector: "#root", globalDockSelector: "#global", pageContextDockSelector: "#other",
  filterLabelSelector: "[data-id]", filterDataIdAttr: "data-id", nativeFooterSelector: ".footer"
};

function createApi({ activeFilterEl = null, selectors = SELECTORS } = {}) {
  class FakeObserver { observe() {} disconnect() {} }
  const register = loadAmd(path.join(FD, "index.js"), {
    stubs: { document: { querySelector: () => null }, MutationObserver: FakeObserver, Date: { now: () => 5000 }, CSS, console: { error() {}, warn() {}, log() {}, info() {}, debug() {} } }
  });
  const _KDB = { elements: { selectors: { filterDock: selectors } }, state: {}, runtime: {}, api: {} };
  const api = register(_KDB);
  if (activeFilterEl) _KDB.runtime.filterDock.domRefs.activeFilterEl = activeFilterEl;
  return { _KDB, api };
}

function clickableDock(clicks) {
  const button = { click: () => clicks.push("clicked") };
  const footer = { querySelector: () => button };
  return {
    closest: () => null,
    querySelector: (selector) => (selector === ".footer" ? footer : { getAttribute: () => "Region" })
  };
}

const click = (payload) => ({ type: "filterDock/clickOriginalButtonRequested", payload });

test("getActiveFilterEl: null before any click, the stamped element after, null after destroy", () => {
  const empty = createApi();
  assert.equal(empty.api.getActiveFilterEl(), null);
  const el = { id: "active" };
  const { api, _KDB } = createApi({ activeFilterEl: el });
  assert.equal(api.getActiveFilterEl(), el);
  assert.equal(api.getActiveFilterEl(), _KDB.runtime.filterDock.domRefs.activeFilterEl);
  api.destroy();
  assert.equal(api.getActiveFilterEl(), null);
});

test("getActiveFilterEl does not throw without a dock runtime", () => {
  const { api, _KDB } = createApi();
  delete _KDB.runtime.filterDock;
  assert.equal(api.getActiveFilterEl(), null);
  _KDB.runtime.filterDock = {};
  assert.equal(api.getActiveFilterEl(), null);
});

test("isFiltersReady equals getState().filtersReady === true and is false after destroy", () => {
  const { api } = createApi();
  assert.equal(api.isFiltersReady(), false);
  assert.equal(api.getState().filtersReady === true, api.isFiltersReady());
  api.dispatch({ type: "filterDock/filtersReadyObserved", payload: { filtersReady: true, filtersReadyAt: 7, filterWrapperCount: 2 } });
  assert.equal(api.isFiltersReady(), true);
  assert.equal(api.getState().filtersReady === true, api.isFiltersReady());
  api.destroy();
  assert.equal(api.isFiltersReady(), false);
  assert.equal(api.getState(), undefined);
});

test("selectors.readActiveFilterEl mirrors the api read", () => {
  const selectors = loadAmd(path.join(FD, "selectors.js"));
  const el = {};
  assert.equal(selectors.readActiveFilterEl({ runtime: { filterDock: { domRefs: { activeFilterEl: el } } } }), el);
  for (const kdb of [null, {}, { runtime: {} }, { runtime: { filterDock: {} } }, { runtime: { filterDock: { domRefs: {} } } }]) {
    assert.equal(selectors.readActiveFilterEl(kdb), null);
  }
});

test("clickOriginalButtonRequested: the snapshot keeps its shape and gains ok=true after a click", () => {
  const clicks = [];
  const { api } = createApi({ activeFilterEl: clickableDock(clicks) });
  const before = api.getState();
  const result = api.dispatch(click({ filterKey: "pageContext__Region", buttonTid: "okClickable" }));
  assert.deepEqual(clicks, ["clicked"]);
  assert.equal(result.ok, true);
  const { ok, ...snapshot } = result;
  assert.deepEqual(snapshot, before);
  assert.deepEqual(Object.keys(snapshot), Object.keys(before));
});

test("clickOriginalButtonRequested: ok=false when nothing was clicked (no active filter, wrong filter, no button tid)", () => {
  const clicks = [];
  for (const [label, dock, payload] of [
    ["no active filter", null, { filterKey: "pageContext__Region", buttonTid: "okClickable" }],
    ["other filter", clickableDock(clicks), { filterKey: "global__Other", buttonTid: "okClickable" }],
    ["no tid", clickableDock(clicks), { filterKey: "pageContext__Region" }]
  ]) {
    const { api } = createApi({ activeFilterEl: dock });
    const result = api.dispatch(click(payload));
    assert.equal(result.ok, false, label);
    assert.equal(typeof result.lifecycle, "string", label);
  }
  assert.deepEqual(clicks, []);
});

test("other actions keep returning the plain snapshot without an ok field", () => {
  const { api } = createApi();
  const state = api.dispatch({ type: "filterDock/mountSucceeded", payload: { mountedAt: 3 } });
  assert.equal(state.lifecycle, "ready");
  assert.equal("ok" in state, false);
  const closed = api.dispatch({ type: "filterDock/closeActivePopupRequested" });
  assert.equal("ok" in closed, false);
  assert.equal(api.dispatch({ type: "filterDock/unknown" }).lifecycle, "ready");
});

test("dispatch after destroy is still a guarded no-op", () => {
  const { api } = createApi();
  api.destroy();
  assert.equal(api.dispatch(click({ buttonTid: "x" })), undefined);
});
