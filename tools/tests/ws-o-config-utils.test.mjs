// Golden tests for core/config/** and core/utils/*.js (WS-O task O2).
// Run: node --test tools/tests/ws-o-config-utils.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import vm from "node:vm";

const JS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../_____________KDB3API/KDB3/js");

function createLoader() {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const source = readFileSync(file, "utf8");
    let result;
    const define = (deps, factory) => {
      const args = deps.map((dep) => load(resolve(dirname(file), dep)));
      result = factory(...args);
    };
    vm.runInThisContext(`(function (define) {\n${source}\n})`, { filename: file })(define);
    cache.set(file, result);
    return result;
  }
  return (rel) => load(resolve(JS_DIR, rel));
}

const sha = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);

function buildConfig(existing) {
  const orchestrator = createLoader()("core/config/registerConfig.js");
  const _KDB = { config: existing || { options: {} } };
  orchestrator(_KDB);
  return _KDB.config;
}

function withoutDeadKeys(config) {
  const copy = JSON.parse(JSON.stringify(config));
  for (const key of ["defaultTopN", "defaultWidth", "defaultHeight", "defaultBackgroundColor"]) {
    delete copy.visualizations.definitions[key];
  }
  for (const key of ["slotId", "dimensionSelectionAffects"]) {
    delete copy.visualizations.topNHelper[key];
  }
  return copy;
}

const TABLE_KEYS = [
  "personal_berechtigung_dienststelle_kdb_ready", "personal_berechtigung_kdb_ready", "personal_kdb_ready",
  "superuser", "alle", "personengruppe", "dienststellenleitung", "personal_kdb",
  "berufsfamilie_filter", "dienstverhältnis_filter", "geschlecht_filter", "altersgruppe_filter",
  "personengruppe_filter", "dienststellenleitung_filter", "sicht_bw", "sicht_dezpv",
  "dienststelle_bw_default", "dienststelle_dezpv_default", "dienststelle_dezpv_hierarchy", "dienststelle_bw_hierarchy",
  "update_date", "year", "newestStichtag", "writeback"
];

// ------------------------------------------------------------------ config

test("config: full result (minus dead keys) matches the golden hash", () => {
  assert.equal(sha(withoutDeadKeys(buildConfig())), "5f2f3c7e6a0749dd");
});

test("config: top-level key order and table order", () => {
  const config = buildConfig();
  assert.deepEqual(Object.keys(config), ["options", "links", "tables", "tabs", "dimensions", "dataSources", "visualizations"]);
  assert.deepEqual(Object.keys(config.tables), TABLE_KEYS);
  assert.deepEqual(Object.keys(config.visualizations), ["definitions", "bindingSpecs", "dimensions", "kennzahlDefaults", "sorting", "topNHelper"]);
});

test("config: kennzahlDefaults has 113 keys in the recorded order", () => {
  const defaults = buildConfig().visualizations.kennzahlDefaults;
  const keys = Object.keys(defaults);
  assert.equal(keys.length, 113);
  assert.equal(sha(keys), "50bf9776f95773fc");
  assert.deepEqual(defaults.P_ABS_K_KF_02.extraFilter !== undefined, true);
});

test("config: topNHelper.resolveTableEntry returns the Personal_KDB entry", () => {
  const topN = buildConfig().visualizations.topNHelper;
  assert.equal(topN.resolveTableEntry(), topN.byKennzahlenTable.Personal_KDB);
  assert.equal(topN.resolveTableEntry("unknown"), topN.byKennzahlenTable.Personal_KDB);
});

test("config: dimensions equals visualizations.dimensions but is a separate object", () => {
  const config = buildConfig();
  assert.deepEqual(config.dimensions, config.visualizations.dimensions);
  assert.notEqual(config.dimensions, config.visualizations.dimensions);
});

test("config: parkFilter ids are resolved to recipe objects", () => {
  const { tables } = buildConfig();
  assert.equal(tables.personal_kdb.parkFilter.itemId, "HideData");
  assert.equal(tables.dienststelle_bw_hierarchy.parkFilter, tables.personal_kdb.parkFilter);
});

test("config: existing values win and nested merges are kept", () => {
  const config = buildConfig({
    options: { color: { custom: "#123456" }, extra: 1 },
    links: { wienKiUrl: "x" },
    dataSources: { metrics: { other: { name: "o" } } },
    visualizations: { definitions: { defaultType: "Pie" } }
  });
  assert.equal(config.links.wienKiUrl, "x");
  assert.equal(config.links.kdbControlHandbookUrl.startsWith("https://"), true);
  assert.equal(config.options.color.custom, "#123456");
  assert.equal(config.options.extra, 1);
  assert.equal(typeof config.options.color, "object");
  assert.deepEqual(Object.keys(config.dataSources.metrics), ["default", "other"]);
  assert.equal(config.dataSources.metrics.default.name, "Personal_KDB");
  assert.equal(config.visualizations.definitions.defaultType, "Pie");
  assert.ok(config.visualizations.definitions.visualizations.Line);
});

test("config: running the orchestrator twice is stable", () => {
  const orchestrator = createLoader()("core/config/registerConfig.js");
  const _KDB = { config: { options: {} } };
  orchestrator(_KDB);
  const first = sha(_KDB.config);
  orchestrator(_KDB);
  assert.equal(sha(_KDB.config), first);
});

test("config: externally imported paths keep their export shape", () => {
  const load = createLoader();
  assert.equal(typeof load("core/config/visualizations/topNHelper.js").resolveTableEntry, "function");
  assert.ok(load("core/config/visualizations/buildKennzahlAggregationFilter.js"));
  assert.ok(load("core/config/visualizations/sorting.js").sortingByProfile);
  assert.ok(load("core/config/colorPalette.js").color);
  assert.ok(load("core/config/dimensions.js").dimensions);
  assert.ok(load("core/config/mapping/parameterMap.js"));
  assert.ok(load("core/config/mapping/kidIndex.js"));
  assert.ok(load("core/config/mapping/bwOldToNewMap.js"));
});

test("kidIndex: required keys present, package key resolved", () => {
  const kid = createLoader()("core/config/mapping/kidIndex.js");
  assert.deepEqual(kid.findMissingRequiredKeys(), []);
  assert.equal(typeof kid.resolveRuntimePackageKey({}), "string");
  assert.equal(kid.getParameterMappingIndex({}).package.pkg, kid.resolveRuntimePackageKey({}));
});

// ------------------------------------------------------------------- utils

test("waitFor: resolves the value, honours the predicate", async () => {
  const waitFor = createLoader()("core/utils/waitFor.js");
  let calls = 0;
  const value = await waitFor(async () => (++calls >= 3 ? "ready" : null), { interval: 5, timeoutMs: 1000 });
  assert.equal(value, "ready");
  assert.equal(calls, 3);
  assert.equal(await waitFor(() => 7, { interval: 5, timeoutMs: 100, predicate: (v) => v === 7 }), 7);
});

test("waitFor: times out with WAITFOR_TIMEOUT and the same message", async () => {
  const waitFor = createLoader()("core/utils/waitFor.js");
  await assert.rejects(
    waitFor(() => null, { interval: 5, timeoutMs: 40 }),
    (error) => error.code === "WAITFOR_TIMEOUT" && error.message === "waitFor timed out after 40ms"
  );
});

test("waitFor: a throwing check counts as not ready", async () => {
  const waitFor = createLoader()("core/utils/waitFor.js");
  let calls = 0;
  const value = await waitFor(() => {
    calls += 1;
    if (calls < 3) throw new Error("transient");
    return "ok";
  }, { interval: 5, timeoutMs: 1000 });
  assert.equal(value, "ok");
  await assert.rejects(waitFor(() => { throw new Error("always"); }, { interval: 5, timeoutMs: 30 }), (e) => e.code === "WAITFOR_TIMEOUT");
});

test("waitFor: an aborted signal rejects with ABORTED, interval/timeout defaults keep working", async () => {
  const waitFor = createLoader()("core/utils/waitFor.js");
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 20);
  await assert.rejects(waitFor(() => null, { interval: 5, signal: controller.signal }), (e) => e.code === "ABORTED");
  assert.equal(await waitFor(() => "now"), "now");
});

test("getKennzahlenSource: personal, then per, then first key", () => {
  const get = createLoader()("core/utils/getKennzahlenSource.js");
  const withKeys = (keys) => ({ properties: { kennzahlenTablesPropObj: Object.fromEntries(keys.map((k) => [k, 1])) } });
  assert.equal(get(withKeys(["Other", "Per_X", "My_Personal"])), "My_Personal");
  assert.equal(get(withKeys(["Other", "Per_X"])), "Per_X");
  assert.equal(get(withKeys(["Other", "Second"])), "Other");
  assert.equal(get(withKeys([])), null);
  assert.equal(get({}), null);
  assert.equal(get(null), null);
});

test("rewriteUniqueNameSourceToken: rewrites only the leading token", () => {
  const { rewriteUniqueNameSourceToken: rewrite } = createLoader()("core/utils/rewriteUniqueNameSourceToken.js");
  assert.equal(rewrite("[Personal_KDB_TM1].[A].[B]", "Other"), "[Other_TM1].[A].[B]");
  assert.equal(rewrite("[Personal_KDB_TM1].[A]", "X_TM1"), "[X_TM1].[A]");
  assert.equal(rewrite("plain", "X"), "plain");
  assert.equal(rewrite("[A].[B]", ""), "[A].[B]");
  assert.equal(rewrite(5, "X"), 5);
});

test("normalizeCognosScopeId", () => {
  const normalize = createLoader()("core/utils/normalizeCognosScopeId.js");
  assert.equal(normalize(null), "");
  assert.equal(normalize(undefined), "");
  assert.equal(normalize("  abc_tabpanel "), "abc");
  assert.equal(normalize("abc"), "abc");
  assert.equal(normalize(12), "12");
});

test("convertUnitToPx", () => {
  const origWarn = console.warn;
  console.warn = () => {};
  try {
    const px = createLoader()("core/utils/convertUnitToPx.js");
    assert.equal(px(12.4), 12);
    assert.equal(px("10px"), 10);
    assert.equal(px("1cm"), 38);
    assert.equal(px("10mm"), 38);
    assert.equal(px("2in"), 192);
    assert.equal(px("12pt"), 16);
    assert.equal(px("abc"), null);
    assert.equal(px({}), null);
  } finally {
    console.warn = origWarn;
  }
});

test("readableTextColorForHex", () => {
  const readable = createLoader()("core/utils/readableTextColorForHex.js");
  assert.equal(readable("#ffffff"), "#000000");
  assert.equal(readable("#000000"), "#FFFFFF");
  assert.equal(readable("#fff"), "#000000");
  assert.equal(readable("transparent"), "#000000");
  assert.equal(readable("#12345600"), "#000000");
  assert.equal(readable("#102030"), "#FFFFFF");
  assert.equal(readable("zz"), "#000000");
  assert.equal(readable(null), "#000000");
});

test("readElementScale", () => {
  const scale = createLoader()("core/utils/readElementScale.js");
  assert.deepEqual(scale(null), { scaleX: 1, scaleY: 1 });
  const element = { offsetWidth: 100, offsetHeight: 50, getBoundingClientRect: () => ({ width: 50, height: 100 }) };
  assert.deepEqual(scale(element), { scaleX: 0.5, scaleY: 2 });
  assert.deepEqual(scale({ offsetWidth: 0, offsetHeight: 0, getBoundingClientRect: () => ({ width: 5, height: 5 }) }), { scaleX: 1, scaleY: 1 });
});

test("utils orchestrator publishes exactly the six readers", () => {
  const orchestrator = createLoader()("core/utils/registerUtils.js");
  const _KDB = {};
  const utils = orchestrator(_KDB);
  assert.equal(utils, _KDB.utils);
  assert.deepEqual(Object.keys(utils).sort(),
    ["convertUnitToPx", "getTableConfigObject", "readCurrentTab", "readableTextColorForHex", "waitFor", "waitForElObserver"]);
});
