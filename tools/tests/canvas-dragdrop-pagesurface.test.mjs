// Unit tests for dashboard/canvas/{dragDrop,pageSurface} with a minimal AMD loader and a fake DOM.
// Run: node --test tools/tests/canvas-dragdrop-pagesurface.test.mjs   (Node >= 22, no dependencies)
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import vm from "node:vm";

const JS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../_____________KDB3API/KDB3/js");
const cache = new Map();

function load(absPath) {
  if (cache.has(absPath)) return cache.get(absPath);
  const source = readFileSync(absPath, "utf8");
  let result;
  const define = (deps, factory) => {
    const modules = deps.map((dep) => load(resolve(dirname(absPath), dep)));
    result = factory(...modules);
  };
  vm.runInThisContext(`(function (define) {\n${source}\n})`, { filename: absPath })(define);
  cache.set(absPath, result);
  return result;
}
const loadJs = (rel) => load(resolve(JS_ROOT, rel));

class Target {
  constructor() {
    this.registered = [];
  }
  addEventListener(type, handler, options) {
    const record = { type, handler };
    this.registered.push(record);
    const signal = options && options.signal;
    if (signal) signal.addEventListener("abort", () => this.removeEventListener(type, handler), { once: true });
  }
  removeEventListener(type, handler) {
    this.registered = this.registered.filter((r) => !(r.type === type && r.handler === handler));
  }
  dispatch(type, event) {
    this.registered.filter((r) => r.type === type).forEach((r) => r.handler(event));
  }
}

function matchesSimple(el, selector) {
  if (selector.startsWith("#")) return el.id === selector.slice(1);
  const attr = /^\[([\w-]+)='([^']*)'\]$/.exec(selector);
  if (attr) return el.getAttribute(attr[1]) === attr[2];
  return selector.split(".").filter(Boolean).every((cls) => el.classes.has(cls));
}

class FakeEl extends Target {
  constructor(id, classes = [], doc = null) {
    super();
    this.id = id || "";
    this.classes = new Set(classes);
    this.attrs = {};
    this.children = [];
    this.parentNode = null;
    this.doc = doc;
    this.style = {};
    this.classList = {
      add: (c) => this.classes.add(c),
      remove: (c) => this.classes.delete(c),
      toggle: (c, force) => (force ? this.classes.add(c) : this.classes.delete(c)),
      contains: (c) => this.classes.has(c)
    };
  }
  get isConnected() {
    let node = this;
    while (node.parentNode) node = node.parentNode;
    return node === this.doc.body;
  }
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    this.children = this.children.filter((c) => c !== child);
    child.parentNode = null;
  }
  setAttribute(name, value) {
    this.attrs[name] = String(value);
  }
  getAttribute(name) {
    return name in this.attrs ? this.attrs[name] : null;
  }
  removeAttribute(name) {
    delete this.attrs[name];
  }
  matches(selector) {
    const last = selector.split(" ").pop();
    return matchesSimple(this, last);
  }
  closest(selector) {
    for (let node = this; node && node.matches; node = node.parentNode) if (node.matches(selector)) return node;
    return null;
  }
  querySelectorAll(selector) {
    const out = [];
    const walk = (node) => node.children.forEach((c) => { if (c.matches(selector)) out.push(c); walk(c); });
    walk(this);
    return out;
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
  contains(node) {
    for (let current = node; current; current = current.parentNode) if (current === this) return true;
    return false;
  }
  cloneNode() {
    return new FakeEl(this.id, [...this.classes], this.doc);
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 100, height: 100 };
  }
}

function createDocument() {
  const doc = new Target();
  doc.body = new FakeEl("body", [], doc);
  doc.body.parentNode = doc.body;
  doc.body.parentNode = null;
  doc.createElement = () => new FakeEl("", [], doc);
  doc.getElementById = (id) => doc.body.querySelectorAll(`#${id}`)[0] || null;
  doc.querySelectorAll = (selector) => doc.body.querySelectorAll(selector);
  doc.querySelector = (selector) => doc.body.querySelector(selector);
  return doc;
}

function addPage(doc, tabId, pageId) {
  const tabEl = new FakeEl(tabId, ["pagecontainer"], doc);
  const pageEl = new FakeEl(pageId, ["page", "pagegenericPage"], doc);
  doc.body.appendChild(tabEl);
  tabEl.appendChild(pageEl);
  return { tabEl, pageEl };
}

function createKdb(doc, extra = {}) {
  const handlers = {};
  return {
    state: {},
    runtime: {},
    api: {},
    elements: {},
    events: {
      subscribe(name, handler) {
        (handlers[name] = handlers[name] || []).push(handler);
        return () => { handlers[name] = handlers[name].filter((h) => h !== handler); };
      },
      emit(name, payload) { (handlers[name] || []).forEach((h) => h(payload)); }
    },
    ...extra
  };
}

function withDom(fn) {
  return async () => {
    const doc = createDocument();
    const saved = { document: globalThis.document };
    globalThis.document = doc;
    try {
      await fn(doc);
    } finally {
      globalThis.document = saved.document;
    }
  };
}

const registerDragDrop = loadJs("dashboard/canvas/dragDrop/index.js");
const registerPageSurface = loadJs("dashboard/canvas/pageSurface/index.js");
const dragState = loadJs("dashboard/canvas/dragDrop/state.js");
const TABS_CHANGED = "tabs:changed";
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
const flushMicrotasks = async () => { for (let i = 0; i < 25; i += 1) await Promise.resolve(); };
async function advance(ms) {
  await flushMicrotasks();
  mock.timers.tick(ms);
  await flushMicrotasks();
}
const withFakeTimers = (fn) => async (doc) => {
  mock.timers.enable({ apis: ["setTimeout", "Date"] });
  try {
    await fn(doc);
  } finally {
    mock.timers.reset();
  }
};
const dropboxListenerCount = (el) => el.registered.length;

test("dragDrop reducer: drag lifecycle and error handling", () => {
  let state = dragState.createInitialDragDropState();
  state = dragState.reduceDragDropState(state, { type: "dragDrop/mountSucceeded", payload: { mountedAt: 5 } });
  assert.equal(state.lifecycle, "ready");
  assert.equal(state.mountedAt, 5);
  state = dragState.reduceDragDropState(state, { type: "dragDrop/dragStarted", payload: { copyId: "c1" } });
  assert.equal(state.isDragging, true);
  assert.deepEqual(state.session, { copyId: "c1" });
  state = dragState.reduceDragDropState(state, { type: "dragDrop/dragFinished" });
  assert.equal(state.isDragging, false);
  assert.equal(state.session, null);
  state = dragState.reduceDragDropState(state, { type: "dragDrop/error", payload: {} });
  assert.equal(state.errorCode, "DRAG_DROP_ERROR");
  state = dragState.reduceDragDropState(state, { type: "dragDrop/destroy" });
  assert.equal(state.lifecycle, "disposed");
  assert.equal(dragState.reduceDragDropState(state, { type: "unknown" }), state);
});

test("dragDrop mount binds every dropbox once; refresh is idempotent", withDom(async (doc) => {
  const a = addPage(doc, "tabA", "pageA");
  const b = addPage(doc, "tabB", "pageB");
  const _KDB = createKdb(doc);
  const api = registerDragDrop(_KDB);
  assert.equal(api.mount(), true);
  assert.equal(a.pageEl.getAttribute("kdb_dropbox"), "true");
  assert.equal(dropboxListenerCount(a.pageEl), 4);
  assert.equal(dropboxListenerCount(b.pageEl), 4);
  const handlersBefore = a.pageEl.registered.map((r) => r.handler);
  assert.equal(api.refreshDropboxes(), true);
  assert.deepEqual(a.pageEl.registered.map((r) => r.handler), handlersBefore);
  api.destroy();
  assert.equal(dropboxListenerCount(a.pageEl), 0);
  assert.equal(a.pageEl.getAttribute("kdb_dropbox"), null);
}));

test("tabs:changed binds only the activated page and skips bound pages", withDom(async (doc) => {
  const a = addPage(doc, "tabA", "pageA");
  const _KDB = createKdb(doc);
  const api = registerDragDrop(_KDB);
  api.mount();
  const b = addPage(doc, "tabB", "pageB");
  const handlersOfA = a.pageEl.registered.map((r) => r.handler);
  _KDB.events.emit(TABS_CHANGED, { pageId: "pageB", tabId: "tabB" });
  assert.equal(dropboxListenerCount(b.pageEl), 4);
  assert.deepEqual(a.pageEl.registered.map((r) => r.handler), handlersOfA);
  const handlersOfB = b.pageEl.registered.map((r) => r.handler);
  _KDB.events.emit(TABS_CHANGED, { pageId: "pageB", tabId: "tabB" });
  assert.deepEqual(b.pageEl.registered.map((r) => r.handler), handlersOfB);
  api.destroy();
}));

test("tabs:changed for a lazily loaded page binds when the element appears (bounded poll)", withDom(withFakeTimers(async (doc) => {
  const _KDB = createKdb(doc);
  const api = registerDragDrop(_KDB);
  api.mount();
  _KDB.events.emit(TABS_CHANGED, { pageId: "pageLate", tabId: "tabLate" });
  assert.ok(_KDB.runtime.dragDrop.abortControllers.tabsChangedRebind, "poll is tracked in the abort bucket");
  await advance(50);
  const late = addPage(doc, "tabLate", "pageLate");
  await advance(150);
  assert.equal(dropboxListenerCount(late.pageEl), 4, "bound on the first pass after the element appeared");
  assert.ok(_KDB.runtime.dragDrop.abortControllers.tabsChangedRebind, "poll keeps verifying one more interval");
  await advance(200);
  assert.equal(_KDB.runtime.dragDrop.abortControllers.tabsChangedRebind, undefined);
  api.destroy();
})));

test("a newer activation or destroy cancels the pending poll", withDom(async (doc) => {
  const _KDB = createKdb(doc);
  const api = registerDragDrop(_KDB);
  api.mount();
  _KDB.events.emit(TABS_CHANGED, { pageId: "pageX" });
  const first = _KDB.runtime.dragDrop.abortControllers.tabsChangedRebind;
  _KDB.events.emit(TABS_CHANGED, { pageId: "pageY" });
  assert.equal(first.signal.aborted, true);
  const second = _KDB.runtime.dragDrop.abortControllers.tabsChangedRebind;
  api.destroy();
  assert.equal(second.signal.aborted, true);
  assert.equal(_KDB.runtime.dragDrop.abortControllers.tabsChangedRebind, undefined);
}));

test("tabs:changed is ignored while tabs work is in flight", withDom(async (doc) => {
  const _KDB = createKdb(doc);
  const api = registerDragDrop(_KDB);
  api.mount();
  _KDB.runtime.tabs = { pendingPromises: { traverse: Promise.resolve() } };
  const b = addPage(doc, "tabB", "pageB");
  _KDB.events.emit(TABS_CHANGED, { pageId: "pageB" });
  assert.equal(dropboxListenerCount(b.pageEl), 0);
  api.destroy();
}));

test("helper tab dropboxes are not bound", withDom(async (doc) => {
  const helper = addPage(doc, "tabHelper", "pageHelper");
  const _KDB = createKdb(doc, { state: { launchpad: { helperTabIds: ["tabHelper"] } } });
  const api = registerDragDrop(_KDB);
  api.mount();
  assert.equal(dropboxListenerCount(helper.pageEl), 0);
  assert.equal(helper.pageEl.getAttribute("kdb_dropbox"), null);
  api.destroy();
}));

test("destroy removes avatar templates, the fallback mount and the document dragover listener without finishDrag", withDom(async (doc) => {
  addPage(doc, "tabA", "pageA");
  const _KDB = createKdb(doc, { utils: { convertUnitToPx: () => null } });
  const api = registerDragDrop(_KDB);
  api.mount();
  assert.ok(doc.getElementById("KDB_dragAvatarTemplates"));
  assert.ok(doc.getElementById("kdbTextAvatar"));
  const dataTransfer = { setData() {}, setDragImage() {} };
  const source = new FakeEl("src", [], doc);
  doc.body.appendChild(source);
  const started = api.startDrag({ dataTransfer, clientX: 3, clientY: 4, target: source }, { draggedElementType: "text", dragSourceEl: source });
  assert.equal(started, true);
  assert.equal(doc.registered.filter((r) => r.type === "dragover").length, 1);
  assert.ok(_KDB.runtime.dragDrop.timers.nativeDragImage, "native drag image timer is tracked with a valid id");
  api.destroy();
  assert.equal(doc.registered.filter((r) => r.type === "dragover").length, 0);
  assert.equal(doc.getElementById("KDB_dragAvatarTemplates"), null);
  assert.equal(doc.getElementById("kdbTextAvatar"), null);
  assert.equal(doc.body.children.filter((c) => c.classes.has("avatarClone")).length, 0);
  assert.equal(api.getState(), undefined);
  assert.equal(api.startDrag({}, {}), false);
}));

test("finishDrag clears the avatar, the layout grid class and the document dragover listener", withDom(async (doc) => {
  const page = addPage(doc, "tabA", "pageA");
  const template = new FakeEl("tpl", ["page", "pagetemplateIndicator"], doc);
  doc.body.appendChild(template);
  const _KDB = createKdb(doc, { utils: { convertUnitToPx: () => null } });
  const api = registerDragDrop(_KDB);
  api.mount();
  const source = new FakeEl("src", [], doc);
  doc.body.appendChild(source);
  api.startDrag({ dataTransfer: { setData() {}, setDragImage() {} }, clientX: 0, clientY: 0, target: source }, { draggedElementType: "text", dragSourceEl: source });
  assert.ok(template.classes.has("KDB_absoluteLayoutGrid"));
  assert.ok(doc.body.children.some((c) => c.classes.has("avatarClone")));
  api.finishDrag(null);
  assert.equal(template.classes.has("KDB_absoluteLayoutGrid"), false);
  assert.equal(doc.body.children.some((c) => c.classes.has("avatarClone")), false);
  assert.equal(doc.registered.filter((r) => r.type === "dragover").length, 0);
  assert.equal(_KDB.runtime.dragDrop.timers.nativeDragImage, undefined);
  assert.equal(dropboxListenerCount(page.pageEl), 4);
  api.destroy();
}));

test("pageSurface queues dispatches until the canvas is ready, then flushes pending and settings", async () => {
  const calls = [];
  let release;
  const facet = {
    whenCanvasReady: () => new Promise((resolveReady) => { release = () => resolveReady({ ok: true, data: { ready: true } }); }),
    setCanvasPageSize: (axis, css) => { calls.push([axis, css]); return { ok: true }; }
  };
  const _KDB = createKdb(createDocument(), {
    services: { cognosHost: { canvas: facet } },
    utils: {},
    api: { kdbControl: { getState: () => ({ settings: { dashboard: { width: "800px", height: "600px", backgroundColor: "" } } }) } }
  });
  globalThis.document = createDocument();
  const api = registerPageSurface(_KDB);
  api.mount();
  api.dispatch({ type: "kdbControl.canvasIntent.dashboardWidth", payload: { value: "1000px" } });
  assert.deepEqual(calls, []);
  release();
  await sleep(10);
  assert.deepEqual(calls, [["width", "1000px"], ["height", "600px"]]);
  api.dispatch({ type: "kdbControl.canvasIntent.dashboardHeight", payload: { value: "700px" } });
  assert.deepEqual(calls[2], ["height", "700px"]);
  api.destroy();
  assert.equal(_KDB.runtime.pageSurface.canvasFacet, null);
  api.dispatch({ type: "kdbControl.canvasIntent.dashboardHeight", payload: { value: "900px" } });
  assert.equal(calls.length, 3);
  assert.equal(api.getState(), undefined);
});

test("pageSurface without a ready facet applies the settings immediately on mount", async () => {
  const calls = [];
  const facet = { setCanvasPageSize: (axis, css) => { calls.push([axis, css]); return { ok: true }; } };
  const _KDB = createKdb(createDocument(), {
    services: { cognosHost: { canvas: facet } },
    api: { kdbControl: { getState: () => ({ settings: { dashboard: { width: "500px", height: "400px" } } }) } }
  });
  globalThis.document = createDocument();
  const api = registerPageSurface(_KDB);
  api.mount();
  await sleep(5);
  assert.deepEqual(calls, [["width", "500px"], ["height", "400px"]]);
  api.destroy();
});

function createDropEvent(el, payload, point = { x: 10, y: 10 }) {
  const body = JSON.stringify(payload);
  return {
    target: el,
    currentTarget: el,
    clientX: point.x,
    clientY: point.y,
    preventDefault() {},
    dataTransfer: { getData: (type) => (type === "application/json" ? body : "") }
  };
}

function mountWithDropbox(doc, extra = {}) {
  const page = addPage(doc, "tabA", "pageA");
  const emitted = [];
  const notices = [];
  const _KDB = createKdb(doc, { services: { message: { notify: (n) => notices.push(n) } }, ...extra });
  _KDB.events.subscribe("canvas:dropValidated", (payload) => emitted.push(payload));
  const api = registerDragDrop(_KDB);
  api.mount();
  return { page, emitted, notices, _KDB, api };
}

const textPayload = { draggedElementType: "text", defaultWidth: 20, defaultHeight: 20, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, originId: "origin1", padKey: "text", sourceKind: "toolboxTextButton", payload: { title: "Notiz" } };

test("a valid drop emits canvas:dropValidated and records the validation in state", withDom(async (doc) => {
  const { page, emitted, _KDB, api } = mountWithDropbox(doc);
  const origin = new FakeEl("origin1", [], doc);
  doc.body.appendChild(origin);
  page.pageEl.dispatch("drop", createDropEvent(page.pageEl, textPayload));
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].dropboxId, "pageA");
  assert.equal(emitted[0].tabId, "tabA");
  assert.equal(emitted[0].draggedElementType, "text");
  assert.equal(emitted[0].originId, "origin1");
  assert.equal(emitted[0].sourceKind, "toolboxTextButton");
  assert.deepEqual(emitted[0].payload, { title: "Notiz" });
  assert.deepEqual(Object.keys(emitted[0].layout).sort(), ["defaultHeight", "defaultWidth", "dragOffset", "pointer", "scaleX", "scaleY"]);
  assert.equal(emitted[0].layout.pointer.offsetX, 10);
  assert.equal(origin.classes.has("dropped"), true);
  const state = api.getState();
  assert.equal(state.lastValidation.isValid, true);
  assert.equal(state.lastValidation.dropboxId, "pageA");
  assert.equal(state.isDragging, false);
  assert.equal(_KDB.state.dragDrop.lastValidation.draggedElementType, "text");
  api.destroy();
}));

test("rejected drops: out-of-bounds, helper-tab and filter-name conflict emit nothing and notify", withDom(async (doc) => {
  const { page, emitted, notices, _KDB, api } = mountWithDropbox(doc, {
    properties: { filterPropObj: { src: { globalFilters: { Jahr: {} }, pageContextFilters: {} } } }
  });
  page.pageEl.dispatch("drop", createDropEvent(page.pageEl, textPayload, { x: 95, y: 10 }));
  assert.equal(api.getState().lastValidation.reason, "out-of-bounds");
  page.pageEl.dispatch("drop", createDropEvent(page.pageEl, { ...textPayload, payload: { title: " jahr " } }));
  assert.equal(api.getState().lastValidation.reason, "name-conflicts-with-filter");
  _KDB.runtime.dragDrop.helperTabIds = ["tabA"];
  page.pageEl.dispatch("drop", createDropEvent(page.pageEl, textPayload));
  assert.equal(api.getState().lastValidation.reason, "helper-tab");
  assert.equal(api.getState().lastValidation.isValid, false);
  assert.equal(emitted.length, 0);
  assert.equal(notices.length, 3);
  assert.ok(notices.every((n) => n.severity === "warning"));
  assert.match(notices[1].message, /Filterbezeichnung/);
  api.destroy();
}));

test("drop with a foreign payload is rejected as invalid-widget-type", withDom(async (doc) => {
  const { page, emitted, api } = mountWithDropbox(doc);
  page.pageEl.dispatch("drop", createDropEvent(page.pageEl, { draggedElementType: "chart" }));
  assert.equal(api.getState().lastValidation.reason, "invalid-widget-type");
  assert.equal(emitted.length, 0);
  api.destroy();
}));

test("hover: dragover highlights within bounds, clears outside; dragleave honours inner targets", withDom(async (doc) => {
  const { page, _KDB, api } = mountWithDropbox(doc);
  _KDB.state.dragDrop.session = { defaultWidth: 20, defaultHeight: 20, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1 };
  const makeEvent = (x, y, extra = {}) => ({ target: page.pageEl, currentTarget: page.pageEl, clientX: x, clientY: y, preventDefault() {}, dataTransfer: {}, ...extra });
  const inside = makeEvent(10, 10);
  page.pageEl.dispatch("dragover", inside);
  assert.equal(page.pageEl.classes.has("kdb_drag-over"), true);
  assert.equal(inside.dataTransfer.dropEffect, "copy");
  const outside = makeEvent(95, 10);
  page.pageEl.dispatch("dragover", outside);
  assert.equal(page.pageEl.classes.has("kdb_drag-over"), false);
  assert.equal(outside.dataTransfer.dropEffect, "none");
  page.pageEl.dispatch("dragenter", makeEvent(10, 10));
  assert.equal(page.pageEl.classes.has("kdb_drag-over"), true);
  const child = new FakeEl("child", [], doc);
  page.pageEl.appendChild(child);
  page.pageEl.dispatch("dragleave", makeEvent(10, 10, { relatedTarget: child }));
  assert.equal(page.pageEl.classes.has("kdb_drag-over"), true, "moving onto a child keeps the highlight");
  page.pageEl.dispatch("dragleave", makeEvent(10, 10, { relatedTarget: null }));
  assert.equal(page.pageEl.classes.has("kdb_drag-over"), false);
  api.destroy();
}));

test("a bound page that became a helper page is unbound on activation", withDom(withFakeTimers(async (doc) => {
  const _KDB = createKdb(doc, { state: { launchpad: { helperTabIds: [] } } });
  const page = addPage(doc, "tabA", "pageA");
  const api = registerDragDrop(_KDB);
  api.mount();
  assert.equal(dropboxListenerCount(page.pageEl), 4);
  _KDB.state.launchpad.helperTabIds = ["tabA"];
  _KDB.events.emit(TABS_CHANGED, { pageId: "pageA", tabId: "tabA" });
  await advance(0);
  assert.equal(dropboxListenerCount(page.pageEl), 0);
  assert.equal(page.pageEl.getAttribute("kdb_dropbox"), null);
  assert.equal(_KDB.runtime.dragDrop.abortControllers.tabsChangedRebind, undefined, "a helper page ends the poll");
  api.destroy();
})));

test("a page node swapped by Cognos right after the first bind is rebound, old listeners are released", withDom(withFakeTimers(async (doc) => {
  const _KDB = createKdb(doc);
  const first = addPage(doc, "tabA", "pageA");
  const api = registerDragDrop(_KDB);
  api.mount();
  _KDB.events.emit(TABS_CHANGED, { pageId: "pageA", tabId: "tabA" });
  const swapped = new FakeEl("pageA", ["page", "pagegenericPage"], doc);
  first.tabEl.removeChild(first.pageEl);
  first.tabEl.appendChild(swapped);
  await advance(200);
  assert.equal(dropboxListenerCount(swapped), 4);
  assert.equal(dropboxListenerCount(first.pageEl), 0);
  assert.equal(first.pageEl.getAttribute("kdb_dropbox"), null);
  assert.ok(_KDB.runtime.dragDrop.abortControllers.tabsChangedRebind, "the poll waits for one more stable pass");
  await advance(200);
  assert.equal(_KDB.runtime.dragDrop.abortControllers.tabsChangedRebind, undefined);
  assert.equal(_KDB.runtime.dragDrop.dropboxesById.pageA, swapped);
  api.destroy();
  assert.equal(dropboxListenerCount(swapped), 0);
})));

test("refreshDropboxes releases the listeners of a re-created element", withDom(async (doc) => {
  const _KDB = createKdb(doc);
  const first = addPage(doc, "tabA", "pageA");
  const api = registerDragDrop(_KDB);
  api.mount();
  const swapped = new FakeEl("pageA", ["page", "pagegenericPage"], doc);
  first.tabEl.removeChild(first.pageEl);
  first.tabEl.appendChild(swapped);
  assert.equal(api.refreshDropboxes(), true);
  assert.equal(dropboxListenerCount(swapped), 4);
  assert.equal(dropboxListenerCount(first.pageEl), 0);
  api.destroy();
}));

test("rebind poll that keeps failing logs the last error once on timeout", withDom(withFakeTimers(async (doc) => {
  const errors = mock.method(console, "error", () => {});
  const _KDB = createKdb(doc, { api: { launchpad: { getState: () => { throw new Error("launchpad down"); } } } });
  const api = registerDragDrop(_KDB);
  api.mount();
  errors.mock.resetCalls();
  _KDB.events.emit(TABS_CHANGED, { pageId: "pageZ" });
  for (let i = 0; i < 20; i += 1) await advance(200);
  const logged = errors.mock.calls.filter((call) => String(call.arguments[0]).includes("pollForPageDropbox"));
  assert.equal(logged.length, 1);
  assert.equal(logged[0].arguments[1].message, "launchpad down");
  assert.equal(_KDB.runtime.dragDrop.abortControllers.tabsChangedRebind, undefined);
  errors.mock.restore();
  api.destroy();
})));

test("a failing initial bind keeps mount usable: returns false, no error lifecycle, rebind subscription kept", withDom(async (doc) => {
  const errors = mock.method(console, "error", () => {});
  addPage(doc, "tabA", "pageA");
  const _KDB = createKdb(doc, { api: { launchpad: { getState: () => { throw new Error("boom"); } } } });
  const api = registerDragDrop(_KDB);
  assert.equal(api.mount(), false);
  assert.equal(api.getState().lifecycle, "ready");
  assert.equal(typeof _KDB.runtime.dragDrop.subscriptions.tabsChanged, "function");
  assert.equal(api.refreshDropboxes(), false);
  assert.equal(api.getState().lifecycle, "ready");
  assert.equal(api.getState().errorCode, null);
  errors.mock.restore();
  api.destroy();
}));

test("destroy releases subscription and poll even when a teardown step throws", withDom(withFakeTimers(async (doc) => {
  const errors = mock.method(console, "error", () => {});
  const _KDB = createKdb(doc);
  const page = addPage(doc, "tabA", "pageA");
  const api = registerDragDrop(_KDB);
  api.mount();
  _KDB.events.emit(TABS_CHANGED, { pageId: "pageLate" });
  const poll = _KDB.runtime.dragDrop.abortControllers.tabsChangedRebind;
  page.pageEl.removeAttribute = () => { throw new Error("detached host"); };
  api.destroy();
  assert.equal(poll.signal.aborted, true);
  assert.equal(_KDB.runtime.dragDrop.subscriptions.tabsChanged, undefined);
  assert.equal(_KDB.state.dragDrop.lifecycle, "disposed");
  assert.ok(errors.mock.calls.some((call) => String(call.arguments[0]).includes("teardown failed")));
  errors.mock.restore();
})));

test("native drag image: tracked timer removes the element and deletes itself after firing", withDom(withFakeTimers(async (doc) => {
  const _KDB = createKdb(doc, { utils: { convertUnitToPx: () => null } });
  addPage(doc, "tabA", "pageA");
  const api = registerDragDrop(_KDB);
  api.mount();
  const source = new FakeEl("src", [], doc);
  doc.body.appendChild(source);
  api.startDrag({ dataTransfer: { setData() {}, setDragImage() {} }, clientX: 0, clientY: 0, target: source }, { draggedElementType: "text", dragSourceEl: source });
  const dragImageEl = _KDB.runtime.dragDrop.domRefs.nativeDragImageEl;
  assert.ok(dragImageEl && dragImageEl.parentNode === doc.body);
  assert.ok(_KDB.runtime.dragDrop.timers.nativeDragImage);
  await advance(1);
  assert.equal(_KDB.runtime.dragDrop.timers.nativeDragImage, undefined);
  assert.equal(_KDB.runtime.dragDrop.domRefs.nativeDragImageEl, null);
  assert.equal(dragImageEl.parentNode, null);
  api.destroy();
})));
