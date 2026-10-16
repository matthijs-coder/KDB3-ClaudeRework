// Tests for the W6a tabs API additions: api.tabs.isMutationRunning() and api.tabs.readCurrentTab(), plus the
// _KDB.utils.readCurrentTab compatibility binding that keeps existing callers working.
// Run: node --test tools/tests/w6a-tabs-api.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const silent = { log() {}, warn() {}, error() {}, info() {} };
const documentStub = { querySelector: () => null, querySelectorAll: () => [], getElementById: () => null };
const tabsLoad = (rel) => loadAmd(path.join(JS_ROOT, "dashboard/tabs", rel), { stubs: { document: documentStub, console: silent } });
const utilsLoad = (rel) => loadAmd(path.join(JS_ROOT, "core/utils", rel), { stubs: { console: silent } });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const kit = utilsLoad("kit/runtime.js");

function selectedChromeRoot(index) {
  const item = {
    getAttribute: () => String(index),
    classList: { contains: (name) => name === "is-selected" }
  };
  return { querySelectorAll: () => [item] };
}

function mountTabs(extra) {
  const orchestrate = tabsLoad("__orchestratorTabs.js");
  const facet = {
    listTabs: () => ({ ok: true, data: [{ index: 0, id: "pageA" }, { index: 1, id: "pageB" }] })
  };
  const _KDB = Object.assign({
    utils: { readCurrentTab: utilsLoad("readCurrentTab.js") }, config: {}, state: {}, api: {},
    services: { cognosHost: { tabs: facet } }
  }, extra || {});
  const controller = orchestrate(_KDB, {});
  return { _KDB, controller };
}

test("isMutationRunning mirrors the tabMutation busy flag and ignores other tab operations", () => {
  const { _KDB, controller } = mountTabs();
  assert.equal(controller.isMutationRunning(), false);
  _KDB.runtime.tabs.pendingPromises.traverse = Promise.resolve();
  _KDB.runtime.tabs.pendingPromises.startup = Promise.resolve();
  assert.equal(controller.isMutationRunning(), false);
  assert.equal(kit.readTabsBusy(_KDB, ["tabMutation"]), false);
  _KDB.runtime.tabs.pendingPromises.tabMutation = Promise.resolve();
  assert.equal(controller.isMutationRunning(), true);
  assert.equal(controller.isMutationRunning(), kit.readTabsBusy(_KDB, ["tabMutation"]));
  assert.equal(_KDB.api.tabs, controller);
});

test("isMutationRunning is true while the saga runs, false after it settles and after destroy", async () => {
  const widgetCalls = [];
  let release = null;
  const { _KDB, controller } = mountTabs({
    api: {
      widgetBase: {
        dispatch: (action) => {
          widgetCalls.push(action.type);
          return new Promise((resolve) => { release = () => resolve({ ok: false, diagnostics: [{ code: "STOP" }] }); });
        }
      }
    }
  });
  const byIndex = {};
  [0, 1, 2, 3].forEach((index) => {
    byIndex[String(index)] = {
      index, tabId: "t" + index, pageId: "p" + index, name: "T" + index, role: "dashboard", isHelper: false, hasBeenActivated: true,
      visible: index < 3, isActive: index === 1, button: { visible: index < 3 }, edit: {}
    };
  });
  _KDB.state.tabs = {
    byIndex, order: [0, 1, 2, 3], activeIndex: 1, activeTabId: "t1", editUi: {}, lifecycle: "ready", hydration: {}, traversal: {},
    limits: { maxUserTabs: 4, minVisibleUserTabs: 1 }
  };
  const pending = controller.dispatch({ type: "tabs/delete", payload: { tabId: "t1" } });
  await sleep(20);
  assert.equal(controller.isMutationRunning(), true);
  release();
  const result = await pending;
  assert.equal(result.ok, false);
  assert.equal(controller.isMutationRunning(), false);

  const second = controller.dispatch({ type: "tabs/delete", payload: { tabId: "t1" } });
  await sleep(20);
  assert.equal(controller.isMutationRunning(), true);
  controller.destroy();
  assert.equal(controller.isMutationRunning(), false);
  release();
  await second;
});

test("readCurrentTab reads the selected chrome tab and its id from the tabs facet", () => {
  const { controller } = mountTabs();
  assert.deepEqual(controller.readCurrentTab(selectedChromeRoot(1)), { index: 1, id: "pageB" });
  assert.deepEqual(controller.readCurrentTab({ querySelectorAll: () => [] }), { index: -1, id: null });
});

test("the _KDB.utils.readCurrentTab compatibility binding answers like the API and is restored on destroy", () => {
  const original = utilsLoad("readCurrentTab.js");
  const { _KDB, controller } = mountTabs({ utils: { readCurrentTab: original } });
  assert.notEqual(_KDB.utils.readCurrentTab, original);
  assert.deepEqual(_KDB.utils.readCurrentTab(selectedChromeRoot(0)), controller.readCurrentTab(selectedChromeRoot(0)));
  assert.deepEqual(_KDB.utils.readCurrentTab(selectedChromeRoot(0)), { index: 0, id: "pageA" });
  controller.destroy();
  assert.equal(_KDB.utils.readCurrentTab, original);
  assert.deepEqual(controller.readCurrentTab(selectedChromeRoot(0)), { index: -1, id: null });
});

test("without _KDB.utils.readCurrentTab the API still works and nothing is bound", () => {
  const { _KDB, controller } = mountTabs({ utils: {} });
  assert.equal(_KDB.utils.readCurrentTab, undefined);
  assert.deepEqual(controller.readCurrentTab(selectedChromeRoot(1)), { index: 1, id: "pageB" });
  controller.destroy();
  assert.equal(_KDB.utils.readCurrentTab, undefined);
});

test("getState().actions reports rename only (the never-enabled delete/duplicate/move/reorder entries are gone)", () => {
  const { _KDB, controller } = mountTabs();
  _KDB.state.tabs = { byIndex: {}, order: [], visibleOrder: [], activeIndex: null, editUi: {}, lifecycle: "ready", hydration: {}, traversal: {}, limits: {} };
  assert.deepEqual(controller.getState().actions, { rename: { enabled: false, reason: "noTarget" } });
  assert.deepEqual(Object.keys(tabsLoad("selectors.js").readTabsForKdbControl(_KDB).actions), ["rename"]);
});

test("the edit icon fails closed without a message service and logs a plain ASCII warning", async () => {
  const warnings = [];
  const confirm = loadAmd(path.join(JS_ROOT, "dashboard/tabs/editUi/confirm.js"), {
    stubs: { document: documentStub, console: Object.assign({}, silent, { warn: (...args) => warnings.push(args[0]) }) }
  });
  const result = await confirm.confirmAndDispatchTabMutation({ services: {}, runtime: {} }, "delete", { tabId: "t1" });
  assert.deepEqual(result, { ok: false, blocked: true });
  assert.deepEqual(warnings, ["[tabs.editIcon] messageService unavailable - delete blocked (fail closed)"]);
});
