// Behaviour tests for widgetVis line/Prognose tooltip suppression (JS class + MutationObserver).
// Run: node --test tools/tests/widgetVis-lineTooltip.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const W = "dashboard/widgets/widgetVis/";
const load = (rel, options) => loadAmd(path.join(JS_ROOT, rel), options);
const CLASS = "kdb-hide-aggregate-tooltip";
const LINE_ID = "com.ibm.vis.rave2line";
const PROGNOSE_ID = "com.ibm.vis.custom.prognoseyearlinechart";
const PIE_ID = "com.ibm.vis.rave2pie";

function parseCompound(compound) {
  const attrs = Object.fromEntries([...compound.matchAll(/\[([\w-]+)="([^"]*)"\]/g)].map((m) => [m[1], m[2]]));
  const withoutAttrs = compound.replace(/\[[^\]]*\]/g, "");
  const tag = (withoutAttrs.match(/^[a-zA-Z][\w-]*/) || [null])[0];
  const classes = [...withoutAttrs.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
  return { tag, classes, attrs };
}

function matchesCompound(el, compound) {
  const parsed = parseCompound(compound);
  if (parsed.tag && el.tagName !== parsed.tag.toUpperCase()) return false;
  for (const name of parsed.classes) if (!el.classList.contains(name)) return false;
  for (const [name, value] of Object.entries(parsed.attrs)) if (el.getAttribute(name) !== value) return false;
  return true;
}

function matchesSelector(el, selector) {
  return selector.split(",").some((group) => {
    const parts = group.trim().split(/\s+/).filter(Boolean);
    if (!parts.length || !matchesCompound(el, parts[parts.length - 1])) return false;
    let node = el.parentElement;
    for (let i = parts.length - 2; i >= 0; i -= 1) {
      while (node && node.nodeType === 1 && !matchesCompound(node, parts[i])) node = node.parentElement;
      if (!node) return false;
      node = node.parentElement;
    }
    return true;
  });
}

function collect(root, selector, skipRoot) {
  const out = [];
  function walk(node, isRoot) {
    if (node && node.nodeType === 1 && (!isRoot || !skipRoot) && matchesSelector(node, selector)) out.push(node);
    (node.children || []).forEach((child) => walk(child, false));
  }
  walk(root, true);
  return out;
}

function createClassList(names) {
  const set = new Set(names || []);
  return {
    contains: (name) => set.has(name),
    add: (name) => { set.add(name); },
    remove: (name) => { set.delete(name); }
  };
}

function createDom() {
  function ElementStub() {}
  function createNode(tag, opts = {}) {
    const el = new ElementStub();
    el.nodeType = 1;
    el.tagName = String(tag).toUpperCase();
    el.children = [];
    el.parentElement = null;
    el.classList = createClassList(opts.classes || []);
    const attrs = Object.assign({}, opts.attrs || {});
    el.getAttribute = (name) => (name in attrs ? attrs[name] : null);
    el.textContent = opts.text != null ? opts.text : "";
    el.getClientRects = () => (opts.hidden ? [] : [{}]);
    el.closest = function closest(sel) {
      let node = this;
      while (node && node.nodeType === 1) {
        if (matchesSelector(node, sel)) return node;
        node = node.parentElement;
      }
      return null;
    };
    el.querySelector = function querySelector(sel) {
      return collect(this, sel, true)[0] || null;
    };
    el.querySelectorAll = function querySelectorAll(sel) {
      return collect(this, sel, true);
    };
    return el;
  }
  function append(parent, child) {
    parent.children.push(child);
    child.parentElement = parent;
    return child;
  }
  const body = createNode("body");
  const listeners = [];
  const document = {
    body,
    addEventListener(type, handler, options) {
      listeners.push({ type, handler, options });
    },
    removeEventListener(type, handler) {
      const index = listeners.findIndex((entry) => entry.type === type && entry.handler === handler);
      if (index >= 0) listeners.splice(index, 1);
    },
    querySelectorAll(sel) {
      return collect(body, sel, false);
    },
    querySelector(sel) {
      return collect(body, sel, false)[0] || null;
    },
    getElementById() {
      return null;
    }
  };
  const pending = new Map();
  let nextTimer = 1;
  const delays = [];
  const timers = {
    pending,
    delays,
    setTimeout(fn, ms) {
      const id = nextTimer++;
      delays.push(ms);
      pending.set(id, fn);
      return id;
    },
    clearTimeout(id) {
      pending.delete(id);
    },
    flush() {
      const fns = Array.from(pending.values());
      pending.clear();
      fns.forEach((fn) => fn());
    }
  };
  function FakeMutationObserver(callback) {
    this.callback = callback;
    this.observeCount = 0;
    this.disconnectCount = 0;
    this.connected = false;
    this.target = null;
    this.opts = null;
    FakeMutationObserver.instances.push(this);
  }
  FakeMutationObserver.instances = [];
  FakeMutationObserver.prototype.observe = function observe(target, opts) {
    this.observeCount += 1;
    this.connected = true;
    this.target = target;
    this.opts = opts;
  };
  FakeMutationObserver.prototype.disconnect = function disconnect() {
    this.disconnectCount += 1;
    this.connected = false;
  };
  FakeMutationObserver.prototype.trigger = function trigger() {
    this.callback([], this);
  };
  const errors = [];
  const stubs = {
    document,
    Element: ElementStub,
    MutationObserver: FakeMutationObserver,
    setTimeout: (fn, ms) => timers.setTimeout(fn, ms),
    clearTimeout: (id) => timers.clearTimeout(id),
    console: {
      error(...args) { errors.push(args); },
      warn() {},
      log() {}
    },
    window: {}
  };
  return { ElementStub, createNode, append, body, document, listeners, timers, FakeMutationObserver, errors, stubs };
}

const DEFAULT_STAMPS = { [LINE_ID]: "line", [PROGNOSE_ID]: "prognose", [PIE_ID]: "pie" };

// stamp: value of data-kdb-vis-type on the KDB settings panel; null means the panel is absent (parked widget).
function addWidget(dom, visId, stamp = DEFAULT_STAMPS[visId]) {
  const widget = dom.createNode("div", { classes: ["widget", "liveWidget"] });
  if (stamp != null) {
    dom.append(widget, dom.createNode("div", { classes: ["KDB_widgetSettings"], attrs: { "data-kdb-vis-type": stamp } }));
  }
  const content = dom.createNode("div", { classes: ["liveWidgetContent"], attrs: { "walkme-data-id": visId } });
  const legend = dom.createNode("div", { classes: ["Legend"] });
  const swatch = dom.createNode("div", { classes: ["Swatch"] });
  const item = dom.createNode("li");
  const svg = dom.createNode("svg", { classes: ["rootSvg"] });
  const line = dom.createNode("path", { classes: ["line-element"] });
  const point = dom.createNode("path", { classes: ["point-element"] });
  const other = dom.createNode("div", { classes: ["chrome"] });
  dom.append(dom.body, widget);
  dom.append(widget, content);
  dom.append(content, legend);
  dom.append(legend, swatch);
  dom.append(swatch, item);
  dom.append(content, svg);
  dom.append(svg, line);
  dom.append(svg, point);
  dom.append(widget, other);
  return { widget, content, item, svg, line, point, other };
}

function addTooltip(dom, text, opts = {}) {
  const popover = dom.createNode("div", { classes: ["popover-content"] });
  const labels = dom.createNode("div", { classes: ["labels"], text, hidden: opts.hidden });
  const value = dom.createNode("span", { classes: ["labelValue"], text });
  if (!opts.noValue) dom.append(labels, value);
  dom.append(popover, labels);
  dom.append(dom.body, popover);
  return { popover, labels, value };
}

function createHarness() {
  const dom = createDom();
  const api = load(W + "lineTooltip.js", { stubs: dom.stubs });
  const _KDB = { runtime: {}, api: {}, state: {}, services: {} };
  return Object.assign({ api, _KDB }, dom);
}

function rtOf(_KDB) {
  return _KDB.runtime.widgetVis;
}

function fire(h, type, target) {
  h.listeners.filter((entry) => entry.type === type).forEach((entry) => entry.handler({ target }));
}

function over(h, target) {
  fire(h, "pointerover", target);
}

function move(h, target) {
  fire(h, "pointermove", target);
}

function observerOf(h) {
  return h.FakeMutationObserver.instances[0];
}

test("install registers exactly two capture listeners and is idempotent", () => {
  const h = createHarness();
  h.api.install(h._KDB);
  assert.equal(h.listeners.length, 2);
  assert.deepEqual(h.listeners.map((entry) => [entry.type, entry.options]), [["pointerover", true], ["pointermove", true]]);
  h.api.install(h._KDB);
  assert.equal(h.listeners.length, 2);
  assert.equal(h.FakeMutationObserver.instances.length, 1);
});

test("legend hover on a line widget turns the hide class on with no hold timer", () => {
  const h = createHarness();
  const line = addWidget(h, LINE_ID);
  h.api.install(h._KDB);
  over(h, line.item);
  assert.equal(h.body.classList.contains(CLASS), true);
  assert.equal(h.timers.pending.size, 0);
  assert.equal(rtOf(h._KDB).timers.lineTooltipHold, undefined);
});

test("chart hover on a line widget turns the hide class on", () => {
  const h = createHarness();
  const line = addWidget(h, LINE_ID);
  h.api.install(h._KDB);
  over(h, line.svg);
  assert.equal(h.body.classList.contains(CLASS), true);
  over(h, line.line);
  assert.equal(h.body.classList.contains(CLASS), true);
  assert.equal(h.timers.pending.size, 0);
});

test("legend hover on a non-line widget does not add the class", () => {
  const h = createHarness();
  const pie = addWidget(h, PIE_ID);
  h.api.install(h._KDB);
  over(h, pie.item);
  assert.equal(h.body.classList.contains(CLASS), false);
});

test("point hover with class on observes once, captures previous tooltip, keeps the class", () => {
  const h = createHarness();
  const line = addWidget(h, LINE_ID);
  addTooltip(h, "  agg   12  ");
  h.api.install(h._KDB);
  over(h, line.item);
  const mo = observerOf(h);
  assert.equal(mo.observeCount, 0);
  over(h, line.point);
  assert.equal(mo.observeCount, 1);
  assert.deepEqual(mo.opts, { childList: true, characterData: true, subtree: true });
  assert.equal(mo.target, h.body);
  const state = rtOf(h._KDB).lineTooltip;
  assert.equal(state.pendingPoint, true);
  assert.equal(state.previousTooltip, "agg 12");
  assert.equal(h.body.classList.contains(CLASS), true);
});

test("observer with unchanged tooltip stays hidden; changed content releases", () => {
  const h = createHarness();
  const line = addWidget(h, LINE_ID);
  const tip = addTooltip(h, "agg 12");
  h.api.install(h._KDB);
  over(h, line.item);
  over(h, line.point);
  const mo = observerOf(h);
  mo.trigger();
  assert.equal(h.body.classList.contains(CLASS), true);
  assert.equal(rtOf(h._KDB).lineTooltip.pendingPoint, true);
  assert.equal(mo.connected, true);
  tip.labels.textContent = "point 3";
  mo.trigger();
  assert.equal(h.body.classList.contains(CLASS), false);
  assert.equal(rtOf(h._KDB).lineTooltip.pendingPoint, false);
  assert.equal(mo.connected, false);
});

test("repeated point pointermoves while pending do not observe again", () => {
  const h = createHarness();
  const line = addWidget(h, LINE_ID);
  addTooltip(h, "agg 12");
  h.api.install(h._KDB);
  over(h, line.item);
  over(h, line.point);
  const mo = observerOf(h);
  move(h, line.point);
  move(h, line.point);
  assert.equal(mo.observeCount, 1);
  assert.equal(rtOf(h._KDB).lineTooltip.pendingPoint, true);
});

test("point hover with class off does not observe", () => {
  const h = createHarness();
  const line = addWidget(h, LINE_ID);
  h.api.install(h._KDB);
  over(h, line.point);
  assert.equal(observerOf(h).observeCount, 0);
  assert.equal(rtOf(h._KDB).lineTooltip.pendingPoint, false);
  assert.equal(h.body.classList.contains(CLASS), false);
});

test("leaving to a non-chart element starts the 800 ms hold once; it then removes the class", () => {
  const h = createHarness();
  const line = addWidget(h, LINE_ID);
  const outside = h.createNode("div");
  h.append(h.body, outside);
  h.api.install(h._KDB);
  over(h, line.item);
  over(h, line.other);
  assert.equal(h.timers.delays[h.timers.delays.length - 1], 800);
  assert.equal(h.timers.pending.size, 1);
  move(h, outside);
  over(h, outside);
  assert.equal(h.timers.pending.size, 1);
  assert.equal(h.timers.delays.filter((ms) => ms === 800).length, 1);
  h.timers.flush();
  assert.equal(h.body.classList.contains(CLASS), false);
  assert.equal(rtOf(h._KDB).timers.lineTooltipHold, undefined);
});

test("re-entering the legend before 800 ms clears the timer and keeps the class", () => {
  const h = createHarness();
  const line = addWidget(h, LINE_ID);
  h.api.install(h._KDB);
  over(h, line.item);
  over(h, line.other);
  assert.equal(h.timers.pending.size, 1);
  over(h, line.item);
  assert.equal(h.timers.pending.size, 0);
  assert.equal(h.body.classList.contains(CLASS), true);
});

test("a non-point event while pending cancels pending and disconnects", () => {
  const h = createHarness();
  const line = addWidget(h, LINE_ID);
  addTooltip(h, "agg 12");
  h.api.install(h._KDB);
  over(h, line.item);
  over(h, line.point);
  const mo = observerOf(h);
  assert.equal(mo.connected, true);
  over(h, line.other);
  assert.equal(rtOf(h._KDB).lineTooltip.pendingPoint, false);
  assert.equal(mo.connected, false);
  assert.equal(h.body.classList.contains(CLASS), true);
  assert.equal(h.timers.pending.size, 1);
});

test("point to line (chart) while pending cancels then keeps the class on", () => {
  const h = createHarness();
  const line = addWidget(h, LINE_ID);
  addTooltip(h, "agg 12");
  h.api.install(h._KDB);
  over(h, line.item);
  over(h, line.point);
  const mo = observerOf(h);
  over(h, line.line);
  assert.equal(rtOf(h._KDB).lineTooltip.pendingPoint, false);
  assert.equal(mo.connected, false);
  assert.equal(h.body.classList.contains(CLASS), true);
  assert.equal(h.timers.pending.size, 0);
});

test("Prognose is detected through our stamp, whatever Cognos id the vis has", () => {
  ["prognose", "com.ibm.vis.custom.prognoseyear", "com.ibm.vis.custom.prognoseyearlinechart"].forEach((stamp) => {
    const h = createHarness();
    const prognose = addWidget(h, "com.ibm.vis.custom.unverified", stamp);
    h.api.install(h._KDB);
    over(h, prognose.item);
    assert.equal(h.body.classList.contains(CLASS), true, stamp);
    h.body.classList.remove(CLASS);
    over(h, prognose.svg);
    assert.equal(h.body.classList.contains(CLASS), true, stamp);
  });
});

test("Line without a stamp falls back to the Cognos rave2line id", () => {
  const h = createHarness();
  const line = addWidget(h, LINE_ID, null);
  h.api.install(h._KDB);
  over(h, line.item);
  assert.equal(h.body.classList.contains(CLASS), true);
});

test("a widget without stamp and without the Line id (Prognose Cognos id, pie) does not hide", () => {
  const h = createHarness();
  const prognose = addWidget(h, PROGNOSE_ID, null);
  const pie = addWidget(h, PIE_ID, "pie");
  h.api.install(h._KDB);
  over(h, prognose.item);
  over(h, pie.svg);
  assert.equal(h.body.classList.contains(CLASS), false);
});

test("uninstall removes the class, listeners, hold timer and disconnects the observer", () => {
  const h = createHarness();
  const line = addWidget(h, LINE_ID);
  addTooltip(h, "agg 12");
  h.api.install(h._KDB);
  over(h, line.item);
  over(h, line.point);
  over(h, line.other);
  assert.equal(h.timers.pending.size, 1);
  h.api.uninstall(h._KDB);
  assert.equal(h.body.classList.contains(CLASS), false);
  assert.equal(h.listeners.length, 0);
  assert.equal(h.timers.pending.size, 0);
  assert.equal(observerOf(h).connected, false);
  assert.equal(rtOf(h._KDB).lineTooltip, null);
});

test("disposeRuntimeBuckets also clears listeners, observer and timer", () => {
  const h = createHarness();
  const kit = load("core/utils/kit/runtime.js", { stubs: h.stubs });
  const line = addWidget(h, LINE_ID);
  h.api.install(h._KDB);
  over(h, line.item);
  over(h, line.other);
  const runtime = rtOf(h._KDB);
  assert.equal(h.listeners.length, 2);
  assert.ok(runtime.observers.lineTooltip);
  assert.ok(runtime.timers.lineTooltipHold);
  kit.disposeRuntimeBuckets(runtime);
  assert.equal(h.listeners.length, 0);
  assert.deepEqual(runtime.listeners, {});
  assert.deepEqual(runtime.observers, {});
  assert.deepEqual(runtime.timers, {});
  assert.equal(h.timers.pending.size, 0);
});

test("events after uninstall do nothing", () => {
  const h = createHarness();
  const line = addWidget(h, LINE_ID);
  h.api.install(h._KDB);
  over(h, line.item);
  h.api.uninstall(h._KDB);
  over(h, line.item);
  move(h, line.svg);
  assert.equal(h.body.classList.contains(CLASS), false);
});

test("handler errors are caught; throwing closest does not propagate", () => {
  const h = createHarness();
  const line = addWidget(h, LINE_ID);
  h.api.install(h._KDB);
  line.item.closest = function closest() {
    throw new Error("boom");
  };
  assert.doesNotThrow(() => over(h, line.item));
  assert.equal(h.errors.length, 1);
  assert.equal(h.errors[0][0], "[widgetVis.lineTooltip] pointer handler failed");
});

test("index.js mount installs once and destroy tears down", () => {
  const h = createDom();
  const register = load(W + "index.js", { stubs: h.stubs });
  const _KDB = {
    runtime: {},
    api: {},
    state: {},
    services: {
      cognosHost: { visualization: {}, widgets: {}, filters: {}, dataQuery: {} },
      tableData: { readRows() { return []; } }
    }
  };
  const api = register(_KDB, {});
  const line = addWidget(h, LINE_ID);
  assert.equal(api.mount({}), true);
  assert.equal(h.listeners.length, 2);
  assert.equal(api.mount({}), true);
  assert.equal(h.listeners.length, 2);
  over({ listeners: h.listeners }, line.item);
  assert.equal(h.body.classList.contains(CLASS), true);
  api.destroy();
  assert.equal(h.listeners.length, 0);
  assert.equal(h.body.classList.contains(CLASS), false);
  assert.deepEqual(_KDB.runtime.widgetVis, {});
});
