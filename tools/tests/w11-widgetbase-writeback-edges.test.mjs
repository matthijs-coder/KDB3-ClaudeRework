// P2-W11: what widgetBase's duplicate-tab flow takes from the writeback workflow: the v3 widget object
// (slotStock/serialize.js) and the parameterSet run id allocator (slotStock/fillContent.js). Recorded on the code before
// the two imports into writeback were removed; the same expectations hold after.
// Run: node --test tools/tests/w11-widgetbase-writeback-edges.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const QUIET = { error() {}, warn() {}, log() {}, info() {}, debug() {} };
const load = (rel, options) => loadAmd(path.join(JS_ROOT, rel), Object.assign({ stubs: { console: QUIET } }, options || {}));
const json = (value) => JSON.parse(JSON.stringify(value));

const serialize = load("dashboard/widgets/widgetBase/slotStock/serialize.js");
const fillContent = load("dashboard/widgets/widgetBase/slotStock/fillContent.js");
const registerWriteback = load("workflows/parameterSet/__orchestratorWriteback.js");

const DIAG = "WRITEBACK_WIDGET_RESTORE_FAILED";
const layout = { x: 1, y: 2, width: 30, height: 20 };

function serializeKdb(extra) {
  return Object.assign({
    api: {
      widgetVis: { getState: () => ({ byId: { v1: { derived: { code: " P_1 " } }, v2: { derived: { code: "" } } } }) },
      widgetText: { getState: () => ({ byId: { t1: { content: { text: "hello" } } } }) }
    }
  }, extra || {});
}

test("serializeWidgetFrame: vis, text and the two diagnostic cases", () => {
  const kdb = serializeKdb();
  assert.deepStrictEqual(json(serialize.serializeWidgetFrame(kdb, { widgetId: "v1", kind: "vis", layout }, 3)), {
    ok: true, diagnostics: [], entry: { tab: 3, x: 1, y: 2, w: 30, h: 20, kind: "vis", code: "P_1", type: "line" }
  });
  assert.deepStrictEqual(json(serialize.serializeWidgetFrame(kdb, { widgetId: "t1", kind: "text", layout, colour: "#ff0000" }, 0)), {
    ok: true, diagnostics: [], entry: { tab: 0, x: 1, y: 2, w: 30, h: 20, kind: "txt", text: "hello", bgcol: "#ff0000" }
  });
  assert.deepStrictEqual(json(serialize.serializeWidgetFrame(kdb, { widgetId: "v2", kind: "vis", layout }, 0)), {
    ok: false, entry: null,
    diagnostics: [{ code: DIAG, phase: "get", message: "vis widget missing metricCode in derived.code", details: { widgetId: "v2" } }]
  });
  assert.deepStrictEqual(json(serialize.serializeWidgetFrame(kdb, { widgetId: "v1", kind: "vis", layout: { x: 1, y: 2, width: NaN, height: 5 } }, 0)), {
    ok: false, entry: null,
    diagnostics: [{ code: DIAG, phase: "get", message: "widget layout or tab index contains a non-finite number", details: { widgetId: "v1" } }]
  });
});

function fillWorld(runtimeSeed) {
  const dispatched = [];
  const owner = (name) => ({ dispatch: (action) => { dispatched.push({ owner: name, type: action.type, runId: action.payload.runId }); return { ok: true }; } });
  const _KDB = { runtime: runtimeSeed || {}, config: {}, state: {}, services: {}, api: { widgetSettings: owner("widgetSettings"), widgetText: owner("widgetText"), widgetVis: owner("widgetVis") } };
  registerWriteback(_KDB, { installCognosBridge: false });
  return { _KDB, dispatched, context: { _KDB } };
}

const created = [{ sourceWidgetId: "a", widgetId: "a2" }, { sourceWidgetId: "b", widgetId: "b2" }];
const rows = [
  { sourceWidgetId: "a", entry: { kind: "vis", tab: 1, code: "P_1" } },
  { sourceWidgetId: "b", entry: { kind: "txt", tab: 1, text: "x" } }
];

test("fillDuplicateWidgetContent allocates one parameterSet run id per fill and hands it to every owner", async () => {
  const world = fillWorld();
  assert.deepStrictEqual(json(await fillContent.fillDuplicateWidgetContent(world.context, created, rows)), { degraded: [] });
  assert.equal(world._KDB.runtime.writeback.parameterSetRestoreRunId, 1);
  assert.deepStrictEqual(world.dispatched.map((d) => d.owner + ":" + d.runId), ["widgetSettings:1", "widgetText:1", "widgetVis:1"]);
  await fillContent.fillDuplicateWidgetContent(world.context, created, rows);
  assert.equal(world._KDB.runtime.writeback.parameterSetRestoreRunId, 2);
  assert.deepStrictEqual(world.dispatched.slice(3).map((d) => d.runId), [2, 2, 2]);
});

test("fillDuplicateWidgetContent continues the counter of real restore runs and repairs a bad value", async () => {
  const seeded = fillWorld();
  seeded._KDB.runtime.writeback.parameterSetRestoreRunId = 41;
  await fillContent.fillDuplicateWidgetContent(seeded.context, created, rows);
  assert.equal(seeded._KDB.runtime.writeback.parameterSetRestoreRunId, 42);
  assert.deepStrictEqual(seeded.dispatched.map((d) => d.runId), [42, 42, 42]);

  const broken = fillWorld();
  broken._KDB.runtime.writeback.parameterSetRestoreRunId = "7";
  await fillContent.fillDuplicateWidgetContent(broken.context, created, rows);
  assert.equal(broken._KDB.runtime.writeback.parameterSetRestoreRunId, 1);
});

test("fillDuplicateWidgetContent without rows touches neither the counter nor the owners", async () => {
  const world = fillWorld();
  assert.deepStrictEqual(json(await fillContent.fillDuplicateWidgetContent(world.context, [], rows)), { degraded: [] });
  assert.equal(world._KDB.runtime.writeback.parameterSetRestoreRunId, 0);
  assert.deepStrictEqual(world.dispatched, []);
});

test("writebackSet.allocateRestoreRunId bumps the shared counter, also for real restore runs and after destroy", () => {
  const world = fillWorld();
  const set = world._KDB.services.writebackSet;
  assert.equal(set.allocateRestoreRunId(), 1);
  assert.equal(set.allocateRestoreRunId(), 2);
  assert.equal(world._KDB.runtime.writeback.parameterSetRestoreRunId, 2);
  set.destroy();
  assert.equal(set.allocateRestoreRunId(), 3);
});

test("fillDuplicateWidgetContent without the writebackSet service degrades instead of throwing", async () => {
  for (const services of [undefined, {}, { writebackSet: {} }]) {
    const world = fillWorld();
    world._KDB.services = services;
    const result = json(await fillContent.fillDuplicateWidgetContent(world.context, created, rows));
    assert.deepStrictEqual(result, { degraded: [{ sourceWidgetId: null, code: DIAG, message: "duplicate content fill skipped: writebackSet service unavailable" }] });
    assert.deepStrictEqual(world.dispatched, []);
  }
});
