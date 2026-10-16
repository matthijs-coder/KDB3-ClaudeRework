// Golden tests for dashboard/metricsTree (catalog build + resolveMetricByCode).
// The golden JSON was generated from the pre-refactor modules (state/buildMetricsTreeSources.js, state/resolveMetricByCode.js);
// do not regenerate it to make a test pass. Run: node --test tools/tests/metricsTree.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const GOLDEN_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "fixtures/metricsTree.golden.json");
const MT = path.join(JS_ROOT, "dashboard/metricsTree");

const catalog = loadAmd(path.join(MT, "catalog.js"));
const metricLookup = loadAmd(path.join(MT, "metricLookup.js"));
const stateModule = loadAmd(path.join(MT, "state.js"));
const config = loadAmd(path.join(MT, "config.js"));

const SEARCH_ICON_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" height=\"24px\" viewBox=\"0 0 24 24\" width=\"24px\" fill=\"#000000\"><path d=\"M0 0h24v24H0z\" fill=\"none\"></path><path d=\"M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16a6.471 6.471 0 004.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zM10 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z\"></path></svg>";

function cell(display) {
  return { display: display };
}

function row(values) {
  const out = {};
  Object.keys(values).forEach(function (key) { out[key] = cell(values[key]); });
  return out;
}

const ROWS_DEFAULT = [
  row({ "Kennzahlen - Name": "X1", KURZTEXT: "Kurz eins", LANGTEXT: "X1: Lang eins", PFAD: "Alpha/Beta", Gruppe1: "A", Gruppe2: "B", FREIGABE: "1", URL: "http://u/1" }),
  row({ "Kennzahlen - Name": "X1", KURZTEXT: "Duplicate", LANGTEXT: "", PFAD: "Alpha/Beta", Gruppe1: "A", Gruppe2: "B", FREIGABE: "1", URL: "http://u/dup" }),
  row({ "Kennzahlen - Name": "  X9 ", KURZTEXT: "Spaces", LANGTEXT: "", PFAD: "Alpha", Gruppe1: "A", Gruppe2: "", FREIGABE: "1", URL: "" }),
  row({ "Kennzahlen - Name": "", KURZTEXT: "No code kurz", LANGTEXT: "", PFAD: "", Gruppe1: "", Gruppe2: "", FREIGABE: "", URL: "" }),
  row({ "Kennzahlen - Name": "", KURZTEXT: "", LANGTEXT: "Only: langtext", PFAD: "", Gruppe1: "C", Gruppe2: "", FREIGABE: "", URL: "" }),
  row({ "Kennzahlen - Name": "", KURZTEXT: "", LANGTEXT: "", PFAD: "", Gruppe1: "", Gruppe2: "", FREIGABE: "", URL: "" }),
  row({ "Kennzahlen - Name": "BETA1", KURZTEXT: "Beta metric", LANGTEXT: "", PFAD: "Alpha/Beta", Gruppe1: "A", Gruppe2: "B", FREIGABE: "0", URL: "" }),
  row({ "Kennzahlen - Name": "AMP", KURZTEXT: "A&B <x>", LANGTEXT: "", PFAD: "A&B/<x>", Gruppe1: "A&B", Gruppe2: "<x>", FREIGABE: "1", URL: "" })
];

const ROWS_CONFIGURED = [
  row({ MyCode: "M1", MyText: "Mapped one", Hard: "Hardcoded one", Rel: "1", LANGTEXT: "", Gruppe1: "G" }),
  row({ MyCode: "M2", MyText: "Mapped two", Hard: "", Rel: "0", LANGTEXT: "", Gruppe1: "G" }),
  row({ MyCode: "X1", MyText: "Other source X1", Hard: "", Rel: "1", LANGTEXT: "", Gruppe1: "H" })
];

const CONFIG_PROPERTIES = {
  metricsTablesPropObj: {
    tblA: { code: "MyCode", kurztext: "MyText", freigabe: "Rel", hardcoded: "Hard" },
    tblB: { code: "MyCode", kurztext: "MyText", freigabe: "Rel" }
  },
  metricsTreePropObj: { tblA: { pathColumnNamesArr: ["Gruppe1"] } }
};

const SCENARIOS = {
  defaultNormal: { properties: {}, input: { sourceKey: "personal_kdb", tableName: "Personal", rows: ROWS_DEFAULT, tableConfigObject: {}, isSuperUserAllowed: false } },
  defaultSuper: { properties: {}, input: { sourceKey: "personal_kdb", tableName: "Personal", rows: ROWS_DEFAULT, tableConfigObject: {}, isSuperUserAllowed: true } },
  configured: { properties: CONFIG_PROPERTIES, input: { rows: ROWS_CONFIGURED, isSuperUserAllowed: false } },
  configuredSuper: { properties: CONFIG_PROPERTIES, input: { rows: ROWS_CONFIGURED, isSuperUserAllowed: true } },
  noRows: { properties: {}, input: { sourceKey: "personal_kdb", rows: [] } },
  invalidInput: { properties: {}, input: null }
};

const CODES = ["", "X1", " X1 ", "X9", "  X9 ", "missing", "BETA1", "M1", "M2", "AMP", "kennzahl_3", "kennzahl_5", "No code kurz", "Only: langtext", null, undefined];

function buildAll(buildSources) {
  const out = {};
  Object.keys(SCENARIOS).forEach(function (name) {
    const scenario = SCENARIOS[name];
    out[name] = buildSources({ properties: scenario.properties }, scenario.input);
  });
  return out;
}

function makeKdb(metricsState) {
  return { state: { metricsTree: metricsState }, runtime: { metricsTree: {} } };
}

function readyState(sources) {
  return { lifecycle: "ready", bySource: sources.bySource, sourceOrder: sources.sourceOrder, hasRenderableData: sources.hasRenderableData };
}

function resolveAll(sourcesByScenario) {
  const out = {};
  ["defaultSuper", "configuredSuper"].forEach(function (name) {
    const kdb = makeKdb(readyState(sourcesByScenario[name]));
    out[name] = CODES.map(function (code) { return metricLookup.resolveMetricByCode(kdb, code); });
  });
  out.loading = CODES.map(function (code) {
    const loading = Object.assign(readyState(sourcesByScenario.defaultSuper), { lifecycle: "loading" });
    return metricLookup.resolveMetricByCode(makeKdb(loading), code);
  });
  out.noState = [metricLookup.resolveMetricByCode({}, "X1"), metricLookup.resolveMetricByCode({ state: {} }, "X1")];
  return out;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function readGolden() {
  return JSON.parse(readFileSync(GOLDEN_PATH, "utf8"));
}

function stripDraggable(sources) {
  const copy = plain(sources);
  Object.keys(copy).forEach(function (scenario) {
    Object.keys(copy[scenario].bySource).forEach(function (sourceKey) {
      copy[scenario].bySource[sourceKey].nodes.forEach(function (node) {
        if (node.a_attr && node.a_attr.code !== undefined) {
          assert.equal(node.a_attr.draggable, "true", "leaf " + node.id);
          delete node.a_attr.draggable;
        } else {
          assert.deepStrictEqual(node.a_attr, { draggable: "false" }, "group " + node.id);
          delete node.a_attr;
        }
      });
    });
  });
  return copy;
}

test("buildMetricsTreeSources matches the golden output (plus draggable attributes)", () => {
  const sources = buildAll(catalog.buildMetricsTreeSources);
  assert.deepStrictEqual(stripDraggable(sources), readGolden().sources);
});

test("resolveMetricByCode matches the golden output", () => {
  const sources = buildAll(catalog.buildMetricsTreeSources);
  assert.deepStrictEqual(plain(resolveAll(sources)), readGolden().resolved);
});

test("metric code index is cached until the state references change", () => {
  const sources = buildAll(catalog.buildMetricsTreeSources);
  const kdb = makeKdb(readyState(sources.defaultSuper));
  assert.equal(metricLookup.resolveMetricByCode(kdb, "X1").resolved, true);
  const firstIndex = kdb.runtime.metricsTree.metricIndex;
  assert.ok(firstIndex.byCode instanceof Map);

  assert.equal(metricLookup.resolveMetricByCode(kdb, "BETA1").resolved, true);
  assert.equal(kdb.runtime.metricsTree.metricIndex, firstIndex);

  kdb.state.metricsTree = Object.assign({}, kdb.state.metricsTree, { lifecycle: "ready" });
  metricLookup.resolveMetricByCode(kdb, "X1");
  assert.equal(kdb.runtime.metricsTree.metricIndex, firstIndex);

  kdb.state.metricsTree = readyState(sources.configuredSuper);
  assert.equal(metricLookup.resolveMetricByCode(kdb, "BETA1").resolved, false);
  assert.equal(metricLookup.resolveMetricByCode(kdb, "M1").resolved, true);
  assert.notEqual(kdb.runtime.metricsTree.metricIndex, firstIndex);
});

test("buildMetricCodeIndex: first occurrence wins, keys are untrimmed, groups are skipped", () => {
  const sources = buildAll(catalog.buildMetricsTreeSources);
  const index = metricLookup.buildMetricCodeIndex(sources.configuredSuper.bySource, ["tblB", "tblA"]);
  assert.equal(index.get("X1").sourceKey, "tblB");
  assert.equal(index.has(""), false);
  const spaced = metricLookup.buildMetricCodeIndex(sources.defaultSuper.bySource, sources.defaultSuper.sourceOrder);
  assert.equal(spaced.has("  X9 "), true);
  assert.equal(spaced.has("X9"), false);
  assert.equal(metricLookup.buildMetricCodeIndex(sources.defaultSuper.bySource, undefined).size, spaced.size);
});

test("reducer: destroy releases the catalog, loadSucceeded without data stays idle", () => {
  const { ACTIONS, reduceMetricsTreeState, createInitialMetricsTreeState } = stateModule;
  const sources = buildAll(catalog.buildMetricsTreeSources).defaultSuper;
  const loaded = reduceMetricsTreeState(createInitialMetricsTreeState(), {
    type: ACTIONS.LOAD_SUCCEEDED,
    payload: { bySource: sources.bySource, sourceOrder: sources.sourceOrder, hasRenderableData: true, lastBuildAt: 5 }
  });
  assert.equal(loaded.lifecycle, "ready");
  assert.deepStrictEqual(loaded.sourceOrder, ["personal_kdb"]);

  const destroyed = reduceMetricsTreeState(loaded, { type: ACTIONS.DESTROY });
  assert.equal(destroyed.lifecycle, "disposed");
  assert.deepStrictEqual(destroyed.bySource, {});
  assert.deepStrictEqual(destroyed.sourceOrder, []);

  const empty = reduceMetricsTreeState(createInitialMetricsTreeState(), {
    type: ACTIONS.LOAD_SUCCEEDED,
    payload: { bySource: {}, sourceOrder: [], hasRenderableData: false }
  });
  assert.equal(empty.lifecycle, "idle");
  assert.equal(empty.hasRenderableData, false);
});

test("reducer: action strings and remaining transitions are unchanged", () => {
  const { ACTIONS, reduceMetricsTreeState, createInitialMetricsTreeState } = stateModule;
  assert.deepStrictEqual(ACTIONS, {
    LOAD_STARTED: "metricsTree/loadStarted",
    LOAD_SUCCEEDED: "metricsTree/loadSucceeded",
    LOAD_FAILED: "metricsTree/loadFailed",
    RENDERED: "metricsTree/rendered",
    DESTROY: "metricsTree/destroy"
  });
  const initial = createInitialMetricsTreeState();
  const loading = reduceMetricsTreeState(initial, { type: ACTIONS.LOAD_STARTED });
  assert.equal(loading.lifecycle, "loading");
  const failed = reduceMetricsTreeState(loading, { type: ACTIONS.LOAD_FAILED, payload: {} });
  assert.deepStrictEqual([failed.lifecycle, failed.errorCode], ["error", "METRICS_TREE_LOAD_FAILED"]);
  const rendered = reduceMetricsTreeState(initial, { type: ACTIONS.RENDERED, payload: { lastRenderedAt: 3, readyResolvedAt: 4 } });
  assert.deepStrictEqual([rendered.lifecycle, rendered.lastRenderedAt, rendered.readyResolvedAt], ["idle", 3, 4]);
  assert.equal(reduceMetricsTreeState(initial, { type: "other" }), initial);
});

test("config: search icon markup is unchanged", () => {
  assert.equal(config.SEARCH_ICON_SVG, SEARCH_ICON_SVG);
});

function loadRegister(fakeView, fakeDrag) {
  return loadAmd(path.join(MT, "index.js"), {
    modules: { "./view.js": fakeView, "./dragSource.js": fakeDrag }
  });
}

function makeLifecycleKdb(superUser) {
  const calls = { waits: [] };
  const kdb = {
    config: { tables: { personal_kdb: { schema: "x" } } },
    utils: { getTableConfigObject: () => ({ key: "personal_kdb", name: "Personal" }) },
    services: {
      tableData: {
        waitForRows(input) {
          calls.waits.push(input[0].tableName);
          return Promise.resolve(input[0].tableName === "superuser" ? [{ flag: { use: superUser ? 1 : 0 } }] : ROWS_DEFAULT);
        },
        readRows(input) {
          return input[0].tableName === "superuser" ? [{ flag: { use: superUser ? 1 : 0 } }] : ROWS_DEFAULT;
        }
      }
    }
  };
  return { kdb, calls };
}

function makeFakeView(log) {
  return {
    renderMetricsTrees(kdb) {
      log.push("render");
      return Promise.resolve(kdb.state.metricsTree.hasRenderableData);
    },
    cleanupMetricsTrees() { log.push("cleanup"); },
    bindMetricsTreeSearch() { log.push("search"); }
  };
}

test("index: mount builds the catalog, resolves codes, coalesces concurrent mounts", async () => {
  const log = [];
  const register = loadRegister(makeFakeView(log), { bindMetricsTreeDragSources() { log.push("drag"); } });
  const { kdb } = makeLifecycleKdb(true);
  const api = register(kdb);

  assert.equal(kdb.api.metricsTree, api);
  assert.deepStrictEqual(kdb.elements.selectors.metricsTree, { rootSelector: "#kdb-control_metrics_container" });
  assert.equal(api.getState().lifecycle, "idle");

  const first = api.mount();
  const second = api.mount();
  assert.equal(first, second);
  assert.equal(await first, true);
  assert.deepStrictEqual(log, ["render", "search", "drag"]);
  assert.equal(api.getState().lifecycle, "ready");
  assert.equal(kdb.runtime.metricsTree.pendingPromises.render, undefined);
  assert.equal(api.resolveMetricByCode(" BETA1 ").resolved, true);
  assert.equal(api.resolveMetricByCode("nope").resolved, false);

  assert.equal(await api.mount(), true);
});

test("index: superuser right controls the release filter", async () => {
  for (const superUser of [false, true]) {
    const register = loadRegister(makeFakeView([]), { bindMetricsTreeDragSources() {} });
    const { kdb } = makeLifecycleKdb(superUser);
    const api = register(kdb);
    await api.mount();
    assert.equal(api.resolveMetricByCode("BETA1").resolved, superUser);
  }
});

test("index: destroy releases the catalog and index, later calls are guarded", async () => {
  const log = [];
  const register = loadRegister(makeFakeView(log), { bindMetricsTreeDragSources() {} });
  const { kdb } = makeLifecycleKdb(true);
  const api = register(kdb);
  await api.mount();
  assert.equal(api.resolveMetricByCode("X1").resolved, true);
  assert.ok(kdb.runtime.metricsTree.metricIndex);

  api.destroy();
  assert.equal(log[log.length - 1], "cleanup");
  assert.equal(kdb.state.metricsTree.lifecycle, "disposed");
  assert.deepStrictEqual(kdb.state.metricsTree.bySource, {});
  assert.equal("metricIndex" in kdb.runtime.metricsTree, false);
  assert.equal(api.getState(), undefined);
  assert.equal(api.resolveMetricByCode("X1").resolved, false);

  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (message) => warnings.push(message);
  try {
    assert.equal(await api.mount(), false);
    assert.equal(api.dispatch({ type: "metricsTree/loadStarted" }), undefined);
  } finally {
    console.warn = originalWarn;
  }
  assert.deepStrictEqual(warnings, ["[metricsTree.mount] called after destroy", "[metricsTree.dispatch] called after destroy"]);
  assert.equal(kdb.state.metricsTree.lifecycle, "disposed");
  api.destroy();
});

test("index: destroy during mount aborts the pipeline without a failure state", async () => {
  const register = loadRegister(makeFakeView([]), { bindMetricsTreeDragSources() {} });
  const { kdb } = makeLifecycleKdb(false);
  const api = register(kdb);
  const pending = api.mount();
  api.destroy();
  assert.equal(await pending, false);
  assert.equal(kdb.state.metricsTree.lifecycle, "disposed");
  assert.equal(kdb.state.metricsTree.errorCode, null);
});

test("index: a failing load ends in the error state and mount resolves false", async () => {
  const register = loadRegister(makeFakeView([]), { bindMetricsTreeDragSources() {} });
  const { kdb } = makeLifecycleKdb(false);
  kdb.utils.getTableConfigObject = () => null;
  const api = register(kdb);
  const originalError = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args[0]);
  try {
    assert.equal(await api.mount(), false);
  } finally {
    console.error = originalError;
  }
  assert.equal(api.getState().lifecycle, "error");
  assert.equal(api.getState().errorCode, "METRICS_TREE_MOUNT_FAILED");
  assert.deepStrictEqual(logged, ["[metricsTree.mount] mount failed"]);
});

test("index: a throwing loading service neither fails nor masks the mount", async () => {
  const { kdb } = makeLifecycleKdb(false);
  const attempts = [];
  kdb.services.loading = {
    startLoading() { attempts.push("start"); throw new Error("overlay start"); },
    finishLoading() { attempts.push("finish"); throw new Error("overlay finish"); }
  };
  const stubDocument = { querySelector: () => ({}) };
  const api = loadAmd(path.join(MT, "index.js"), {
    modules: { "./view.js": makeFakeView([]), "./dragSource.js": { bindMetricsTreeDragSources() {} } },
    stubs: { document: stubDocument }
  })(kdb);
  const originalError = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args[0]);
  try {
    assert.equal(await api.mount(), true);
  } finally {
    console.error = originalError;
  }
  assert.deepStrictEqual(attempts, ["start", "finish"]);
  assert.deepStrictEqual(logged, ["[metricsTree.loading] startLoading failed", "[metricsTree.loading] finishLoading failed"]);
  assert.equal(api.getState().lifecycle, "ready");
});
