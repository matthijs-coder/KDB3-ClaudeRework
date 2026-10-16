// P2-W9a: widgetVis focus-mode settings panel (focus/panel.js): which widgetSettings helpers it calls, with what, for
// pointer input on the cloned panel and on the document. widgetSettings and the DOM query helpers are recording fakes;
// only the adapter section knows how panel.js reaches them.
// Run: node --test tools/tests/w9a-focus-panel.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const QUIET = { error() {}, warn() {}, log() {} };

const SEL = {
  dropdownOptionInDropdownSelector: ".OPT_IN_DD", dropdownSelector: ".DD", dropdownKindAttr: "kind-attr", visibleClass: "VIS",
  focusPanelPointerIconSelector: ".ICON", focusPanelRootAttr: "focus-root", panelRootAttr: "panel-root", toolbarClass: "TOOLBAR",
  settingsIconsSelector: ".ICONS", widgetIconsSelector: ".WICONS", widgetHeaderSelector: ".HEADER"
};

class FakeEl {
  constructor(name, opts) {
    const o = opts || {};
    this.name = name;
    this.attrs = Object.assign({}, o.attrs);
    this.classes = new Set(o.classes || []);
    this.children = [];
    this.parentNode = null;
    this.listeners = [];
    this.matchers = o.matchers || {};
    this.found = o.found || {};
    this.classList = {
      add: (c) => { this.classes.add(c); },
      remove: (c) => { this.classes.delete(c); },
      contains: (c) => this.classes.has(c)
    };
    this.ownerDocument = o.ownerDocument || null;
  }
  closest(selector) { return this.matchers[selector] === undefined ? null : this.matchers[selector]; }
  contains(el) { return el === this || this.children.indexOf(el) >= 0 || !!el && el.parentNode === this; }
  getAttribute(n) { return Object.prototype.hasOwnProperty.call(this.attrs, n) ? this.attrs[n] : null; }
  setAttribute(n, v) { this.attrs[n] = String(v); }
  removeAttribute(n) { delete this.attrs[n]; }
  querySelector(selector) { return this.found[selector] || null; }
  cloneNode() {
    const copy = new FakeEl(this.name + "-clone", { attrs: this.attrs, classes: [...this.classes], found: this.found, ownerDocument: this.ownerDocument });
    return copy;
  }
  appendChild(child) { this.children.push(child); child.parentNode = this; return child; }
  removeChild(child) { this.children.splice(this.children.indexOf(child), 1); child.parentNode = null; return child; }
  insertAdjacentElement(where, el) { el.parentNode = this.parentNode; this.inserted = { where, el }; return el; }
  addEventListener(type, handler, capture) { this.listeners.push({ type, handler, capture }); }
  removeEventListener(type, handler, capture) {
    const i = this.listeners.findIndex((l) => l.type === type && l.handler === handler && l.capture === capture);
    if (i >= 0) this.listeners.splice(i, 1);
  }
}

function createHarness() {
  const calls = [];
  const rec = (name) => (...args) => { calls.push([name, ...args.map((a) => (a instanceof FakeEl ? "<" + a.name + ">" : a))]); };
  const doc = new FakeEl("document");
  const sourcePanel = new FakeEl("source", { attrs: { "panel-root": "w1", "data-kdb-vis-type": "line" } });
  const container = new FakeEl("container");
  const header = new FakeEl("header");
  container.found[SEL.widgetHeaderSelector] = header;
  header.parentNode = container;
  sourcePanel.ownerDocument = doc;
  const icons = new FakeEl("icons");
  icons.appendChild = (el) => { calls.push(["appendIcon", el.className]); };
  const fakes = {
    selectors: SEL,
    focusOnly: { unmaximize: { className: "UNMAX", kind: "unmaximize" } },
    buildSettingsIcon: (_KDB, def) => ({ className: def.className, def }),
    markSelectedOption: rec("markSelectedOption"),
    shouldKeepDropdownsOpen: (panel, target, iconSelector) => { calls.push(["shouldKeep", "<" + (target && target.name) + ">", iconSelector]); return fakes.keep === true; },
    dropdownOption: (_KDB, panel, option, opts) => { calls.push(["intentOption", "<" + panel.name + ">", "<" + option.name + ">", opts]); },
    icon: (_KDB, panel, icon, opts) => { calls.push(["intentIcon", "<" + panel.name + ">", "<" + icon.name + ">", opts]); },
    keep: false
  };
  sourcePanel.found[SEL.settingsIconsSelector] = icons;
  const domQueries = {
    hidePanelDropdowns: rec("hidePanelDropdowns"),
    filterFocusPanelIcons: rec("filterFocusPanelIcons"),
    resolveCanvasSettingsPanel: () => sourcePanel,
    resolveExpandModeContainer: () => container
  };
  const install = { installDrillthrough: rec("installDrillthrough") };
  return { calls, doc, sourcePanel, container, header, fakes, domQueries, install };
}

// Adapter: the module specifiers panel.js is loaded with.
function loadPanel(h) {
  const modules = {
    "../drillthrough/install.js": h.install,
    "./domQueries.js": h.domQueries,
    "../../widgetSettings/selectors.js": {
      domSelectors: h.fakes.selectors,
      focusOnlyControls: h.fakes.focusOnly,
      buildSettingsIcon: h.fakes.buildSettingsIcon,
      dispatchDropdownOptionIntent: h.fakes.dropdownOption,
      dispatchIconIntent: h.fakes.icon,
      markSelectedOption: h.fakes.markSelectedOption,
      shouldKeepDropdownsOpen: h.fakes.shouldKeepDropdownsOpen
    }
  };
  return loadAmd(path.join(JS_ROOT, "dashboard/widgets/widgetVis/focus/panel.js"), { stubs: { console: QUIET, document: h.doc }, modules });
}

function activate(h, panel) {
  const runtime = { focusMode: { focusPanelEl: null, dispose: null, observedExpanded: false, source: null } };
  const result = panel.activateFocusModeChrome({}, "w1", runtime, { source: "test" });
  return { runtime, result, panelRoot: runtime.focusMode.focusPanelEl };
}

test("activate builds the focus panel from the source panel and binds pointer handlers", () => {
  const h = createHarness();
  const { result, panelRoot, runtime } = activate(h, loadPanel(h));
  assert.deepStrictEqual(result, { ok: true, diagnostics: { mounted: true, visible: true } });
  assert.ok(panelRoot.classList.contains("KDB_focusModeSettingsPanel"));
  assert.ok(panelRoot.classList.contains("VIS"));
  assert.equal(panelRoot.getAttribute("focus-root"), "w1");
  assert.equal(panelRoot.getAttribute("panel-root"), null);
  assert.equal(panelRoot.getAttribute("data-kdb-vis-type"), "line");
  assert.deepStrictEqual(h.header.parentNode === h.container, true);
  assert.equal(h.calls.filter((c) => c[0] === "appendIcon").length, 1);
  assert.deepStrictEqual(h.calls.find((c) => c[0] === "appendIcon"), ["appendIcon", "UNMAX"]);
  assert.deepStrictEqual(panelRoot.listeners.map((l) => [l.type, l.capture]), [["pointerdown", true]]);
  assert.deepStrictEqual(h.doc.listeners.map((l) => [l.type, l.capture]), [["pointerdown", true]]);
  assert.equal(typeof runtime.focusMode.dispose, "function");
});

test("pointerdown on a dropdown option marks it, dispatches the intent and hides the other dropdowns", () => {
  const h = createHarness();
  const { panelRoot } = activate(h, loadPanel(h));
  const dropdown = new FakeEl("dd", { attrs: { "kind-attr": "topN" } });
  const option = new FakeEl("opt", { matchers: { [SEL.dropdownOptionInDropdownSelector]: null, [SEL.dropdownSelector]: dropdown } });
  option.matchers[SEL.dropdownOptionInDropdownSelector] = option;
  panelRoot.children.push(option);
  const target = new FakeEl("t", { matchers: { [SEL.dropdownOptionInDropdownSelector]: option } });
  const ev = { target, preventDefault() { this.p = true; }, stopPropagation() { this.s = true; } };
  h.calls.length = 0;
  panelRoot.listeners[0].handler(ev);
  assert.equal(ev.p, true);
  assert.equal(ev.s, true);
  assert.deepStrictEqual(h.calls.map((c) => c[0]), ["markSelectedOption", "intentOption", "hidePanelDropdowns"]);
  assert.deepStrictEqual(h.calls[1], ["intentOption", "<source-clone>", "<opt>", { isHistoryReplay: false }]);
  option.attrs["kind-attr"] = "showValues";
  dropdown.attrs["kind-attr"] = "x";
  h.calls.length = 0;
  panelRoot.listeners[0].handler({ target, preventDefault() {}, stopPropagation() {} });
  assert.deepStrictEqual(h.calls.map((c) => c[0]), ["markSelectedOption", "intentOption"]);
});

test("pointerdown on an icon without a dropdown dispatches the icon intent; with a dropdown it toggles it", () => {
  const h = createHarness();
  const { panelRoot } = activate(h, loadPanel(h));
  const plainIcon = new FakeEl("icon1");
  panelRoot.children.push(plainIcon);
  const plainTarget = new FakeEl("t1", { matchers: { [SEL.focusPanelPointerIconSelector]: plainIcon } });
  h.calls.length = 0;
  panelRoot.listeners[0].handler({ target: plainTarget, preventDefault() {}, stopPropagation() {} });
  assert.deepStrictEqual(h.calls, [["intentIcon", "<source-clone>", "<icon1>", { isHistoryReplay: false }]]);

  const dd = new FakeEl("dd2");
  const dropIcon = new FakeEl("icon2", { found: { [SEL.dropdownSelector]: dd } });
  panelRoot.children.push(dropIcon);
  const dropTarget = new FakeEl("t2", { matchers: { [SEL.focusPanelPointerIconSelector]: dropIcon, [SEL.dropdownSelector]: null } });
  h.calls.length = 0;
  panelRoot.listeners[0].handler({ target: dropTarget, preventDefault() {}, stopPropagation() {} });
  assert.ok(dd.classList.contains("VIS"));
  assert.deepStrictEqual(h.calls.map((c) => c[0]), ["hidePanelDropdowns"]);
  h.calls.length = 0;
  panelRoot.listeners[0].handler({ target: dropTarget, preventDefault() {}, stopPropagation() {} });
  assert.ok(!dd.classList.contains("VIS"));
  assert.deepStrictEqual(h.calls, []);
  const inside = new FakeEl("t3", { matchers: { [SEL.focusPanelPointerIconSelector]: dropIcon, [SEL.dropdownSelector]: dd } });
  panelRoot.listeners[0].handler({ target: inside, preventDefault() {}, stopPropagation() {} });
  assert.ok(!dd.classList.contains("VIS"));
  const outside = new FakeEl("t4");
  h.calls.length = 0;
  panelRoot.listeners[0].handler({ target: outside, preventDefault() {}, stopPropagation() {} });
  assert.deepStrictEqual(h.calls, []);
});

test("document pointerdown hides the dropdowns unless the target stays inside a dropdown/owning icon", () => {
  const h = createHarness();
  const { panelRoot } = activate(h, loadPanel(h));
  const target = new FakeEl("outside");
  h.calls.length = 0;
  h.doc.listeners[0].handler({ target });
  assert.deepStrictEqual(h.calls, [["shouldKeep", "<outside>", SEL.focusPanelPointerIconSelector], ["hidePanelDropdowns", "<source-clone>"]]);
  h.fakes.keep = true;
  h.calls.length = 0;
  h.doc.listeners[0].handler({ target });
  assert.deepStrictEqual(h.calls, [["shouldKeep", "<outside>", SEL.focusPanelPointerIconSelector]]);
  assert.ok(panelRoot);
});

test("dispose removes the panel and unbinds both listeners; a second activate reuses a mounted panel", () => {
  const h = createHarness();
  const panel = loadPanel(h);
  const { runtime, panelRoot } = activate(h, panel);
  panelRoot.parentNode = h.container;
  const reuse = panel.activateFocusModeChrome({}, "w1", runtime, {});
  assert.deepStrictEqual(reuse, { ok: true, diagnostics: { reusedExistingPanel: true } });
  assert.equal(runtime.focusMode.focusPanelEl, panelRoot);
  const disposed = panel.disposeFocusModeChrome("w1", runtime);
  assert.deepStrictEqual(disposed, { ok: true, diagnostics: { disposedChrome: true } });
  assert.deepStrictEqual(panelRoot.listeners, []);
  assert.deepStrictEqual(h.doc.listeners, []);
  assert.equal(runtime.focusMode.focusPanelEl, null);
  assert.equal(runtime.focusMode.dispose, null);
  assert.equal(panel.disposeFocusModeChrome("w1", {}).diagnostics.skipped, "no_focus_bucket");
});

test("activate without a source panel or container fails like before", () => {
  const h = createHarness();
  h.domQueries.resolveCanvasSettingsPanel = () => null;
  const { result } = activate(h, loadPanel(h));
  assert.deepStrictEqual(result, { ok: false, errorCode: "WIDGET_VIS_FOCUS_PANEL_FAILED", diagnostics: { missingSourcePanel: true, missingContainer: false } });
});
