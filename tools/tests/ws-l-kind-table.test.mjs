// Golden tests for widgetSettings config.js (one kind table) and the index.js controller contract (WS-L W3).
// Run: node --test tools/tests/ws-l-kind-table.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const SETTINGS_DIR = path.join(JS_ROOT, "dashboard/widgets/widgetSettings");
const INTERACTIONS = ["iconClick", "dropdownOption", "startup"];

// Recorded from intentDispatchMap.js + visKindToControl.js + kindToStateKey.js before they were merged.
// Per kind: n = normalizeKind, sk = exact kindToStateKey entry, c = kindToControl, v = isWidgetVisKind,
// live/text = [resolveTarget(widgetType), resolveType(target, kind, interaction) for INTERACTIONS].
const OLD_KIND_ROUTING = {
  "visualization": {
    n: "visualization", sk: "visType", c: "visType", v: true,
    live: ["widgetVis", "widgetVis/applyVisType", "widgetVis/applyVisType", "widgetVis/applyVisType"],
    text: ["widgetVis", "widgetVis/applyVisType", "widgetVis/applyVisType", "widgetVis/applyVisType"]
  },
  "Visualization": {
    n: "visualization", sk: null, c: "visType", v: true,
    live: ["widgetVis", "widgetVis/applyVisType", "widgetVis/applyVisType", "widgetVis/applyVisType"],
    text: ["widgetVis", "widgetVis/applyVisType", "widgetVis/applyVisType", "widgetVis/applyVisType"]
  },
  "dimension": {
    n: "dimension", sk: "dimension", c: "dimension", v: true,
    live: ["widgetVis", "widgetVis/applyDimension", "widgetVis/applyDimension", "widgetVis/applyDimension"],
    text: ["widgetVis", "widgetVis/applyDimension", "widgetVis/applyDimension", "widgetVis/applyDimension"]
  },
  "dimensions": {
    n: "dimension", sk: null, c: "dimension", v: true,
    live: ["widgetVis", "widgetVis/applyDimension", "widgetVis/applyDimension", "widgetVis/applyDimension"],
    text: ["widgetVis", "widgetVis/applyDimension", "widgetVis/applyDimension", "widgetVis/applyDimension"]
  },
  "topN": {
    n: "topN", sk: "topNChoice", c: "topNChoice", v: true,
    live: ["widgetVis", "widgetVis/applyTopNChoice", "widgetVis/applyTopNChoice", "widgetVis/applyTopNChoice"],
    text: ["widgetVis", "widgetVis/applyTopNChoice", "widgetVis/applyTopNChoice", "widgetVis/applyTopNChoice"]
  },
  "topn": {
    n: "topN", sk: null, c: "topNChoice", v: true,
    live: ["widgetVis", "widgetVis/applyTopNChoice", "widgetVis/applyTopNChoice", "widgetVis/applyTopNChoice"],
    text: ["widgetVis", "widgetVis/applyTopNChoice", "widgetVis/applyTopNChoice", "widgetVis/applyTopNChoice"]
  },
  "TOPN": {
    n: "topN", sk: null, c: "topNChoice", v: true,
    live: ["widgetVis", "widgetVis/applyTopNChoice", "widgetVis/applyTopNChoice", "widgetVis/applyTopNChoice"],
    text: ["widgetVis", "widgetVis/applyTopNChoice", "widgetVis/applyTopNChoice", "widgetVis/applyTopNChoice"]
  },
  "showValues": {
    n: "showValues", sk: "showValues", c: "showValues", v: true,
    live: ["widgetVis", "widgetVis/applyShowValues", "widgetVis/applyShowValues", "widgetVis/applyShowValues"],
    text: ["widgetVis", "widgetVis/applyShowValues", "widgetVis/applyShowValues", "widgetVis/applyShowValues"]
  },
  "showvalues": {
    n: "showValues", sk: null, c: "showValues", v: true,
    live: ["widgetVis", "widgetVis/applyShowValues", "widgetVis/applyShowValues", "widgetVis/applyShowValues"],
    text: ["widgetVis", "widgetVis/applyShowValues", "widgetVis/applyShowValues", "widgetVis/applyShowValues"]
  },
  "grouping": {
    n: "grouping", sk: "grouping", c: "grouping", v: true,
    live: ["widgetVis", "widgetVis/applyGrouping", "widgetVis/applyGrouping", "widgetVis/applyGrouping"],
    text: ["widgetVis", "widgetVis/applyGrouping", "widgetVis/applyGrouping", "widgetVis/applyGrouping"]
  },
  "iterator": {
    n: "iterator", sk: "iterator", c: "iterator", v: true,
    live: ["widgetVis", "widgetVis/applyIteratorZoom", "widgetVis/applyIteratorZoom", "widgetVis/applyIteratorZoom"],
    text: ["widgetVis", "widgetVis/applyIteratorZoom", "widgetVis/applyIteratorZoom", "widgetVis/applyIteratorZoom"]
  },
  "zoom": {
    n: "zoom", sk: "zoom", c: "zoom", v: true,
    live: ["widgetVis", "widgetVis/applyIteratorZoom", "widgetVis/applyIteratorZoom", "widgetVis/applyIteratorZoom"],
    text: ["widgetVis", "widgetVis/applyIteratorZoom", "widgetVis/applyIteratorZoom", "widgetVis/applyIteratorZoom"]
  },
  "valueCaption": {
    n: "valueCaption", sk: "valueCaption", c: "valueCaption", v: true,
    live: ["widgetVis", "widgetVis/applyIteratorZoom", "widgetVis/applyIteratorZoom", "widgetVis/applyIteratorZoom"],
    text: ["widgetVis", "widgetVis/applyIteratorZoom", "widgetVis/applyIteratorZoom", "widgetVis/applyIteratorZoom"]
  },
  "valuecaption": {
    n: "valueCaption", sk: null, c: "valueCaption", v: true,
    live: ["widgetVis", "widgetVis/applyIteratorZoom", "widgetVis/applyIteratorZoom", "widgetVis/applyIteratorZoom"],
    text: ["widgetVis", "widgetVis/applyIteratorZoom", "widgetVis/applyIteratorZoom", "widgetVis/applyIteratorZoom"]
  },
  "maximize": {
    n: "maximize", sk: null, c: null, v: false,
    live: ["widgetVis", "widgetVis/maximizeToggle", "widgetVis/maximizeToggle", "widgetVis/maximizeToggle"],
    text: ["widgetVis", "widgetVis/maximizeToggle", "widgetVis/maximizeToggle", "widgetVis/maximizeToggle"]
  },
  "unmaximize": {
    n: "unmaximize", sk: null, c: null, v: false,
    live: ["widgetVis", "widgetVis/maximizeToggle", "widgetVis/maximizeToggle", "widgetVis/maximizeToggle"],
    text: ["widgetVis", "widgetVis/maximizeToggle", "widgetVis/maximizeToggle", "widgetVis/maximizeToggle"]
  },
  "title": {
    n: "title", sk: null, c: null, v: false,
    live: ["widgetText", "widgetText/commitTextEdit", "widgetText/applyTitle", "widgetText/applyTitle"],
    text: ["widgetText", "widgetText/commitTextEdit", "widgetText/applyTitle", "widgetText/applyTitle"]
  },
  "text": {
    n: "title", sk: null, c: null, v: false,
    live: ["widgetText", "widgetText/commitTextEdit", "widgetText/applyTitle", "widgetText/applyTitle"],
    text: ["widgetText", "widgetText/commitTextEdit", "widgetText/applyTitle", "widgetText/applyTitle"]
  },
  "fontSize": {
    n: "fontSize", sk: "fontSize", c: null, v: false,
    live: ["widgetText", "widgetText/applyFontSize", "widgetText/applyFontSize", "widgetText/applyFontSize"],
    text: ["widgetText", "widgetText/applyFontSize", "widgetText/applyFontSize", "widgetText/applyFontSize"]
  },
  "fontsize": {
    n: "fontSize", sk: null, c: null, v: false,
    live: ["widgetText", "widgetText/applyFontSize", "widgetText/applyFontSize", "widgetText/applyFontSize"],
    text: ["widgetText", "widgetText/applyFontSize", "widgetText/applyFontSize", "widgetText/applyFontSize"]
  },
  "backgroundColor": {
    n: "backgroundColor", sk: "colour", c: null, v: false,
    live: ["widgetSettings", "widgetSettings/commitColour", "widgetSettings/commitColour", "widgetSettings/commitColour"],
    text: ["widgetSettings", "widgetSettings/commitColour", "widgetSettings/commitColour", "widgetSettings/commitColour"]
  },
  "backgroundcolor": {
    n: "backgroundColor", sk: null, c: null, v: false,
    live: ["widgetSettings", "widgetSettings/commitColour", "widgetSettings/commitColour", "widgetSettings/commitColour"],
    text: ["widgetSettings", "widgetSettings/commitColour", "widgetSettings/commitColour", "widgetSettings/commitColour"]
  },
  "layout": {
    n: "layout", sk: "restyle", c: null, v: false,
    live: ["widgetBase", "widgetBase/scaffoldNoop", "widgetBase/scaffoldNoop", "widgetBase/scaffoldNoop"],
    text: ["widgetText", "widgetText/applyRestyle", "widgetText/applyRestyle", "widgetText/applyRestyle"]
  },
  "restyle": {
    n: "layout", sk: null, c: null, v: false,
    live: ["widgetBase", "widgetBase/scaffoldNoop", "widgetBase/scaffoldNoop", "widgetBase/scaffoldNoop"],
    text: ["widgetText", "widgetText/applyRestyle", "widgetText/applyRestyle", "widgetText/applyRestyle"]
  },
  "move": {
    n: "move", sk: null, c: null, v: false,
    live: ["widgetBase", "widgetBase/enableMove", "widgetBase/setMoveMode", "widgetBase/enableMove"],
    text: ["widgetBase", "widgetBase/enableMove", "widgetBase/setMoveMode", "widgetBase/enableMove"]
  },
  "resize": {
    n: "resize", sk: null, c: null, v: false,
    live: ["widgetBase", "widgetBase/resizeToggle", "widgetBase/resizeToggle", "widgetBase/resizeToggle"],
    text: ["widgetBase", "widgetBase/resizeToggle", "widgetBase/resizeToggle", "widgetBase/resizeToggle"]
  },
  "reset": {
    n: "reset", sk: null, c: null, v: false,
    live: ["widgetBase", "widgetBase/routeToLaunchpad", "widgetBase/routeToLaunchpad", "widgetBase/routeToLaunchpad"],
    text: ["widgetBase", "widgetBase/routeToLaunchpad", "widgetBase/routeToLaunchpad", "widgetBase/routeToLaunchpad"]
  },
  "info": {
    n: "info", sk: null, c: null, v: false,
    live: ["widgetBase", "widgetBase/scaffoldNoop", "widgetBase/scaffoldNoop", "widgetBase/scaffoldNoop"],
    text: ["widgetBase", "widgetBase/scaffoldNoop", "widgetBase/scaffoldNoop", "widgetBase/scaffoldNoop"]
  },
  "": {
    n: "", sk: null, c: null, v: false,
    live: ["widgetBase", "widgetBase/scaffoldNoop", "widgetBase/scaffoldNoop", "widgetBase/scaffoldNoop"],
    text: ["widgetBase", "widgetBase/scaffoldNoop", "widgetBase/scaffoldNoop", "widgetBase/scaffoldNoop"]
  },
  "null": {
    n: "", sk: null, c: null, v: false,
    live: ["widgetBase", "widgetBase/scaffoldNoop", "widgetBase/scaffoldNoop", "widgetBase/scaffoldNoop"],
    text: ["widgetBase", "widgetBase/scaffoldNoop", "widgetBase/scaffoldNoop", "widgetBase/scaffoldNoop"]
  }
};

function rawKind(key) {
  return key === "null" ? null : key;
}

function withoutScaffold(type) {
  return /\/scaffoldNoop$/.test(type) ? null : type;
}

test("kind table matches the old routing (scaffoldNoop becomes null)", () => {
  const config = loadAmd(path.join(SETTINGS_DIR, "config.js"));
  for (const [key, old] of Object.entries(OLD_KIND_ROUTING)) {
    const kind = rawKind(key);
    assert.equal(config.normalizeKind(kind), old.n, `normalizeKind(${key})`);
    assert.equal(config.stateKeyForKind(kind), old.sk || String(kind || ""), `stateKeyForKind(${key})`);
    assert.equal(config.controlForKind(kind), old.c, `controlForKind(${key})`);
    assert.equal(config.isWidgetVisKind(kind), old.v, `isWidgetVisKind(${key})`);
    for (const widgetType of ["live", "text"]) {
      const [target, ...types] = old[widgetType];
      assert.equal(config.resolveTarget(widgetType, kind), target, `resolveTarget(${widgetType}, ${key})`);
      INTERACTIONS.forEach((interaction, index) => {
        assert.equal(config.resolveType(target, kind, interaction), withoutScaffold(types[index]), `resolveType(${target}, ${key}, ${interaction})`);
      });
    }
  }
});

function createConsole() {
  const calls = { warn: [], error: [] };
  return {
    calls,
    stub: { warn: (...args) => calls.warn.push(args), error: (...args) => calls.error.push(args), log: () => {} }
  };
}

function createKdb() {
  const dispatched = [];
  return {
    dispatched,
    _KDB: {
      api: { widgetBase: { dispatch: (action) => { dispatched.push(action); return { ok: true }; } } },
      services: {}
    }
  };
}

test("controller: register, mount, state shape, unknown action, destroy and disposed dispatch", () => {
  const fakeConsole = createConsole();
  const register = loadAmd(path.join(SETTINGS_DIR, "__orchestratorWidgetSettings.js"), { stubs: { console: fakeConsole.stub } });
  const { _KDB } = createKdb();
  const controller = register(_KDB);
  assert.equal(_KDB.api.widgetSettings, controller);
  assert.equal(typeof _KDB.config.labels.de.widgetSettings.topNGroupingRequired, "string");
  const runtime = _KDB.runtime.widgetSettings;
  ["domRefs", "listeners", "subscriptions", "abortControllers", "observers", "timers", "pendingPromises", "seedPlacementStarted"]
    .forEach((bucket) => assert.deepEqual(runtime[bucket], {}, bucket));
  assert.equal(typeof runtime.historyReplayHandlerContribution.apply, "function");
  assert.equal(runtime.historyReplayHandlerContribution.apply(_KDB, null, { key: "widget_canvasDrop" }, {}), false);

  assert.equal(controller.mount(), true);
  assert.deepEqual(controller.getState(), { lifecycle: "ready", byWidget: {}, errorCode: null, errorMessage: null });
  assert.deepEqual(controller.dispatch({ type: "widgetSettings/unknown" }), {
    ok: true, skipped: true, reasonCode: "WIDGET_SETTINGS_ACTION_UNKNOWN", actionType: "widgetSettings/unknown"
  });
  assert.equal(controller.dispatch({ type: "widgetSettings/parameterSetResetRequested", payload: {} }).status, "error");

  const removed = [];
  const handler = () => {};
  const target = { removeEventListener: (type, fn, options) => removed.push([type, fn, options]) };
  runtime.listeners.documentPointerDown = { target, type: "pointerdown", handler, options: { capture: true } };
  let aborted = 0;
  runtime.abortControllers["panel:w1"] = { abort: () => { aborted += 1; } };
  controller.destroy();
  assert.deepEqual(removed, [["pointerdown", handler, { capture: true }]]);
  assert.equal(aborted, 1);
  assert.equal(runtime.historyReplayHandlerContribution, null);
  assert.deepEqual(_KDB.runtime.widgetSettings, {});
  assert.equal(_KDB.state.widgets.settings.lifecycle, "disposed");
  assert.equal(controller.getState(), undefined);

  const disposed = { ok: false, outcome: "aborted", reason: "disposed", skipped: true, status: "aborted" };
  assert.deepEqual(controller.dispatch({ type: "widgetSettings/placeControls" }), disposed);
  assert.deepEqual(controller.dispatch({ type: "widgetSettings/placeControls" }), disposed);
  assert.equal(fakeConsole.calls.warn.length, 1);
  assert.equal(controller.mount(), false);
});

test("intent: an unsupported kind returns KIND_UNSUPPORTED without dispatching", async () => {
  const dispatchIntent = loadAmd(path.join(SETTINGS_DIR, "effects/dispatchWidgetSettingsIntent.js"));
  const { _KDB, dispatched } = createKdb();
  _KDB.state = { widgets: { settings: { lifecycle: "ready", byWidget: {}, errorCode: null, errorMessage: null } } };
  const result = await dispatchIntent.startupDefault(_KDB, { widgetId: "w1", widgetType: "live", kind: "layout", optionKey: "default" });
  assert.deepEqual(result, { ok: false, skipped: true, reasonCode: "WIDGET_SETTINGS_KIND_UNSUPPORTED", kind: "layout" });
  const moved = await dispatchIntent.startupDefault(_KDB, { widgetId: "w1", widgetType: "live", kind: "move", optionValue: "aktiv" });
  assert.deepEqual(moved, { ok: true });
  assert.deepEqual(dispatched.map((action) => [action.type, action.payload.mode]), [["widgetBase/setMoveMode", "persistent"]]);
});
