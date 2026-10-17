// P2-W9a: selectors and facades the widget folders publish to each other.
// Run: node --test tools/tests/w9a-selectors.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const QUIET = { error() {}, warn() {}, log() {} };
const load = (rel, options) => loadAmd(path.join(JS_ROOT, rel), Object.assign({ stubs: { console: QUIET } }, options || {}));

test("widgetTopN readOwnerState: copy of one owner record", () => {
  const selectors = load("dashboard/widgets/widgetTopN/selectors.js");
  const state = { lifecycle: "ready", byOwner: { a: { ownerVisId: "a", resolutionStatus: "success", resultValues: ["x"] }, b: { ownerVisId: "b", resolutionStatus: "idle" } } };
  const _KDB = { state: { widgets: { topN: state } } };
  const record = selectors.readOwnerState(_KDB, "a");
  assert.deepStrictEqual(record, { ownerVisId: "a", resolutionStatus: "success", resultValues: ["x"] });
  assert.notStrictEqual(record, state.byOwner.a);
  record.resultValues.push("y");
  record.resolutionStatus = "error";
  assert.deepStrictEqual(state.byOwner.a.resultValues, ["x"]);
  assert.equal(state.byOwner.a.resolutionStatus, "success");
  assert.equal(selectors.readOwnerState(_KDB, "missing"), undefined);
  assert.equal(selectors.readOwnerState(_KDB, ""), undefined);
  assert.equal(selectors.readOwnerState(_KDB), undefined);
  assert.equal(selectors.readOwnerState({}, "a"), undefined);
  assert.equal(selectors.readOwnerState({ state: { widgets: {} } }, "a"), undefined);
  state.lifecycle = "disposed";
  assert.equal(selectors.readOwnerState(_KDB, "a"), undefined);
});

test("widgetTopN readOwnerState does not clone the other owners", () => {
  const selectors = load("dashboard/widgets/widgetTopN/selectors.js");
  let reads = 0;
  const byOwner = {};
  for (let index = 0; index < 50; index += 1) {
    byOwner["o" + index] = Object.defineProperty({ ownerVisId: "o" + index, resolutionStatus: "success" }, "poison", {
      enumerable: true, get() { reads += 1; return 1; }
    });
  }
  const _KDB = { state: { widgets: { topN: { lifecycle: "ready", byOwner } } } };
  selectors.readOwnerState(_KDB, "o7");
  assert.equal(reads, 1);
});

test("widgetSettings downstream maximize intent: nextMaximized from the widgetVis record", () => {
  const downstream = load("dashboard/widgets/widgetSettings/intent/downstream.js");
  const byId = { on: { maximized: true }, off: { maximized: false }, bare: {} };
  const _KDB = {
    state: { widgets: { vis: { lifecycle: "ready", byId: byId } } },
    api: { widgetVis: { getState: () => ({ lifecycle: "ready", byId: JSON.parse(JSON.stringify(byId)) }) } }
  };
  const nextOf = (kdb, widgetId, kind) => downstream.buildDownstreamIntentAction(kdb, {
    type: "widgetVis/maximizeToggle", widgetId: widgetId, kind: kind, interaction: "iconClick", target: "widgetBase"
  }).payload.nextMaximized;
  assert.equal(nextOf(_KDB, "on", "maximize"), false);
  assert.equal(nextOf(_KDB, "off", "maximize"), true);
  assert.equal(nextOf(_KDB, "bare", "maximize"), true);
  assert.equal(nextOf(_KDB, "unknown", "maximize"), true);
  assert.equal(nextOf(_KDB, "on", "unmaximize"), false);
  assert.equal(nextOf({ state: {}, api: {} }, "on", "maximize"), true);
});

test("owners publish their action types through selectors.js (used by widgetBase slot stock)", () => {
  const json = (value) => JSON.parse(JSON.stringify(value));
  const vis = load("dashboard/widgets/widgetVis/selectors.js");
  const text = load("dashboard/widgets/widgetText/selectors.js");
  const settings = load("dashboard/widgets/widgetSettings/selectors.js");
  assert.deepStrictEqual(json(vis.ACTION_TYPES), json(load("dashboard/widgets/widgetVis/state.js").ACTION_TYPES));
  assert.deepStrictEqual(json(text.ACTION_TYPES), json(load("dashboard/widgets/widgetText/config/actionTypes.js")));
  assert.deepStrictEqual(json(settings.ACTION_TYPES), json(load("dashboard/widgets/widgetSettings/config/actionTypes.js")));
  assert.equal(vis.ACTION_TYPES.CONTENT_CREATE, "widgetVis/contentCreate");
  assert.equal(vis.ACTION_TYPES.PARAMETER_SET_BINDING, "widgetVis/parameterSetBindingRequested");
  assert.equal(text.ACTION_TYPES.CONTENT_CREATE, "widgetText/contentCreate");
  assert.equal(text.ACTION_TYPES.PARAMETER_SET_RESTORE, "widgetText/parameterSetRestoreRequested");
  assert.equal(settings.ACTION_TYPES.PARAMETER_SET_RESTORE_BATCH, "widgetSettings/parameterSetRestoreBatchRequested");
});

test("widgetVis readVisPropBucketKey equals visTypes.resolveVisPropBucketKey for the configured bindingSpecs", () => {
  const _KDB = { config: { options: {} }, api: {}, properties: {}, state: {}, runtime: {} };
  load("core/config/registerConfig.js")(_KDB);
  const vis = load("dashboard/widgets/widgetVis/selectors.js");
  const visTypes = load("dashboard/widgets/widgetVis/visTypes.js");
  const types = ["Line", "line", "Pie", "pie", "List", "StackedBar", "StackedColumn", "Prognose", "prognose", "Bar", "", null, undefined];
  types.forEach((type) => assert.equal(vis.readVisPropBucketKey(_KDB, type), visTypes.resolveVisPropBucketKey(type, _KDB), String(type)));
  assert.equal(typeof vis.readVisPropBucketKey(_KDB, "Line"), "string");
  assert.equal(vis.readVisPropBucketKey({}, "Line"), visTypes.resolveVisPropBucketKey("Line", {}));
});

test("widgetBase readWidgetShell resolves the shell in the owner document like resolveWidgetShell", () => {
  const shellEl = { id: "w1" };
  const ownerDoc = { getElementById: (id) => (id === "w1" ? shellEl : null) };
  const hostEl = { ownerDocument: ownerDoc };
  const globalDoc = { getElementById: () => ({ id: "global" }), querySelector: () => null };
  const selectors = load("dashboard/widgets/widgetBase/state/selectors.js", { stubs: { document: globalDoc } });
  const shellModule = load("dashboard/widgets/widgetBase/view/resolveWidgetShell.js", { stubs: { document: globalDoc } });
  const withHost = { elements: { kdbWidget: hostEl } };
  assert.equal(selectors.readWidgetShell(withHost, "w1"), shellEl);
  assert.equal(selectors.readWidgetShell(withHost, "w1"), shellModule.resolveWidgetShell(withHost, "w1"));
  assert.equal(selectors.readWidgetShell(withHost, "nope"), null);
  assert.equal(selectors.readWidgetShell(withHost, ""), null);
  assert.equal(selectors.readWidgetShell(withHost, undefined), null);
  assert.deepStrictEqual(selectors.readWidgetShell({}, "x"), shellModule.resolveWidgetShell({}, "x"));
});

test("widgetSettings selectors.js is the facade: every member is the identical source export", () => {
  const W = "dashboard/widgets/widgetSettings/";
  const sentinel = () => function sentinelFn() {};
  const actionTypes = { SENTINEL: "a" };
  const domSelectors = { SENTINEL: "d" };
  const focusOnly = { SENTINEL: "f" };
  const buildSettingsIcon = sentinel();
  const markSelectedOption = sentinel();
  const shouldKeepDropdownsOpen = sentinel();
  const resolveWidgetEl = sentinel();
  const dropdownOption = sentinel();
  const icon = sentinel();
  const startWidgetRenderLoading = sentinel();
  const facade = load(W + "selectors.js", {
    overrides: {
      "core/utils/kit/data.js": { cloneJson: (v) => v },
      [W + "config/actionTypes.js"]: actionTypes,
      [W + "config/selectors.js"]: domSelectors,
      [W + "config/controlDefinitions.js"]: { focusOnly },
      [W + "view/buildSettingsIcon.js"]: buildSettingsIcon,
      [W + "view/dropdownOptionSelection.js"]: { markSelectedOption },
      [W + "view/panelOutsidePointerBehavior.js"]: { shouldKeepDropdownsOpen },
      [W + "view/resolveWidgetPlacementContext.js"]: { resolveWidgetEl },
      [W + "effects/dispatchWidgetSettingsIntent.js"]: { dropdownOption, icon },
      [W + "effects/startWidgetRenderLoading.js"]: startWidgetRenderLoading
    }
  });
  assert.deepStrictEqual(Object.keys(facade).sort(), [
    "ACTION_TYPES", "buildSettingsIcon", "dispatchDropdownOptionIntent", "dispatchIconIntent", "domSelectors", "focusOnlyControls",
    "markSelectedOption", "readWidgetSettings", "resolveWidgetEl", "shouldKeepDropdownsOpen", "startWidgetRenderLoading"
  ]);
  assert.equal(facade.ACTION_TYPES, actionTypes);
  assert.equal(facade.domSelectors, domSelectors);
  assert.equal(facade.focusOnlyControls, focusOnly);
  assert.equal(facade.buildSettingsIcon, buildSettingsIcon);
  assert.equal(facade.markSelectedOption, markSelectedOption);
  assert.equal(facade.shouldKeepDropdownsOpen, shouldKeepDropdownsOpen);
  assert.equal(facade.resolveWidgetEl, resolveWidgetEl);
  assert.equal(facade.dispatchDropdownOptionIntent, dropdownOption);
  assert.equal(facade.dispatchIconIntent, icon);
  assert.equal(facade.startWidgetRenderLoading, startWidgetRenderLoading);
  assert.equal(typeof facade.readWidgetSettings, "function");
});

test("widgetSettings selectors.js with the real modules: members exist with the expected types", () => {
  const facade = load("dashboard/widgets/widgetSettings/selectors.js");
  assert.equal(facade.domSelectors.panelRootSelectorFor("w1"), load("dashboard/widgets/widgetSettings/config/selectors.js").panelRootSelectorFor("w1"));
  assert.equal(facade.domSelectors.kennzahlenTableAttr, "kdb_kennzahlentable");
  assert.equal(facade.focusOnlyControls.unmaximize.kind, "unmaximize");
  ["buildSettingsIcon", "dispatchDropdownOptionIntent", "dispatchIconIntent", "markSelectedOption", "shouldKeepDropdownsOpen",
    "startWidgetRenderLoading", "resolveWidgetEl"].forEach((key) => assert.equal(typeof facade[key], "function", key));
});

test("widgetVis readVisRecord / readVisMaximized tolerate a missing vis subtree or byId", () => {
  const vis = load("dashboard/widgets/widgetVis/selectors.js");
  [{}, { state: {} }, { state: { widgets: {} } }, { state: { widgets: { vis: {} } } }].forEach((kdb) => {
    assert.equal(vis.readVisRecord(kdb, "w1"), undefined);
    assert.equal(vis.readVisMaximized(kdb, "w1"), false);
  });
  const record = { maximized: true };
  const _KDB = { state: { widgets: { vis: { byId: { w1: record } } } } };
  assert.equal(vis.readVisRecord(_KDB, "w1"), record);
  assert.equal(vis.readVisMaximized(_KDB, "w1"), true);
});
