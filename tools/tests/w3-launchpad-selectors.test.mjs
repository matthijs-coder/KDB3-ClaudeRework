// launchpad published selectors: slot element query and helperTabIds (W3, additive).
// readSlotElement is checked against the lookup widgetBase's moveWidgetToLaunchpad performs today.
// Run: node --test tools/tests/w3-launchpad-selectors.test.mjs
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

const quiet = { log() {}, info() {}, warn() {}, error() {}, debug() {} };
const LP = path.join(JS_ROOT, "dashboard/launchpad");
const tabs = [{ tabId: "t0", aliases: ["t0"] }, { tabId: 't"1', aliases: ['t"1'] }];

function setup() {
  const doc = createDocument();
  const view = loadAmd(path.join(LP, "view.js"), { stubs: { console: quiet } });
  const config = loadAmd(path.join(LP, "config.js"));
  const _KDB = {
    runtime: { launchpad: { domRefs: {}, pendingPromises: {} } },
    state: {},
    elements: { selectors: { launchpad: config.DOM_SELECTORS } }
  };
  const built = view.buildLaunchpadDom(_KDB, { tabs, helperTabIds: ["h", 7], helperTabPageId: "hp" }, { ownerDocument: doc });
  view.placeLaunchpadDom(_KDB, built);
  _KDB.state.launchpad = { lifecycle: "ready", domReady: true, helperTabIds: built.helperTabIds, padsByKey: built.padsByKey, tabs };
  return { doc, _KDB, built };
}

function withDocument(doc) {
  const selectors = loadAmd(path.join(LP, "selectors.js"), { stubs: { document: doc } });
  const placement = loadAmd(path.join(JS_ROOT, "dashboard/widgets/widgetBase/view/placement.js"), { stubs: { document: doc, console: quiet } });
  return { selectors, placement };
}

test("readSlotElement returns the slot of every pad/tab and agrees with widgetBase's own lookup", () => {
  const { doc, _KDB, built } = setup();
  const { selectors, placement } = withDocument(doc);
  let compared = 0;
  for (const padKey of Object.keys(built.padsByKey)) {
    for (const meta of built.padsByKey[padKey]) {
      const slotEl = selectors.readSlotElement(_KDB, meta);
      assert.equal(slotEl, built.domRefs.slotsByKey[meta.slotKey], meta.slotKey);
      const shellEl = new FakeElement(doc, "div");
      shellEl.id = "w-" + meta.slotKey;
      const moved = placement.moveWidgetToLaunchpad(_KDB, { widgetId: shellEl.id, shellEl, slotMeta: meta });
      assert.equal(moved.ok, true, meta.slotKey);
      assert.equal(shellEl.parentNode, slotEl, `widgetBase appended into the same slot for ${meta.slotKey}`);
      compared += 1;
    }
  }
  assert.equal(compared, 10);
});

test("readSlotElement: pageIndex wins over childIndex, childIndex is the fallback, incomplete meta gives null", () => {
  const { doc, _KDB, built } = setup();
  const { selectors } = withDocument(doc);
  const meta = built.padsByKey.text[1];
  assert.equal(selectors.readSlotElement(_KDB, { padKey: "text", tabId: meta.tabId, childIndex: 1 }), built.domRefs.slotsByKey.text_1);
  assert.equal(selectors.readSlotElement(_KDB, { padKey: "text", tabId: meta.tabId, pageIndex: 1, childIndex: 0 }), built.domRefs.slotsByKey.text_1);
  for (const incomplete of [undefined, null, {}, { padKey: "text" }, { padKey: "text", tabId: "t0" }, { tabId: "t0", pageIndex: 0 }, { padKey: "nope", tabId: "t0", pageIndex: 0 }]) {
    assert.equal(selectors.readSlotElement(_KDB, incomplete), null, JSON.stringify(incomplete));
  }
});

test("readSlotElement: no launchpad DOM, no published selectors, no document give null without throwing", () => {
  const { doc, _KDB, built } = setup();
  const meta = built.padsByKey.text[0];
  const { selectors } = withDocument(doc);
  assert.equal(selectors.readSlotElement({ elements: { selectors: {} } }, meta), null);
  assert.equal(selectors.readSlotElement({}, meta), null);
  assert.equal(selectors.readSlotElement(undefined, meta), null);
  doc.body.removeChild(built.hideSpotEl);
  assert.equal(selectors.readSlotElement(_KDB, meta), null);
  const noDoc = loadAmd(path.join(LP, "selectors.js"));
  assert.equal(noDoc.readSlotElement(_KDB, meta), null);
});

test("readSlotElement: the host document comes from selectors.root.kdbWidget when that element exists", () => {
  const { doc, _KDB, built } = setup();
  const hostDoc = createDocument();
  const host = new FakeElement(hostDoc, "div");
  host.id = "host";
  hostDoc.body.appendChild(host);
  hostDoc.body.appendChild(built.hideSpotEl);
  const router = { querySelector: (selector) => (selector === "#host" ? host : doc.querySelector(selector)) };
  const selectors = loadAmd(path.join(LP, "selectors.js"), { stubs: { document: router } });
  _KDB.elements.selectors.root = { kdbWidget: "#host" };
  assert.equal(selectors.readSlotElement(_KDB, built.padsByKey.text[0]), built.domRefs.slotsByKey.text_0);
});

test("readHelperTabIds: string copy of state.launchpad.helperTabIds, [] when missing; equals dragDrop's lookup", () => {
  const { _KDB } = setup();
  const selectors = loadAmd(path.join(LP, "selectors.js"));
  const ids = selectors.readHelperTabIds(_KDB);
  assert.deepEqual(ids, ["h", "7"]);
  assert.notEqual(ids, _KDB.state.launchpad.helperTabIds);
  ids.push("x");
  assert.deepEqual(_KDB.state.launchpad.helperTabIds, ["h", 7]);
  const lookup = loadAmd(path.join(JS_ROOT, "dashboard/canvas/dragDrop/dropboxes/lookup.js"), { stubs: { console: quiet } });
  _KDB.api = { launchpad: { getState: () => _KDB.state.launchpad } };
  assert.deepEqual(selectors.readHelperTabIds(_KDB), lookup.readHelperTabIds(_KDB));
  for (const kdb of [undefined, {}, { state: {} }, { state: { launchpad: {} } }, { state: { launchpad: { helperTabIds: "no" } } }]) {
    assert.deepEqual(selectors.readHelperTabIds(kdb), []);
  }
});

test("the four frozen state selectors are re-exported unchanged", () => {
  const selectors = loadAmd(path.join(LP, "selectors.js"));
  const stateSelectors = loadAmd(path.join(LP, "state/selectors.js"));
  for (const name of ["readLaunchpadState", "readLaunchpadReady", "readLaunchpadSlots", "readLaunchpadSlotMeta"]) {
    assert.equal(typeof selectors[name], "function", name);
  }
  const { _KDB } = setup();
  assert.equal(selectors.readLaunchpadReady(_KDB), stateSelectors.readLaunchpadReady(_KDB));
  assert.deepEqual(selectors.readLaunchpadSlotMeta(_KDB, "text", "t0"), stateSelectors.readLaunchpadSlotMeta(_KDB, "text", "t0"));
  assert.deepEqual(Object.keys(selectors).sort(), [
    "readHelperTabIds", "readLaunchpadReady", "readLaunchpadSlotMeta", "readLaunchpadSlots", "readLaunchpadState", "readSlotElement"
  ]);
});
