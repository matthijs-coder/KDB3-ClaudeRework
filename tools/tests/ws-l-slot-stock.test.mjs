// Golden tests for the widgetBase slot-stock handlers (WS-L W1): prepare, apply and rollback results plus the
// snapshot they leave in runtime.widgetBase.tabMutationSnapshots, and the parameter-set reset/restore results,
// on a stubbed _KDB without a DOM.
// The hashes were recorded from the pre-refactor handlers on main.
// Run: node --test tools/tests/ws-l-slot-stock.test.mjs   (WS_L_RECORD=1 prints the hashes instead of asserting)
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const BASE = path.join(JS_ROOT, "dashboard/widgets/widgetBase");
const documentStub = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => []
};
const consoleStub = { error() {}, warn() {}, info() {}, log() {} };
const load = (rel) => loadAmd(path.join(BASE, rel), { stubs: { document: documentStub, console: consoleStub } });

const prepare = load("slotStock/prepare.js").handlePrepareTabMutation;
const apply = load("slotStock/apply.js").handleApplyTabMutation;
const rollback = load("slotStock/rollback.js").handleRestoreTabMutationSnapshot;
const parameterSetReset = load("restore.js").handleParameterSetReset;
const parameterSetRestore = load("restore.js").handleParameterSetRestore;
const selectors = load("state/selectors.js");
const actionTypes = load("state.js").ACTION_TYPES;

const sha = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);

function frame(widgetId, tabId, kind, extra) {
  return Object.assign({ widgetId, tabId, kind, placement: "onCanvas", layout: { x: 10, y: 20, width: 300, height: 200 } }, extra);
}

function makeContext(options) {
  const opts = options || {};
  const log = [];
  const byId = {};
  (opts.frames || []).forEach((entry) => { byId[entry.widgetId] = entry; });
  const _KDB = {
    state: { widgets: { base: { byId } } },
    runtime: {
      widgetBase: { routedTabIds: opts.routed || { A: true, B: true, C: true, D: true }, tabMutationSnapshots: {}, tabMutationRunId: 0 },
      tabs: {}
    },
    api: {
      widgetSettings: { getState: () => ({ byWidget: {} }), dispatch: async () => ({ ok: true }) },
      widgetVis: {
        getState: () => ({ byId: { v1: { derived: { code: "M1" } }, v2: { derived: { code: "M2" } }, v9: { derived: { code: "M9" } } } }),
        dispatch: async () => ({ ok: true })
      },
      widgetText: { getState: () => ({ byId: {} }), dispatch: async () => ({ ok: true }) },
      tabs: { dispatch: async (action) => { log.push(["tabs", action.type, action.payload.tabIndex]); return true; } }
    },
    elements: {}
  };
  if (opts.launchpad !== false) {
    _KDB.api.launchpad = {
      dispatch: async (action) => {
        log.push(["launchpad", action.payload.padKey, action.payload.tabId]);
        return opts.launchpadResult || { ok: true, widgets: [] };
      }
    };
  }
  const context = {
    _KDB,
    selectors: opts.throwingSelectors ? { readCanvasWidgetsByTab() { throw new Error("selector boom"); } } : selectors,
    actionTypes,
    dispatch: async (action) => {
      log.push(["dispatch", action.type, action.widgetId, action.payload && action.payload.reason]);
      return opts.dispatchResult || { ok: true };
    },
    dispatchInternal: (action) => { log.push(["internal", action.type, action.payload && action.payload.widgetId]); },
    ensureOpSeq: () => 1,
    isStaleOpSeq: () => false,
    isLaunchpadReady: () => opts.launchpadReady !== false
  };
  if (opts.subOwnerResult) {
    ["widgetVis", "widgetText", "widgetSettings"].forEach((owner) => {
      _KDB.api[owner].dispatch = async (action) => { log.push([owner, action.type, action.payload.widgetIds]); return opts.subOwnerResult[owner] || { ok: true }; };
    });
  }
  return { context, log };
}

async function run(handler, ctx, payload) {
  const result = await handler(ctx.context, { payload });
  const rt = ctx.context._KDB.runtime.widgetBase;
  return JSON.parse(JSON.stringify({ result, snapshots: rt.tabMutationSnapshots, runId: rt.tabMutationRunId, log: ctx.log }));
}

const twoTabFrames = () => [
  frame("v1", "A", "vis"), frame("t1", "A", "text"), frame("v2", "B", "vis"),
  frame("h1", "A", "topN", { role: "topNHelper" }), frame("kdb3widget", "A", "vis")
];
const plans = {
  duplicate: {
    operation: "duplicate", affectedTabIds: ["A", "B", "C"],
    sourceSlot: { tabId: "A", tabIdx: 0, index: 0 }, insertSlot: { tabId: "C", tabIdx: 2, index: 2 },
    slotMoves: [{ fromTabId: "B", toTabId: "D", fromTabIdx: 1, toTabIdx: 3, fromIndex: 1, toIndex: 3 }]
  },
  delete: {
    operation: "delete", affectedTabIds: ["A", "B", "C"],
    deletedSlot: { tabId: "A", tabIdx: 0, index: 0 }, hideSlot: { tabId: "C", tabIdx: 2, index: 2 },
    slotMoves: [{ fromTabId: "B", toTabId: "A", fromTabIdx: 1, toTabIdx: 0, fromIndex: 1, toIndex: 0 }]
  },
  move: {
    operation: "move", affectedTabIds: ["A", "B"],
    slotMoves: [
      { fromTabId: "A", toTabId: "B", fromTabIdx: 0, toTabIdx: 1, fromIndex: 0, toIndex: 1 },
      { fromTabId: "B", toTabId: "A", fromTabIdx: 1, toTabIdx: 0, fromIndex: 1, toIndex: 0 }
    ]
  },
  restoreDeleted: {
    operation: "restoreDeleted", affectedTabIds: ["A", "B"],
    insertSlot: { tabId: "A", tabIdx: 0, index: 0 }, revealSlot: { tabId: "B", tabIdx: 1, index: 1 }
  }
};
const entryRow = (id, kind) => ({ sourceWidgetId: id, entry: { kind, tab: 0, x: 1, y: 2, w: 300, h: 200 } });
const lots = { ok: true, widgets: [] };
const moveFrames = () => twoTabFrames().concat([frame("t2", "B", "text")]);
const withStock = (frames) => frames.concat([frame("v9", "C", "vis"), frame("v8", "D", "vis"), frame("t9", "C", "text")]);

const PREPARE_CASES = {
  "duplicate forward": { frames: () => withStock(twoTabFrames()), payload: { runId: 1, operationId: "op", plan: plans.duplicate } },
  "duplicate forward short": { frames: twoTabFrames, payload: { runId: 1, operationId: "op", plan: plans.duplicate } },
  "duplicate forward unsupported": {
    frames: () => withStock(twoTabFrames()).concat([frame("x1", "B", "datatable")]),
    payload: { runId: 1, operationId: "op", plan: plans.duplicate }
  },
  "duplicate forward unevaluable": {
    frames: twoTabFrames, launchpad: false, payload: { runId: 1, operationId: "op", plan: plans.duplicate }
  },
  "duplicate undo": {
    frames: () => withStock(twoTabFrames()),
    payload: { runId: 2, operationId: "op", widgetRebuild: true, plan: plans.duplicate, serializedByTabId: { C: [entryRow("v1", "vis")] } }
  },
  "duplicate undo non-object": {
    frames: twoTabFrames, payload: { runId: 2, operationId: "op", widgetRebuild: true, plan: plans.duplicate, serializedByTabId: "x" }
  },
  "delete widgetRebuild": {
    frames: () => withStock(twoTabFrames()),
    payload: { runId: 3, operationId: "op", widgetRebuild: true, plan: plans.delete, serializedByTabId: { A: [entryRow("v2", "vis")] } }
  },
  "delete forward": { frames: () => withStock(twoTabFrames()), payload: { runId: 1, operationId: "op", plan: plans.delete } },
  "delete forward hide is destination": {
    frames: twoTabFrames,
    payload: { runId: 1, operationId: "op", plan: Object.assign({}, plans.delete, { hideSlot: { tabId: "A", tabIdx: 0 } }) }
  },
  "delete forward unsupported": {
    frames: () => twoTabFrames().concat([frame("x1", "C", "datatable")]), payload: { runId: 1, operationId: "op", plan: plans.delete }
  },
  "delete forward short": {
    frames: () => [frame("v2", "B", "vis"), frame("v3", "B", "vis")], payload: { runId: 1, operationId: "op", plan: plans.delete }
  },
  "restoreDeleted": {
    frames: () => withStock(twoTabFrames()),
    payload: { runId: 1, operationId: "op", plan: plans.restoreDeleted, serializedByTabId: { A: [entryRow("v1", "vis")], B: [] } }
  },
  "restoreDeleted non-plain": {
    frames: twoTabFrames, payload: { runId: 1, operationId: "op", plan: plans.restoreDeleted, serializedByTabId: [] }
  },
  "restoreDeleted short": {
    frames: () => [], payload: { runId: 1, operationId: "op", plan: plans.restoreDeleted, serializedByTabId: { A: [entryRow("v1", "vis")] } }
  },
  "move forward": { frames: moveFrames, payload: { runId: 1, operationId: "op", plan: plans.move } },
  "move forward replay": { frames: moveFrames, payload: { runId: 1, operationId: "op", isHistoryReplay: true, plan: plans.move } },
  "move forward no tabIdx": {
    frames: moveFrames,
    payload: { runId: 1, operationId: "op", plan: { operation: "move", affectedTabIds: ["A", "B"], slotMoves: [{ fromTabId: "A", toTabId: "B" }] } }
  },
  "move undo": {
    frames: moveFrames,
    payload: { runId: 1, operationId: "op", plan: plans.move, serializedByTabId: { A: [entryRow("v2", "vis")], B: [entryRow("v1", "vis"), entryRow("t1", "txt")] } }
  },
  "move undo non-plain": { frames: moveFrames, payload: { runId: 1, operationId: "op", plan: plans.move, serializedByTabId: [1] } },
  "move unsupported": {
    frames: () => twoTabFrames().concat([frame("x1", "A", "datatable")]), payload: { runId: 1, operationId: "op", plan: plans.move }
  },
  "missing routes": { frames: twoTabFrames, routed: { A: true }, payload: { runId: 1, operationId: "op", plan: plans.duplicate } },
  "non-numeric runId": { frames: twoTabFrames, payload: { runId: "1", operationId: "op", plan: plans.move } },
  "unknown operation": { frames: twoTabFrames, payload: { runId: 1, operationId: "op", plan: { operation: "rename", affectedTabIds: ["A"] } } },
  "selector throws": { frames: twoTabFrames, throwingSelectors: true, payload: { runId: 1, operationId: "op", plan: plans.move } }
};

const APPLY_CASES = {
  "duplicate missing insertSlot": {
    snapshot: { rebuildByTabId: {} }, payload: { runId: 1, operationId: "op", plan: Object.assign({}, plans.duplicate, { insertSlot: null }) }
  },
  "duplicate missing rebuild": { snapshot: {}, payload: { runId: 1, operationId: "op", plan: plans.duplicate } },
  "duplicate empty rows": {
    snapshot: { rebuildByTabId: { C: [], D: [], B: [] } }, payload: { runId: 1, operationId: "op", plan: plans.duplicate }
  },
  "duplicate structural": {
    snapshot: { rebuildByTabId: { C: [entryRow("v1", "vis")] } }, payload: { runId: 1, operationId: "op", plan: plans.duplicate }
  },
  "delete user": { snapshot: { rebuildByTabId: { A: [], C: [] } }, payload: { runId: 1, operationId: "op", plan: plans.delete } },
  "delete user hide park fails": {
    dispatchResult: { ok: false },
    snapshot: { rebuildByTabId: { A: [] } }, payload: { runId: 1, operationId: "op", plan: plans.delete }
  },
  "delete widgetRebuild structural": {
    snapshot: { rebuildByTabId: { A: [entryRow("v2", "vis")] } }, payload: { runId: 1, operationId: "op", widgetRebuild: true, plan: plans.delete }
  },
  "restoreDeleted": { snapshot: { rebuildByTabId: { A: [], B: [] } }, payload: { runId: 1, operationId: "op", plan: plans.restoreDeleted } },
  "move": { snapshot: { rebuildByTabId: { A: [], B: [] } }, payload: { runId: 1, operationId: "op", plan: plans.move } },
  "move route fails": {
    dispatchResult: { ok: false }, snapshot: { rebuildByTabId: { A: [] } }, payload: { runId: 1, operationId: "op", plan: plans.move }
  },
  "no snapshot": { payload: { runId: 1, operationId: "missing", plan: plans.move } },
  "unsupported operation": { payload: { runId: 1, operationId: "op", plan: { operation: "rename" } } },
  "stale runId": { runIdBefore: 5, payload: { runId: 4, operationId: "op", plan: plans.move } }
};

const ROLLBACK_CASES = {
  "not started": { snapshot: { plan: plans.move, physicalStarted: false, byId: { v1: frame("v1", "A", "vis") } } },
  "content rebuild": {
    snapshot: { plan: plans.duplicate, physicalStarted: true, createdWidgetIds: ["v1"], rollbackByTabId: { A: [], B: [] }, byId: {} }
  },
  "content rebuild fails": {
    dispatchResult: { ok: false },
    snapshot: { plan: plans.move, slotStockRebuild: true, physicalStarted: true, rollbackByTabId: { A: [] }, byId: {} }
  },
  "frame restore": {
    snapshot: { plan: { operation: "rename" }, physicalStarted: true, createdWidgetIds: ["t1"], byId: { v1: frame("v1", "B", "vis"), v2: frame("v2", "B", "vis", { placement: "onLaunchpad" }) } }
  },
  "missing": { snapshot: null }
};

const PARAMETER_SET_CASES = {
  "reset non-numeric runId": { handler: "reset", payload: { runId: "1" } },
  "reset stale runId": { handler: "reset", runIdBefore: 5, payload: { runId: 4 } },
  "reset no canvas widgets": { handler: "reset", frames: () => [], payload: { runId: 1 } },
  "reset launchpad not ready": { handler: "reset", launchpadReady: false, payload: { runId: 1 } },
  "reset sub-owner fails": {
    handler: "reset", subOwnerResult: { widgetVis: { ok: false, diagnostics: [{ code: "X" }] } }, payload: { runId: 1, source: "s", status: "st" }
  },
  "reset parks": {
    handler: "reset", subOwnerResult: {}, frames: () => [frame("v1", "A", "vis"), frame("w1", "A", "weird")], payload: { runId: 1, skipHistory: true }
  },
  "restore non-numeric runId": { handler: "restore", payload: { runId: null } },
  "restore stale runId": { handler: "restore", runIdBefore: 3, payload: { runId: 2 } },
  "restore entries": {
    handler: "restore",
    payload: {
      runId: 1,
      tabTargets: { 0: { tabId: "A" } },
      widgets: [{ kind: "img", tab: 0 }, { kind: "vis", tab: 7 }, { kind: "vis", tab: 0, code: "M1", x: 1, y: 2, w: 3, h: 4 }, { kind: "txt", tab: 0 }]
    }
  }
};

async function runParameterSet(spec) {
  const ctx = makeContext({
    frames: (spec.frames || twoTabFrames)(), launchpadReady: spec.launchpadReady, subOwnerResult: spec.subOwnerResult
  });
  if (spec.runIdBefore) { ctx.context._KDB.runtime.widgetBase.parameterSetRunId = spec.runIdBefore; }
  const handler = spec.handler === "reset" ? parameterSetReset : parameterSetRestore;
  const result = await handler(ctx.context, { payload: spec.payload });
  return JSON.parse(JSON.stringify({ result, runId: ctx.context._KDB.runtime.widgetBase.parameterSetRunId, log: ctx.log }));
}

async function runPrepare(spec) {
  const ctx = makeContext({ frames: spec.frames(), routed: spec.routed, launchpad: spec.launchpad, throwingSelectors: spec.throwingSelectors });
  return run(prepare, ctx, spec.payload);
}

async function runApply(spec) {
  const ctx = makeContext({ frames: twoTabFrames(), dispatchResult: spec.dispatchResult });
  const rt = ctx.context._KDB.runtime.widgetBase;
  if (spec.snapshot) { rt.tabMutationSnapshots.op = JSON.parse(JSON.stringify(spec.snapshot)); }
  if (spec.runIdBefore) { rt.tabMutationRunId = spec.runIdBefore; }
  return run(apply, ctx, spec.payload);
}

async function runRollback(spec) {
  const ctx = makeContext({ frames: twoTabFrames(), dispatchResult: spec.dispatchResult });
  if (spec.snapshot) { ctx.context._KDB.runtime.widgetBase.tabMutationSnapshots.op = JSON.parse(JSON.stringify(spec.snapshot)); }
  return run(rollback, ctx, { runId: 1, operationId: "op" });
}

const GOLDEN = {
  "prepare: duplicate forward": "e946f7f3d86e467a",
  "prepare: duplicate forward short": "987ac27dd6c14543",
  "prepare: duplicate forward unsupported": "ad5683d56b053dda",
  "prepare: duplicate forward unevaluable": "a2ce3ad43739ac52",
  "prepare: duplicate undo": "62d0c2f9aa868b78",
  "prepare: duplicate undo non-object": "7fe83c286710c633",
  "prepare: delete widgetRebuild": "1f01b01d560dcfb0",
  "prepare: delete forward": "dca6bd4babbb46b0",
  "prepare: delete forward hide is destination": "67ae3ad2f4112b1c",
  "prepare: delete forward unsupported": "b5fdee8253af5c1e",
  "prepare: delete forward short": "0b0e69003c8c8713",
  "prepare: restoreDeleted": "21525f9d9625cb2c",
  "prepare: restoreDeleted non-plain": "93594518439284e5",
  "prepare: restoreDeleted short": "e9881be7902b61c7",
  "prepare: move forward": "bfa8ae52845d9513",
  "prepare: move forward replay": "18556647d4522e8f",
  "prepare: move forward no tabIdx": "56e7abb22b738877",
  "prepare: move undo": "eed5feace15cc49c",
  "prepare: move undo non-plain": "67dba3cc6d440600",
  "prepare: move unsupported": "51e8c7b585a77116",
  "prepare: missing routes": "4aea6453eb36ee35",
  "prepare: non-numeric runId": "0a3b53c76568ffa8",
  "prepare: unknown operation": "7e7927411993cd4e",
  "prepare: selector throws": "2c506836d4bad4f4",
  "apply: duplicate missing insertSlot": "7f75216acf1b524c",
  "apply: duplicate missing rebuild": "e2696d1e021d9e1d",
  "apply: duplicate empty rows": "2f6e2a28e4476a55",
  "apply: duplicate structural": "acdf04135579aefa",
  "apply: delete user": "0a495194329163b2",
  "apply: delete user hide park fails": "64fde52dae1ae95a",
  "apply: delete widgetRebuild structural": "b9d2e6d31493e744",
  "apply: restoreDeleted": "39eab27a549f453b",
  "apply: move": "5729c527c756e664",
  "apply: move route fails": "1182f93a2f699195",
  "apply: no snapshot": "7d913726a03ad2d0",
  "apply: unsupported operation": "20ed304deefb5715",
  "apply: stale runId": "aa8005d85245e844",
  "rollback: not started": "5b3315df0f3f2693",
  "rollback: content rebuild": "54ab0248f0606dba",
  "rollback: content rebuild fails": "ee12a8a2bde88887",
  "rollback: frame restore": "e727762a1966d91f",
  "rollback: missing": "b4d5a2f689b4e6ba",
  "parameterSet: reset non-numeric runId": "dc249e0b0e5be747",
  "parameterSet: reset stale runId": "ecf23cb58755fc34",
  "parameterSet: reset no canvas widgets": "409f2bef73363beb",
  "parameterSet: reset launchpad not ready": "9c0654ae3d3999da",
  "parameterSet: reset sub-owner fails": "0f8e44b5c8c97de4",
  "parameterSet: reset parks": "eadc325dbfc659c9",
  "parameterSet: restore non-numeric runId": "e6e3da1fb4387080",
  "parameterSet: restore stale runId": "710952fefd780471",
  "parameterSet: restore entries": "1faf24e113fb31b6"
};

const groups = [["prepare", PREPARE_CASES, runPrepare], ["apply", APPLY_CASES, runApply], ["rollback", ROLLBACK_CASES, runRollback],
  ["parameterSet", PARAMETER_SET_CASES, runParameterSet]];

if (process.env.WS_L_RECORD === "1") {
  const recorded = {};
  for (const [group, cases, runner] of groups) {
    for (const name of Object.keys(cases)) {
      recorded[group + ": " + name] = sha(await runner(cases[name]));
    }
  }
  process.stdout.write(JSON.stringify(recorded, null, 2) + "\n");
} else {
  for (const [group, cases, runner] of groups) {
    for (const name of Object.keys(cases)) {
      test("widgetBase slot stock " + group + ": " + name, async () => {
        const output = await runner(cases[name]);
        assert.equal(sha(output), GOLDEN[group + ": " + name], JSON.stringify(output));
      });
    }
  }
}
