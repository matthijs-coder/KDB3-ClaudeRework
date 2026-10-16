// Golden tests for dashboard/filters/filterDock (pure logic). Run: node --test tools/tests/filterDock.test.mjs
// Fixture: tools/tests/fixtures/filterDock.golden.json, generated from the pre-refactor code (commit "golden tests").
// Regenerate (only after an intentional behaviour change): UPDATE_GOLDEN=1 node tools/tests/filterDock.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const FD = path.join(JS_ROOT, "dashboard/filters/filterDock");
const GOLDEN_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/filterDock.golden.json");
const UPDATE = process.env.UPDATE_GOLDEN === "1";
const golden = UPDATE || !fs.existsSync(GOLDEN_PATH) ? {} : JSON.parse(fs.readFileSync(GOLDEN_PATH, "utf8"));
const FixedDate = { now: () => 5000 };

const plain = (value) => JSON.parse(JSON.stringify(value === undefined ? null : value));
const load = (rel, opts) => loadAmd(path.join(FD, rel), opts);

function check(name, value) {
  const actual = plain(value);
  if (UPDATE) {
    golden[name] = actual;
    return;
  }
  assert.ok(Object.prototype.hasOwnProperty.call(golden, name), `golden entry missing: ${name}`);
  assert.deepStrictEqual(actual, golden[name], name);
}

process.on("exit", () => {
  if (UPDATE) {
    fs.mkdirSync(path.dirname(GOLDEN_PATH), { recursive: true });
    fs.writeFileSync(GOLDEN_PATH, JSON.stringify(golden, null, 2) + "\n");
  }
});

// ---- module adapters ----
const stubs = { Date: FixedDate };
const mutationSummary = load("observation/mutationSummary.js", { stubs });
const popupReadySession = load("observation/popupReadySession.js");
const filterDockState = load("state.js", { stubs });
const identity = load("identity.js");
const ownerRoutes = load("ownerRoutes.js");
const ownerRouter = load("ownerRouter.js");
const popupReadyHandoff = load("observation/popupReadyHandoff.js", { stubs });
const clickInteraction = load("interaction/clickInteraction.js");

const api = {
  summarizeMutations: (records) => mutationSummary.summarizeMutations(records),
  mergeSummaries(summaries, scheduledAt) {
    const pending = mutationSummary.createPendingSummary(summaries[0], scheduledAt);
    summaries.slice(1).forEach((summary) => mutationSummary.mergePendingSummary(pending, summary));
    return pending;
  },
  isOwnedTarget: (node) => mutationSummary.isKdbOwnedMutationTarget(node),
  session: {
    shouldDispatch: (runtime, popup, lastClicked) => popupReadySession.shouldDispatchPopupReadyTransition(runtime, popup, lastClicked),
    decide: (runtime, popup, lastClicked, summary, gap) =>
      popupReadySession.decidePostReadyResync(popupReadySession.ensurePopupReadyState(runtime), popup, lastClicked, summary, () => gap),
    resetOnClick: (runtime, interaction) => popupReadySession.resetSessionOnSingleSelectClick(runtime, interaction),
    resetState: (runtime) => popupReadySession.resetPopupReadyState(runtime),
    isPopupReady: (popup) => popupReadySession.isPopupReady(popup)
  },
  reduce: (state, action) => filterDockState.reduceFilterDockState(state, action),
  readCapabilities: (config) => identity.readFilterCapabilities(config),
  toHandoffCapabilities: (caps) => identity.toHandoffCapabilities(caps),
  resolveFilterType: (caps) => identity.resolveFilterType(caps),
  ownerRouteMap: ownerRoutes.OWNER_ROUTE_MAP,
  buildOwnerPayload: (handoff, filterType) => ownerRouter.buildOwnerPayload(handoff, ownerRoutes.OWNER_ROUTE_MAP[filterType]),
  buildPopupReadyHandoff: (lastClicked, lastInteraction, popup) => popupReadyHandoff.buildPopupReadyHandoff(lastClicked, lastInteraction, popup),
  buildHandoff: (input) => clickInteraction.buildHandoff(input),
  buildClickResolution: (handoff, filterEl, observedAt) => clickInteraction.buildClickResolution(handoff, filterEl, observedAt)
};

// ---- fixtures ----
function fakeEl(spec) {
  const attrs = spec.attrs || {};
  return {
    nodeType: spec.nodeType === undefined ? 1 : spec.nodeType,
    tagName: spec.tag || "DIV",
    id: spec.id || "",
    className: spec.className === undefined ? "" : spec.className,
    parentElement: spec.parent || null,
    getAttribute: (name) => (Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null)
  };
}

const ownedWrapper = fakeEl({ className: "wa-filterItem KDB_singleSelectFilter" });
const dienstWrapper = fakeEl({ className: "KDB_dienststelle_active" });
const notOwnedWrapper = fakeEl({ className: "KDB_dienststelleX other" });
const notOwnedOption = fakeEl({ className: "KDB_selectedOptionX" });
const plainRoot = fakeEl({ className: "root" });

const MUTATION_CASES = {
  undefinedInput: undefined,
  emptyArray: [],
  childListEmptyNodes: [{ type: "childList", addedNodes: [], removedNodes: [], target: plainRoot }],
  childListNodes: [
    {
      type: "childList",
      addedNodes: [fakeEl({ tag: "SPAN", id: "a", className: "one two three four", attrs: { "data-tid": "x" } })],
      removedNodes: [fakeEl({ tag: "LI" }), fakeEl({ tag: "P", className: "gone" })],
      target: plainRoot
    }
  ],
  childListTextNode: [{ type: "childList", addedNodes: [fakeEl({ nodeType: 3 })], removedNodes: [], target: plainRoot }],
  attributeOwnedBySingleSelect: [{ type: "attributes", target: fakeEl({ className: "inner", parent: ownedWrapper }) }],
  attributeOwnedByDienststelle: [{ type: "attributes", target: fakeEl({ tag: "B", parent: dienstWrapper }) }],
  attributeNotOwnedDienststelleSuffix: [{ type: "attributes", target: fakeEl({ className: "x", parent: notOwnedWrapper }) }],
  attributeNotOwnedSelectedOptionSuffix: [{ type: "attributes", target: fakeEl({ className: "y", parent: notOwnedOption }) }],
  attributeSvgClassName: [{ type: "attributes", target: fakeEl({ tag: "svg", className: { baseVal: "icon" } }) }],
  mixedWithNullRecord: [
    null,
    { type: "attributes", target: fakeEl({ className: "is-selected", parent: ownedWrapper }) },
    { type: "attributes", target: fakeEl({ id: "plain", className: "bx--btn", parent: plainRoot }) },
    { type: "childList", addedNodes: [fakeEl({ tag: "DIV", className: "wa-filterDock-filterItemText" })], removedNodes: [] },
    { type: "characterData", target: plainRoot }
  ]
};

test("summarizeMutations matches golden", () => {
  Object.keys(MUTATION_CASES).forEach((name) => check("summarize." + name, api.summarizeMutations(MUTATION_CASES[name])));
  check("summarize.all", api.summarizeMutations([].concat(...Object.values(MUTATION_CASES).filter(Array.isArray))));
});

test("mergePendingSummary matches golden", () => {
  const summaries = ["childListNodes", "attributeOwnedBySingleSelect", "attributeNotOwnedDienststelleSuffix", "mixedWithNullRecord"].map((name) =>
    api.summarizeMutations(MUTATION_CASES[name])
  );
  check("merge.sequence4", api.mergeSummaries(summaries, 1234));
  check("merge.single", api.mergeSummaries([summaries[0]], 99));
  check("merge.noSignatureOverwrite", api.mergeSummaries([summaries[0], summaries[1]], 7));
});

test("KDB-owned class classifier matches golden", () => {
  const classes = [
    "", "KDB_selectedOption", "KDB_selectedOptionX", "a KDB_selectedOption b", "KDB_singleSelectFilter", "KDB_singleSelect",
    "KDB_singleSelectFooter", "KDB_sichtSingleSelect", "KDB_dienststelle", "KDB_dienststelleX", "KDB_dienststelle_active",
    "KDB_dienststelleActive_BW", "KDB_dienststelleActive_DEZPV", "KDB_dienststelle_popupLabelsReady", "KDB_dienststelleActive_BWX",
    "xKDB_dienststelle", "KDB_cascadingFilter", "KDB_hierarchyFilter", "KDB_hideAlleOption", "is-selected"
  ];
  check("owned.classes", classes.map((className) => api.isOwnedTarget(fakeEl({ className }))));
  check("owned.ancestor", api.isOwnedTarget(fakeEl({ className: "child", parent: ownedWrapper })));
  check("owned.nonStringClassName", api.isOwnedTarget(fakeEl({ className: { baseVal: "KDB_singleSelectFilter" } })));
  check("owned.nonElement", [api.isOwnedTarget(null), api.isOwnedTarget(fakeEl({ nodeType: 3 }))]);
});

const popupReady = (key, extra) =>
  Object.assign({ isVisible: true, activeFilterId: key, activeFilterType: "singleSelect", hasOptions: true, optionCount: 3, hasOkButton: true, hasCancelButton: true, observedAt: 1 }, extra);
const lastA = { filterId: "tab1__A", filterKey: "pageContext__A", filterLabel: "A", filterType: "singleSelect" };
const lastB = { filterId: "tab1__B", filterKey: "pageContext__B", filterLabel: "B", filterType: "sicht" };
const lastD = { filterId: "global__D", filterKey: "global__D", filterLabel: "D", filterType: "dienststelle" };
const summaryOf = (name) => api.summarizeMutations(MUTATION_CASES[name]);

test("popup ready session decisions match golden", () => {
  const runtime = {};
  const steps = [
    ["shouldDispatch", popupReady("tab1__A", { isVisible: false }), lastA],
    ["shouldDispatch", popupReady("tab1__A"), lastA],
    ["shouldDispatch", popupReady("tab1__A"), lastA],
    ["decide", popupReady("tab1__A"), lastA, null, false],
    ["decide", popupReady("tab1__A"), lastA, summaryOf("attributeOwnedBySingleSelect"), false],
    ["decide", popupReady("tab1__A"), lastA, summaryOf("attributeOwnedBySingleSelect"), true],
    ["decide", popupReady("tab1__A"), lastA, summaryOf("attributeNotOwnedDienststelleSuffix"), false],
    ["decide", popupReady("tab1__A"), lastA, summaryOf("attributeNotOwnedDienststelleSuffix"), false],
    ["resetOnClick", { filterType: "singleSelect", interactionType: "option" }],
    ["resetOnClick", { filterType: "singleSelect", interactionType: "open" }],
    ["decide", popupReady("tab1__A"), lastA, summaryOf("childListNodes"), false],
    ["shouldDispatch", popupReady("tab1__A"), lastA],
    ["decide", popupReady("tab1__A"), lastA, summaryOf("attributeOwnedBySingleSelect"), false],
    ["decide", popupReady("tab1__A"), lastA, summaryOf("attributeNotOwnedSelectedOptionSuffix"), false],
    ["shouldDispatch", popupReady("tab1__B"), lastA],
    ["shouldDispatch", popupReady("tab1__B", { activeFilterId: "" }), lastB],
    ["shouldDispatch", popupReady("pageContext__B"), lastB],
    ["decide", popupReady("pageContext__B"), lastB, summaryOf("childListNodes"), true],
    ["decide", popupReady("pageContext__B"), lastB, summaryOf("childListNodes"), true],
    ["shouldDispatch", popupReady("global__D", { activeFilterType: "dienststelle" }), lastD],
    ["decide", popupReady("global__D"), lastD, summaryOf("childListNodes"), true],
    ["decide", popupReady("tab1__A"), null, summaryOf("childListNodes"), true],
    ["resetOnClick", { filterType: "dienststelle", interactionType: "open" }],
    ["resetOnClick", { filterType: "sicht", interactionType: "confirm" }],
    ["resetOnClick", null],
    ["shouldDispatch", popupReady("tab1__A", { hasOptions: false }), lastA],
    ["shouldDispatch", popupReady("tab1__A"), lastA],
    ["resetState"]
  ];
  const results = steps.map(([op, ...args]) => {
    const result = op === "shouldDispatch" ? api.session.shouldDispatch(runtime, ...args)
      : op === "decide" ? api.session.decide(runtime, ...args)
      : op === "resetOnClick" ? api.session.resetOnClick(runtime, ...args)
      : api.session.resetState(runtime);
    return { op, result: result === undefined ? null : result, state: plain(runtime.popupReadyState || null) };
  });
  check("session.steps", results);
  check("session.isPopupReady", [null, {}, popupReady("x"), popupReady("x", { optionCount: 0 }), popupReady("x", { isVisible: false })].map(api.session.isPopupReady));
});

test("reducer matches golden", () => {
  const actions = [
    { type: "filterDock/mountSucceeded", payload: { mountedAt: 111 } },
    { type: "filterDock/mountSucceeded" },
    { type: "filterDock/clickObserved", payload: { lastClickedFilter: lastA, interaction: { interactionType: "open" }, popup: { isVisible: true } } },
    { type: "filterDock/clickObserved", payload: {} },
    { type: "filterDock/popupObserved", payload: { popup: popupReady("tab1__A") } },
    { type: "filterDock/popupObserved" },
    { type: "filterDock/filtersReadyObserved", payload: { filtersReadyAt: 321, filterWrapperCount: 4 } },
    { type: "filterDock/filtersReadyObserved", payload: { filtersReadyAt: 999, filterWrapperCount: 9 } },
    { type: "filterDock/filtersReadyDiagnosticObserved", payload: { errorCode: "FILTER_DOCK_OWNER_API_MISSING", errorMessage: "m" } },
    { type: "filterDock/filtersReadyDiagnosticObserved" },
    { type: "filterDock/error", payload: { errorCode: "FILTER_DOCK_MOUNT_FAILED", errorMessage: "boom" } },
    { type: "filterDock/error" },
    { type: "filterDock/unknown" },
    null,
    { type: "filterDock/destroy" }
  ];
  check("reducer.initial", api.reduce(undefined, null));
  let state;
  check("reducer.states", actions.map((action) => {
    state = api.reduce(state, action);
    return state;
  }));
});

test("capabilities, handoff capabilities and filter type match golden", () => {
  const configs = [
    null, "x", {}, { isSingleSelect: true }, { isSingleSelect: "true", cascade: " Upstream " },
    { isSingleSelect: "trueish", condition: "Personengruppe" }, { isSingleSelect: true, condition: " DienststellenLeitung " },
    { isHierarchy: true, cascade: "downstream" }, { isHierarchy: "true" }, { isNative: true },
    { isNative: true, isHierarchy: true }, { isNative: true, isHierarchy: true, cascade: "downstream" },
    { isNative: false, isSingleSelect: false, isHierarchy: false }, { isSingleSelect: "false", hasAlleOption: "true", condition: "x" },
    { cascade: "upstream" }, { cascade: "downstream", isSingleSelect: true, hasAlleOption: true, condition: "" }
  ];
  const rows = configs.map((config) => {
    const raw = api.readCapabilities(config);
    const handoff = api.toHandoffCapabilities(raw);
    return { raw, handoff, type: api.resolveFilterType(handoff), typeFromRaw: api.resolveFilterType(raw) };
  });
  check("capabilities.rows", rows);
  check("capabilities.nullHandoff", api.toHandoffCapabilities(null));
  check("capabilities.nullType", api.resolveFilterType(null));
});

test("owner route table keeps every action string", () => {
  const projection = {};
  Object.keys(api.ownerRouteMap).forEach((key) => {
    const route = api.ownerRouteMap[key];
    projection[key] = {
      apiKey: route.apiKey,
      allowDeprecatedScopeProjection: route.allowDeprecatedScopeProjection === true,
      needsFilterDockFiltersReady: route.needsFilterDockFiltersReady === true,
      needsFilterDockHeaderResync: route.needsFilterDockHeaderResync === true,
      needsFilterDockCommittedDisplayResync: route.needsFilterDockCommittedDisplayResync === true,
      needsPopupDisplayResync: route.needsPopupDisplayResync === true,
      actionTypes: route.actionTypes
    };
  });
  check("routes.projection", projection);
  const singleSelect = api.ownerRouteMap.singleSelect;
  assert.equal(singleSelect.needsFilterDockFiltersReady, true);
  assert.equal(typeof singleSelect.actionTypes.filtersReady, "string");
  assert.ok(singleSelect.actionTypes.filtersReady.trim().length > 0);
  assert.deepEqual(Object.keys(api.ownerRouteMap), ["singleSelect", "specialSingleSelect", "sicht", "dienststelle", "nativeMultiSelect"]);
});

test("owner payload and popup-ready handoff match golden", () => {
  const handoff = {
    filterId: "tab1__A", filterKey: "pageContext__A", filterLabel: "A", filterType: "singleSelect", legacyScope: "tab1", legacyScopeId: "tab1",
    scopeId: null, scope: "stale", interactionType: "open", capabilities: { isSingleSelect: true }
  };
  const payloads = {};
  ["singleSelect", "specialSingleSelect", "sicht", "dienststelle", "nativeMultiSelect"].forEach((type) => {
    payloads[type] = api.buildOwnerPayload(handoff, type);
  });
  payloads.missingLegacy = api.buildOwnerPayload({ filterId: "x" }, "sicht");
  check("ownerPayload", payloads);

  const lastClicked = Object.assign({}, lastA, { filterInstanceId: "i1", itemNameHint: "A", itemIdHint: "idA", scopeType: "pageContext", tabId: "tab1", scopeResolution: "ownerRequired" });
  const interaction = { capabilities: { isSingleSelect: true, condition: null }, filterConfig: { itemName: "A", nested: { a: 1 } } };
  check("popupHandoff.full", api.buildPopupReadyHandoff(lastClicked, interaction, popupReady("tab1__A")));
  check("popupHandoff.noInteraction", api.buildPopupReadyHandoff(lastClicked, null, popupReady("tab1__A", { observedAt: 0 })));
  check("popupHandoff.missing", [api.buildPopupReadyHandoff(null, interaction, popupReady("x")), api.buildPopupReadyHandoff(lastClicked, interaction, null)]);
});

test("click handoff builders match golden", () => {
  const input = {
    filterId: "tab1__A", filterKey: "pageContext__A", filterInstanceId: null, filterLabel: "A", itemNameHint: "A", itemIdHint: "idA",
    semanticInstanceKeyHint: null, filterType: "singleSelect", filterScope: "pageContext", scopeType: "pageContext", tabId: "tab1", scopeId: null,
    scopeResolution: "ownerRequired", legacyScope: "tab1", legacyScopeId: "tab1", tabContextDiagnostic: null, filterConfig: { itemName: "A" },
    capabilities: { isSingleSelect: true }, interactionType: "option", isAlleOption: false, optionLabel: "2024", confirmedLabels: null,
    sourceElementSignature: "DIV|class=a.b", popup: { isVisible: true }, observedAt: 42, extraIgnored: "x"
  };
  const handoff = api.buildHandoff(input);
  check("handoff.keys", Object.keys(handoff));
  check("handoff.value", handoff);
  const resolution = api.buildClickResolution(handoff, "FILTER_EL", 42);
  check("clickResolution", Object.assign({}, resolution, { filterEl: resolution.filterEl }));
});

// ---- chromeWait (Cognos dock chrome wait) with stubbed document / MutationObserver / timers ----
function createChromeWaitHarness(present) {
  const found = new Set(present);
  const observers = [];
  const timers = [];
  const tracked = [];
  const doc = { querySelector: (selector) => (found.has(selector) ? { selector } : null) };
  class FakeObserver {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  }
  const fakeSetTimeout = (fn, ms) => { timers.push({ fn, ms, cleared: false }); return timers.length - 1; };
  const fakeClearTimeout = (id) => { if (timers[id]) timers[id].cleared = true; };
  const { waitForDockChrome } = load("chromeWait.js", {
    stubs: { document: doc, MutationObserver: FakeObserver, setTimeout: fakeSetTimeout, clearTimeout: fakeClearTimeout }
  });
  const selectors = { rootSelector: "#root", globalDockSelector: "#global", pageContextDockSelector: "#other" };
  const _KDB = {
    elements: { selectors: { filterDock: selectors } },
    runtime: { cognosHost: { chromeChecks: { trackWait: (K, key, promise) => { tracked.push({ key, promise }); return promise; } } } }
  };
  return { waitForDockChrome, _KDB, observers, timers, tracked, appear: (selector) => found.add(selector), selectors };
}

test("chromeWait resolves synchronously found containers without an observer", async () => {
  const h = createChromeWaitHarness(["#root", "#global", "#other"]);
  const elements = await h.waitForDockChrome(h._KDB, null);
  assert.deepEqual(elements.map((el) => el.selector), ["#root", "#global", "#other"]);
  assert.equal(h.observers.length, 0);
  assert.equal(h.timers.length, 0);
  assert.deepEqual(h.tracked.map((entry) => entry.key), ["filterDock.rootSelector", "filterDock.globalDockSelector", "filterDock.pageContextDockSelector"]);
});

test("chromeWait uses one observer and one timer and cleans up when all containers appear", async () => {
  const h = createChromeWaitHarness(["#root"]);
  const controller = new AbortController();
  const result = h.waitForDockChrome(h._KDB, controller.signal);
  assert.equal(h.observers.length, 1);
  assert.equal(h.timers.length, 1);
  assert.equal(h.timers[0].ms, 30000);
  h.appear("#global");
  h.observers[0].callback([]);
  assert.equal(h.observers[0].disconnected, false);
  h.appear("#other");
  h.observers[0].callback([]);
  const elements = await result;
  assert.deepEqual(elements.map((el) => el.selector), ["#root", "#global", "#other"]);
  assert.equal(h.observers[0].disconnected, true);
  assert.equal(h.timers[0].cleared, true);
  const { getEventListeners } = await import("node:events");
  assert.equal(getEventListeners(controller.signal, "abort").length, 0);
});

test("chromeWait timeout rejects the pending keys with FILTER_DOCK_CHROME_WAIT_TIMEOUT", async () => {
  const h = createChromeWaitHarness(["#root"]);
  const result = h.waitForDockChrome(h._KDB, null);
  h.timers[0].fn();
  await assert.rejects(result, (error) => error.code === "FILTER_DOCK_CHROME_WAIT_TIMEOUT" && /Timeout waiting for #(global|other)/.test(error.message));
  const settled = await Promise.allSettled(h.tracked.map((entry) => entry.promise));
  assert.deepEqual(settled.map((entry) => entry.status), ["fulfilled", "rejected", "rejected"]);
  assert.equal(settled[1].reason.message, "Timeout waiting for #global");
  assert.equal(settled[2].reason.message, "Timeout waiting for #other");
  assert.equal(h.observers[0].disconnected, true);
});

test("chromeWait abort rejects with ABORTED, also for an already aborted signal", async () => {
  const h = createChromeWaitHarness([]);
  const controller = new AbortController();
  const result = h.waitForDockChrome(h._KDB, controller.signal);
  controller.abort();
  await assert.rejects(result, (error) => error.code === "ABORTED");
  assert.equal(h.observers[0].disconnected, true);
  assert.equal(h.timers[0].cleared, true);

  const aborted = new AbortController();
  aborted.abort();
  const second = createChromeWaitHarness(["#root"]);
  await assert.rejects(second.waitForDockChrome(second._KDB, aborted.signal), (error) => error.code === "ABORTED");
  assert.equal(second.observers.length, 0);
});

test("chromeWait rejects when the dock selectors are not configured", async () => {
  const h = createChromeWaitHarness([]);
  h._KDB.elements.selectors.filterDock = { rootSelector: "#root" };
  await assert.rejects(h.waitForDockChrome(h._KDB, null), /Cognos dock selectors are not configured/);
});

test("lazy selection-sync gap is only read when the decision reaches it", () => {
  const runtime = {};
  let reads = 0;
  const decide = (popup, last, summary) =>
    popupReadySession.decidePostReadyResync(popupReadySession.ensurePopupReadyState(runtime), popup, last, summary, () => { reads += 1; return false; });
  decide(popupReady("tab1__A"), lastA, null);
  popupReadySession.shouldDispatchPopupReadyTransition(runtime, popupReady("tab1__A"), lastA);
  decide(popupReady("tab1__A"), lastA, null);
  assert.equal(reads, 0);
  decide(popupReady("tab1__A"), lastA, summaryOf("attributeOwnedBySingleSelect"));
  assert.equal(reads, 1);
});

// ---- filters-ready watch (kit timers, 30 s max-wait armed once per watch) ----
function createFiltersReadyHarness() {
  const timers = [];
  const dispatched = [];
  const ownerCalls = [];
  const fakeSetTimeout = (fn, ms) => { timers.push({ fn, ms, cleared: false, fired: false }); return timers.length - 1; };
  const fakeClearTimeout = (id) => { if (timers[id]) timers[id].cleared = true; };
  const filtersReady = load("observation/filtersReady.js", { stubs: { setTimeout: fakeSetTimeout, clearTimeout: fakeClearTimeout, Date: FixedDate } });
  const state = { filtersReady: false };
  const dock = { count: 0, queries: 0, querySelectorAll() { this.queries += 1; return { length: this.count }; } };
  const _KDB = {
    state: { filters: { filterDock: state } },
    elements: { selectors: { filterDock: { filterItemSelector: ".item" } } },
    api: {
      singleSelect: { dispatch: (action) => ownerCalls.push(action) },
      dienststelle: { dispatch: (action) => ownerCalls.push(action) }
    }
  };
  const runtime = { timers: {}, observers: {}, domRefs: {} };
  const ctx = { _KDB, runtime, dispatch: (action) => dispatched.push(action), isDisposed: () => false };
  const fire = (index) => { timers[index].fired = true; timers[index].fn(); };
  return { filtersReady, dock, ctx, runtime, timers, dispatched, ownerCalls, fire };
}

test("filters-ready watch arms the max-wait timer once and restarts the stability timer", () => {
  const h = createFiltersReadyHarness();
  h.dock.count = 2;
  assert.equal(h.filtersReady.detectFiltersReady(h.ctx, h.dock), true);
  assert.deepEqual(h.timers.map((t) => t.ms), [30000, 500]);
  assert.deepEqual(Object.keys(h.runtime.timers).sort(), ["filtersReadyMaxWait", "filtersReadyStability"]);
  h.dock.count = 3;
  h.filtersReady.detectFiltersReady(h.ctx, h.dock);
  assert.deepEqual(h.timers.map((t) => t.ms), [30000, 500, 500]);
  assert.equal(h.timers[1].cleared, true);
  assert.equal(h.filtersReady.detectFiltersReady(h.ctx, h.dock), true);
  assert.equal(h.timers.length, 3);

  h.dock.count = 0;
  h.fire(0);
  assert.equal(h.ctx.runtime.filtersReadyDispatched, undefined);
  h.dock.count = 4;
  h.filtersReady.detectFiltersReady(h.ctx, h.dock);
  assert.deepEqual(h.timers.map((t) => t.ms), [30000, 500, 500, 500]);
});

test("filters-ready dispatches once, then detect returns before touching the DOM", () => {
  const h = createFiltersReadyHarness();
  h.dock.count = 2;
  h.filtersReady.detectFiltersReady(h.ctx, h.dock);
  h.fire(1);
  assert.deepEqual(h.dispatched.map((a) => a.type), ["filterDock/filtersReadyObserved"]);
  assert.deepEqual(plain(h.dispatched[0].payload), { filtersReady: true, filtersReadyAt: 5000, filterWrapperCount: 2 });
  assert.deepEqual(h.ownerCalls.map((a) => a.type), ["singleSelect/reconcileFilterInstances", "dienststelle/filterDockFiltersReady"]);
  assert.deepEqual(plain(h.ownerCalls[0].payload), { reason: "filtersReady", source: "filterDockFiltersReady", observedAt: 5000, filterWrapperCount: 2 });
  assert.equal(h.ctx.runtime.filtersReadyDispatched, true);
  assert.equal(h.ctx.runtime.filtersReadyWatch, undefined);
  assert.deepEqual(Object.keys(h.ctx.runtime.timers), []);
  const queriesBefore = h.dock.queries;
  assert.equal(h.filtersReady.detectFiltersReady(h.ctx, h.dock), false);
  assert.equal(h.dock.queries, queriesBefore);
});

test("internal-only diagnostic actions are gone from the action table", () => {
  assert.deepEqual(Object.values(filterDockState.ACTIONS).sort(), [
    "filterDock/clickObserved", "filterDock/clickOriginalButtonRequested", "filterDock/closeActivePopupRequested", "filterDock/destroy",
    "filterDock/error", "filterDock/filtersReadyDiagnosticObserved", "filterDock/filtersReadyObserved", "filterDock/mountSucceeded",
    "filterDock/popupObserved"
  ]);
  const initial = filterDockState.reduceFilterDockState(undefined, null);
  const afterRemoved = filterDockState.reduceFilterDockState(initial, { type: "filterDock/mutationsObserved", payload: { mutationDelta: 5 } });
  assert.deepStrictEqual(afterRemoved, initial);
});

// ---- behaviour changes ----
const cssStub = { escape: (value) => String(value).replace(/([^\w-])/g, "\\$1") };

test("scoped popup mount escapes the host data id in the attribute selector", () => {
  const dockDom = load("interaction/dockDom.js", { stubs: { CSS: cssStub } });
  const queries = [];
  const mount = { name: "mount" };
  const wrapper = { querySelector: () => mount };
  const bucket = { querySelector: (selector) => { queries.push(selector); return { closest: () => wrapper }; } };
  const dockRoot = { querySelector: () => bucket };
  const selectors = {
    popupMountSelector: ".mount", globalDockSelector: "#g", pageContextDockSelector: "#p", filterDataIdAttr: "data-id", filterItemSelector: ".item"
  };
  const result = dockDom.resolveScopedPopupMount({
    filterEl: null, dockRoot, selectors, runtime: { domRefs: {} }, scopeType: "pageContext", hostDataId: 'Dienst "A"\\B'
  });
  assert.equal(result, mount);
  assert.deepEqual(queries, ['[data-id="Dienst\\ \\"A\\"\\\\B"]']);
});

test("click on an original popup button escapes the button tid", () => {
  const popupCommands = load("interaction/popupCommands.js", { stubs: { CSS: cssStub } });
  const clicks = [];
  const queried = [];
  const selectors = { filterLabelSelector: "[data-id]", filterDataIdAttr: "data-id", globalDockSelector: "#g", nativeFooterSelector: ".footer" };
  const footer = { querySelector: (selector) => { queried.push(selector); return { click: () => clicks.push(selector) }; } };
  const filterEl = {
    closest: () => null,
    querySelector: (selector) => (selector === ".footer" ? footer : { getAttribute: () => "Region" })
  };
  const _KDB = { elements: { selectors: { filterDock: selectors } }, runtime: { filterDock: { domRefs: { activeFilterEl: filterEl } } } };
  const ok = popupCommands.runPopupCommand(_KDB, {
    type: "filterDock/clickOriginalButtonRequested", payload: { filterKey: "pageContext__Region", buttonTid: 'ok"Click' }
  });
  assert.equal(ok, true);
  assert.deepEqual(queried, ['[data-tid="ok\\"Click"]']);
  assert.equal(popupCommands.runPopupCommand(_KDB, { type: "filterDock/clickOriginalButtonRequested", payload: { filterKey: "global__Other", buttonTid: "x" } }), false);
});

function createMountHarness(selectors) {
  const timers = [];
  const doc = { querySelector: () => null };
  class FakeObserver { observe() {} disconnect() {} }
  const register = load("index.js", {
    stubs: {
      document: doc, MutationObserver: FakeObserver, Date: FixedDate,
      setTimeout: (fn, ms) => { timers.push({ fn, ms, cleared: false }); return timers.length - 1; },
      clearTimeout: (id) => { if (timers[id]) timers[id].cleared = true; }
    }
  });
  const warnings = [];
  const errors = [];
  const _KDB = { elements: { selectors: { filterDock: selectors } }, state: {}, runtime: {}, api: {} };
  const originalError = console.error;
  const originalWarn = console.warn;
  return {
    _KDB, timers, errors, warnings, register,
    withConsole(fn) {
      console.error = (...args) => errors.push(args[0]);
      console.warn = (...args) => warnings.push(args[0]);
      return Promise.resolve(fn()).finally(() => { console.error = originalError; console.warn = originalWarn; });
    }
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));
const DOCK_SELECTORS = { rootSelector: "#root", globalDockSelector: "#global", pageContextDockSelector: "#other" };

test("mount: a chrome wait timeout puts the dock into the error state", async () => {
  const h = createMountHarness(Object.assign({}, DOCK_SELECTORS));
  await h.withConsole(async () => {
    const api = h.register(h._KDB);
    assert.equal(api.mount(), true);
    assert.equal(api.mount(), true);
    assert.equal(h.timers.length, 1);
    h.timers[0].fn();
    await flush();
    const state = api.getState();
    assert.equal(state.lifecycle, "error");
    assert.equal(state.errorCode, "FILTER_DOCK_CHROME_WAIT_TIMEOUT");
    assert.match(state.errorMessage, /^Timeout waiting for #(root|global|other)$/);
    assert.deepEqual(h.errors, ["[filterDock.mount] filter dock wait failed"]);
  });
});

test("mount: other wait failures use FILTER_DOCK_MOUNT_FAILED, an abort by destroy leaves no error", async () => {
  const broken = createMountHarness({ rootSelector: "#root" });
  await broken.withConsole(async () => {
    const api = broken.register(broken._KDB);
    api.mount();
    await flush();
    assert.equal(api.getState().errorCode, "FILTER_DOCK_MOUNT_FAILED");
  });

  const aborted = createMountHarness(Object.assign({}, DOCK_SELECTORS));
  await aborted.withConsole(async () => {
    const api = aborted.register(aborted._KDB);
    api.mount();
    api.destroy();
    await flush();
    const state = aborted._KDB.state.filters.filterDock;
    assert.equal(state.lifecycle, "disposed");
    assert.equal(state.errorCode, null);
    assert.deepEqual(aborted.errors, []);
    assert.equal(api.getState(), undefined);
    assert.equal(aborted.timers[0].cleared, true);
    assert.deepEqual(Object.keys(aborted._KDB.runtime.filterDock.abortControllers), []);
  });
});

test("dockHasCommittedDisplay is true when the dock root is or contains a committed display element", () => {
  const ownerResync = load("observation/ownerResync.js");
  const make = (closestHit, queryHit) => ({ closest: () => closestHit, querySelector: () => queryHit });
  assert.equal(ownerResync.dockHasCommittedDisplay(make(null, null)), false);
  assert.equal(ownerResync.dockHasCommittedDisplay(make({}, null)), true);
  assert.equal(ownerResync.dockHasCommittedDisplay(make(null, {})), true);
  assert.equal(ownerResync.dockHasCommittedDisplay(null), false);
});
