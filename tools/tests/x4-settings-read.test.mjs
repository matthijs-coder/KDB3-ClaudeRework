// P2-X4: what the per-widget widgetSettings readers in widgetVis and widgetBase return for a set of records
// (present, removed, missing id, empty id, destroyed module). Driven through the real widgetSettings controller, so the
// same expectations hold before and after the readers move from api.getState() to the published selector.
// Run: node --test tools/tests/x4-settings-read.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const QUIET = { error() {}, warn() {}, log() {} };
const load = (rel, options) => loadAmd(path.join(JS_ROOT, rel), Object.assign({ stubs: { console: QUIET } }, options || {}));
const json = (value) => (value === undefined ? "<undefined>" : JSON.parse(JSON.stringify(value)));

const RECORDS = {
  full: {
    pending: { kind: null }, deferred: {}, errorCode: null, errorMessage: null,
    dimension: "Altersgruppe", dimensionMeta: { optionKey: "dim", displayValue: "Alter" },
    visType: "Line", topNChoice: "10", showValues: true, iterator: false, zoom: true, valueCaption: false, grouping: "jahr"
  },
  partial: { pending: { kind: "visType" }, deferred: {}, dimension: "Geschlecht", visType: "Pie" },
  defaults: { pending: { kind: null }, deferred: {}, errorCode: null, errorMessage: null },
  badGrouping: { pending: { kind: null }, deferred: {}, dimension: "x", visType: "Column", topNChoice: "none", grouping: "inherit", iterator: "yes" }
};

function createKdb() {
  const _KDB = { config: { options: {} }, api: {}, properties: {}, state: {}, runtime: {} };
  load("core/config/__orchestratorConfig.js")(_KDB);
  _KDB.state.widgets = { vis: { byId: {} }, base: { byId: {} } };
  load("dashboard/widgets/widgetSettings/index.js")(_KDB);
  _KDB.api.widgetSettings.mount();
  Object.keys(RECORDS).forEach((id) => { _KDB.state.widgets.settings.byWidget[id] = JSON.parse(JSON.stringify(RECORDS[id])); });
  return _KDB;
}

const IDS = ["full", "partial", "defaults", "badGrouping", "removed", "", undefined];

test("settingsSnapshot.readEffectiveSettingsContext reads the committed record", () => {
  const snapshot = load("dashboard/widgets/widgetVis/settingsSnapshot.js");
  const _KDB = createKdb();
  const out = {};
  IDS.forEach((id) => {
    out[String(id)] = json(snapshot.readEffectiveSettingsContext(_KDB, id, {}, { derived: { lastAppliedVisType: "Bar" } }));
  });
  out.payloadSnapshotWins = json(snapshot.readEffectiveSettingsContext(_KDB, "full", { settingsSnapshot: { dimension: "D" } }, null));
  assert.deepStrictEqual(out["full"], { dimension: "Altersgruppe", visType: "Line", topNChoice: "10", showValues: true, iterator: false, zoom: true, valueCaption: false, grouping: "jahr" });
  assert.deepStrictEqual(out["partial"], { dimension: "Geschlecht", visType: "Pie", topNChoice: json(snapshot.VIS_CONTROL_DEFAULTS.topNChoice) });
  assert.deepStrictEqual(out["defaults"], json({
    dimension: snapshot.VIS_CONTROL_DEFAULTS.dimension, visType: snapshot.VIS_CONTROL_DEFAULTS.visType, topNChoice: snapshot.VIS_CONTROL_DEFAULTS.topNChoice
  }));
  assert.deepStrictEqual(out["badGrouping"], { dimension: "x", visType: "Column", topNChoice: "none" });
  ["removed", "", "undefined"].forEach((key) => {
    assert.deepStrictEqual(out[key], { dimension: null, visType: "Bar", topNChoice: null });
  });
  assert.deepStrictEqual(out.payloadSnapshotWins, { dimension: "D", visType: null, topNChoice: null });
});

test("settingsSnapshot after destroy and without a widgetSettings module falls back like a missing record", () => {
  const snapshot = load("dashboard/widgets/widgetVis/settingsSnapshot.js");
  const _KDB = createKdb();
  const record = { derived: { lastAppliedVisType: "Bar" } };
  const live = json(snapshot.readEffectiveSettingsContext(_KDB, "full", {}, record));
  _KDB.api.widgetSettings.destroy();
  const afterDestroy = json(snapshot.readEffectiveSettingsContext(_KDB, "full", {}, record));
  assert.equal(live.visType, "Line");
  assert.deepStrictEqual(afterDestroy, { dimension: null, visType: "Bar", topNChoice: null });
  const bare = { config: { options: {} }, api: {}, state: {}, runtime: {} };
  load("core/config/__orchestratorConfig.js")(bare);
  assert.deepStrictEqual(json(snapshot.readEffectiveSettingsContext(bare, "full", {}, record)), { dimension: null, visType: "Bar", topNChoice: null });
});

test("a snapshot read is a copy: mutating it never reaches the live record", () => {
  const snapshot = load("dashboard/widgets/widgetVis/settingsSnapshot.js");
  const _KDB = createKdb();
  const read = snapshot.readEffectiveSettingsContext(_KDB, "full", {}, null);
  read.dimension = "mutated";
  assert.equal(_KDB.state.widgets.settings.byWidget.full.dimension, "Altersgruppe");
  assert.equal(snapshot.readEffectiveSettingsContext(_KDB, "full", {}, null).dimension, "Altersgruppe");
});

test("displayOptions.overlayIteratorZoomOnLayoutMap overlays iterator/zoom/valueCaption from the record", () => {
  const display = load("dashboard/widgets/widgetVis/render/displayOptions.js");
  const _KDB = createKdb();
  const overlay = (id, type) => json(display.overlayIteratorZoomOnLayoutMap(_KDB, id, { keep: 1 }, type));
  const lineFull = overlay("full", "Line");
  assert.deepStrictEqual(lineFull, { keep: 1, "widget.iterator": false, "zoom.bar.enable": true, "valueAxis.ticks.labels.visible": false });
  assert.deepStrictEqual(overlay("defaults", "Line"), { keep: 1, "widget.iterator": true, "zoom.bar.enable": false, "valueAxis.ticks.labels.visible": true });
  assert.deepStrictEqual(overlay("badGrouping", "Line"), { keep: 1, "widget.iterator": true, "zoom.bar.enable": false, "valueAxis.ticks.labels.visible": true });
  assert.deepStrictEqual(overlay("removed", "Line"), overlay("defaults", "Line"));
  assert.deepStrictEqual(overlay(undefined, "Line"), overlay("defaults", "Line"));
  assert.deepStrictEqual(overlay("full", "Pie"), { keep: 1, "widget.iterator": false });
  assert.deepStrictEqual(overlay("full", "List"), { keep: 1 });
  assert.deepStrictEqual(overlay("full", "TopN"), { keep: 1 });
  _KDB.api.widgetSettings.destroy();
  assert.deepStrictEqual(overlay("full", "Line"), overlay("defaults", "Line"));
});

test("restore binds from the committed record and skips widgets without a complete one", async () => {
  const applied = [];
  const fakes = {
    "./lifecycle.js": { handleWaitUntilContentReady: async () => ({ ok: true }) },
    "./cleanup.js": { handleCleanupContent: async () => ({ ok: true }) },
    "./settings.js": { handleApplyStartupSettings: async (ctx, action) => { applied.push(json(action.payload.settingsSnapshot)); return { ok: true }; } }
  };
  const restore = load("dashboard/widgets/widgetVis/restore.js", { modules: fakes });
  const _KDB = createKdb();
  const context = load("dashboard/widgets/widgetVis/context.js").createDetachedContext(_KDB);
  const FAILED = "WRITEBACK_WIDGET_RESTORE_FAILED";
  const correlation = { 1: { kind: "vis", widgetId: "full" }, 2: { kind: "vis", widgetId: "partial" }, 3: { kind: "vis", widgetId: "removed" },
    4: { kind: "vis", widgetId: "badGrouping" }, 5: { kind: "vis", widgetId: "defaults" } };
  const result = await restore.handleParameterSetBinding(context, { payload: { runId: 1, widgetCorrelation: correlation, skipHistory: true } });
  assert.deepStrictEqual(json(result.bound), ["full", "badGrouping"]);
  assert.deepStrictEqual(json(result.skipped), [
    { widgetId: "partial", code: FAILED }, { widgetId: "removed", code: FAILED }, { widgetId: "defaults", code: FAILED }
  ]);
  assert.deepStrictEqual(applied, [
    { dimension: "Altersgruppe", visType: "Line", topNChoice: "10", showValues: true, iterator: false, zoom: true, valueCaption: false, grouping: "jahr" },
    { dimension: "x", visType: "Column", topNChoice: "none" }
  ]);

  _KDB.api.widgetSettings.destroy();
  const afterDestroy = await restore.handleParameterSetBinding(context, { payload: { runId: 2, widgetCorrelation: { 1: { kind: "vis", widgetId: "full" } } } });
  assert.deepStrictEqual(json(afterDestroy.skipped), [{ widgetId: "full", code: FAILED }]);
  assert.equal(applied.length, 2);
});

test("widgetBase serializeWidgetFrame feeds the settings record into the writeback widget object", () => {
  const serialize = load("dashboard/widgets/widgetBase/slotStock/serialize.js");
  const _KDB = createKdb();
  _KDB.state.widgets.vis.byId.full = { derived: { code: "P_1" } };
  _KDB.state.widgets.vis.byId.removed = { derived: { code: "P_2" } };
  _KDB.api.widgetVis = { getState: () => json(_KDB.state.widgets.vis) };
  const frame = (id) => ({ widgetId: id, kind: "vis", placement: "onCanvas", layout: { x: 1, y: 2, width: 300, height: 200 } });
  const base = { tab: 0, x: 1, y: 2, w: 300, h: 200, kind: "vis" };
  assert.deepStrictEqual(json(serialize.serializeWidgetFrame(_KDB, frame("full"), 0)), {
    ok: true, diagnostics: [],
    entry: Object.assign({}, base, { code: "P_1", type: "Line", dim: "Altersgruppe", topn: "10", vals: 1, grp: "jahr", iter: 0, wzbar: 1, vcap: 0 })
  });
  const noRecord = json(serialize.serializeWidgetFrame(_KDB, frame("removed"), 0));
  assert.deepStrictEqual(noRecord, { ok: true, diagnostics: [], entry: Object.assign({}, base, { code: "P_2", type: "line" }) });
  const noVis = json(serialize.serializeWidgetFrame(_KDB, frame("partial"), 0));
  assert.equal(noVis.ok, false);
  _KDB.api.widgetSettings.destroy();
  assert.deepStrictEqual(json(serialize.serializeWidgetFrame(_KDB, frame("full"), 0)).entry, Object.assign({}, base, { code: "P_1", type: "line" }));
});
