// Golden test for core/services/dashboardPdf (WS-D task D3). Drives the service through its stable entry
// (__orchestratorDashboardPdf.js) with a fake _KDB, fake jsPDF/html2canvas and a fake DOM.
// Run: node --test tools/tests/ws-d3-dashboard-pdf.test.mjs
// Re-record after an intended behaviour change: RECORD=1 node --test tools/tests/ws-d3-dashboard-pdf.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN_PATH = path.join(HERE, "ws-d3-dashboard-pdf.golden.json");
const PDF_ROOT = path.join(JS_ROOT, "core/services/dashboardPdf");
const ENTRY = path.join(PDF_ROOT, "__orchestratorDashboardPdf.js");
const LIBRARIES_ROOT = path.join(JS_ROOT, "core/libraries");
const realSetTimeout = globalThis.setTimeout;
const golden = process.env.RECORD ? {} : JSON.parse(fs.readFileSync(GOLDEN_PATH, "utf8"));
const recorded = {};

const quietConsole = { log() {}, info() {}, warn() {}, error() {} };

class FixedDate extends Date {
  constructor(...args) {
    super(...(args.length ? args : [2026, 9, 16, 12, 0, 0]));
  }
}

function plain(value) {
  return JSON.parse(JSON.stringify(value === undefined ? null : value));
}

function stripElapsed(value) {
  if (Array.isArray(value)) return value.map(stripElapsed);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value)) {
      if (key !== "elapsedMs") out[key] = stripElapsed(value[key]);
    }
    return out;
  }
  return value;
}

function expectGolden(name, actual) {
  const value = plain(stripElapsed(actual));
  if (process.env.RECORD) {
    recorded[name] = value;
    return;
  }
  assert.ok(Object.prototype.hasOwnProperty.call(golden, name), `no golden entry for ${name}`);
  assert.deepStrictEqual(value, golden[name]);
}

// ---- fake DOM -------------------------------------------------------------------------------------------
function makeStyle() {
  const style = {};
  Object.defineProperty(style, "setProperty", {
    enumerable: false,
    value(key, value, priority) { style[`--set:${key}`] = priority ? `${value} !${priority}` : value; }
  });
  Object.defineProperty(style, "removeProperty", {
    enumerable: false,
    value(key) { delete style[key]; }
  });
  return style;
}

function makeNode(tag, init = {}) {
  const node = {
    tag,
    id: init.id || "",
    attrs: { ...(init.attrs || {}) },
    style: makeStyle(),
    children: [],
    parentElement: null,
    parentNode: null,
    classNames: init.classes || [],
    classList: { contains: (name) => (init.classes || []).includes(name) },
    appendChild(child) {
      child.parentElement = node;
      child.parentNode = node;
      node.children.push(child);
      return child;
    },
    removeChild(child) {
      node.children = node.children.filter((entry) => entry !== child);
      child.parentNode = null;
      return child;
    },
    setAttribute(key, value) { node.attrs[key] = String(value); },
    getAttribute(key) { return Object.prototype.hasOwnProperty.call(node.attrs, key) ? node.attrs[key] : null; },
    closest(selector) {
      const matches = (candidate) => {
        if (selector === ".Legend") return candidate.classNames.includes("Legend");
        if (selector === "li") return candidate.tag === "li";
        if (selector === "[role=checkbox]") return candidate.attrs.role === "checkbox";
        return false;
      };
      for (let current = node; current; current = current.parentElement) {
        if (matches(current)) return current;
      }
      return null;
    },
    querySelector(selector) {
      if (selector === "use") return node.children.find((child) => child.tag === "use") || null;
      if (selector === ".kdb_hyperlink_icon") return init.hyperlinkIcon ? {} : null;
      return null;
    },
    getBoundingClientRect() { return init.box || { width: 12, height: 12 }; }
  };
  if (init.color !== undefined) node.style.color = init.color;
  if (init.computedColor !== undefined) node.computedColor = init.computedColor;
  (init.children || []).forEach((child) => node.appendChild(child));
  return node;
}

function serializeNode(node) {
  const style = {};
  Object.keys(node.style).forEach((key) => { style[key] = node.style[key]; });
  return { tag: node.tag, attrs: node.attrs, style, children: node.children.map(serializeNode) };
}

function makeLegendSvg(init) {
  const use = makeNode("use", { attrs: init.href ? { href: init.href } : {} });
  const svg = makeNode("svg", { id: init.id, classes: init.classes, color: init.color, computedColor: init.computedColor, box: init.box, children: init.noUse ? [] : [use] });
  const slot = makeNode("span", { attrs: { role: "checkbox", ...(init.shape ? { "data-shape": init.shape } : {}) }, children: [svg] });
  const item = makeNode("li", { children: [slot] });
  const legend = makeNode("div", { classes: ["Legend"], children: [item] });
  return { svg, slot, legend, item };
}

function makeCloneFixture() {
  const cases = [
    { name: "circleHex", shape: "circle", color: "#0a0" },
    { name: "rectRgb", href: "#square-shape", color: "rgb(1, 2, 3)" },
    { name: "fallbackComputed", href: "#triangle", color: "transparent", computedColor: "rgb(9, 9, 9)" },
    { name: "alphaRejected", shape: "circle", color: "rgba(1, 2, 3, 0.5)", computedColor: "transparent" },
    { name: "svgIconSkipped", shape: "circle", color: "#fff", classes: ["svgIcon"] },
    { name: "ellipsisSkipped", shape: "circle", color: "#fff", id: "x-ellipsis-y" },
    { name: "noUseSkipped", shape: "circle", color: "#fff", noUse: true },
    { name: "zeroSizeSkipped", shape: "circle", color: "#fff", box: { width: 0, height: 0 } }
  ];
  const parts = cases.map((init) => ({ name: init.name, ...makeLegendSvg(init) }));
  const hidden = {
    maximize: makeNode("button"),
    pkz: makeNode("button"),
    headerIconWithLink: makeNode("span", { hyperlinkIcon: true }),
    headerIconPlain: makeNode("span")
  };
  const root = {
    querySelectorAll(selector) {
      if (selector === ".kdb-widget-maximize") return [hidden.maximize];
      if (selector === ".kdb-datapoint-pkz") return [hidden.pkz];
      if (selector === ".widgetHeader .dataWidgetIcon") return [hidden.headerIconWithLink, hidden.headerIconPlain];
      if (selector === ".Legend .swatchListWrapper svg") return parts.map((entry) => entry.svg);
      return [];
    }
  };
  const clonedDocument = {
    defaultView: {
      getComputedStyle: (svg) => ({ color: svg.computedColor === undefined ? "" : svg.computedColor })
    },
    createElement: (tag) => makeNode(tag),
    createElementNS: (_ns, tag) => makeNode(tag)
  };
  const snapshot = () => ({
    hidden: Object.fromEntries(Object.entries(hidden).map(([key, node]) => [key, node.style.display || null])),
    legends: parts.map((entry) => ({ name: entry.name, legend: serializeNode(entry.legend), svgDetached: entry.svg.parentNode === null }))
  });
  return { root, clonedDocument, snapshot };
}

// ---- fake jsPDF / html2canvas ---------------------------------------------------------------------------
function makeJsPdf(calls) {
  return class FakeJsPdf {
    constructor(options) {
      calls.push(["new", options]);
      this.internal = { pageSize: { getWidth: () => 841.89, getHeight: () => 595.28 } };
    }
    getTextWidth(text) { return text.length * 6; }
    splitTextToSize(text, width) { return String(text).match(/.{1,60}/g) || [""]; }
    getImageProperties(data) { calls.push(["getImageProperties", data]); return { width: 1600, height: 900 }; }
    save(name) { calls.push(["save", name]); }
  };
}

function installDocMethods(FakeJsPdf, calls) {
  ["addPage", "setFont", "setFontSize", "setTextColor", "setFillColor", "rect", "text", "addImage"].forEach((method) => {
    FakeJsPdf.prototype[method] = function (...args) { calls.push([method, ...args]); };
  });
  return FakeJsPdf;
}

function makeHtml2canvas(ctx, behaviour = {}) {
  return function html2canvas(root, options) {
    ctx.calls.push(["html2canvas", root.name || "root", { scale: options.scale, useCORS: options.useCORS, logging: options.logging }]);
    ctx.calls.push(["ignoreElements", options.ignoreElements({ id: "kdb-control-root" }), options.ignoreElements({ id: "other" }), options.ignoreElements(null)]);
    const fixture = makeCloneFixture();
    options.onclone(fixture.clonedDocument, fixture.root);
    ctx.cloneSnapshots.push(fixture.snapshot());
    if (behaviour.onCall) behaviour.onCall(ctx);
    if (behaviour.throws) throw behaviour.throws;
    if (behaviour.never) return new Promise(() => {});
    if (behaviour.rejects) return Promise.reject(behaviour.rejects);
    const size = behaviour.size || { width: 1600, height: 900 };
    return Promise.resolve({
      width: size.width,
      height: size.height,
      toDataURL(type, quality) {
        if (behaviour.encodeThrows) throw behaviour.encodeThrows;
        return `data:${type};q=${quality};${root.name || "root"}`;
      }
    });
  };
}

function makeVendorModules(ctx, variant = {}) {
  const FakeJsPdf = installDocMethods(makeJsPdf(ctx.docCalls), ctx.docCalls);
  const html2canvas = makeHtml2canvas(ctx, variant.canvas);
  const jspdfModule = variant.jspdfModule === undefined ? { jsPDF: FakeJsPdf } : variant.jspdfModule;
  const html2canvasModule = variant.html2canvasModule === undefined ? html2canvas : variant.html2canvasModule;
  return new Proxy({}, {
    getOwnPropertyDescriptor(_target, key) {
      if (typeof key === "string" && /libraries\/(jspdf\.umd|html2canvas)\.min\.js$/.test(key)) {
        return { value: undefined, enumerable: true, configurable: true, writable: true };
      }
      return undefined;
    },
    get(_target, key) {
      if (typeof key !== "string") return undefined;
      ctx.vendorRequests.push(key);
      return /jspdf/.test(key) ? jspdfModule : html2canvasModule;
    }
  });
}

// ---- fake _KDB ------------------------------------------------------------------------------------------
function makeDocument(ctx) {
  const host = {
    classList: {
      add: (name) => ctx.calls.push(["host.addClass", name]),
      remove: (name) => ctx.calls.push(["host.removeClass", name])
    }
  };
  const mountEl = { name: "loadingMount" };
  ctx.mountEl = mountEl;
  const doc = {
    querySelector(selector) {
      if (selector === "#main") return host;
      if (selector === ".ba-common-container.ba-common-tabList__innerContainer") return mountEl;
      return null;
    },
    createElement(tag) {
      if (tag !== "textarea") return makeNode(tag);
      let value = "";
      return {
        set innerHTML(input) { value = String(input).replace(/&lt;/g, "<").replace(/&amp;/g, "&"); },
        get value() { return value; }
      };
    }
  };
  return doc;
}

function singleSelectInstances() {
  const selection = (displayValue, displaySource = "cognos") => ({ displayValue, displaySource });
  const base = { selectionOwner: "singleSelect", status: "active", hostStatus: "present" };
  return {
    a: { ...base, filterInstanceId: "a", filterLabel: "Jahr", scopeType: "global", currentSelection: selection("2024") },
    b: { ...base, filterInstanceId: "b", filterLabel: "Geschlecht", scopeType: "pageContext", scopeId: "scopeA_tabpanel", currentSelection: selection("weiblich") },
    c: { ...base, filterInstanceId: "c", filterLabel: "Berufsfamilie", scopeType: "pageContext", scopeId: "scopeB", currentSelection: selection("A &amp; B") },
    d: { ...base, filterInstanceId: "d", filterLabel: "Altersgruppe", scopeType: "pageContext", scopeId: "unknownScope", currentSelection: selection("30+") },
    e: { ...base, filterInstanceId: "e", filterLabel: "Dienstverhältnis", scopeType: "global", currentSelection: selection("Beamte", "bogus") },
    f: { ...base, filterInstanceId: "f", filterLabel: "Dienststelle", scopeType: "global", currentSelection: selection("skipped") },
    g: { ...base, filterInstanceId: "g", filterLabel: "Personengruppe", scopeType: "global", currentSelection: selection("") },
    h: { ...base, filterInstanceId: "h", filterLabel: "Dienststellenleitung", scopeType: "global", currentSelection: selection("Leitung X") },
    i: { ...base, filterInstanceId: "i", filterLabel: "Jahr", scopeType: "global", status: "removed", currentSelection: selection("1999") }
  };
}

function makeKdb(ctx) {
  const doc = makeDocument(ctx);
  ctx.document = doc;
  const facet = {
    getFileName: () => ({ ok: true, data: "Mein Dashboard" }),
    getDashboardVersion: () => ({ ok: true, data: "12.1.0" }),
    getEnvironmentSource: () => ({ ok: true, data: "https://cognos-test.example/ibmcognos" })
  };
  ctx.facet = facet;
  const state = { inventoryFresh: true };
  ctx.singleSelectState = state;
  const tabs = [
    { index: 0, tabId: "t0", pageId: "p0", name: "Tab A" },
    { index: 1, tabId: "t1", pageId: "p1", name: "" },
    { index: 2, tabId: "t2", pageId: "p2", name: "Tab C&amp;D" }
  ];
  const kdb = {
    services: {
      cognosHost: { dashboard: facet },
      loading: {
        startLoading: (opts) => { ctx.calls.push(["loading.start", { ...opts, mountEl: opts.mountEl && opts.mountEl.name }]); return { mountKey: opts.mountKey, mountEl: opts.mountEl }; },
        finishLoading: (opts) => ctx.calls.push(["loading.finish", opts.handle && opts.handle.mountKey]),
        updateLoadingMessage: (opts) => ctx.calls.push(["loading.update", opts.handle && opts.handle.mountKey, opts.message || null, opts.messageKey || null])
      }
    },
    elements: { selectors: { root: { dashboardClassHost: "#main", loadingIndicatorSelector: ".spin" } } },
    runtime: { core: { domRefs: { renderParentEl: { ownerDocument: doc } } } },
    config: {
      labels: {
        de: {
          loading: {
            pdfTitle: "Titelseite", pdfAttachment: "Anhang", pdfSave: "Speichern",
            pdfTabPrepare: "Tab {n}/{m} vorbereiten", pdfTabCapture: "Tab {n}/{m} erfassen"
          }
        }
      }
    },
    properties: {
      pdfAttachmentPageObj: {
        dataSteward: "Frau X", dataspotLink: "https://dataspot.example", environmentRegex: "cognos-(dev|test)\\\\.example",
        updateCycle: "taeglich", dataFreshness: "gestern", dataSource: "DWH", dataSourceLoading: "Nacht", additionalInfo: "Info"
      }
    },
    api: {
      header: { getState: () => ({ titleText: "Mein Dash", subtitleText: "" }) },
      tabs: {
        getState: () => ({ visibleTabs: tabs, activeIndex: 1, byIndex: { 1: { tabId: "t1" } }, traversal: ctx.traversal || {} }),
        dispatch: async (action) => {
          ctx.calls.push(["tabs.dispatch", action.type, action.payload.source || null, action.payload.tabIndex === undefined ? null : action.payload.tabIndex]);
          if (action.type === "tabs/resolveFilterScopeTargets") {
            return ctx.scopeTargets || { ok: true, tabTargets: { 0: { scopeId: "scopeA_tabpanel", tabId: "t0" }, 1: { scopeId: "scopeB", tabId: "t1" }, 2: { scopeId: "scopeC", tabId: "t2" } } };
          }
          if (ctx.onTraverse) return ctx.onTraverse(action);
          return true;
        }
      },
      widgetBase: {
        dispatch: async (action) => {
          ctx.calls.push(["widgetBase.dispatch", action.payload.tabId, action.payload.reason, action.payload.timeoutMs]);
          return ctx.onRender ? ctx.onRender(action) : { ok: true, failed: 0 };
        }
      },
      widgetVis: {
        getState: () => ctx.widgetVisState || { byId: { w1: { maximized: true }, w2: { maximized: false } } },
        dispatch: async (action) => {
          ctx.calls.push(["widgetVis.dispatch", action.widgetId, action.payload.nextMaximized]);
          return ctx.onMaximize ? ctx.onMaximize(action) : { ok: true };
        }
      },
      singleSelect: {
        getState: () => ({ inventory: { freshness: state.inventoryFresh ? "fresh" : "stale" }, instancesById: singleSelectInstances() }),
        dispatch: async (action) => {
          ctx.calls.push(["singleSelect.dispatch", action.type, action.payload.reason]);
          state.inventoryFresh = true;
          return { ok: true };
        }
      },
      sicht: { getState: () => ({ currentSelection: { displayValue: "Ist" } }) },
      dienststelle: {
        getState: () => ({
          activeFilterKey: "k",
          byFilter: {
            k: {
              currentSelectionByScope: {
                global: { currentValues: [{ displayValue: "Magistrat" }, { displayValue: "Magistrat" }] },
                pageContext: {
                  scopeA_tabpanel: { currentValues: [{ displayValue: "MA 05" }, { displayValue: null }] },
                  nowhere: { currentValues: [{ displayValue: "lost" }] }
                }
              }
            }
          }
        })
      },
      specialSingleSelect: { getState: () => ({ byFilterId: { x: { isVisible: true, filterLabel: "Dienststellenleitung" }, y: { isVisible: false, filterLabel: "Personengruppe" } } }) }
    },
    cognosAPI: {
      dashboard: {
        resolveCaptureRoot: ({ tabId, pageId }) => {
          ctx.calls.push(["resolveCaptureRoot", tabId, pageId]);
          if (ctx.noCaptureRoot) return null;
          return { name: `root-${tabId}`, querySelectorAll: (selector) => { ctx.calls.push(["root.querySelectorAll", selector]); return ctx.spinners ? [{}] : []; } };
        }
      }
    }
  };
  return kdb;
}

async function runScenario(name, { setup, options, stubs, vendor, dispose, twice, record = true } = {}) {
  const ctx = { calls: [], docCalls: [], cloneSnapshots: [], vendorRequests: [], progress: [] };
  const kdb = makeKdb(ctx);
  if (setup) setup(kdb, ctx);
  const modules = makeVendorModules(ctx, vendor);
  const register = loadAmd(ENTRY, {
    modules,
    stubs: { console: quietConsole, document: ctx.document, Date: FixedDate, ...(stubs || {}) }
  });
  const service = register(kdb);
  const exportOptions = { onProgress: (payload) => ctx.progress.push(payload), ...(typeof options === "function" ? options(ctx) : options || {}) };
  const first = service.exportDashboardPdf(exportOptions);
  if (dispose) await dispose(service, ctx);
  const result = await first;
  const out = { result, calls: ctx.calls, docCalls: ctx.docCalls, progress: ctx.progress, vendorRequests: ctx.vendorRequests.length, cloneSnapshot: ctx.cloneSnapshots[0] || null, cloneCount: ctx.cloneSnapshots.length };
  if (twice) {
    out.second = await service.exportDashboardPdf({});
    out.vendorRequestsAfterSecond = ctx.vendorRequests.length;
  }
  const rt = kdb.runtime.dashboardPdf;
  out.runtime = {
    facetStamped: rt.dashboardFacet === ctx.facet,
    activeRun: rt.activeRun,
    abortControllersActiveRun: rt.abortControllers.activeRun,
    pendingActiveRun: rt.pendingPromises.activeRun,
    vendorLoadCached: !!(rt.pendingPromises.vendorLoad && typeof rt.pendingPromises.vendorLoad.then === "function")
  };
  if (record) expectGolden(name, out);
  return { out, ctx, kdb, service };
}

// ---- tests ----------------------------------------------------------------------------------------------
test("registration surface", () => {
  const ctx = { calls: [] };
  const kdb = makeKdb(ctx);
  const register = loadAmd(ENTRY, { modules: makeVendorModules({ calls: [], docCalls: [], vendorRequests: [], cloneSnapshots: [] }), stubs: { console: quietConsole, document: ctx.document } });
  const service = register(kdb);
  assert.deepStrictEqual(Object.keys(service).sort(), ["destroy", "exportDashboardPdf"]);
  assert.strictEqual(register(kdb), service);
  assert.strictEqual(typeof kdb.elements.selectors.dashboardPdf.loadingMountSelector, "string");
  assert.strictEqual(kdb.runtime.dashboardPdf.dashboardFacet, ctx.facet);
  assert.strictEqual(kdb.runtime.dashboardPdf.activeRun, null);
  assert.strictEqual(kdb.runtime.dashboardPdf.abortControllers.activeRun, null);
  assert.strictEqual(kdb.runtime.dashboardPdf.pendingPromises.activeRun, null);
  service.destroy();
  assert.strictEqual(kdb.runtime.dashboardPdf.pendingPromises.vendorLoad, null);
});

test("export succeeds: full page sequence, attachment rows, progress, loading, chrome class", async () => {
  const { out } = await runScenario("success", { twice: true });
  assert.strictEqual(out.result.ok, true);
  assert.strictEqual(out.vendorRequests, 2);
  assert.strictEqual(out.vendorRequestsAfterSecond, 2, "vendor modules are requested once and cached");
});

test("vendor module paths resolve to the vendored libraries", async () => {
  const { ctx } = await runScenario("success-vendor-paths", {});
  const files = [];
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs);
    else if (entry.name.endsWith(".js")) files.push(abs);
  });
  walk(PDF_ROOT);
  const requesters = files.filter((file) => /libraries\/jspdf/.test(fs.readFileSync(file, "utf8")));
  assert.strictEqual(requesters.length, 1, "exactly one dashboardPdf file names the vendor libraries");
  assert.strictEqual(ctx.vendorRequests.length, 2);
  ctx.vendorRequests.forEach((spec) => {
    const resolved = path.resolve(path.dirname(requesters[0]), spec);
    assert.ok(resolved.startsWith(LIBRARIES_ROOT) && fs.existsSync(resolved), `${spec} must resolve to a file in core/libraries from ${requesters[0]}`);
  });
});

test("export without onProgress callback", async () => {
  const { out } = await runScenario("success-no-progress-callback", { options: { onProgress: undefined } });
  assert.strictEqual(out.result.ok, true);
});

test("vendor failures", async () => {
  await runScenario("vendor-missing-jspdf", { vendor: { jspdfModule: {} } });
  await runScenario("vendor-missing-html2canvas", { vendor: { html2canvasModule: {} } });
  await runScenario("vendor-default-export", { vendor: { jspdfModule: { default: { jsPDF: class { constructor() { throw new Error("unused"); } } } } } });
});

test("busy, aborted, disposed", async () => {
  await runScenario("aborted-before-start", { options: () => { const c = new AbortController(); c.abort(); return { signal: c.signal }; } });
  await runScenario("busy", {
    dispose: async (service) => {
      const second = await service.exportDashboardPdf({});
      expectGolden("busy-second-result", second);
    }
  });
  await runScenario("disposed-mid-export", { dispose: async (service) => { service.destroy(); } });
  const external = new AbortController();
  await runScenario("aborted-during-capture", {
    options: () => ({ signal: external.signal }),
    vendor: { canvas: { onCall: () => external.abort(), never: true } }
  });
});

test("preparation failures", async () => {
  await runScenario("file-name-unavailable", { setup: (kdb) => { kdb.services.cognosHost.dashboard.getFileName = () => ({ ok: false, reason: "no name" }); } });
  await runScenario("file-name-object", { setup: (kdb) => { kdb.services.cognosHost.dashboard.getFileName = () => ({ ok: true, data: { x: 1 } }); } });
  await runScenario("file-name-facet-missing", { setup: (kdb) => { kdb.services.cognosHost.dashboard = {}; } });
  await runScenario("manifest-unavailable", { setup: (kdb) => { kdb.api.tabs.getState = () => ({}); } });
  await runScenario("no-visible-tabs", { setup: (kdb) => { kdb.api.tabs.getState = () => ({ visibleTabs: [], activeIndex: null }); } });
  await runScenario("no-visible-tabs-restores-active-tab", { setup: (kdb) => { kdb.api.tabs.getState = () => ({ visibleTabs: [], activeIndex: 1, byIndex: { 1: { tabId: "t1" } } }); } });
  await runScenario("focus-exit-failed", { setup: (kdb) => { kdb.api.widgetVis.dispatch = async () => ({ ok: false, errorMessage: "cannot exit" }); } });
  await runScenario("focus-state-unavailable", { setup: (kdb) => { kdb.api.widgetVis.getState = () => undefined; } });
  await runScenario("focus-restore-failed", { setup: (_kdb, ctx) => { ctx.onMaximize = (action) => (action.payload.nextMaximized ? { ok: false, errorCode: "X_FAIL", errorMessage: "no restore" } : { ok: true }); } });
  await runScenario("filter-api-missing", { setup: (kdb) => { delete kdb.api.singleSelect; } });
  await runScenario("filter-inventory-stale", { setup: (_kdb, ctx) => { ctx.singleSelectState.inventoryFresh = false; } });
  await runScenario("filter-reconcile-failed", {
    setup: (kdb, ctx) => {
      ctx.singleSelectState.inventoryFresh = false;
      kdb.api.singleSelect.dispatch = async () => ({ ok: false });
    }
  });
  await runScenario("scope-targets-failed", { setup: (_kdb, ctx) => { ctx.scopeTargets = { ok: false, diagnostics: [{ message: "scope boom" }] }; } });
  await runScenario("scope-targets-api-missing", { setup: (kdb) => { delete kdb.api.tabs.dispatch; } });
  await runScenario("scope-multiple-tabs", {
    setup: (_kdb, ctx) => {
      ctx.scopeTargets = { ok: true, tabTargets: { 0: { scopeId: "dup_tabpanel", tabId: "t0" }, 1: { scopeId: "dup", tabId: "t1" } } };
    }
  });
  await runScenario("metadata-warnings", {
    setup: (kdb) => {
      kdb.properties.pdfAttachmentPageObj = { environmentRegex: "(" };
      kdb.services.cognosHost.dashboard.getDashboardVersion = () => ({ ok: false, diagnostics: [{ message: "no version" }] });
      kdb.services.cognosHost.dashboard.getEnvironmentSource = () => { throw new Error("env boom"); };
    }
  });
  await runScenario("environment-variants", {
    setup: (kdb) => { kdb.properties.pdfAttachmentPageObj.environmentRegex = "(nomatch)"; }
  });
  await runScenario("environment-prod", {
    setup: (kdb) => {
      kdb.properties.pdfAttachmentPageObj.environmentRegex = "(dev|test)?example";
      kdb.services.cognosHost.dashboard.getEnvironmentSource = () => ({ ok: true, data: "https://prod.example" });
    }
  });
});

test("tab capture failures", async () => {
  await runScenario("tab-gate-failed", {
    setup: (_kdb, ctx) => { ctx.onTraverse = () => false; ctx.traversal = { errorMessage: "gate down" }; }
  });
  await runScenario("tab-gate-timeout", {
    setup: (_kdb, ctx) => { ctx.onTraverse = () => false; ctx.traversal = { errorCode: "TABS_TRAVERSE_TIMEOUT" }; }
  });
  await runScenario("tab-render-failed", { setup: (_kdb, ctx) => { ctx.onRender = () => ({ ok: true, failed: 2 }); } });
  await runScenario("capture-root-missing", { setup: (_kdb, ctx) => { ctx.noCaptureRoot = true; } });
  await runScenario("capture-readiness-timeout", { setup: (_kdb, ctx) => { ctx.spinners = true; }, options: { timeoutMs: 250 } });
  await runScenario("capture-timeout", {
    vendor: { canvas: { never: true } },
    stubs: { setTimeout: (fn, ms) => realSetTimeout(fn, ms >= 60000 ? 0 : ms) }
  });
  await runScenario("capture-rejects", { vendor: { canvas: { rejects: new Error("canvas boom") } } });
  await runScenario("capture-rejects-plain", { vendor: { canvas: { rejects: "plain failure" } } });
  await runScenario("capture-throws-sync", { vendor: { canvas: { throws: new Error("sync boom") } } });
  await runScenario("capture-invalid-size", { vendor: { canvas: { size: { width: 0, height: 10 } } } });
  await runScenario("capture-encode-failed", { vendor: { canvas: { encodeThrows: new Error("encode boom") } } });
});

test("restore failures become warnings on a successful export", async () => {
  await runScenario("restore-traverse-failed", {
    setup: (_kdb, ctx) => { ctx.onTraverse = (action) => (action.payload.source === "dashboardPdfRestore" ? false : true); }
  });
  await runScenario("restore-render-failed", {
    setup: (_kdb, ctx) => { ctx.onRender = (action) => (action.payload.reason === "dashboardPdfRestore" ? { ok: false, failed: 1 } : { ok: true, failed: 0 }); }
  });
  await runScenario("restore-throws", {
    setup: (_kdb, ctx) => { ctx.onTraverse = (action) => { if (action.payload.source === "dashboardPdfRestore") throw new Error("restore boom"); return true; }; }
  });
});

test("save failure and loading/chrome degradation", async () => {
  await runScenario("save-failed", {
    vendor: { jspdfModule: { jsPDF: class { constructor() { this.internal = { pageSize: { getWidth: () => 800, getHeight: () => 600 } }; } addPage() {} setFont() {} setFontSize() {} setTextColor() {} setFillColor() {} rect() {} text() {} getTextWidth() { return 1; } splitTextToSize(t) { return [String(t)]; } getImageProperties() { return { width: 10, height: 10 }; } addImage() {} save() { throw new Error("disk full"); } } } }
  });
  await runScenario("no-loading-service", { setup: (kdb) => { delete kdb.services.loading; } });
  await runScenario("loading-start-null", { setup: (kdb) => { kdb.services.loading.startLoading = () => null; } });
  await runScenario("no-chrome-host", { setup: (kdb) => { kdb.elements.selectors.root.dashboardClassHost = ""; } });
  await runScenario("no-mount-element", { setup: (kdb) => { kdb.runtime.core.domRefs.renderParentEl = null; kdb.elements.selectors.dashboardPdf = { loadingMountSelector: "#none" }; } });
});

test("clone hooks: chrome hiding and legend swatch rewrite", async () => {
  const { out } = await runScenario("clone-hooks", {});
  assert.strictEqual(out.cloneCount, 3);
});

if (process.env.RECORD) {
  process.on("exit", () => {
    fs.writeFileSync(GOLDEN_PATH, `${JSON.stringify(recorded, null, 1)}\n`);
  });
}
