// Every path that touches the "datatable" widget kind (Phase 2 W12): content create in the drop workflow, delete,
// writeback save, v2/v3 saved-set loading. Recorded on the code with the widgetDataTable scaffold module registered;
// after the module was removed the same assertions hold (only the owner-call test was dropped).
// Run: node --test tools/tests/w12-datatable-characterisation.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const quiet = { log() {}, info() {}, warn() {}, error() {}, debug() {} };
const WB_DIR = "dashboard/widgets/widgetBase";

const state = loadAmd(path.join(JS_ROOT, WB_DIR, "state.js"), { stubs: { console: quiet } });
const realRoute = loadAmd(path.join(JS_ROOT, WB_DIR, "launchpadRoute.js"), { stubs: { console: quiet } });

function createFakeShell(id) {
  return { id, parentNode: { id: "canvasParent" }, style: {} };
}

function loadCanvas(claimedWidgetId, shellEl) {
  const placement = {
    placeWidgetOnCanvas: () => ({ ok: true, layout: { x: 5, y: 6, width: 70, height: 80 } }),
    applyWidgetLayout: (_KDB, _widgetId, layout) => Promise.resolve({ ok: true, layout }),
    moveWidgetToLaunchpad: () => Promise.resolve({ ok: true })
  };
  const route = {
    resolveLaunchpadRoute: realRoute.resolveLaunchpadRoute,
    resolveClaimedWidget: () => Promise.resolve({ ok: true, widgetId: claimedWidgetId, shellEl })
  };
  return loadAmd(path.join(JS_ROOT, WB_DIR, "canvas.js"), {
    stubs: { console: quiet, document: undefined },
    overrides: {
      [WB_DIR + "/view/placement.js"]: placement,
      [WB_DIR + "/launchpadRoute.js"]: route
    }
  });
}

function createWorld() {
  const calls = [];
  const internal = [];
  const steps = [];
  const apiSpy = (name) => ({ dispatch: (action) => { calls.push([name, action.type]); return Promise.resolve({ ok: true }); } });
  const _KDB = {
    state: {},
    runtime: { widgetBase: {} },
    elements: {},
    services: { history: { pushCommittedStep: (step) => { steps.push(step); return true; } } },
    api: { widgetVis: apiSpy("widgetVis"), widgetText: apiSpy("widgetText"), widgetSettings: apiSpy("widgetSettings"), widgetTopN: apiSpy("widgetTopN") }
  };
  let frame;
  const context = {
    _KDB,
    actionTypes: state.ACTION_TYPES,
    selectors: { readFrame: () => frame },
    dispatchInternal: (action) => { internal.push(action); },
    ensureOpSeq: (_id, seq) => seq || 1,
    isStaleOpSeq: () => false
  };
  return { _KDB, context, calls, internal, steps, setFrame: (value) => { frame = value; } };
}

const DROP_PAYLOAD = { draggedElementType: "list", sourceKind: "unknown", dropboxId: "dbx", tabId: "tabA", layout: { x: 1, y: 1, width: 10, height: 10 }, payload: {} };

test("route: list/hierarchy drag or LIST/HIERARCHY/TABLE/CROSSTAB visual types resolve to kind datatable on the dataTables pad", () => {
  const base = { widgetId: "w1", tabId: "tabA", tabHandle: 0 };
  const cases = [
    { draggedElementType: "list" },
    { draggedElementType: "hierarchy" },
    { visualType: "TABLE", visualTitle: "T" },
    { visualType: "crosstab", visualTitle: "T" },
    { visualType: "LIST", visualTitle: "T" }
  ];
  cases.forEach((descriptor) => {
    const route = realRoute.resolveLaunchpadRoute(Object.assign({}, base, descriptor));
    assert.deepStrictEqual([route.shouldRoute, route.kind, route.role, route.launchpadPad], [true, "datatable", "primary", "dataTables"], JSON.stringify(descriptor));
  });
});

test("content create: a dropped datatable keeps its frame on the canvas, pushes the drop step and starts no settings chrome", async () => {
  const w = createWorld();
  const shell = createFakeShell("w1");
  const canvas = loadCanvas("w1", shell);
  const result = await canvas.handleDropCreate(w.context, { type: "widgetBase/dropCreate", widgetId: "w1", payload: { dropRequest: DROP_PAYLOAD, widgetId: "w1" } });
  assert.deepStrictEqual(
    { ok: result.ok, widgetId: result.widgetId, placement: result.placement },
    { ok: true, widgetId: "w1", placement: "onCanvas" }
  );
  const registered = w.internal.find((action) => action.type === state.ACTION_TYPES.REGISTER_FRAME);
  assert.deepStrictEqual(
    { kind: registered.payload.frame.kind, role: registered.payload.frame.role, lifecycle: registered.payload.frame.lifecycle, tabId: registered.payload.frame.tabId },
    { kind: "datatable", role: "primary", lifecycle: "loading", tabId: "tabA" }
  );
  assert.deepStrictEqual(
    w.internal.map((action) => action.type),
    [state.ACTION_TYPES.REGISTER_FRAME, state.ACTION_TYPES.MARK_PENDING, state.ACTION_TYPES.PLACE_ON_CANVAS_SUCCEEDED]
  );
  assert.deepStrictEqual(w.internal[2].payload, { layout: { x: 5, y: 6, width: 70, height: 80 }, tabId: "tabA" });
  assert.equal(w.steps.length, 1);
  assert.equal(w.steps[0].key, "widget_canvasDrop");
  assert.equal(w.steps[0].new.kind, "datatable");
  assert.equal(w.steps[0].new.launchpadPad, "dataTables");
  assert.equal(w.steps[0].new.placement, "onCanvas");
  assert.equal(w.steps[0].old, null);
  assert.equal(w._KDB.runtime.widgetBase.byId.w1.domRefs.shellEl, shell);
  assert.equal(w._KDB.api.widgetDataTable, undefined, "the scaffold owner no longer exists");
  assert.deepStrictEqual(w.calls, [], "no owner (vis, text, settings, topN) is called for a datatable drop");
});

test("content create: an `other` resource drop ends in the same final state (frame kind other, one drop step)", async () => {
  const w = createWorld();
  const canvas = loadCanvas("w2", createFakeShell("w2"));
  const dropRequest = Object.assign({}, DROP_PAYLOAD, { draggedElementType: "image", payload: {} });
  const result = await canvas.handleDropCreate(w.context, { type: "widgetBase/dropCreate", widgetId: "w2", payload: { dropRequest, widgetId: "w2" } });
  assert.deepStrictEqual({ ok: result.ok, placement: result.placement }, { ok: true, placement: "onCanvas" });
  assert.equal(w.internal.find((action) => action.type === state.ACTION_TYPES.REGISTER_FRAME).payload.frame.kind, "other");
  assert.equal(w.steps[0].new.kind, "other");
  assert.deepStrictEqual(w.calls, []);
});

test("delete: removing a datatable frame disposes vis, cleans settings, detaches the shell and skips the TopN claim cleanup", async () => {
  const w = createWorld();
  const canvas = loadCanvas("w1", createFakeShell("w1"));
  w.setFrame({ widgetId: "w1", kind: "datatable", role: "primary", placement: "onCanvas", tabId: "tabA" });
  const result = await canvas.handleRemove(w.context, { type: "widgetBase/remove", widgetId: "w1", payload: { reason: "user" } });
  assert.deepStrictEqual({ ok: result.ok, widgetId: result.widgetId, placement: result.placement }, { ok: true, widgetId: "w1", placement: "removed" });
  assert.deepStrictEqual(w.internal.map((action) => action.type), [state.ACTION_TYPES.REMOVE_SUCCEEDED]);
  const owners = w.calls.map(([owner]) => owner);
  assert.equal(owners.includes("widgetTopN"), false);
  assert.deepStrictEqual(owners.slice().sort(), ["widgetSettings", "widgetVis"]);
  assert.equal(w.steps.length, 1);
  assert.equal(w.steps[0].key, "widget_removed");
});

// ---------------------------------------------------------------- writeback save and saved-set loading

const WRITEBACK = path.join(JS_ROOT, "workflows/parameterSet");

test("writeback save: only vis and text frames are collected, a datatable frame is skipped without a diagnostic", async () => {
  const collect = loadAmd(path.join(WRITEBACK, "get/collectors/collectWidgets.js"), { stubs: { console: quiet } });
  const layout = { x: 0, y: 0, width: 5, height: 5 };
  const frames = {
    d1: { widgetId: "d1", kind: "datatable", role: "primary", placement: "onCanvas", layout, tabId: "t1", lifecycle: "ready" },
    o1: { widgetId: "o1", kind: "other", role: "otherResource", placement: "onCanvas", layout, tabId: "t1", lifecycle: "ready" },
    t1: { widgetId: "t1w", kind: "text", role: "primary", placement: "onCanvas", layout, tabId: "t1", lifecycle: "ready" }
  };
  const tabs = {
    order: [0], byIndex: { 0: { index: 0, tabId: "t1", role: "dashboard", visible: true } }, traversal: { traversedIndexes: [0] }
  };
  const _KDB = {
    api: {
      tabs: { getState: () => tabs, dispatch: () => true },
      widgetBase: { getState: () => ({ byId: frames }) },
      widgetText: { getState: () => ({ byId: { t1w: { text: "Hallo", fontSize: 12 } } }) }
    }
  };
  const diagnostics = [];
  const result = await collect(_KDB, diagnostics);
  assert.deepStrictEqual(result.wgts.map((w) => w.kind), ["txt"]);
  assert.deepStrictEqual(diagnostics, []);
});

test("saved set v3: kind tbl, topn and any other non-vis/txt kind validate as degraded (unsupported) and are not placed", async () => {
  const normalizeV3 = loadAmd(path.join(WRITEBACK, "schema/normalizeV3.js"), { stubs: { console: quiet } });
  const validateV3 = loadAmd(path.join(WRITEBACK, "schema/validateV3.js"), { stubs: { console: quiet } });
  const { placeSerializedWidgetEntry } = loadAmd(path.join(JS_ROOT, WB_DIR, "slotStock/placeEntries.js"), { stubs: { console: quiet } });
  const expected = {
    tbl: "widget kind \"tbl\" is reserved and unsupported in tranche 1",
    topn: "widget kind \"topn\" is reserved and unsupported in tranche 1",
    datatable: "unknown widget kind"
  };
  for (const kind of Object.keys(expected)) {
    const entry = { tab: 0, x: 0, y: 0, w: 1, h: 1, kind };
    const normalized = normalizeV3({ v: 3, pkg: "Personal_KDB", tabs: [{ name: "A" }], wgts: [entry] }, { diagnostics: [] });
    const validation = validateV3(normalized);
    assert.equal(validation.ok, true, kind);
    assert.deepStrictEqual(validation.diagnostics.map((d) => [d.code, d.message]), [["WRITEBACK_WIDGET_KIND_UNSUPPORTED", expected[kind]]], kind);
    const owners = [];
    const _KDB = { state: {}, runtime: {}, api: new Proxy({}, { get: (_t, name) => { owners.push(String(name)); return undefined; } }) };
    const placed = await placeSerializedWidgetEntry({ _KDB }, normalized.wgts[0], "t1", { entryIndex: 0 });
    assert.deepStrictEqual(placed, { ok: false, diagnostics: [{ code: "WRITEBACK_WIDGET_KIND_UNSUPPORTED", message: "unsupported widget kind \"" + kind + "\"" }] }, kind);
    assert.deepStrictEqual(owners, [], "no owner API is touched for " + kind);
  }
});

test("saved set v2: datatable, table and topn widgets are skipped with WRITEBACK_WIDGET_KIND_UNSUPPORTED, vis widgets still map", () => {
  const mapV2Widgets = loadAmd(path.join(WRITEBACK, "map/adapters/mapV2Widgets.js"), { stubs: { console: quiet } });
  const diagnostics = [];
  const style = JSON.stringify({ left: "10px", top: "10px", width: "100px", height: "100px" });
  const widget = (widgetType) => ({ widgetType, tab: { index: 0 }, style });
  const mapped = mapV2Widgets({ widgets: { a: widget("widget.datatable"), b: widget("WIDGET.TABLE"), c: widget("widget.topN") } }, diagnostics);
  assert.equal(mapped, null);
  assert.deepStrictEqual(diagnostics.map((d) => d.code), ["WRITEBACK_WIDGET_KIND_UNSUPPORTED", "WRITEBACK_WIDGET_KIND_UNSUPPORTED", "WRITEBACK_WIDGET_KIND_UNSUPPORTED"]);
  assert.deepStrictEqual(diagnostics.map((d) => d.details.widgetType), ["widget.datatable", "WIDGET.TABLE", "widget.topN"]);
});
