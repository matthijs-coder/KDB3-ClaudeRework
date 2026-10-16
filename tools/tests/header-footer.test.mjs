// Tests for dashboard/header and dashboard/footer (reducers, history replay, header -> footer decoupling).
// Run: node --test tools/tests/header-footer.test.mjs   (Node >= 22, no dependencies)
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const DASHBOARD = path.join(JS_ROOT, "dashboard");

class FakeElement {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.style = {};
    this.isConnected = true;
    this.firstChild = null;
    this.textContent = "";
    this.className = "";
    this.classList = { toggle() {}, remove() {} };
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return name in this.attributes ? this.attributes[name] : null; }
  removeAttribute(name) { delete this.attributes[name]; }
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    this.firstChild = this.children[0];
    return child;
  }
  insertBefore(child, ref) {
    child.parentNode = this;
    this.children.splice(this.children.indexOf(ref), 0, child);
    this.firstChild = this.children[0];
    return child;
  }
  removeChild(child) {
    this.children = this.children.filter((c) => c !== child);
    child.parentNode = null;
    this.firstChild = this.children[0] || null;
  }
  addEventListener() {}
  contains() { return false; }
  focus() {}
  find(predicate) {
    for (const child of this.children) {
      if (predicate(child)) return child;
      const hit = child.find(predicate);
      if (hit) return hit;
    }
    return null;
  }
}

function createFakeDocument() {
  const mounts = { ".pageViewContent": new FakeElement("div"), ".ba-common-tabList__container": new FakeElement("div") };
  return {
    mounts,
    createElement: (tag) => new FakeElement(tag),
    querySelector: (selector) => mounts[selector] || null,
    addEventListener() {},
    location: { href: "https://host/bi/x/y", protocol: "https:", host: "host", origin: "https://host" }
  };
}

function bootModules() {
  const fakeDocument = createFakeDocument();
  const stubs = { document: fakeDocument, window: {} };
  const createEventBus = loadAmd(path.join(JS_ROOT, "core/events/createEventBus.js"), { stubs });
  const registerHeader = loadAmd(path.join(DASHBOARD, "header/index.js"), { stubs });
  const registerFooter = loadAmd(path.join(DASHBOARD, "footer/index.js"), { stubs });
  const KDB = {
    state: { tabs: { activeTabId: "t1", tabs: [{ tabId: "t1" }] } },
    runtime: {},
    api: {},
    services: {},
    utils: {},
    events: createEventBus(),
    elements: { selectors: { root: { pageViewContent: ".pageViewContent", footerMountRoot: ".ba-common-tabList__container" } } }
  };
  registerHeader(KDB);
  registerFooter(KDB);
  KDB.api.header.mount({});
  KDB.api.footer.mount({});
  return { KDB, fakeDocument };
}

const headerSource = { source: "api" };

function findFooterTitle(fakeDocument) {
  const footerRoot = fakeDocument.mounts[".ba-common-tabList__container"].children[0];
  return footerRoot.find((node) => node.id === "KDB_footer_dashboardTitle");
}

test("header reducer: setIcon keeps catalog-like stems and rejects URL-changing keys", () => {
  const state = loadAmd(path.join(DASHBOARD, "header/state.js"));
  const initial = state.createInitialHeaderState();
  const setIcon = (current, iconKey) => state.reduceHeader(current, { type: "header/setIcon", payload: { iconKey } });
  assert.equal(setIcon(initial, "Logo.png").iconKey, "Logo");
  for (const stem of ["Mein Logo", "com.ibm.vis.custom", "Gr\u00fcn-Logo", "a_b-c"]) {
    assert.equal(setIcon(initial, stem + ".png").iconKey, stem, stem);
  }
  const custom = { ...initial, iconKey: "Logo" };
  for (const unsafe of ["../../x", "//evil/x", "a/b", "a\\b", "http:x", "a?b", "a#b", "a%20b", "a..b", "a\u0001b"]) {
    assert.equal(setIcon(custom, unsafe).iconKey, "Stadt-wien", JSON.stringify(unsafe));
  }
  assert.equal(setIcon(initial, "   "), initial);
});

test("header state has no draft fields", () => {
  const state = loadAmd(path.join(DASHBOARD, "header/state.js"));
  let current = state.createInitialHeaderState();
  current = state.reduceHeader(current, { type: "header/show", payload: headerSource });
  current = state.reduceHeader(current, { type: "header/startTitleEdit", payload: headerSource });
  assert.equal(Object.keys(current).some((key) => key.startsWith("draft")), false);
  assert.equal(current.activeEditableTarget, "title");
});

test("footer title follows a header title commit without header knowing the footer", () => {
  const { KDB, fakeDocument } = bootModules();
  assert.equal(KDB.api.header.dispatch({ type: "header/show", payload: headerSource }), true);
  assert.equal(KDB.api.footer.dispatch({ type: "footer/show", payload: headerSource }), true);
  assert.equal(findFooterTitle(fakeDocument).textContent, "");

  KDB.api.header.dispatch({ type: "header/startTitleEdit", payload: headerSource });
  KDB.api.header.dispatch({ type: "header/commitTitle", payload: { source: "api", text: "Neuer Titel" } });
  assert.equal(KDB.state.header.titleText, "Neuer Titel");
  assert.equal(findFooterTitle(fakeDocument).textContent, "Neuer Titel");

  KDB.api.header.dispatch({ type: "header/setTitleText", payload: { source: "api", titleText: "Per Restore" } });
  assert.equal(findFooterTitle(fakeDocument).textContent, "Per Restore");
});

test("footer hides when the header hides and cannot activate while the header is off", () => {
  const { KDB } = bootModules();
  KDB.api.header.dispatch({ type: "header/show", payload: headerSource });
  KDB.api.footer.dispatch({ type: "footer/show", payload: headerSource });
  assert.equal(KDB.state.footer.status, "active");

  KDB.api.header.dispatch({ type: "header/hide", payload: headerSource });
  assert.equal(KDB.state.footer.status, "removed");
  assert.equal(KDB.api.footer.dispatch({ type: "footer/toggle", payload: headerSource }), false);
  assert.equal(KDB.state.footer.status, "removed");
});

test("header and footer push history steps and replay them", async () => {
  const { KDB } = bootModules();
  const steps = [];
  KDB.services.history = { pushCommittedStep: (step) => { steps.push(step); return true; } };
  KDB.api.header.dispatch({ type: "header/show", payload: headerSource });
  KDB.api.footer.dispatch({ type: "footer/show", payload: headerSource });
  assert.deepEqual(steps.map((s) => s.key), ["header_chromeChange", "footer_chromeChange"]);
  assert.deepEqual(steps[0].old, { target: "header.status", value: "removed" });
  assert.deepEqual(steps[0].new, { target: "header.status", value: "active" });

  const headerHandler = KDB.runtime.header.historyReplayHandlerContribution;
  const footerHandler = KDB.runtime.footer.historyReplayHandlerContribution;
  assert.equal(footerHandler.apply(KDB, steps[1].old, steps[1], { direction: "undo" }), true);
  assert.equal(KDB.state.footer.status, "removed");
  assert.equal(headerHandler.apply(KDB, steps[0].old, steps[0], { direction: "undo" }), true);
  assert.equal(KDB.state.header.status, "removed");
  assert.equal(headerHandler.apply(KDB, steps[0].old, { key: "other" }, {}), false);
  assert.equal(steps.length, 2, "replay must not push new steps");
});

test("destroy removes chrome and releases the replay handlers", () => {
  const { KDB, fakeDocument } = bootModules();
  KDB.api.header.dispatch({ type: "header/show", payload: headerSource });
  KDB.api.footer.dispatch({ type: "footer/show", payload: headerSource });
  assert.equal(fakeDocument.mounts[".pageViewContent"].children.length, 1);
  assert.equal(fakeDocument.mounts[".ba-common-tabList__container"].children.length, 1);

  KDB.api.footer.destroy();
  KDB.api.header.destroy();
  assert.equal(fakeDocument.mounts[".pageViewContent"].children.length, 0);
  assert.equal(fakeDocument.mounts[".ba-common-tabList__container"].children.length, 0);
  assert.equal(KDB.runtime.header.historyReplayHandlerContribution, null);
  assert.equal(KDB.runtime.footer.historyReplayHandlerContribution, null);
  assert.equal(KDB.api.header.dispatch({ type: "header/show", payload: headerSource }), false);
});

test("header restore maps a v3 head onto owner actions", async () => {
  const { KDB } = bootModules();
  const result = await KDB.api.header.dispatch({
    type: "header/parameterSetRestoreRequested",
    payload: { runId: 1, skipHistory: true, header: { on: 1, title: "T", sub: "S" } }
  });
  assert.equal(result.ok, true);
  assert.equal(KDB.state.header.status, "active");
  assert.equal(KDB.state.header.titleText, "T");
  assert.equal(KDB.state.header.subtitleStatus, "active");
  const stale = await KDB.api.header.dispatch({ type: "header/parameterSetRestoreRequested", payload: { runId: 0 } });
  assert.equal(stale.ok, false);
});
