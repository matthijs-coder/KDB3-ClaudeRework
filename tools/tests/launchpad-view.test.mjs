// Fake-DOM tests for launchpad view (place / keep-existing / remove) and the controller's disposed dispatch results.
// Run: node --test tools/tests/launchpad-view.test.mjs   (Node >= 22, no dependencies)
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

class FakeElement {
  constructor(doc, tag) {
    this.ownerDocument = doc;
    this.tag = tag;
    this.attrs = {};
    this.children = [];
    this.parentNode = null;
    this.id = "";
    this.className = "";
  }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    this.children = this.children.filter((c) => c !== child);
    child.parentNode = null;
    return child;
  }
  get isConnected() {
    let node = this;
    while (node.parentNode) node = node.parentNode;
    return node === this.ownerDocument.rootEl;
  }
  descendants() { return this.children.flatMap((c) => [c, ...c.descendants()]); }
  matches(selector) {
    if (selector[0] === "#") return this.id === selector.slice(1);
    const parts = selector.match(/\[[^\]]+\]/g) || [];
    return parts.length > 0 && parts.every((part) => {
      const [, name, value] = part.match(/\[([^=\]]+)(?:="((?:[^"\\]|\\.)*)")?\]/);
      return value === undefined ? name in this.attrs : this.attrs[name] === value.replace(/\\(.)/g, "$1");
    });
  }
  querySelector(selector) { return this.descendants().find((e) => e.matches(selector)) || null; }
  querySelectorAll(selector) { return this.descendants().filter((e) => e.matches(selector)); }
}

function createDocument() {
  const doc = { createElement: (tag) => new FakeElement(doc, tag) };
  doc.rootEl = new FakeElement(doc, "html");
  doc.body = new FakeElement(doc, "body");
  doc.rootEl.appendChild(doc.body);
  doc.querySelector = (selector) => doc.rootEl.querySelector(selector);
  return doc;
}

const silent = { console: { log() {}, info() {}, warn() {}, error() {} } };
const launchpadDir = path.join(JS_ROOT, "dashboard/launchpad");
const view = loadAmd(path.join(launchpadDir, "view.js"), { stubs: silent });
const tabs = [{ tabId: "t0", aliases: ["t0"] }, { tabId: "t1", aliases: ["t1", "alias1"] }];

function setup() {
  const doc = createDocument();
  const _KDB = { runtime: { launchpad: { domRefs: {}, pendingPromises: {} } }, state: {} };
  const build = () => view.buildLaunchpadDom(_KDB, { tabs, helperTabIds: ["h"], helperTabPageId: "hp" }, { ownerDocument: doc });
  return { doc, _KDB, build };
}

test("buildLaunchpadDom: 5 pads with one slot per tab, slot meta with aliases", () => {
  const { build } = setup();
  const result = build();
  assert.equal(result.hideSpotEl.id, "KDB_HideSpot");
  assert.equal(result.hideSpotEl.attrs["aria-hidden"], "true");
  assert.deepStrictEqual(Object.keys(result.padsByKey), ["visualization", "text", "dataTables", "topN", "otherResources"]);
  assert.deepStrictEqual(result.padsByKey.text[1], {
    aliases: ["t1", "alias1"], childIndex: 1, padKey: "text", pageIndex: 1, pageId: "t1", tabId: "t1", slotKey: "text_1"
  });
  assert.equal(result.domRefs.slotsByKey.text_1.attrs.cor_page_id, "t1");
  assert.equal(result.domRefs.slotsByKey.text_1.attrs.cor_page_index, "1");
  assert.deepStrictEqual([result.helperTabIds, result.helperTabPageId], [["h"], "hp"]);
  assert.equal(result.hideSpotEl.querySelectorAll("[data-kdb-launchpad-pad][cor_page_id][cor_page_index]").length, 10);
});

test("placeLaunchpadDom: appends to body, stores domRefs, returns true", () => {
  const { doc, _KDB, build } = setup();
  const result = build();
  assert.equal(view.placeLaunchpadDom(_KDB, result), true);
  assert.equal(result.hideSpotEl.parentNode, doc.body);
  assert.equal(_KDB.runtime.launchpad.domRefs, result.domRefs);
});

test("placeLaunchpadDom: throws without a built hide spot", () => {
  const { _KDB } = setup();
  assert.throws(() => view.placeLaunchpadDom(_KDB, {}), /hide spot was not built/);
});

test("placeLaunchpadDom: replaces an existing empty hide spot when the launchpad is not ready", () => {
  const { doc, _KDB, build } = setup();
  const first = build();
  view.placeLaunchpadDom(_KDB, first);
  const second = build();
  assert.equal(view.placeLaunchpadDom(_KDB, second), true);
  assert.equal(first.hideSpotEl.parentNode, null);
  assert.equal(second.hideSpotEl.parentNode, doc.body);
  assert.equal(_KDB.runtime.launchpad.domRefs, second.domRefs);
});

test("placeLaunchpadDom: keeps an existing hide spot that holds a parked widget and syncs domRefs to it", () => {
  const { doc, _KDB, build } = setup();
  const first = build();
  view.placeLaunchpadDom(_KDB, first);
  first.domRefs.slotsByKey.text_0.appendChild(doc.createElement("div"));
  const second = build();
  assert.equal(view.placeLaunchpadDom(_KDB, second), true);
  assert.equal(first.hideSpotEl.parentNode, doc.body);
  assert.equal(second.hideSpotEl.parentNode, null);
  assert.equal(_KDB.runtime.launchpad.domRefs.hideSpotEl, first.hideSpotEl);
  assert.equal(_KDB.runtime.launchpad.domRefs.rootEl, first.hideSpotEl.querySelector("#KDB_widgetLaunchpad"));
});

test("placeLaunchpadDom: keeps an existing hide spot when the launchpad state is ready", () => {
  const { doc, _KDB, build } = setup();
  const first = build();
  view.placeLaunchpadDom(_KDB, first);
  _KDB.state.launchpad = { lifecycle: "ready", domReady: true };
  const second = build();
  assert.equal(view.placeLaunchpadDom(_KDB, second), true);
  assert.equal(first.hideSpotEl.parentNode, doc.body);
  assert.equal(second.hideSpotEl.parentNode, null);
});

test("removeLaunchpadDom: removes the hide spot with parked widgets and resets domRefs", () => {
  const { doc, _KDB, build } = setup();
  const result = build();
  view.placeLaunchpadDom(_KDB, result);
  result.domRefs.slotsByKey.text_0.appendChild(doc.createElement("div"));
  view.removeLaunchpadDom(_KDB);
  assert.equal(result.hideSpotEl.parentNode, null);
  assert.equal(doc.querySelector("#KDB_HideSpot"), null);
  assert.deepStrictEqual(_KDB.runtime.launchpad.domRefs, {});
});

test("removeLaunchpadDom: safe without runtime or hide spot", () => {
  const _KDB = {};
  view.removeLaunchpadDom(_KDB);
  assert.deepStrictEqual(_KDB.runtime.launchpad.domRefs, {});
});

test("controller after destroy: dispatch, mount, getState and destroy results", async () => {
  const warnings = [];
  const register = loadAmd(path.join(launchpadDir, "index.js"), {
    stubs: { console: { log() {}, info() {}, error() {}, warn: (message) => warnings.push(message) } }
  });
  const doc = createDocument();
  const _KDB = { services: { cognosHost: {} } };
  const controller = register(_KDB, { ownerDocument: doc });
  assert.equal(await controller.mount({ tabsSnapshot: { byIndex: { 0: { tabId: "t0" } } } }), true);
  assert.ok(doc.querySelector("#KDB_HideSpot"));

  controller.destroy();
  assert.equal(doc.querySelector("#KDB_HideSpot"), null);
  assert.equal(_KDB.state.launchpad.lifecycle, "disposed");
  assert.equal(controller.getState(), undefined);

  assert.deepStrictEqual(
    await controller.dispatch({ type: "launchpad/readSlotWidgets", payload: { padKey: "text", tabId: 4, mode: "first" } }),
    {
      ok: false,
      errorCode: "LAUNCHPAD_DISPOSED",
      errorMessage: "Launchpad dispatch called after destroy.",
      padKey: "text",
      tabId: 4,
      mode: "first",
      widgets: [],
      widgetId: null
    }
  );
  assert.deepStrictEqual(
    await controller.dispatch({ type: "launchpad/readSlotWidgets" }),
    {
      ok: false,
      errorCode: "LAUNCHPAD_DISPOSED",
      errorMessage: "Launchpad dispatch called after destroy.",
      padKey: null,
      tabId: null,
      mode: "all",
      widgets: [],
      widgetId: null
    }
  );
  assert.equal(await controller.dispatch({ type: "launchpad/waitUntilReady" }), false);
  assert.equal(controller.dispatch({ type: "launchpad/other" }), undefined);
  assert.equal(await controller.mount({}), false);
  assert.equal(controller.dispatch({ type: "launchpad/destroy" }), _KDB.state.launchpad);
  controller.destroy();
  assert.deepStrictEqual(warnings, ["[launchpad.dispatch] called after destroy", "[launchpad.mount] called after destroy"]);
});
