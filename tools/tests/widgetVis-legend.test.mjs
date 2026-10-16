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
  const text = load(W + "view/legend/legendCaptionText.js");
  const dom = load(W + "view/legend/legendCaptionDom.js");
  return {
    sanitizeLegendCaptionText: text.sanitizeLegendCaptionText,
    replaceTooltipInLegendTitle: text.replaceTooltipInLegendTitle,
    sanitizeLegendTitleLine: text.sanitizeLegendTitleLine,
    normalizeLegendHashCaption: load(W + "view/legend/normalizeLegendHashSegment.js"),
    collapseLegendCaptionDimParts: load(W + "view/legend/collapseLegendCaptionDimParts.js"),
    collectCaptionEntries: dom.collectCaptionEntries,
    mutationNeedsLegendSanitize: dom.mutationNeedsLegendSanitize,
    sanitizeLegendCaptionMutation: dom.sanitizeLegendCaptionMutation,
    runLegendSanitizers: load(W + "view/legend/runLegendSanitizers.js"),
    shouldApplyVisualizationProperties: load(W + "effects/shouldApplyVisualizationProperties.js"),
    applyPropertyMap: load(W + "effects/applyPropertyMap.js")
  };
}

function loadTitleBuilder(shellAttrs) {
  const shell = shellAttrs ? { getAttribute: (name) => (name in shellAttrs ? shellAttrs[name] : null) } : null;
  const stubs = { document: { getElementById: () => shell, querySelector: () => null }, ...QUIET };
  return load(W + "effects/buildVisualizationTitleText.js", { stubs }).buildVisualizationTitleText;
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
  load("core/config/__orchestratorConfig.js")(_KDB);
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
    [{ _KDB, widgetId: "w1", metric: { display: "Anzahl" }, settings: { dimension: "Jahr", topNChoice: "Top-3" }, derived: topN }, null, "Anzahl nach Jahr Top-3"],
    [{ _KDB, widgetId: "w1", metric: { display: "Anzahl" }, settings: { dimension: "Jahr", topNChoice: "Top-3" } }, null, "Anzahl nach Jahr"],
    [{ _KDB, widgetId: "w1", metric: { display: "Anzahl" }, settings: { dimension: "default", topNChoice: "Top-3" }, helperTableResult: topN }, null, "Anzahl"],
    [{ _KDB, widgetId: "w1", metric: {}, settings: { dimension: "Jahr" } }, { kdb_kennzahldisplay: " Bootstrap  Titel " }, "Bootstrap Titel nach Jahr"],
    [{ _KDB, widgetId: "w1", metric: {}, settings: {} }, { KDB_display: "Display" }, "Display"],
    [{ _KDB, widgetId: "w1", metric: {}, settings: {} }, null, ""],
    [{ _KDB: buildKdb({ getVisTitle: () => ({ ok: true, data: "Rendered nach Jahr Top-5" }) }), widgetId: "w1", metric: {},
      settings: { dimension: "Jahr", topNChoice: "top5" }, helperTableResult: topN }, null, "Rendered nach Jahr Top-5"],
    [{ _KDB: buildKdb({ getVisTitle: () => { throw new Error("x"); } }), widgetId: "w1", metric: {}, settings: {} }, null, ""],
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
