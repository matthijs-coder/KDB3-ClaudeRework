// Prognose vis-step undo restores dimension + TopN through widgetVis/applyVisType.
// Stubs sit at the widgetVis dispatch / DOM edges; history.js, finalize.js, downstream.js,
// dispatchWidgetSettingsIntent.js and optionMarking.js run for real.
// Run: node --test tools/tests/widgetSettings-prognose-undo.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";
import { createFakeDocument } from "./ws-d1-fake-dom.mjs";

const QUIET = { error() {}, warn() {}, log() {}, info() {}, debug() {} };
const WIDGET_ID = "w1";
const STEP_KEY = "widgetSettings_optionSelect";
const PROGNOSE_VALUE = "com.ibm.vis.custom.prognoseyear";
const DIM = "Berufsfamilie";

const load = (rel, options) => loadAmd(path.join(JS_ROOT, rel), Object.assign({ stubs: { console: QUIET } }, options || {}));

function loadWithDoc(rel, doc, extra) {
  return loadAmd(path.join(JS_ROOT, rel), Object.assign({
    stubs: { console: QUIET, document: doc }
  }, extra || {}));
}

function selectors() {
  return load("dashboard/widgets/widgetSettings/config/selectors.js");
}

function selectedKey(dropdown, sel) {
  const rows = dropdown.querySelectorAll(sel.dropdownOptionSelector);
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i].classList.contains(sel.optionSelectedClass)) {
      return rows[i].getAttribute(sel.optionKeyAttr);
    }
  }
  return null;
}

function addOption(doc, dropdown, sel, kind, key, value, isSelected) {
  const option = doc.createElement("div");
  option.className = "dataWidgetIcon";
  option.setAttribute(sel.dropdownKindAttr, kind);
  option.setAttribute(sel.optionKeyAttr, key);
  option.setAttribute(sel.optionValueAttr, value);
  if (isSelected) {
    option.classList.add(sel.optionSelectedClass);
  }
  dropdown.appendChild(option);
  return option;
}

function addDropdown(doc, panel, sel, kind, rows, selectedKeyValue) {
  const dropdown = doc.createElement("div");
  dropdown.className = "KDB_IconsDropdown";
  dropdown.setAttribute(sel.dropdownKindAttr, kind);
  const options = {};
  rows.forEach((row) => {
    options[row.key] = addOption(doc, dropdown, sel, kind, row.key, row.value, row.key === selectedKeyValue);
  });
  panel.appendChild(dropdown);
  return { dropdown, options };
}

function buildPanel(doc, sel, selected) {
  const pick = Object.assign({ vis: "prognose", dimension: "none", topN: "none" }, selected || {});
  const panel = doc.createElement("div");
  panel.className = sel.panelRootClass;
  panel.setAttribute(sel.panelRootAttr, WIDGET_ID);
  panel.setAttribute(sel.panelWidgetTypeAttr, "live");
  const vis = addDropdown(doc, panel, sel, "visualization", [
    { key: "line", value: "line" },
    { key: "pie", value: "pie" },
    { key: "prognose", value: PROGNOSE_VALUE }
  ], pick.vis);
  const dimension = addDropdown(doc, panel, sel, "dimension", [
    { key: "none", value: "none" },
    { key: DIM, value: DIM }
  ], pick.dimension);
  const topN = addDropdown(doc, panel, sel, "topN", [
    { key: "none", value: "none" },
    { key: "top-3", value: "3" },
    { key: "bottom-3", value: "bottom-3" }
  ], pick.topN);
  return { panel, vis, dimension, topN };
}

function fakeOption(sel, kind, key, value) {
  const attrs = {
    [sel.dropdownKindAttr]: kind,
    [sel.optionKeyAttr]: key,
    [sel.optionValueAttr]: value
  };
  return { getAttribute: (name) => (name in attrs ? attrs[name] : "") };
}

function visFrame(key, value, extra) {
  return Object.assign({
    widgetId: WIDGET_ID,
    widgetType: "live",
    kind: "visualization",
    optionKey: key,
    optionValue: value,
    target: "widgetVis",
    type: "widgetVis/applyVisType"
  }, extra || {});
}

function dimFrame(key) {
  return {
    widgetId: WIDGET_ID,
    widgetType: "live",
    kind: "dimension",
    optionKey: key,
    optionValue: key,
    target: "widgetVis",
    type: "widgetVis/applyDimension"
  };
}

function topNFrame(key, value) {
  return {
    widgetId: WIDGET_ID,
    widgetType: "live",
    kind: "topN",
    optionKey: key,
    optionValue: value,
    target: "widgetVis",
    type: "widgetVis/applyTopNChoice"
  };
}

function successResult(nextValue) {
  return {
    ok: true,
    status: "success",
    reportToSettings: { nextValue: nextValue }
  };
}

function createHarness(options) {
  const opts = options || {};
  const sel = selectors();
  const doc = createFakeDocument();
  const selected = Object.assign({ vis: "prognose", dimension: "none", topN: "none" }, opts.selected);
  const live = buildPanel(doc, sel, selected);
  const focus = buildPanel(doc, sel, selected);
  delete focus.panel.attributes[sel.panelRootAttr];
  focus.panel.setAttribute(sel.focusPanelRootAttr, WIDGET_ID);
  doc.body.appendChild(live.panel);
  doc.body.appendChild(focus.panel);

  const dispatched = [];
  const visResults = opts.visResults || [];
  const _KDB = {
    config: { options: {}, labels: { de: {} } },
    api: {
      widgetVis: {
        dispatch: (action) => {
          dispatched.push(action);
          if (typeof opts.visDispatch === "function") {
            return opts.visDispatch(action, dispatched.length - 1);
          }
          if (visResults.length) {
            return visResults.shift();
          }
          return successResult(action.payload && action.payload.nextValue);
        }
      }
    },
    properties: { filterPropObj: {} },
    state: {
      widgets: {
        settings: { byWidget: {} },
        vis: { byId: {} }
      }
    },
    runtime: {
      widgetSettings: {
        abortControllers: {},
        timers: {},
        domRefs: { [WIDGET_ID]: { panel: live.panel } }
      }
    },
    events: { emit() {}, subscribe() { return function () {}; } },
    services: {}
  };
  load("core/config/registerConfig.js")(_KDB);
  const record = Object.assign({
    visType: PROGNOSE_VALUE,
    dimension: "none",
    topNChoice: "none",
    pending: { kind: null },
    deferred: {}
  }, opts.record);
  _KDB.state.widgets.settings.byWidget[WIDGET_ID] = record;

  const historyMod = loadWithDoc("dashboard/widgets/widgetSettings/history.js", doc);
  return {
    _KDB, sel, doc, live, focus, dispatched, record, historyMod
  };
}

function readRecord(_KDB) {
  return _KDB.state.widgets.settings.byWidget[WIDGET_ID];
}

test("recording: Line+Berufsfamilie+top-3 → Prognose attaches restoreControls on the old frame", () => {
  const sel = selectors();
  const historyMod = load("dashboard/widgets/widgetSettings/history.js");
  const _KDB = {
    state: { widgets: { settings: { byWidget: {
      [WIDGET_ID]: { dimension: DIM, topNChoice: "top-3", visType: "line", pending: { kind: null }, deferred: {} }
    } } } }
  };
  const oldFrame = visFrame("line", "line");
  historyMod.maybeAttachRestoreControls(_KDB, oldFrame, fakeOption(sel, "visualization", "prognose", PROGNOSE_VALUE));
  assert.deepEqual(oldFrame.restoreControls, { dimension: DIM, topNChoice: "top-3" });
});

test("recording: Line(Ohne)→Prognose and Line→Pie attach no restoreControls; dim+none does", () => {
  const sel = selectors();
  const historyMod = load("dashboard/widgets/widgetSettings/history.js");
  const prognoseOpt = fakeOption(sel, "visualization", "prognose", PROGNOSE_VALUE);
  const pieOpt = fakeOption(sel, "visualization", "pie", "pie");

  const noneKdb = {
    state: { widgets: { settings: { byWidget: {
      [WIDGET_ID]: { dimension: "none", topNChoice: "none", visType: "line", pending: { kind: null }, deferred: {} }
    } } } }
  };
  const noneFrame = visFrame("line", "line");
  historyMod.maybeAttachRestoreControls(noneKdb, noneFrame, prognoseOpt);
  assert.equal("restoreControls" in noneFrame, false);

  const pieFrame = visFrame("line", "line");
  const dimKdb = {
    state: { widgets: { settings: { byWidget: {
      [WIDGET_ID]: { dimension: DIM, topNChoice: "top-3", visType: "line", pending: { kind: null }, deferred: {} }
    } } } }
  };
  historyMod.maybeAttachRestoreControls(dimKdb, pieFrame, pieOpt);
  assert.equal("restoreControls" in pieFrame, false);

  const dimOnlyKdb = {
    state: { widgets: { settings: { byWidget: {
      [WIDGET_ID]: { dimension: DIM, topNChoice: "none", visType: "line", pending: { kind: null }, deferred: {} }
    } } } }
  };
  const dimOnlyFrame = visFrame("line", "line");
  historyMod.maybeAttachRestoreControls(dimOnlyKdb, dimOnlyFrame, prognoseOpt);
  assert.deepEqual(dimOnlyFrame.restoreControls, { dimension: DIM, topNChoice: "none" });
});

test("selectOption calls maybeAttachRestoreControls on the old frame before dispatch", () => {
  const sel = selectors();
  const attachCalls = [];
  const dispatchCalls = [];
  let oldFrame = visFrame("line", "line");
  const panelEvents = load("dashboard/widgets/widgetSettings/view/panelEvents.js", {
    modules: {
      "../history.js": {
        buildDropdownSelectionFrame: () => oldFrame,
        maybeAttachRestoreControls: (_KDB, frame, option) => {
          attachCalls.push({ frame: frame, optionKey: option.getAttribute(sel.optionKeyAttr), beforeDispatch: dispatchCalls.length === 0 });
        },
        queueCoupledTopNClearHistory: () => false,
        pushHistoryAfterConfirmedApply: () => {}
      },
      "../effects/dispatchWidgetSettingsIntent.js": {
        dropdownOption: () => {
          dispatchCalls.push(1);
          return { ok: true, status: "success" };
        },
        icon: () => {}
      },
      "./dropdownUi.js": {
        findOption: (_panel, target) => target,
        findIcon: () => null,
        closeDropdowns: () => {},
        toggleDropdown: () => {}
      },
      "./panelOutsidePointerBehavior.js": { ensureDocumentPointerDown: () => {} }
    }
  });
  const doc = createFakeDocument();
  const live = buildPanel(doc, sel, { vis: "line", dimension: DIM, topN: "top-3" });
  const _KDB = {
    runtime: { widgetSettings: { abortControllers: {}, timers: {}, domRefs: {} } }
  };
  panelEvents.bindWidgetSettingsPanel(_KDB, { panelEl: live.panel, widgetId: WIDGET_ID });
  const option = live.vis.options.prognose;
  const down = live.panel.listenerLog.find((l) => l.type === "pointerdown");
  down.handler({
    currentTarget: live.panel,
    target: option,
    preventDefault() {},
    stopPropagation() {}
  });
  assert.equal(attachCalls.length, 1);
  assert.equal(attachCalls[0].frame, oldFrame);
  assert.equal(attachCalls[0].optionKey, "prognose");
  assert.equal(attachCalls[0].beforeDispatch, true);
  assert.equal(dispatchCalls.length, 1);
});

test("replay undo: applyVisType nextValue is Line and snapshot carries recorded dim+TopN; finalize commits all three", async () => {
  const h = createHarness({
    record: { visType: PROGNOSE_VALUE, dimension: "none", topNChoice: "none" }
  });
  const handler = h.historyMod.createWidgetSettingsHistoryReplayHandler(h._KDB);
  const oldFrame = visFrame("line", "line", { restoreControls: { dimension: DIM, topNChoice: "top-3" } });
  const ok = await handler.apply(h._KDB, oldFrame, { key: STEP_KEY, old: oldFrame, new: visFrame("prognose", PROGNOSE_VALUE) }, { direction: "undo" });
  assert.equal(ok, true);
  assert.equal(h.dispatched.length, 1);
  const action = h.dispatched[0];
  assert.equal(action.type, "widgetVis/applyVisType");
  assert.equal(action.payload.nextValue, "line");
  assert.equal(action.payload.settingsSnapshot.dimension, DIM);
  assert.equal(action.payload.settingsSnapshot.topNChoice, "top-3");
  const record = readRecord(h._KDB);
  assert.equal(record.visType, "line");
  assert.equal(record.dimension, DIM);
  assert.equal(record.topNChoice, "top-3");
});

test("fail-closed: timeout / aborted / ok:false / stale / skipped commit nothing, replay returns false, vis dropdown re-stamped", async () => {
  const cases = [
    { name: "timeout", result: { ok: false, status: "timeout" }, stamp: true },
    { name: "aborted", result: { ok: false, status: "aborted" }, stamp: true },
    { name: "ok:false", result: { ok: false }, stamp: true },
    { name: "stale", result: { ok: true, stale: true, status: "success", reportToSettings: { nextValue: "line" } }, stamp: false },
    { name: "skipped", result: { ok: true, skipped: true }, stamp: true }
  ];
  for (const item of cases) {
    const h = createHarness({
      record: { visType: PROGNOSE_VALUE, dimension: "none", topNChoice: "none" },
      visDispatch: () => item.result
    });
    const handler = h.historyMod.createWidgetSettingsHistoryReplayHandler(h._KDB);
    const oldFrame = visFrame("line", "line", { restoreControls: { dimension: DIM, topNChoice: "top-3" } });
    const ok = await handler.apply(h._KDB, oldFrame, { key: STEP_KEY, old: oldFrame, new: visFrame("prognose", PROGNOSE_VALUE) }, { direction: "undo" });
    assert.equal(ok, false, item.name + " replay");
    const record = readRecord(h._KDB);
    assert.equal(record.visType, PROGNOSE_VALUE, item.name + " visType");
    assert.equal(record.dimension, "none", item.name + " dimension");
    assert.equal(record.topNChoice, "none", item.name + " topN");
    if (item.stamp) {
      assert.equal(selectedKey(h.live.vis.dropdown, h.sel), "prognose", item.name + " vis dropdown");
    }
  }
});

test("redo: Prognose new frame commits Ohne clear and does not restore", async () => {
  const h = createHarness({
    record: { visType: "line", dimension: DIM, topNChoice: "top-3" },
    selected: { vis: "line", dimension: DIM, topN: "top-3" }
  });
  const handler = h.historyMod.createWidgetSettingsHistoryReplayHandler(h._KDB);
  const newFrame = visFrame("prognose", PROGNOSE_VALUE);
  const ok = await handler.apply(h._KDB, newFrame, {
    key: STEP_KEY,
    old: visFrame("line", "line", { restoreControls: { dimension: DIM, topNChoice: "top-3" } }),
    new: newFrame
  }, { direction: "redo" });
  assert.equal(ok, true);
  const action = h.dispatched[0];
  assert.equal(action.type, "widgetVis/applyVisType");
  assert.equal(action.payload.nextValue, PROGNOSE_VALUE);
  const record = readRecord(h._KDB);
  assert.equal(record.visType, PROGNOSE_VALUE);
  assert.equal(record.dimension, "none");
  assert.equal(record.topNChoice, "none");
});

async function runChain(topNKey, topNValue) {
  const h = createHarness({
    record: { visType: PROGNOSE_VALUE, dimension: "none", topNChoice: "none" }
  });
  const registerHistory = load("core/services/historyService/index.js");
  const historyApi = registerHistory(h._KDB);
  const handler = h.historyMod.createWidgetSettingsHistoryReplayHandler(h._KDB);
  historyApi.registerReplayHandler(STEP_KEY, handler);

  assert.equal(historyApi.pushCommittedStep({
    key: STEP_KEY, old: dimFrame("none"), new: dimFrame(DIM)
  }), true);
  assert.equal(historyApi.pushCommittedStep({
    key: STEP_KEY, old: topNFrame("none", "none"), new: topNFrame(topNKey, topNValue)
  }), true);
  assert.equal(historyApi.pushCommittedStep({
    key: STEP_KEY,
    old: visFrame("line", "line", { restoreControls: { dimension: DIM, topNChoice: topNKey } }),
    new: visFrame("prognose", PROGNOSE_VALUE)
  }), true);

  const snap = () => {
    const rec = readRecord(h._KDB);
    return [rec.visType, rec.dimension, rec.topNChoice];
  };

  assert.equal(await historyApi.undo(), true);
  assert.deepEqual(snap(), ["line", DIM, topNKey]);
  assert.equal(await historyApi.undo(), true);
  assert.deepEqual(snap(), ["line", DIM, "none"]);
  assert.equal(await historyApi.undo(), true);
  assert.deepEqual(snap(), ["line", "none", "none"]);

  assert.equal(await historyApi.redo(), true);
  assert.deepEqual(snap(), ["line", DIM, "none"]);
  assert.equal(await historyApi.redo(), true);
  assert.deepEqual(snap(), ["line", DIM, topNKey]);
  assert.equal(await historyApi.redo(), true);
  assert.deepEqual(snap(), [PROGNOSE_VALUE, "none", "none"]);

  assert.equal(await historyApi.undo(), true);
  assert.deepEqual(snap(), ["line", DIM, topNKey]);
  assert.equal(await historyApi.redo(), true);
  assert.deepEqual(snap(), [PROGNOSE_VALUE, "none", "none"]);
  assert.equal(await historyApi.undo(), true);
  assert.deepEqual(snap(), ["line", DIM, topNKey]);
}

test("chain: [dim, top-3, vis→Prognose] undo×3 redo×3 and undo/redo/undo of the vis step", async () => {
  await runChain("top-3", "3");
});

test("chain: same sequences with bottom-3", async () => {
  await runChain("bottom-3", "bottom-3");
});

test("focus clone: after restore, dimension and TopN options are marked", async () => {
  const h = createHarness({
    record: { visType: PROGNOSE_VALUE, dimension: "none", topNChoice: "none" }
  });
  const handler = h.historyMod.createWidgetSettingsHistoryReplayHandler(h._KDB);
  const oldFrame = visFrame("line", "line", { restoreControls: { dimension: DIM, topNChoice: "top-3" } });
  const ok = await handler.apply(h._KDB, oldFrame, { key: STEP_KEY, old: oldFrame, new: visFrame("prognose", PROGNOSE_VALUE) }, { direction: "undo" });
  assert.equal(ok, true);
  assert.equal(selectedKey(h.focus.dimension.dropdown, h.sel), DIM);
  assert.equal(selectedKey(h.focus.topN.dropdown, h.sel), "top-3");
  assert.equal(selectedKey(h.live.dimension.dropdown, h.sel), DIM);
  assert.equal(selectedKey(h.live.topN.dropdown, h.sel), "top-3");
});

test("coupled dimension→Ohne path still commits only topN none as the extra write", async () => {
  const commits = [];
  const finalize = load("dashboard/widgets/widgetSettings/intent/finalize.js", {
    modules: {
      "../state.js": {
        commitWidgetSettingValue: (_KDB, widgetId, kind, value, report) => {
          commits.push({ widgetId, kind, value, nextValue: report && report.nextValue });
          return true;
        },
        ensureWidgetSettingsByWidget: () => ({ pending: { kind: null }, deferred: {} })
      },
      "../view/optionMarking.js": {
        stampPanelVisType: () => {},
        markShowValuesPending: () => {},
        markTopNPending: () => {},
        revertShowValuesDropdownFromState: () => {},
        revertTopNDropdownFromState: () => {}
      }
    }
  });
  const result = await finalize.finalizeVisIntentResult({}, {
    target: "widgetVis",
    kind: "dimension",
    widgetId: WIDGET_ID,
    optionKey: "none",
    optionValue: "none",
    type: "widgetVis/applyDimension",
    coupledTopN: { previousValue: "top-3", nextValue: "none" }
  }, { ok: true, status: "success", reportToSettings: { nextValue: "none" } });
  assert.equal(result.coupledTopNCommitted, true);
  assert.equal(result.clearUnavailableControlsCommitted, undefined);
  assert.deepEqual(commits.map((c) => [c.kind, c.value]), [
    ["topN", "none"],
    ["dimension", "none"]
  ]);
});
