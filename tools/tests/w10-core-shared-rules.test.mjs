// W10: the shared constants and pure tab rules that writeback needs must keep their values and answers when they move
// to core. The golden (tools/tests/fixtures/w10-shared-rules.golden.json) was recorded on the old owner files
// (tabs config/events/slots/selectors, kdbControl defaults); the same answers are asserted through every path.
// Record (only on the unchanged code): W10_RECORD=1 node --test tools/tests/w10-core-shared-rules.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const GOLDEN = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/w10-shared-rules.golden.json");
const RECORD = process.env.W10_RECORD === "1";
const at = (rel) => loadAmd(path.join(JS_ROOT, rel));
const json = (value) => JSON.parse(JSON.stringify(value === undefined ? null : value));

const tabsDefaults = at("dashboard/tabs/config/defaults.js");
const tabsActionTypes = at("dashboard/tabs/config/actionTypes.js");
const tabsEventNames = at("dashboard/tabs/events/eventNames.js");
const slots = at("dashboard/tabs/slots.js");
const tabsSelectors = at("dashboard/tabs/selectors.js");
const tabsState = at("dashboard/tabs/state.js");
const support = at("core/services/writeback/get/collectors/collectorSupport.js");
const initialState = at("dashboard/canvas/kdbControl/state/initialState.js");
const settingsDefaults = at("dashboard/canvas/kdbControl/config/settingsDefaults.js");

const TAB_SHAPES = [
  null,
  { index: 0, role: "dashboard" },
  { index: 5, role: "helper" },
  { index: 2, role: "other" },
  { index: 0 },
  { index: 4 },
  { index: 5 },
  { index: 1, isHelper: true },
  { index: 3, isHelper: false },
  { index: 7 }
];
const STATES = [undefined, null, {}, { limits: {} }, { limits: { maxUserTabs: 2 } }, { limits: { maxUserTabs: "3" } }, { limits: { maxUserTabs: 9 } }];

function tab(index, extra) {
  return Object.assign({ index, tabId: "tab" + index, pageId: "page" + index, name: "T" + index, role: "dashboard", visible: true }, extra || {});
}

function tabsWorld() {
  const state = tabsState.createInitialTabsState();
  [tab(0), tab(1, { visible: false }), tab(2), tab(5, { role: "helper" }), tab(6, { tabId: "", pageId: "" }), tab(3, { tabId: "a#b", pageId: "p b" }), tab(4, { tabId: "dupId" }), tab(7, { tabId: "dupId", pageId: "page7" })]
    .forEach((entry) => { state.byIndex[String(entry.index)] = entry; });
  state.order = [0, 1, 2, 5, 6, 3, 4, 7];
  return { state: { tabs: state } };
}

const SCOPE_IDS = [undefined, null, "", "tab0", "TAB0", "page2", "page 2", "a#b", "A#B", "p b", "live-1", "LIVE-1", "dup", "dupId", "none", 7];
const LIVE_TARGETS = [
  undefined, null, "x", {},
  { 0: { scopeId: "live-1" }, 1: { scopeId: "other" }, 2: { scopeId: "LIVE-1" } },
  { 1: { scopeId: "live-1" } },
  { 0: { scopeId: "dup" }, 1: { scopeId: "dup" }, 9: { scopeId: "dup" } },
  { 10: { scopeId: "live-1" }, 2: { scopeId: "live-1" } },
  { 0: null, 1: { scopeId: undefined } }
];

function recordAnswers() {
  const out = {
    actionTypes: json(tabsActionTypes),
    eventNames: json(tabsEventNames),
    tabLimits: { MAX_USER_TABS: tabsDefaults.MAX_USER_TABS, HELPER_TAB_INDEX: tabsDefaults.HELPER_TAB_INDEX },
    kdbControlSettings: json(initialState().settings),
    kdbControlDimensions: json(settingsDefaults.dimensions),
    kdbControlColorInputs: json(settingsDefaults.colorInputs),
    isDashboardTab: [],
    supportIsDashboardTab: [],
    listDashboardSlots: [],
    scopeMatch: []
  };
  TAB_SHAPES.forEach((shape, shapeIndex) => {
    STATES.forEach((state, stateIndex) => {
      out.isDashboardTab.push([shapeIndex, stateIndex, slots.isDashboardTab(shape, state)]);
      out.supportIsDashboardTab.push([shapeIndex, stateIndex, support.isDashboardTab(shape, state)]);
    });
  });
  const world = tabsWorld();
  [undefined, null, {}, world.state.tabs, Object.assign({}, world.state.tabs, { limits: { maxUserTabs: 2 } })].forEach((state, index) => {
    out.listDashboardSlots.push([index, json(slots.listDashboardSlots(state))]);
  });
  SCOPE_IDS.forEach((scopeId, scopeIndex) => {
    LIVE_TARGETS.forEach((targets, targetIndex) => {
      out.scopeMatch.push([scopeIndex, targetIndex, json(tabsSelectors.readTabScopeMatch(world, scopeId, targets))]);
    });
  });
  out.scopeMatch.push(["no state", 0, json(tabsSelectors.readTabScopeMatch({ state: {} }, "tab0", { 0: { scopeId: "tab0" } }))]);
  out.scopeMatch.push(["no KDB", 0, json(tabsSelectors.readTabScopeMatch(null, "tab0", null))]);
  return out;
}

test("shared tab rules and constants keep the recorded answers", () => {
  const actual = recordAnswers();
  if (RECORD) {
    fs.writeFileSync(GOLDEN, JSON.stringify(actual, null, 2) + "\n");
    return;
  }
  const expected = JSON.parse(fs.readFileSync(GOLDEN, "utf8"));
  assert.deepStrictEqual(Object.keys(actual), Object.keys(expected));
  for (const name of Object.keys(expected)) assert.deepStrictEqual(actual[name], expected[name], name);
});

test("core/events/tabs.js holds the recorded values and the tabs paths re-export the same objects", () => {
  const expected = JSON.parse(fs.readFileSync(GOLDEN, "utf8"));
  const vocabulary = at("core/events/tabs.js");
  assert.deepStrictEqual(json(vocabulary.ACTIONS), expected.actionTypes);
  assert.deepStrictEqual(json(vocabulary.EVENTS), expected.eventNames);
  assert.deepStrictEqual(Object.keys(vocabulary.ACTIONS), Object.keys(expected.actionTypes));
  assert.deepStrictEqual(Object.keys(vocabulary.EVENTS), Object.keys(expected.eventNames));
  const shared = loadAmd(path.join(JS_ROOT, "dashboard/tabs/config/actionTypes.js"), { overrides: { "core/events/tabs.js": vocabulary } });
  assert.strictEqual(shared, vocabulary.ACTIONS);
  const events = loadAmd(path.join(JS_ROOT, "dashboard/tabs/events/eventNames.js"), { overrides: { "core/events/tabs.js": vocabulary } });
  assert.strictEqual(events, vocabulary.EVENTS);
});
