// Focus-mode dropdown changes use the same widgetSettings_optionSelect frames as the gear panel.
// Run: node --test tools/tests/widgetSettings-focus-undo.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";
import { createFakeDocument } from "./ws-d1-fake-dom.mjs";

const QUIET = { error() {}, warn() {}, log() {}, info() {}, debug() {} };
const WIDGET_ID = "w1";
const STEP_KEY = "widgetSettings_optionSelect";
const PROGNOSE_VALUE = "com.ibm.vis.custom.prognoseyear";
const DIM = "Berufsfamilie";
const DISPOSED = { ok: false, outcome: "aborted", reason: "disposed", skipped: true, status: "aborted" };

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

function addDropdown(doc, panel, sel, kind, rows, selectedKeyValue, extraClass) {
  const dropdown = doc.createElement("div");
  dropdown.className = extraClass ? "KDB_IconsDropdown " + extraClass : "KDB_IconsDropdown";
  dropdown.setAttribute(sel.dropdownKindAttr, kind);
  const options = {};
  rows.forEach((row) => {
    options[row.key] = addOption(doc, dropdown, sel, kind, row.key, row.value, row.key === selectedKeyValue);
  });
  panel.appendChild(dropdown);
  return { dropdown, options };
}

function buildPanel(doc, sel, selected) {
  const pick = Object.assign({
    vis: "line", dimension: DIM, topN: "top-3", grouping: "jahr", showValues: "inherit"
  }, selected || {});
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
    { key: "top-3", value: "3" }
  ], pick.topN);
  const grouping = addDropdown(doc, panel, sel, "grouping", [
    { key: "inherit", value: "inherit" },
    { key: "jahr", value: "jahr" },
    { key: "stichtag", value: "stichtag" }
  ], pick.grouping, "KDB_groupingContainer");
  const showValues = addDropdown(doc, panel, sel, "showValues", [
    { key: "off", value: "off" },
    { key: "inherit", value: "inherit" },
    { key: "on", value: "on" }
  ], pick.showValues, "KDB_showValuesContainer");
  return { panel, vis, dimension, topN, grouping, showValues };
}

function successResult(nextValue) {
  return { ok: true, status: "success", reportToSettings: { nextValue: nextValue } };
}

function attachHistory(h) {
  const steps = [];
  h._KDB.services.history = {
    pushCommittedStep(step) {
      steps.push({
        key: step.key,
        old: JSON.parse(JSON.stringify(step.old)),
        new: JSON.parse(JSON.stringify(step.new))
      });
      return true;
    }
  };
  h.steps = steps;
  return h;
}

function createHarness(options) {
  const opts = options || {};
  const sel = selectors();
  const doc = createFakeDocument();
  const selected = Object.assign({
    vis: "line", dimension: DIM, topN: "top-3", grouping: "jahr", showValues: "inherit"
  }, opts.selected);
  const live = buildPanel(doc, sel, selected);
  const focus = buildPanel(doc, sel, selected);
  delete focus.panel.attributes[sel.panelRootAttr];
  focus.panel.setAttribute(sel.focusPanelRootAttr, WIDGET_ID);
  doc.body.appendChild(live.panel);
  doc.body.appendChild(focus.panel);

  const dispatched = [];
  const _KDB = {
    config: { options: {}, labels: { de: {} } },
    api: {
      widgetVis: {
        dispatch: (action) => {
          dispatched.push(action);
          if (typeof opts.visDispatch === "function") {
            return opts.visDispatch(action, dispatched.length - 1);
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
    visType: "line",
    dimension: DIM,
    topNChoice: "top-3",
    grouping: "jahr",
    pending: { kind: null },
    deferred: {}
  }, opts.record);
  _KDB.state.widgets.settings.byWidget[WIDGET_ID] = record;

  const historyMod = loadWithDoc("dashboard/widgets/widgetSettings/history.js", doc);
  return { _KDB, sel, doc, live, focus, dispatched, record, historyMod };
}

function readRecord(_KDB) {
  return _KDB.state.widgets.settings.byWidget[WIDGET_ID];
}

function expectedPrognoseStep() {
  return {
    key: STEP_KEY,
    old: {
      widgetId: WIDGET_ID,
      widgetType: "live",
      kind: "visualization",
      optionKey: "line",
      optionValue: "line",
      target: "widgetVis",
      type: "widgetVis/applyVisType",
      restoreControls: { dimension: DIM, topNChoice: "top-3", grouping: "jahr" }
    },
    new: {
      widgetId: WIDGET_ID,
      widgetType: "live",
      kind: "visualization",
      optionKey: "prognose",
      optionValue: PROGNOSE_VALUE,
      target: "widgetVis",
      type: "widgetVis/applyVisType"
    }
  };
}

test("fromOption on the focus clone uses focusPanelRootAttr as widgetId", () => {
  const sel = selectors();
  const doc = createFakeDocument();
  const focus = buildPanel(doc, sel, { vis: "line" });
  delete focus.panel.attributes[sel.panelRootAttr];
  focus.panel.setAttribute(sel.focusPanelRootAttr, WIDGET_ID);
  const descriptor = load("dashboard/widgets/widgetSettings/intent/descriptor.js");
  const frame = descriptor.fromOption(focus.panel, focus.vis.options.prognose);
  assert.equal(frame.widgetId, WIDGET_ID);
  assert.equal(frame.kind, "visualization");
  assert.equal(frame.optionKey, "prognose");
  assert.equal(frame.optionValue, PROGNOSE_VALUE);
});

test("focus Line+jahr+dim+top-3 → Prognose pushes the same frames as the gear", async () => {
  const focusH = attachHistory(createHarness());
  await focusH.historyMod.selectDropdownOption(focusH._KDB, focusH.focus.panel, focusH.focus.vis.options.prognose);
  assert.equal(focusH.steps.length, 1);
  assert.deepEqual(focusH.steps[0], expectedPrognoseStep());

  const gearH = attachHistory(createHarness());
  await gearH.historyMod.selectDropdownOption(gearH._KDB, gearH.live.panel, gearH.live.vis.options.prognose);
  assert.equal(gearH.steps.length, 1);
  assert.deepEqual(gearH.steps[0], expectedPrognoseStep());
  assert.deepEqual(focusH.steps[0], gearH.steps[0]);
});

test("undo/redo of a focus vis change restores state and marks live + clone", async () => {
  const h = createHarness();
  const registerHistory = load("core/services/historyService/index.js");
  const historyApi = registerHistory(h._KDB);
  historyApi.registerReplayHandler(STEP_KEY, h.historyMod.createWidgetSettingsHistoryReplayHandler(h._KDB));

  await h.historyMod.selectDropdownOption(h._KDB, h.focus.panel, h.focus.vis.options.prognose);
  assert.equal(readRecord(h._KDB).visType, PROGNOSE_VALUE);
  assert.equal(selectedKey(h.live.vis.dropdown, h.sel), "prognose");
  assert.equal(selectedKey(h.focus.vis.dropdown, h.sel), "prognose");

  assert.equal(await historyApi.undo(), true);
  const undone = readRecord(h._KDB);
  assert.equal(undone.visType, "line");
  assert.equal(undone.dimension, DIM);
  assert.equal(undone.topNChoice, "top-3");
  assert.equal(undone.grouping, "jahr");
  assert.equal(selectedKey(h.live.vis.dropdown, h.sel), "line");
  assert.equal(selectedKey(h.focus.vis.dropdown, h.sel), "line");
  assert.equal(selectedKey(h.live.dimension.dropdown, h.sel), DIM);
  assert.equal(selectedKey(h.focus.dimension.dropdown, h.sel), DIM);
  assert.equal(selectedKey(h.live.topN.dropdown, h.sel), "top-3");
  assert.equal(selectedKey(h.focus.topN.dropdown, h.sel), "top-3");
  assert.equal(selectedKey(h.live.grouping.dropdown, h.sel), "jahr");
  assert.equal(selectedKey(h.focus.grouping.dropdown, h.sel), "jahr");

  assert.equal(await historyApi.redo(), true);
  assert.equal(readRecord(h._KDB).visType, PROGNOSE_VALUE);
  assert.equal(selectedKey(h.live.vis.dropdown, h.sel), "prognose");
  assert.equal(selectedKey(h.focus.vis.dropdown, h.sel), "prognose");
});

test("showValues focus change undo restores state and marks live + clone", async () => {
  const h = createHarness({
    record: { visType: "line", dimension: DIM, topNChoice: "top-3", grouping: "jahr" }
  });
  const registerHistory = load("core/services/historyService/index.js");
  const historyApi = registerHistory(h._KDB);
  historyApi.registerReplayHandler(STEP_KEY, h.historyMod.createWidgetSettingsHistoryReplayHandler(h._KDB));

  await h.historyMod.selectDropdownOption(h._KDB, h.focus.panel, h.focus.showValues.options.on);
  const pushed = h._KDB.state.history.stack[h._KDB.state.history.pointer];
  assert.equal(pushed.key, STEP_KEY);
  assert.equal(pushed.old.kind, "showValues");
  assert.equal(pushed.old.optionKey, "inherit");
  assert.equal(pushed.new.optionKey, "on");
  assert.equal(readRecord(h._KDB).showValues, true);
  assert.equal(selectedKey(h.live.showValues.dropdown, h.sel), "on");
  assert.equal(selectedKey(h.focus.showValues.dropdown, h.sel), "on");

  assert.equal(await historyApi.undo(), true);
  assert.equal(readRecord(h._KDB).showValues, undefined);
  assert.equal(selectedKey(h.live.showValues.dropdown, h.sel), "inherit");
  assert.equal(selectedKey(h.focus.showValues.dropdown, h.sel), "inherit");

  assert.equal(await historyApi.redo(), true);
  assert.equal(readRecord(h._KDB).showValues, true);
  assert.equal(selectedKey(h.live.showValues.dropdown, h.sel), "on");
  assert.equal(selectedKey(h.focus.showValues.dropdown, h.sel), "on");
});

test("gear selectDropdownOption path is unchanged (attach before dispatch, one vis step)", async () => {
  const order = [];
  const sel = selectors();
  const doc = createFakeDocument();
  const live = buildPanel(doc, sel, { vis: "line", dimension: DIM, topN: "top-3", grouping: "jahr" });
  const _KDB = {
    config: { options: {}, labels: { de: {} } },
    api: {
      widgetVis: {
        dispatch: (action) => {
          order.push("dispatch");
          return successResult(action.payload && action.payload.nextValue);
        }
      }
    },
    properties: { filterPropObj: {} },
    state: {
      widgets: {
        settings: {
          byWidget: {
            [WIDGET_ID]: {
              visType: "line", dimension: DIM, topNChoice: "top-3", grouping: "jahr",
              pending: { kind: null }, deferred: {}
            }
          }
        },
        vis: { byId: {} }
      }
    },
    runtime: { widgetSettings: { abortControllers: {}, timers: {}, domRefs: { [WIDGET_ID]: { panel: live.panel } } } },
    events: { emit() {}, subscribe() { return function () {}; } },
    services: {}
  };
  load("core/config/registerConfig.js")(_KDB);
  const steps = [];
  _KDB.services.history = {
    pushCommittedStep(step) {
      order.push("push");
      steps.push(step);
      return true;
    }
  };
  const historyMod = loadWithDoc("dashboard/widgets/widgetSettings/history.js", doc);
  order.push("before");
  await historyMod.selectDropdownOption(_KDB, live.panel, live.vis.options.prognose);
  assert.deepEqual(order, ["before", "dispatch", "push"]);
  assert.equal(steps.length, 1);
  assert.deepEqual(steps[0].old.restoreControls, { dimension: DIM, topNChoice: "top-3", grouping: "jahr" });
  assert.equal(steps[0].new.optionKey, "prognose");
});

test("dispatch selectDropdownOption after destroy returns the disposed result", () => {
  const register = load("dashboard/widgets/widgetSettings/index.js");
  const _KDB = {
    api: {},
    services: {},
    config: { labels: { de: {} } }
  };
  const controller = register(_KDB);
  assert.equal(controller.mount(), true);
  controller.destroy();
  assert.deepEqual(controller.dispatch({
    type: "widgetSettings/selectDropdownOption",
    payload: { panel: {}, option: {} }
  }), DISPOSED);
  assert.deepEqual(controller.dispatch({ type: "widgetSettings/placeControls" }), DISPOSED);
});

test("focus panel option clicks dispatch selectDropdownOption; icons stay on the kit", () => {
  const src = fs.readFileSync(path.join(JS_ROOT, "dashboard/widgets/widgetVis/focus/panel.js"), "utf8");
  assert.match(src, /ACTION_TYPES\.SELECT_DROPDOWN_OPTION/);
  assert.match(src, /api\.widgetSettings\.dispatch/);
  assert.equal(src.includes("dispatchDropdownOptionIntent"), false);
  assert.match(src, /dispatchIconIntent/);
});
