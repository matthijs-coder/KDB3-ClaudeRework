// Golden tests for widgetVis legend text rules, vis property gating and title building (WS-M W4).
// Run: node --test tools/tests/widgetVis-legend.test.mjs
// Only loadLegend() knows module paths; fixtures are the recorded outputs of the foundation code.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createHash } from "node:crypto";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const W = "dashboard/widgets/widgetVis/";
const load = (rel, options) => loadAmd(path.join(JS_ROOT, rel), options);
const QUIET = { console: { error() {}, warn() {}, log() {} } };

function loadLegend() {
  const text = load(W + "legend/captionText.js");
  const dom = load(W + "legend/captionDom.js");
  const sanitize = load(W + "legend/sanitize.js");
  const visProperties = load(W + "render/visProperties.js");
  return {
    sanitizeLegendCaptionText: text.sanitizeLegendCaptionText,
    replaceTooltipInLegendTitle: text.replaceTooltipInLegendTitle,
    sanitizeLegendTitleLine: text.sanitizeLegendTitleLine,
    normalizeLegendHashCaption: text.normalizeLegendHashCaption,
    collapseLegendCaptionDimParts: text.collapseLegendCaptionDimParts,
    collectCaptionEntries: dom.collectCaptionEntries,
    mutationNeedsLegendSanitize: dom.mutationNeedsLegendSanitize,
    sanitizeLegendCaptionMutation: sanitize.sanitizeLegendCaptionMutation,
    runLegendSanitizers: sanitize.runLegendSanitizers,
    shouldApplyVisualizationProperties: visProperties.shouldApplyVisualizationProperties,
    applyPropertyMap: visProperties.applyPropertyMap,
    isAbortedOutcome: visProperties.isAbortedOutcome
  };
}

function loadTitleBuilder(shellAttrs) {
  const shell = shellAttrs ? { getAttribute: (name) => (name in shellAttrs ? shellAttrs[name] : null) } : null;
  const stubs = { document: { getElementById: () => shell, querySelector: () => null }, ...QUIET };
  return load(W + "render/title.js", { stubs }).buildVisualizationTitleText;
}

const sha = (value) => createHash("sha256").update(JSON.stringify(value === undefined ? "<undefined>" : value)).digest("hex").slice(0, 16);

const CAPTIONS = [
  "Plain", "", null, "  spaced  ",
  "Müller|Alle # Alle gesamt", "Müller|Alle # Beendet x", "Müller|Beendet # Foo bar", "Müller | Alle # Alle gesamt", "Müller | Alle # Beendet foo", "Müller | Alle # x",
  "Müller | Beendet # Beendet", "Müller | Beendet # Foo bar", "abc # Foo bar", "abc #", "# abc",
  "Kennzahl | 2023 | Dst", "A | B | 2023 | Dst", "A | B | Dst | 2023", "A | B | C | 2024 | Dst",
  "A | B | C | D | 2023 | Dst", "A # x | B # y | 2023", "X | Alle # Alle gesamt | 2022 | Dienst"
];
const VIS_TYPES = ["Line", "List", "Prognose", "", undefined];

test("caption text rules: explicit cases", () => {
  const l = loadLegend();
  assert.deepEqual(l.sanitizeLegendCaptionText("A | B | 2023 | Dst", { visType: "Line" }), { text: "A | 2023 | Dst", changed: true });
  assert.deepEqual(l.sanitizeLegendCaptionText("A | B | 2023 | Dst", { visType: "List" }), { text: "A | B | 2023 | Dst", changed: false });
  assert.deepEqual(l.sanitizeLegendCaptionText("A | B | C | 2024 | Dst", { visType: "Prognose" }), { text: "A | C | 2024 | Dst", changed: true });
  assert.deepEqual(l.sanitizeLegendCaptionText("A | B | C | 2024 | Dst", { visType: "Line" }), { text: "A | B | C | 2024 | Dst", changed: false });
  assert.deepEqual(l.sanitizeLegendCaptionText(null), { text: "", changed: false });
  assert.equal(l.normalizeLegendHashCaption("Müller | Alle # Alle gesamt"), "Müller | Alle");
  assert.equal(l.normalizeLegendHashCaption("Müller|Alle # Alle gesamt"), "Müller(Alle)");
  assert.equal(l.normalizeLegendHashCaption("Müller|Alle # Beendet x"), "Müller(Beendet)");
  assert.equal(l.normalizeLegendHashCaption("Müller|Beendet # Foo bar"), "Foo(Beendet)");
  assert.equal(l.normalizeLegendHashCaption("abc # Foo bar"), "Foo");
  assert.equal(l.collapseLegendCaptionDimParts("A | B | 2023 | Dst", false), "A | 2023 | Dst");
  assert.equal(l.collapseLegendCaptionDimParts("A | B | C | 2024 | Dst", true), "A | C | 2024 | Dst");
  assert.equal(l.collapseLegendCaptionDimParts("A | B | C | 2024 | Dst", false), "A | B | C | 2024 | Dst");
  assert.equal(l.collapseLegendCaptionDimParts("Plain", true), "Plain");
  assert.deepEqual(l.replaceTooltipInLegendTitle("Foo tooltip bar", "Dienststelle"), { text: "Foo Dienststelle bar", changed: true });
  assert.deepEqual(l.replaceTooltipInLegendTitle("Foo tooltip bar", "default"), { text: "Foo tooltip bar", changed: false });
  assert.deepEqual(l.replaceTooltipInLegendTitle(null, "x"), { text: "", changed: false });
  assert.deepEqual(l.sanitizeLegendTitleLine("Kennzahl-Tooltip-2023", "Dienststelle"), { text: "Kennzahl-Dienststelle", changed: true });
  assert.deepEqual(l.sanitizeLegendTitleLine("A-Jahr-B", "default"), { text: "A-B", changed: true });
  assert.deepEqual(l.sanitizeLegendTitleLine("X-Dienststelle", "dienststelle"), { text: "X-Dienststelle", changed: false });
});

test("caption text rules: recorded tables", () => {
  const l = loadLegend();
  const sanitize = [];
  for (const caption of CAPTIONS) for (const visType of VIS_TYPES) {
    sanitize.push(l.sanitizeLegendCaptionText(caption, visType === undefined ? {} : { visType }));
  }
  const tooltip = [];
  const line = [];
  for (const title of ["Tooltip", "Foo tooltip bar", "", null, "none", "Kennzahl-Tooltip-2023", "A-Jahr-B", "X-Y-Z", "Dienststelle-2020"]) {
    for (const dimension of ["Dienststelle", "default", "", null, " Jahr ", "x"]) {
      tooltip.push(l.replaceTooltipInLegendTitle(title, dimension));
      line.push(l.sanitizeLegendTitleLine(title, dimension));
    }
  }
  assert.deepEqual(
    {
      sanitize: sha(sanitize),
      hash: sha(CAPTIONS.map((c) => l.normalizeLegendHashCaption(c))),
      collapse: sha(CAPTIONS.flatMap((c) => [false, true].map((tail) => l.collapseLegendCaptionDimParts(c, tail)))),
      tooltip: sha(tooltip),
      line: sha(line)
    },
    RECORDED.captions
  );
});

function fakeElement(tag, o = {}) {
  return {
    nodeType: 1,
    nodeName: tag.toUpperCase(),
    tagName: tag.toUpperCase(),
    classList: { contains: (name) => (o.classes || []).includes(name) },
    getAttribute: (name) => (o.attrs && name in o.attrs ? o.attrs[name] : null),
    matches: (selector) => (o.matches || []).some((m) => selector.includes(m)),
    querySelector: (selector) => ((o.queryHits || []).some((hit) => selector.includes(hit)) ? {} : null),
    querySelectorAll: (selector) => {
      o.queried = (o.queried || []).concat(selector);
      return (o.lists && o.lists[selector]) || [];
    },
    parentElement: o.parent || null,
    textContent: o.text || "",
    queriedSelectors: () => o.queried || []
  };
}

function captionHost(text) {
  const host = fakeElement("span", { classes: ["legendCaption"], attrs: { "data-visual-item": "widget.legend.labels" } });
  const node = { nodeType: 3, nodeName: "#text", nodeValue: text, parentElement: host };
  return { host, node };
}

test("mutationNeedsLegendSanitize decides per mutation type", () => {
  const l = loadLegend();
  const { host, node } = captionHost("x");
  const plain = fakeElement("div");
  const svg = fakeElement("svg", { queryHits: [".Legend"] });
  const withLegend = fakeElement("div", { queryHits: [".Legend"] });
  const legendRoot = fakeElement("div", { matches: [".Legend"] });
  const cases = [
    [{ type: "characterData", target: node }, true],
    [{ type: "characterData", target: { parentElement: plain } }, false],
    [{ type: "characterData", target: {} }, false],
    [{ type: "childList", target: host, addedNodes: [], removedNodes: [] }, true],
    [{ type: "childList", target: legendRoot, addedNodes: [], removedNodes: [] }, true],
    [{ type: "childList", target: plain, addedNodes: [svg], removedNodes: [] }, false],
    [{ type: "childList", target: plain, addedNodes: [withLegend], removedNodes: [] }, true],
    [{ type: "childList", target: plain, addedNodes: [], removedNodes: [withLegend] }, true],
    [{ type: "childList", target: plain, addedNodes: [plain], removedNodes: [] }, false],
    [{ type: "attributes", attributeName: "id", target: host }, true],
    [{ type: "attributes", attributeName: "id", target: fakeElement("div", { queryHits: ["legendCaption"] }) }, true],
    [{ type: "attributes", attributeName: "class", target: host }, false],
    [{ type: "other" }, false],
    [null, false]
  ];
  cases.forEach(([mutation, expected], index) => {
    assert.equal(l.mutationNeedsLegendSanitize(mutation), expected, "case " + index);
  });
});

test("sanitizeLegendCaptionMutation rewrites caption text nodes", () => {
  const l = loadLegend();
  const { host, node } = captionHost("Müller | Alle # Alle gesamt | 2022 | Dienst");
  assert.equal(l.sanitizeLegendCaptionMutation({ type: "characterData", target: node }, { visType: "Line" }), true);
  assert.equal(node.nodeValue, "Müller | 2022 | Dienst");
  assert.equal(l.sanitizeLegendCaptionMutation({ type: "characterData", target: node }, { visType: "Line" }), false);

  const added = { nodeName: "#text", nodeValue: "A | B | 2023 | Dst" };
  assert.equal(l.sanitizeLegendCaptionMutation({ type: "childList", target: host, addedNodes: [added] }, { visType: "Line" }), true);
  assert.equal(added.nodeValue, "A | 2023 | Dst");

  const caption = fakeElement("span", { text: "A | B | 2023 | Dst" });
  const target = fakeElement("g", { queryHits: ["legendCaption"] });
  target.querySelector = () => caption;
  assert.equal(l.sanitizeLegendCaptionMutation({ type: "attributes", attributeName: "id", target }, { visType: "Line" }), true);
  assert.equal(caption.textContent, "A | 2023 | Dst");
  assert.equal(l.sanitizeLegendCaptionMutation({ type: "attributes", attributeName: "class", target }, {}), false);
  assert.equal(l.sanitizeLegendCaptionMutation(null, {}), false);
});

test("collectCaptionEntries picks selectors by root kind and de-duplicates", () => {
  const l = loadLegend();
  const first = fakeElement("span");
  const second = fakeElement("span");
  const legendRoot = fakeElement("div", {
    matches: [".Legend"],
    lists: { ".legendCaption": [first, second], '[data-visual-item="widget.legend.labels"]': [second] }
  });
  const entries = l.collectCaptionEntries(legendRoot);
  assert.deepEqual(entries.map((entry) => entry.source), ["legendCaption", "legendCaption"]);
  assert.deepEqual(legendRoot.queriedSelectors(), [".legendCaption", '[data-visual-item="widget.legend.labels"]']);

  const hostRoot = fakeElement("span", { classes: ["legendCaption"] });
  const hostEntries = l.collectCaptionEntries(hostRoot);
  assert.deepEqual(hostEntries.map((entry) => [entry.selector, entry.source]), [[":scope", "captionHostRoot"]]);
  assert.deepEqual(hostRoot.queriedSelectors().length, 2);
  assert.deepEqual(l.collectCaptionEntries(null), []);
  assert.deepEqual(l.collectCaptionEntries({}), []);
});

test("runLegendSanitizers handles titles and captions per root kind", () => {
  const l = loadLegend();
  const makeTitle = (text) => {
    const classes = new Set(["KDB_visible"]);
    return { textContent: text, classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), has: (c) => classes.has(c) }, classes };
  };
  const emptied = makeTitle("Tooltip");
  const renamed = makeTitle("Kennzahl-Tooltip");
  const caption = fakeElement("span", { text: "A | B | 2023 | Dst" });
  const content = fakeElement("div", {
    matches: ["[data-kdb-widget-content]"],
    lists: {
      ".Legend .lgd-title, .legend .lgd-title": [emptied, renamed],
      ".Legend .legendCaption, .legend .legendCaption": [caption]
    }
  });
  const diagnostics = l.runLegendSanitizers(content, { visType: "Line", dimension: "default" }, { fromObserver: false });
  assert.deepEqual(
    { scanned: diagnostics.scanned, hidden: diagnostics.hidden, shown: diagnostics.shown, titlesChanged: diagnostics.titlesChanged,
      captionsScanned: diagnostics.captionsScanned, captionsChanged: diagnostics.captionsChanged, isCaptionsOnly: diagnostics.isCaptionsOnly },
    { scanned: 2, hidden: 1, shown: 1, titlesChanged: 2, captionsScanned: 1, captionsChanged: 1, isCaptionsOnly: false }
  );
  assert.equal(emptied.textContent, "");
  assert.equal(emptied.classes.has("KDB_visible"), false);
  assert.equal(renamed.textContent, "Kennzahl");
  assert.equal(renamed.classes.has("KDB_visible"), true);
  assert.equal(caption.textContent, "A | 2023 | Dst");

  const shell = fakeElement("div", { lists: { ".Legend .legendCaption, .legend .legendCaption": [fakeElement("span", { text: "Plain" })] } });
  const shellDiagnostics = l.runLegendSanitizers(shell, { visType: "Line" }, { fromObserver: false });
  assert.equal(shellDiagnostics.isCaptionsOnly, true);
  assert.equal(shellDiagnostics.scanned, 0);
  assert.equal(shellDiagnostics.captionsScanned, 1);
  assert.deepEqual(l.runLegendSanitizers(null, {}, {}).skipped, "no_query_root");
});

test("shouldApplyVisualizationProperties", () => {
  const { shouldApplyVisualizationProperties: should } = loadLegend();
  const cleanup = { reason: "cleanup", forceEmpty: true, mode: "cleanup" };
  const cases = [
    [cleanup, {}, "Line", {}, false],
    [cleanup, {}, "Line", { force: true }, true],
    [cleanup, {}, "Line", { phase: "postRender" }, true],
    [{ reason: "visType" }, { lastAppliedVisPropertiesType: "Line" }, "Line", {}, true],
    [{ reason: "startup" }, { lastAppliedVisPropertiesType: "Line" }, "Line", {}, true],
    [{ reason: "contentCreate" }, { lastAppliedVisPropertiesType: "Line" }, "Line", {}, true],
    [{ reason: "showValues" }, { lastAppliedVisPropertiesType: "Line" }, "Line", {}, true],
    [{ reason: "dimension" }, { lastAppliedVisPropertiesType: "Line" }, "Line", {}, false],
    [{ reason: "dimension" }, { lastAppliedVisPropertiesType: "Pie" }, "Line", {}, true],
    [{ reason: "dimension" }, {}, "Line", {}, true],
    [{ reason: "dimension" }, null, "Line", null, true],
    [null, { lastAppliedVisPropertiesType: "Line" }, "Line", undefined, false],
    [undefined, undefined, "Line", undefined, true]
  ];
  cases.forEach(([input, runtime, visType, options, expected], index) => {
    assert.equal(should(input, runtime, visType, options), expected, "case " + index);
  });
});

test("applyPropertyMap treats aborted outcomes as abort and collects failures", async () => {
  const { applyPropertyMap } = loadLegend();
  const abortedOutcomes = [
    { outcome: "aborted" }, { aborted: true }, { reason: "aborted" }, { reason: "aborted-after-effect" }, { reason: "disposed" }
  ];
  for (const outcome of abortedOutcomes) {
    const diagnostics = {};
    const result = await applyPropertyMap(async () => outcome, "w1", { a: 1 }, diagnostics, "group", null);
    assert.deepEqual(result, { ok: false, aborted: true });
    assert.deepEqual(diagnostics, {});
  }
  const diagnostics = { appliedKeys: ["pre"], failed: [] };
  const outcomes = { ok1: { ok: true }, bad: { ok: false, errorCode: "E_BAD" }, none: null, throws: "throw", ok2: { ok: true } };
  const seen = [];
  const result = await applyPropertyMap(
    async (id, key, value, options) => {
      seen.push([id, key, value, options.signal]);
      if (outcomes[key] === "throw") { throw new Error("boom"); }
      return outcomes[key];
    },
    "w1", { ok1: 1, bad: 2, none: 3, throws: 4, ok2: 5 }, diagnostics, "layoutPropertyValues", "SIGNAL"
  );
  assert.deepEqual(result, { ok: false, aborted: false });
  assert.deepEqual(diagnostics.appliedKeys, ["pre", "layoutPropertyValues:ok1", "layoutPropertyValues:ok2"]);
  assert.deepEqual(diagnostics.failed, [
    { group: "layoutPropertyValues", key: "bad", errorMessage: "E_BAD" },
    { group: "layoutPropertyValues", key: "none", errorMessage: "setContentProperty failed" },
    { group: "layoutPropertyValues", key: "throws", errorMessage: "boom" }
  ]);
  assert.equal(seen.length, 5);
  assert.deepEqual(seen[0], ["w1", "ok1", 1, "SIGNAL"]);
  assert.deepEqual(await applyPropertyMap(async () => ({ ok: true }), "w", null, {}, "g", null), { ok: true, aborted: false });
});

function buildKdb(facet, metricsTree) {
  const _KDB = { config: { options: {} }, api: metricsTree ? { metricsTree } : {}, properties: {}, runtime: { widgetVis: facet ? { visualizationFacet: facet } : {} } };
  load("core/config/registerConfig.js")(_KDB);
  return _KDB;
}

test("buildVisualizationTitleText", () => {
  const _KDB = buildKdb();
  const topN = { topNResultValues: ["a"] };
  const cases = [
    [{ _KDB, widgetId: "w1", metric: { display: "Anzahl MA" }, settings: {} }, null, "Anzahl MA"],
    [{ _KDB, widgetId: "w1", metric: { code: "K1" }, settings: { dimension: "Jahr" } }, null, "K1 nach Jahr"],
    [{ _KDB, widgetId: "w1", metric: { display: "Anzahl MA nach Jahr" }, settings: { dimension: "Jahr" } }, null, "Anzahl MA nach Jahr"],
    [{ _KDB, widgetId: "w1", metric: { display: "Anzahl" }, settings: { dimension: "Jahr", topNChoice: "top10" }, helperTableResult: topN }, null, "Anzahl nach Jahr Top-10"],
    [{ _KDB, widgetId: "w1", metric: { display: "Anzahl" }, settings: { dimension: "Jahr", topNChoice: "bottom-5" }, helperTableResult: topN }, null, "Anzahl nach Jahr Letzte-5"],
    [{ _KDB, widgetId: "w1", metric: { display: "Anzahl" }, settings: { dimension: "Jahr", topNChoice: "Top-3" }, derived: topN }, null, "Anzahl nach Jahr Top-3"],
    [{ _KDB, widgetId: "w1", metric: { display: "Anzahl" }, settings: { dimension: "Jahr", topNChoice: "Top-3" } }, null, "Anzahl nach Jahr"],
    [{ _KDB, widgetId: "w1", metric: { display: "Anzahl" }, settings: { dimension: "default", topNChoice: "Top-3" }, helperTableResult: topN }, null, "Anzahl"],
    [{ _KDB, widgetId: "w1", metric: {}, settings: { dimension: "Jahr" } }, { kdb_kennzahldisplay: " Bootstrap  Titel " }, "Bootstrap Titel nach Jahr"],
    [{ _KDB, widgetId: "w1", metric: {}, settings: {} }, { KDB_display: "Display" }, "Display"],
    [{ _KDB, widgetId: "w1", metric: {}, settings: {} }, null, ""],
    [{ _KDB: buildKdb({ getVisTitle: () => ({ ok: true, data: "Rendered nach Jahr Top-5" }) }), widgetId: "w1", metric: {},
      settings: { dimension: "Jahr", topNChoice: "top5" }, helperTableResult: topN }, null, "Rendered nach Jahr Top-5"],
    [{ _KDB: buildKdb({ getVisTitle: () => ({ ok: false }) }), widgetId: "w1", metric: {}, settings: {} }, null, ""],
    [undefined, null, ""]
  ];
  cases.forEach(([options, shellAttrs, expected], index) => {
    assert.equal(loadTitleBuilder(shellAttrs)(options), expected, "case " + index);
  });
  const withAggregation = loadTitleBuilder(null)({ _KDB, widgetId: "w1", metric: { code: "P_A_MOA_01", display: "Anzahl" }, settings: { visType: "Line", grouping: "jahr" } });
  assert.equal(sha(withAggregation), RECORDED.aggregationTitle);
  assert.match(withAggregation, /^Anzahl/);
});

const RECORDED = {
  captions: { sanitize: "1413401f6fddd0ac", hash: "ff5d627dc1d6137b", collapse: "67d833004a5f6024", tooltip: "a1296d12d5f3c4e4", line: "c1f8d8e4a50f4efb" },
  aggregationTitle: "080da46c84acca90"
};

test("shouldApplyVisualizationProperties skips on mode cleanup alone", () => {
  const { shouldApplyVisualizationProperties: should } = loadLegend();
  assert.equal(should({ mode: "cleanup" }, {}, "Line", {}), false);
  assert.equal(should({ mode: "cleanup", reason: "visType" }, {}, "Line", {}), false);
  assert.equal(should({ mode: "cleanup" }, {}, "Line", { force: true }), true);
});

test("isAbortedOutcome", () => {
  const { isAbortedOutcome } = loadLegend();
  const aborted = [{ outcome: "aborted" }, { aborted: true }, { reason: "aborted" }, { reason: "aborted-after-effect" }, { reason: "disposed" }];
  aborted.forEach((outcome) => assert.equal(isAbortedOutcome(outcome), true));
  [null, undefined, {}, { ok: true }, { reason: "timeout" }, { outcome: "failed" }].forEach((outcome) => assert.equal(isAbortedOutcome(outcome), false));
});

function createFrameHarness() {
  const frames = new Map();
  let nextId = 1;
  const cancelled = [];
  const observers = [];
  class FakeMutationObserver {
    constructor(callback) {
      this.callback = callback;
      this.disconnected = false;
      this.takeRecordsCalls = 0;
      observers.push(this);
    }
    observe(root, options) { this.root = root; this.options = options; }
    disconnect() { this.disconnected = true; }
    takeRecords() { this.takeRecordsCalls += 1; return []; }
  }
  const stubs = {
    requestAnimationFrame: (callback) => { const id = nextId++; frames.set(id, callback); return id; },
    cancelAnimationFrame: (id) => { cancelled.push(id); frames.delete(id); },
    MutationObserver: FakeMutationObserver,
    ...QUIET
  };
  const runFrames = () => {
    const pending = [...frames.entries()];
    frames.clear();
    pending.forEach(([, callback]) => callback(0));
  };
  return { stubs, frames, cancelled, observers, runFrames };
}

function createLegendRuntime() {
  return { observers: {}, timers: {}, domRefs: {} };
}

test("legend observer sanitizes one animation frame later and coalesces bursts", () => {
  const harness = createFrameHarness();
  const { installLegendTextObserver, disconnectLegendTextObserver } = load(W + "legend/observer.js", { stubs: harness.stubs });
  const runtime = createLegendRuntime();
  const { host, node } = captionHost("A | B | 2023 | Dst");
  const log = installLegendTextObserver(fakeElement("div"), {
    runtime, widgetId: "w1", opSeq: 1, visType: "Line", isStaleOpSeq: () => false
  });
  assert.equal(log.action, "installed");
  assert.equal(harness.observers.length, 1);
  assert.deepEqual(harness.observers[0].options, {
    attributes: true, attributeFilter: ["id"], characterData: true, characterDataOldValue: true, childList: true, subtree: true
  });
  assert.equal(runtime.observers.legendText, harness.observers[0]);

  const observer = harness.observers[0];
  observer.callback([{ type: "characterData", target: node }]);
  observer.callback([{ type: "characterData", target: node }, { type: "characterData", target: { parentElement: fakeElement("div") } }]);
  assert.equal(node.nodeValue, "A | B | 2023 | Dst");
  assert.equal(harness.frames.size, 1);
  assert.equal(runtime.timers.legendTextFrame.kind, "raf");
  assert.equal(runtime.legendPendingRecords.length, 2);

  harness.runFrames();
  assert.equal(node.nodeValue, "A | 2023 | Dst");
  assert.equal(observer.takeRecordsCalls, 1);
  assert.deepEqual(runtime.legendPendingRecords, []);
  assert.equal(runtime.timers.legendTextFrame, undefined);

  observer.callback([{ type: "attributes", attributeName: "class", target: host }]);
  assert.equal(harness.frames.size, 0);

  observer.callback([{ type: "characterData", target: node }]);
  assert.equal(harness.frames.size, 1);
  assert.deepEqual(disconnectLegendTextObserver(runtime), { disconnected: true });
  assert.equal(observer.disconnected, true);
  assert.equal(harness.frames.size, 0);
  assert.equal(harness.cancelled.length, 1);
  assert.deepEqual(runtime.legendPendingRecords, []);
  assert.equal(runtime.observers.legendText, undefined);
  assert.deepEqual(disconnectLegendTextObserver(runtime), { disconnected: false });
  assert.deepEqual(disconnectLegendTextObserver(null), { disconnected: false });
});

test("legend observer disconnects instead of sanitizing when the op is stale at flush", () => {
  const harness = createFrameHarness();
  const { installLegendTextObserver } = load(W + "legend/observer.js", { stubs: harness.stubs });
  const runtime = createLegendRuntime();
  const { node } = captionHost("A | B | 2023 | Dst");
  let stale = false;
  installLegendTextObserver(fakeElement("div"), { runtime, widgetId: "w1", opSeq: 4, visType: "Line", isStaleOpSeq: () => stale });
  const observer = harness.observers[0];
  observer.callback([{ type: "characterData", target: node }]);
  stale = true;
  harness.runFrames();
  assert.equal(node.nodeValue, "A | B | 2023 | Dst");
  assert.equal(observer.disconnected, true);
  assert.equal(runtime.observers.legendText, undefined);
});

test("legend observer install skips for cleanup mode, stale op, missing root and replaces the previous observer", () => {
  const harness = createFrameHarness();
  const { installLegendTextObserver } = load(W + "legend/observer.js", { stubs: harness.stubs });
  const runtime = createLegendRuntime();
  const root = fakeElement("div");
  assert.equal(installLegendTextObserver(root, { runtime, widgetId: "w1", opSeq: 1, mode: "cleanup" }).reason, "cleanup");
  assert.equal(installLegendTextObserver(root, { runtime, widgetId: "w1", opSeq: 1, reason: "cleanup", forceEmpty: true }).action, "installed");
  assert.equal(installLegendTextObserver(root, { runtime, widgetId: "w1", opSeq: 1, isStaleOpSeq: () => true }).reason, "stale_op_seq");
  assert.equal(installLegendTextObserver(null, { runtime, widgetId: "w1", opSeq: 1, skipReason: "no_content" }).reason, "no_content");
  assert.equal(installLegendTextObserver(root, { widgetId: "w1", opSeq: 1 }).reason, "no_query_root");
  assert.equal(harness.observers.length, 1);
  const second = installLegendTextObserver(root, { runtime, widgetId: "w1", opSeq: 2, isShell: true });
  assert.equal(second.previousObserverDisconnected, true);
  assert.equal(second.observeRoot, "shell");
  assert.equal(harness.observers[0].disconnected, true);
  assert.equal(runtime.observers.legendText, harness.observers[1]);
});

function createShellStubs(contentEl) {
  const shell = { querySelector: () => contentEl };
  return {
    document: { getElementById: (id) => (id === "w1" ? shell : null), querySelector: () => null },
    ...QUIET
  };
}

test("sweepLegendCaptions sanitizes, installs the observer and records dom refs", () => {
  const harness = createFrameHarness();
  const caption = fakeElement("span", { text: "A | B | 2023 | Dst" });
  const content = fakeElement("div", {
    matches: ["[data-kdb-widget-content]"],
    lists: { ".Legend .legendCaption, .legend .legendCaption": [caption] }
  });
  const stubs = { ...harness.stubs, ...createShellStubs(content) };
  const sweep = load(W + "legend/sweep.js", { stubs });
  const runtime = createLegendRuntime();
  const result = sweep.sweepLegendCaptions(runtime, "w1", { widgetId: "w1", opSeq: 1, visType: "Line", runtime, isStaleOpSeq: () => false });
  assert.equal(caption.textContent, "A | 2023 | Dst");
  assert.equal(result.captionsChanged, 1);
  assert.equal(result.observer.action, "installed");
  assert.equal(runtime.domRefs.contentEl, content);
  assert.equal(harness.observers.length, 1);

  assert.deepEqual(sweep.sweepLegendCaptions(runtime, "missing", { runtime }), { skipped: "no_query_root", observer: { action: "skipped", reason: "no_query_root" } });
  assert.equal(sweep.installLegendObserverBeforeApply(runtime, "w1", { opSeq: 2, mode: "cleanup" }).reason, "cleanup");
  assert.equal(harness.observers.length, 1);
  assert.equal(sweep.installLegendObserverBeforeApply(runtime, "w1", { opSeq: 2, visType: "Line", dimension: "Jahr" }).action, "installed");
  assert.equal(harness.observers.length, 2);
  assert.equal(harness.observers[0].disconnected, true);
  assert.deepEqual(sweep.installLegendObserverBeforeApply(runtime, "missing", {}), { action: "skipped", reason: "no_query_root" });
  assert.deepEqual(sweep.disconnectLegendTextObserver(runtime), { disconnected: true });
});

function loadPostRender(overrides) {
  const calls = [];
  const record = (name, result) => (...args) => { calls.push([name, ...args]); return typeof result === "function" ? result(...args) : result; };
  const modules = {
    "../legend/sweep.js": {
      sweepLegendCaptions: record("sweep", () => ({ action: "swept" })),
      disconnectLegendTextObserver: record("disconnectLegend", { disconnected: true })
    },
    "../drillthrough/install.js": {
      installDrillthrough: record("drillthrough", { ok: true }),
      cleanupDrillthroughDecorations: record("cleanupDrillthrough")
    },
    "../focus/focusMode.js": {
      exitNativeFocus: record("exitFocus"),
      disposeFocusMode: record("disposeFocus", { ok: true, diagnostics: { focus: true } })
    },
    "../focus/maximizeIcon.js": {
      installCanvasMaximize: record("maximize", { ok: true }),
      cleanupCanvasMaximize: record("cleanupMaximize")
    },
    ...(overrides || {})
  };
  const stubs = { document: { getElementById: () => null, querySelector: () => null }, ...QUIET };
  return { postRender: load(W + "render/postRender.js", { stubs, modules }), calls };
}

function buildPostRenderKdb() {
  return { state: { widgets: { vis: { byId: { w1: { derived: { code: "K1" } } } } } }, runtime: { widgetVis: { byId: {} } } };
}

test("applyPostRenderCleanup runs title, legend, tooltip, drillthrough and maximize in order", () => {
  const { postRender, calls } = loadPostRender();
  const root = fakeElement("div", { lists: { "[data-kdb-pipe-parts]": [] } });
  const result = postRender.applyPostRenderCleanup({
    _KDB: buildPostRenderKdb(),
    widgetId: "w1",
    opSeq: 3,
    input: { metric: { display: "Anzahl" }, settings: { dimension: "Jahr", visType: "Line" }, mode: "x" },
    plan: { reason: "dimension" },
    runtime: { domRefs: { contentEl: root, titleLinkEl: { textContent: "" } } },
    isStaleOpSeq: () => false
  });
  assert.equal(result.ok, true);
  assert.equal(result.titleText, "Anzahl nach Jahr");
  assert.deepEqual(calls.map((call) => call[0]), ["sweep", "drillthrough", "maximize"]);
  assert.deepEqual(calls[0].slice(2, 3), ["w1"]);
  assert.deepEqual(
    { reason: calls[0][3].reason, mode: calls[0][3].mode, dimension: calls[0][3].dimension, visType: calls[0][3].visType, opSeq: calls[0][3].opSeq },
    { reason: "dimension", mode: "x", dimension: "Jahr", visType: "Line", opSeq: 3 }
  );
  assert.deepEqual(Object.keys(result.diagnostics), ["title", "legend", "tooltip", "drillthrough", "maximize", "stale"]);
  assert.deepEqual(result.diagnostics.tooltip, { scanned: 0, annotated: 0 });
  assert.deepEqual(result.diagnostics.legend, { action: "swept" });
});

test("applyPostRenderCleanup reports stale ops and keeps ok when a decoration step throws", () => {
  const stale = loadPostRender();
  const staleResult = stale.postRender.applyPostRenderCleanup({ _KDB: {}, widgetId: "w1", opSeq: 1, isStaleOpSeq: () => true });
  assert.deepEqual(staleResult, {
    ok: false, stale: true, titleText: "",
    diagnostics: { title: null, legend: null, tooltip: null, drillthrough: null, maximize: null, stale: true }
  });
  assert.deepEqual(stale.calls, []);

  const failing = loadPostRender({
    "../drillthrough/install.js": { installDrillthrough() { throw new Error("dom"); }, cleanupDrillthroughDecorations() {} }
  });
  const result = failing.postRender.applyPostRenderCleanup({
    _KDB: buildPostRenderKdb(), widgetId: "w1", opSeq: 1, input: { metric: { display: "X" } }, runtime: {}, isStaleOpSeq: () => false
  });
  assert.equal(result.ok, true);
  assert.equal(result.titleText, "X");
  assert.equal(result.diagnostics.decorationError, "dom");
  assert.deepEqual(failing.calls.map((call) => call[0]), ["sweep"]);
});

test("cleanupVisualizationContent resets runtime fields and converts failures", () => {
  const { postRender, calls } = loadPostRender();
  const runtime = {
    lastSuccessfulPlan: { x: 1 },
    lastAppliedVisPropertiesType: "Line",
    domRefs: { contentEl: fakeElement("div"), headerEl: {}, titleLinkEl: { textContent: "T" } }
  };
  const result = postRender.cleanupVisualizationContent({}, { widgetId: "w1", opSeq: 2, runtime, payload: { clearDrillthrough: true, clearDomDecorations: false } });
  assert.equal(result.ok, true);
  assert.deepEqual(calls.map((call) => call[0]), ["exitFocus", "disposeFocus", "disconnectLegend", "cleanupMaximize", "cleanupDrillthrough"]);
  assert.equal(runtime.lastSuccessfulPlan, null);
  assert.equal(runtime.lastAppliedVisPropertiesType, null);
  assert.deepEqual(runtime.domRefs, { contentEl: null, headerEl: null, titleLinkEl: null });
  assert.deepEqual(result.diagnostics.runtimeReset, { lastSuccessfulPlan: true, lastAppliedVisPropertiesType: true, domRefsCleared: true });
  assert.deepEqual(result.diagnostics.focusMode, { focus: true });

  const stale = postRender.cleanupVisualizationContent({}, { widgetId: "w1", opSeq: 2, runtime, isStaleOpSeq: () => true });
  assert.equal(stale.stale, true);
  assert.equal(stale.ok, false);

  const failing = loadPostRender({
    "../focus/maximizeIcon.js": { installCanvasMaximize() {}, cleanupCanvasMaximize() { throw new Error("boom"); } }
  });
  const failed = failing.postRender.cleanupVisualizationContent({}, { widgetId: "w1", opSeq: 2, runtime: {} });
  assert.equal(failed.ok, false);
  assert.equal(failed.errorCode, "WIDGET_VIS_CLEANUP_FAILED");
  assert.equal(failed.errorMessage, "boom");
});

test("cleanupVisualizationContent clears dom decorations when requested", () => {
  const { postRender } = loadPostRender();
  const marked = { removeAttribute: (name) => { marked.removed = name; } };
  const title = { classList: { contains: () => true, remove: (name) => { title.removedClass = name; } } };
  const queryRoot = fakeElement("div", {
    lists: { "[data-kdb-pipe-parts]": [marked], ".Legend .lgd-title, .legend .lgd-title": [title] }
  });
  const runtime = { domRefs: { contentEl: queryRoot, titleLinkEl: { textContent: "T" } } };
  const result = postRender.cleanupVisualizationContent({}, { widgetId: "w1", opSeq: 1, runtime, payload: { clearDomDecorations: true } });
  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics.tooltip, { removed: 1 });
  assert.deepEqual(result.diagnostics.legend, { kdbVisibleReverted: 1 });
  assert.deepEqual(result.diagnostics.titleLink, { cleared: true, unwrapped: false, titleAttrRemoved: false });
  assert.equal(marked.removed, "data-kdb-pipe-parts");
  assert.equal(title.removedClass, "KDB_visible");
});

test("applyPrognoseSeriesSegmentIndexes writes segment indexes only for prognose plans", async () => {
  const { postRender } = loadPostRender();
  const writes = [];
  const facet = { setContentProperty: async (id, key, value) => { writes.push([id, key, value]); return { ok: true }; } };
  const _KDB = { runtime: { widgetVis: { visualizationFacet: facet } } };
  const plan = (visType, columnIds) => ({ visualization: { visType }, slots: [{ slotName: "x", columnIds: ["no"] }, { slotName: "series", columnIds }] });
  const columns = ["[a]", "[Personal_KDB_TM1].[Stichtag].[Stichtag].[Stichtag]", "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]"];
  assert.deepEqual(await postRender.applyPrognoseSeriesSegmentIndexes(_KDB, plan("Prognose", columns), "w1", null, {}), { ok: true, aborted: false });
  assert.deepEqual(writes, [["w1", "series.year.segmentIndex", 2], ["w1", "series.prognose.segmentIndex", 1]]);
  writes.length = 0;
  const skipped = { ok: true, skipped: true };
  assert.deepEqual(await postRender.applyPrognoseSeriesSegmentIndexes(_KDB, plan("Line", columns), "w1", null, {}), skipped);
  assert.deepEqual(await postRender.applyPrognoseSeriesSegmentIndexes(_KDB, plan("Prognose", ["[a]"]), "w1", null, {}), skipped);
  assert.deepEqual(await postRender.applyPrognoseSeriesSegmentIndexes(_KDB, { slots: [] }, "w1", null, { visType: "prognose" }), skipped);
  assert.deepEqual(await postRender.applyPrognoseSeriesSegmentIndexes(_KDB, plan("Prognose", columns), "", null, {}), skipped);
  assert.deepEqual(await postRender.applyPrognoseSeriesSegmentIndexes({}, plan("Prognose", columns), "w1", null, {}), skipped);
  assert.deepEqual(await postRender.applyPrognoseSeriesSegmentIndexes(_KDB, plan("Prognose", columns), "w1", { aborted: true }, {}), skipped);
  assert.deepEqual(writes, []);
  const controller = new AbortController();
  const abortingFacet = { setContentProperty: async () => { controller.abort(); return { ok: true }; } };
  const aborted = await postRender.applyPrognoseSeriesSegmentIndexes(
    { runtime: { widgetVis: { visualizationFacet: abortingFacet } } }, plan("Prognose", columns), "w1", controller.signal, {}
  );
  assert.deepEqual(aborted, { ok: true, skipped: true, aborted: true });
});

function loadDisplayOptions() {
  return load(W + "render/displayOptions.js", { stubs: QUIET });
}

function buildDisplayContext(facet, withRecord = true) {
  return {
    _KDB: { runtime: { widgetVis: facet ? { visualizationFacet: facet } : {} }, config: { options: {} } },
    selectors: { readVisRecord: () => (withRecord ? { derived: {} } : undefined) }
  };
}

function recordingFacet(failKey) {
  const writes = [];
  return {
    writes,
    setContentProperty: async (id, key, value) => {
      writes.push([id, key, value]);
      if (key === failKey) { return { ok: false, errorCode: "E_WRITE" }; }
      return { ok: true };
    }
  };
}

test("handleApplyShowValues envelopes", async () => {
  const { handleApplyShowValues } = loadDisplayOptions();
  const action = (payload) => ({ widgetId: "w1", opSeq: 7, payload });
  const base = { nextValue: true, previousValue: false, settingsSnapshot: { visType: "Line" } };
  const facet = recordingFacet();
  const ok = await handleApplyShowValues(buildDisplayContext(facet), action(base));
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.reportToSettings, { control: "showValues", previousValue: false, nextValue: true });
  assert.deepEqual(facet.writes.map((write) => write[1]), ["valueLabels.visible", "labels.visible", "contrast.label.color", "valueLabels.color"]);

  const list = await handleApplyShowValues(buildDisplayContext(recordingFacet()), action({ ...base, settingsSnapshot: { visType: "List" } }));
  assert.equal(list.skipped, true);
  assert.equal(list.reason, "list");

  const missingRecord = await handleApplyShowValues(buildDisplayContext(facet, false), action(base));
  assert.equal(missingRecord.errorCode, "WIDGET_VIS_CONTENT_CONTEXT_MISSING");
  assert.equal(missingRecord.ok, false);
  const badValue = await handleApplyShowValues(buildDisplayContext(facet), action({ ...base, nextValue: "yes" }));
  assert.equal(badValue.errorCode, "WIDGET_VIS_SETTINGS_SNAPSHOT_INCOMPLETE");
  const noVisType = await handleApplyShowValues(buildDisplayContext(facet), action({ ...base, settingsSnapshot: {} }));
  assert.equal(noVisType.errorCode, "WIDGET_VIS_SETTINGS_SNAPSHOT_INCOMPLETE");
  const noFacet = await handleApplyShowValues(buildDisplayContext(null), action(base));
  assert.equal(noFacet.errorCode, "WIDGET_VIS_FACET_MISSING");
  const writeFailed = await handleApplyShowValues(buildDisplayContext(recordingFacet("labels.visible")), action(base));
  assert.equal(writeFailed.errorCode, "E_WRITE");
  const throwing = { setContentProperty: async () => { throw new Error("boom"); } };
  const thrown = await handleApplyShowValues(buildDisplayContext(throwing), action(base));
  assert.deepEqual([thrown.ok, thrown.errorCode, thrown.status, thrown.widgetId, thrown.opSeq], [false, "WIDGET_VIS_FACET_MISSING", "error", "w1", 7]);
});

test("handleApplyIteratorZoom envelopes", async () => {
  const { handleApplyIteratorZoom } = loadDisplayOptions();
  const action = (payload) => ({ widgetId: "w1", opSeq: 9, payload });
  const base = { control: "zoom", nextValue: true, previousValue: false, settingsSnapshot: { visType: "Line" } };
  const facet = recordingFacet();
  const ok = await handleApplyIteratorZoom(buildDisplayContext(facet), action(base));
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.reportToSettings, { control: "zoom", previousValue: false, nextValue: true });
  assert.deepEqual(facet.writes, [["w1", "zoom.bar.enable", true]]);

  const noHost = await handleApplyIteratorZoom(buildDisplayContext(facet), action({ ...base, settingsSnapshot: { visType: "Pie" } }));
  assert.equal(noHost.skipped, true);
  assert.equal(noHost.reportToSettings, undefined);
  const listOn = await handleApplyIteratorZoom(buildDisplayContext(facet), action({ ...base, settingsSnapshot: { visType: "List" } }));
  assert.equal(listOn.skipped, true);
  assert.equal(listOn.reason, "list");
  const listOff = await handleApplyIteratorZoom(buildDisplayContext(facet), action({ ...base, nextValue: false, settingsSnapshot: { visType: "List" } }));
  assert.equal(listOff.skipped, false);
  assert.deepEqual(listOff.reportToSettings, { control: "zoom", previousValue: false, nextValue: false });

  for (const control of ["bogus", undefined, "constructor"]) {
    const result = await handleApplyIteratorZoom(buildDisplayContext(facet), action({ ...base, control }));
    assert.equal(result.errorCode, "WIDGET_VIS_SETTINGS_SNAPSHOT_INCOMPLETE");
  }
  assert.equal((await handleApplyIteratorZoom(buildDisplayContext(facet, false), action(base))).errorCode, "WIDGET_VIS_CONTENT_CONTEXT_MISSING");
  assert.equal((await handleApplyIteratorZoom(buildDisplayContext(null), action(base))).errorCode, "WIDGET_VIS_FACET_MISSING");
  assert.equal((await handleApplyIteratorZoom(buildDisplayContext(recordingFacet("zoom.bar.enable")), action(base))).errorCode, "E_WRITE");
});

test("applyPreRenderTitle maps facet outcomes", async () => {
  const { applyPreRenderTitle } = load(W + "render/title.js", { stubs: { document: { getElementById: () => null, querySelector: () => null }, ...QUIET } });
  const kdb = (setVisTitle) => ({ config: { options: {} }, api: {}, runtime: { widgetVis: setVisTitle ? { visualizationFacet: { setVisTitle } } : {} } });
  const options = (setVisTitle) => ({ _KDB: kdb(setVisTitle), widgetId: "w1", metric: { display: "Anzahl" }, settings: {}, signal: "SIG" });
  let seen;
  assert.deepEqual(await applyPreRenderTitle(options(async (id, text, opts) => { seen = [id, text, opts.signal]; return { ok: true }; })), { updated: true, titleText: "Anzahl" });
  assert.deepEqual(seen, ["w1", "Anzahl", "SIG"]);
  assert.deepEqual(await applyPreRenderTitle(options(async () => ({ reason: "disposed" }))), { updated: false, aborted: true });
  assert.deepEqual(await applyPreRenderTitle(options(async () => ({ ok: false }))), { updated: false });
  assert.deepEqual(await applyPreRenderTitle(options(null)), { updated: false });
  assert.deepEqual(await applyPreRenderTitle({ _KDB: kdb(async () => ({ ok: true })), widgetId: "w1", metric: {}, settings: {} }), { updated: false });
  assert.deepEqual(await applyPreRenderTitle(options(async () => { throw new Error("nope"); })), { updated: false, error: "nope" });
});

test("applyVisualizationProperties maps the phases and records the applied vis type", async () => {
  const { applyVisualizationProperties } = load(W + "render/visProperties.js", { stubs: QUIET });
  const _KDB = { config: { options: {} }, api: {}, properties: {} };
  load("core/config/registerConfig.js")(_KDB);
  const writes = [];
  const facet = {
    getVisType: async () => ({ ok: true, data: "other" }),
    setVisType: async (id, type) => { writes.push(["type", id, type]); return { ok: true }; },
    setContentProperty: async (id, key, value) => { writes.push([id, key, value]); return { ok: true }; }
  };
  _KDB.runtime = { widgetVis: { visualizationFacet: facet } };
  const runtime = {};
  const result = await applyVisualizationProperties(_KDB, { widgetId: "w1", visualizationType: "Line", runtime, input: { reason: "visType" } });
  assert.equal(result.ok, true);
  assert.equal(runtime.lastAppliedVisPropertiesType, "Line");
  assert.equal(writes[0][0], "type");
  const preKeys = writes.map((write) => write[1]);
  assert.equal(preKeys.includes("titleMode"), true);

  writes.length = 0;
  const post = await applyVisualizationProperties(_KDB, { widgetId: "w1", visualizationType: "Line", runtime, input: {}, phase: "postRender" });
  assert.equal(post.ok, true);
  assert.equal(writes.map((write) => write[1]).includes("titleMode"), false);

  writes.length = 0;
  const unchanged = await applyVisualizationProperties(_KDB, { widgetId: "w1", visualizationType: "Line", runtime, input: { reason: "dimension" } });
  assert.deepEqual([unchanged.ok, unchanged.skipped, unchanged.diagnostics.skipReason], [true, true, "visTypeUnchanged"]);
  const cleanup = await applyVisualizationProperties(_KDB, { widgetId: "w1", visualizationType: "Line", runtime: {}, input: { mode: "cleanup" } });
  assert.deepEqual([cleanup.ok, cleanup.skipped], [true, true]);
  assert.deepEqual(writes, []);

  const noWidget = await applyVisualizationProperties(_KDB, { visualizationType: "Line" });
  assert.deepEqual([noWidget.ok, noWidget.skipped, noWidget.diagnostics.blockers], [false, true, ["widgetId"]]);
  const noFacet = await applyVisualizationProperties({ runtime: {}, config: _KDB.config }, { widgetId: "w1", visualizationType: "Line", input: {} });
  assert.deepEqual(noFacet.diagnostics.blockers, ["cognosHost.visualization"]);
  const controller = new AbortController();
  controller.abort();
  const aborted = await applyVisualizationProperties(_KDB, { widgetId: "w1", visualizationType: "Line", runtime: {}, input: {}, signal: controller.signal });
  assert.deepEqual([aborted.ok, aborted.aborted], [false, true]);
  _KDB.runtime.widgetVis.visualizationFacet = { ...facet, getVisType: async () => { throw new Error("host"); } };
  const thrown = await applyVisualizationProperties(_KDB, { widgetId: "w1", visualizationType: "Line", runtime: {}, input: {} });
  assert.equal(thrown.ok, false);
  assert.deepEqual(thrown.diagnostics.failed, [{ group: "ensureVisType", key: null, errorMessage: "host" }]);
});
