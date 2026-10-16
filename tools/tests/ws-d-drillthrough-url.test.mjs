// Golden test for core/services/drillthrough: BuildResult of buildDrillthroughUrl for icon + datapoint specs, and openDrillthrough outcomes.
// Run: node --test tools/tests/ws-d-drillthrough-url.test.mjs
// Re-record expectations (review the diff!): RECORD=1 node tools/tests/ws-d-drillthrough-url.test.mjs --record
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const ENTRY = path.join(JS_ROOT, "core/services/drillthrough/__orchestratorDrillthrough.js");
const EXPECTED_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "ws-d-drillthrough-url.expected.json");
const RECORD = process.argv.includes("--record") || process.env.RECORD === "1";

const LINKS = {
  pkzAnalysetool: {
    dev: "https://dev.example/pkz?run=1",
    test: "https://test.example/pkz?run=1",
    prod: "https://prod.example/pkz?run=1"
  }
};

const BW_KEY = "dienststelle_bw_hierarchy";
const DEZPV_KEY = "dienststelle_dezpv_hierarchy";

const BW_ROWS = [
  { level00: { text: "Magistrat", id: "mag" }, level01: { text: "Geschäftsgruppe Finanzen", id: "GGF#" }, level02: { text: "MA 05", id: "MA05#1" } },
  { level00: { text: "Magistrat", id: "mag" }, level01: { text: "Geschäftsgruppe Finanzen", id: "GGF#" }, level02: { text: "MA 06", id: "MA06" } },
  { level00: { text: "Magistrat", id: "mag" }, level01: { text: "Geschäftsgruppe Bildung", id: "GGB#" }, level02: { text: "MA 10", id: "MA10#" } }
];

const DEZPV_ROWS = [
  { level0: { text: "DS_KAV|ALLE" }, level1: { text: "KAV Klinik A" } },
  { level0: { text: "DS_KAV|ALLE" }, level1: { text: "KAV Klinik B" } },
  { level0: { text: "DS_WSTW" }, level1: { text: "WSTW Werk 1" } },
  { level0: { text: "DS_WSTW" }, level1: { text: "WSTW Werk 2" } }
];

function quietConsole() {
  const errors = [];
  return { errors, log() {}, warn() {}, info() {}, debug() {}, error: (...args) => errors.push(args) };
}

function makeReadRows(overrides = {}) {
  return (descriptors) => {
    const key = descriptors && descriptors[0] && descriptors[0].tableName;
    if (Object.prototype.hasOwnProperty.call(overrides, key)) return overrides[key];
    if (key === BW_KEY) return BW_ROWS;
    if (key === DEZPV_KEY) return DEZPV_ROWS;
    return [];
  };
}

function loadService({ href = "https://cognos-test.example/x", links = LINKS, readRows = makeReadRows(), readPendingLoad = () => null, readTableState = () => ({ lifecycle: "ready" }), windowOpen = () => ({}) } = {}) {
  const con = quietConsole();
  const windowStub = { location: { href }, open: (...args) => windowOpen(...args) };
  const register = loadAmd(ENTRY, { stubs: { window: windowStub, console: con } });
  const KDB = { services: { tableData: { readRows, readPendingLoad, readTableState } }, config: { links } };
  const service = register(KDB);
  assert.equal(KDB.services.drillthrough, service);
  return { service, con, KDB };
}

const sel = (idValue, displayValue, level) => ({ idValue, displayValue, level });
const org = (...values) => ({ selectedValues: values });

const MAG = sel("mag", "Magistrat", 0);
const GGF = sel("GGF#", "Geschäftsgruppe Finanzen", 1);
const MA05 = sel("MA05#1", "MA 05", 2);
const MA06 = sel("MA06", "MA 06", 2);
const KAV_ROOT = sel("DS_KAV|ALLE", "DS_KAV|ALLE", 0);
const WSTW_CHILD = sel("WSTW Werk 1", "WSTW Werk 1", 1);

const icon = (extra) => ({ source: "icon", widgetId: "w1", kennzahlCode: "KZ_100", sicht: "BW", visType: "line", yearContext: {}, ...extra });
const dp = (extra) => ({ source: "datapoint", widgetId: "w2", kennzahlCode: "KZ_200", sicht: "BW", categories: [], ...extra });

const BUILD_CASES = [
  ["I1 icon line BW single level-2 node", icon({ orgSelection: org(MA05), selectedDimension: "Geschlecht", yearContext: { highestYearFromVis: 2024, highestYearFromJahrFilter: 2023, defaultYear: 2022 } })],
  ["I1b icon line BW filter year only", icon({ orgSelection: org(MA05), selectedDimension: "Geschlecht", yearContext: { highestYearFromJahrFilter: 2023, defaultYear: 2022 } })],
  ["I2 icon table (list) BW level-1 group", icon({ visType: "list", orgSelection: org(GGF), selectedDimension: "Altersgruppe", yearContext: { highestYearFromVis: null, highestYearFromJahrFilter: 2023 } })],
  ["I3 icon pie BW all children of group", icon({ visType: "pie", orgSelection: org(MA05, MA06), selectedDimension: "default", yearContext: { defaultYear: 2022 } })],
  ["I3b icon pie BW with dimension", icon({ visType: "pie", orgSelection: org(MA05, MA06), selectedDimension: "Berufsfamilie", yearContext: { highestYearFromVis: 2021 } })],
  ["I4 icon bar BW Magistrat level 0 dienststelle", icon({ visType: "bar", orgSelection: org(MAG), selectedDimension: "Dienststelle", yearContext: { defaultYear: 2022 } })],
  ["I5 icon line DEZPV root ALLE", icon({ sicht: "DEZPV", orgSelection: org(KAV_ROOT), selectedDimension: "Dienstverhältnis", yearContext: {} })],
  ["I6 icon bar DEZPV child + root, lehrlinge", icon({ visType: "bar", sicht: "DEZPV", orgSelection: org(WSTW_CHILD, KAV_ROOT), selectedDimension: "Lehrlinge", yearContext: { defaultYear: 2023 } })],
  ["I6b icon bar DEZPV dienststelle dim", icon({ visType: "bar", sicht: "DEZPV", orgSelection: org(WSTW_CHILD), selectedDimension: "Dienststelle", yearContext: { defaultYear: 2023 } })],
  ["I6c icon bar unmapped dimension", icon({ visType: "bar", sicht: "DEZPV", orgSelection: org(WSTW_CHILD), selectedDimension: "Unbekannt", yearContext: { defaultYear: 2023 } })],
  ["I7 icon without kennzahl and sicht, hostEnv dev", icon({ kennzahlCode: undefined, sicht: undefined, hostEnv: "dev", visType: "bar", selectedDimension: "Geschlecht", yearContext: { defaultYear: 2020 } })],
  ["I7b icon hostEnv from href -dev", icon({ visType: "bar", orgSelection: org(MA05), selectedDimension: "Geschlecht", yearContext: { defaultYear: 2020 } }), { href: "https://cognos-dev.example/x" }],
  ["I7c icon hostEnv prod via plain href", icon({ visType: "bar", orgSelection: org(MA05), selectedDimension: "Geschlecht", yearContext: { defaultYear: 2020 } }), { href: "https://cognos.example/x" }],
  ["D1 datapoint BW year+month names", dp({ orgSelection: org(MA05), categories: [{ columnId: "Jahr", label: "2023" }, { columnId: "Monat", label: "März" }, { columnId: "Geschlecht", label: "weiblich" }] })],
  ["D2 datapoint BW Magistrat + dienststelle category, year only", dp({ orgSelection: org(MAG), categories: [{ dataItemId: "year", value: 2022 }, { columnId: "Dienststelle", label: "MA 05" }] })],
  ["D2b datapoint BW non-mag dienststelle category", dp({ orgSelection: org(MA05), categories: [{ columnId: "Dienststelle", label: "MA 05" }] })],
  ["D3 datapoint DEZPV name category, month as value", dp({ sicht: "DEZPV", orgSelection: org(KAV_ROOT), categories: [{ name: "Berufsfamilie", label: "Pflege" }, { columnId: "Monat", value: 12 }] })],
  ["D4 datapoint category Lehrlinge unmatched", dp({ orgSelection: org(MA05), categories: [{ columnId: "Lehrlinge", label: "ja" }, { columnId: "Jahr", label: "2024" }] })],
  ["D4b datapoint first category wins", dp({ orgSelection: org(MA05), categories: [{ columnId: "Altersgruppe", label: "20-30" }, { columnId: "Geschlecht", label: "m" }] })],
  ["D4c datapoint without kennzahl and sicht", dp({ kennzahlCode: undefined, sicht: undefined, hostEnv: "test", categories: [] })],
  ["D4d datapoint categories missing", dp({ categories: undefined })],
  ["E1 spec null", null],
  ["E2 invalid source", { source: "x" }],
  ["E3 BW selection but hierarchy rows empty", icon({ orgSelection: org(MA05), selectedDimension: "Geschlecht" }), { readRows: makeReadRows({ [BW_KEY]: [] }) }],
  ["E3b DEZPV selection but hierarchy rows empty", icon({ sicht: "DEZPV", orgSelection: org(KAV_ROOT) }), { readRows: makeReadRows({ [DEZPV_KEY]: [] }) }],
  ["E3c no readRows dependency", icon({ orgSelection: org(MA05) }), { readRows: null }],
  ["E4 link missing for env", icon({ hostEnv: "dev" }), { links: { pkzAnalysetool: { test: "https://test.example/pkz?run=1" } } }],
  ["E5 host unresolved (empty href, no hostEnv)", icon({}), { href: "" }],
  ["O-ORG1 idValue with # in the middle", icon({ visType: "bar", orgSelection: org(sel("XY#42", "Unbekannte Stelle", 2)), selectedDimension: "Geschlecht" })],
  ["O-ORG2 idValue with trailing #", icon({ visType: "bar", orgSelection: org(sel("ABC#", "Stelle ABC", 2)), selectedDimension: "Geschlecht" })],
  ["O-ORG3 display with ~", icon({ visType: "bar", orgSelection: org(sel("A~B", "A~B", 2)), selectedDimension: "Geschlecht" })],
  ["O-ORG4 BW mag/level mismatch", icon({ visType: "bar", orgSelection: org(sel("mag", "Magistrat", 1), MA05), selectedDimension: "Geschlecht" })],
  ["O-ORG5 BW level-1 group of other branch + level-2", icon({ visType: "bar", orgSelection: org(sel("GGB#", "Geschäftsgruppe Bildung", 1), MA05), selectedDimension: "Geschlecht" })],
  ["O-ORG6 provided orgTree is used", icon({ visType: "bar", orgSelection: org(sel("Y1", "Y1", 2)), selectedDimension: "Geschlecht", orgTree: { nodesById: { 1: { id: 1, parent: [], children: [], levelRank: 2 } }, idToMember: { 1: { text: "Y1" } }, textToNodeId: { Y1: 1 } } })],
  ["O-ORG7 provided orgTree invalid", icon({ orgSelection: org(MA05), orgTree: {} })]
];

function summarize(result) {
  return {
    ok: result.ok,
    status: result.status,
    url: result.url,
    errorCode: result.errorCode,
    errorMessage: result.errorMessage,
    source: result.source,
    widgetId: result.widgetId,
    drillConfig: result.drillConfig,
    diagnostics: result.diagnostics
  };
}

function runBuildCase([, spec, options]) {
  const { service } = loadService(options);
  return summarize(service.buildDrillthroughUrl(spec));
}

const recorded = {};
const expected = RECORD || !fs.existsSync(EXPECTED_FILE) ? {} : JSON.parse(fs.readFileSync(EXPECTED_FILE, "utf8"));

for (const buildCase of BUILD_CASES) {
  const name = buildCase[0];
  test(`build: ${name}`, () => {
    const actual = JSON.parse(JSON.stringify(runBuildCase(buildCase)));
    if (RECORD) {
      recorded[name] = actual;
      return;
    }
    assert.ok(Object.prototype.hasOwnProperty.call(expected, name), `no recorded expectation for ${name}`);
    assert.deepStrictEqual(actual, expected[name]);
  });
}

function fakeWindow() {
  const calls = { replace: [], write: [], closed: 0 };
  const handle = {
    closed: false,
    close() {
      handle.closed = true;
      calls.closed += 1;
    },
    location: { replace: (url) => calls.replace.push(url) },
    document: {
      title: "",
      body: { firstChild: { textContent: "" }, textContent: "" },
      open() {},
      write: (html) => calls.write.push(html),
      close() {}
    }
  };
  return { handle, calls };
}

function openSummary(result) {
  return { ok: result.ok, errorCode: result.errorCode, errorMessage: result.errorMessage, url: result.url, source: result.source, widgetId: result.widgetId, diagnostics: result.diagnostics };
}

const OPEN_SPEC = icon({ visType: "bar", orgSelection: org(MA05), selectedDimension: "Geschlecht", yearContext: { defaultYear: 2022 } });

test("open O1: window.open returns null -> DRILLTHROUGH_OPEN_BLOCKED", () => {
  const { service } = loadService({ windowOpen: () => null });
  const result = openSummary(service.openDrillthrough(OPEN_SPEC));
  if (RECORD) {
    recorded["open O1"] = JSON.parse(JSON.stringify(result));
    return;
  }
  assert.equal(result.errorCode, "DRILLTHROUGH_OPEN_BLOCKED");
  assert.deepStrictEqual(JSON.parse(JSON.stringify(result)), expected["open O1"]);
});

test("open O2: success opens built url in _blank", () => {
  const opened = [];
  const { service } = loadService({ windowOpen: (...args) => (opened.push(args), {}) });
  const built = service.buildDrillthroughUrl(OPEN_SPEC);
  const result = service.openDrillthrough(OPEN_SPEC);
  assert.deepStrictEqual(opened, [[built.url, "_blank"]]);
  assert.equal(result.ok, true);
  assert.equal(result.url, built.url);
  assert.equal(result.diagnostics.operation, "openDrillthrough");
  const summary = JSON.parse(JSON.stringify(openSummary(result)));
  if (RECORD) {
    recorded["open O2"] = summary;
    return;
  }
  assert.deepStrictEqual(summary, expected["open O2"]);
});

test("open O3: build failure returns the failure with open operation and does not call window.open", () => {
  const opened = [];
  const { service } = loadService({ windowOpen: (...args) => (opened.push(args), {}), links: { pkzAnalysetool: {} } });
  const result = openSummary(service.openDrillthrough(icon({ hostEnv: "dev" })));
  assert.deepStrictEqual(opened, []);
  const summary = JSON.parse(JSON.stringify(result));
  if (RECORD) {
    recorded["open O3"] = summary;
    return;
  }
  assert.deepStrictEqual(summary, expected["open O3"]);
});

test("open O4: pending hierarchy load -> wait window, then navigates to the built url", async () => {
  const win = fakeWindow();
  let ready = false;
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const rows = makeReadRows();
  const { service } = loadService({
    windowOpen: () => win.handle,
    readRows: (d) => (ready ? rows(d) : []),
    readPendingLoad: () => pending,
    readTableState: () => ({ lifecycle: "ready" })
  });
  const result = service.openDrillthrough(OPEN_SPEC);
  const summary = JSON.parse(JSON.stringify(openSummary(result)));
  assert.equal(result.ok, true);
  assert.equal(result.url, null);
  assert.deepStrictEqual(result.diagnostics.warnings, [{ code: "DRILLTHROUGH_HIERARCHY_PENDING", message: "Hierarchy load already in flight." }]);
  assert.equal(win.calls.write.length, 1);
  assert.equal(win.handle.document.title, "Drillthrough");
  assert.match(win.handle.document.body.firstChild.textContent, /Geduld/);
  ready = true;
  release();
  await pending;
  await new Promise((resolve) => setImmediate(resolve));
  const built = service.buildDrillthroughUrl(OPEN_SPEC);
  assert.equal(built.ok, true);
  assert.deepStrictEqual(win.calls.replace, [built.url]);
  if (RECORD) {
    recorded["open O4"] = summary;
    return;
  }
  assert.deepStrictEqual(summary, expected["open O4"]);
});

test("open O5: pending load that stays without hierarchy -> tree-missing text in wait window", async () => {
  const win = fakeWindow();
  const { service } = loadService({
    windowOpen: () => win.handle,
    readRows: () => [],
    readPendingLoad: () => Promise.resolve(),
    readTableState: () => ({ lifecycle: "ready" })
  });
  service.openDrillthrough(OPEN_SPEC);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepStrictEqual(win.calls.replace, []);
  assert.match(win.handle.document.body.textContent, /Organisationsdaten/);
});

test("open O6: pending load rejects -> load-failed text in wait window", async () => {
  const win = fakeWindow();
  const { service, con } = loadService({
    windowOpen: () => win.handle,
    readRows: () => [],
    readPendingLoad: () => Promise.reject(new Error("boom")),
    readTableState: () => ({ lifecycle: "ready" })
  });
  service.openDrillthrough(OPEN_SPEC);
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(win.handle.document.body.textContent, /konnten nicht geladen werden/);
  assert.ok(con.errors.length >= 1);
});

test("open O7: pending load, popup blocked -> DRILLTHROUGH_OPEN_BLOCKED", () => {
  const { service } = loadService({ windowOpen: () => null, readRows: () => [], readPendingLoad: () => Promise.resolve() });
  const result = service.openDrillthrough(OPEN_SPEC);
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "DRILLTHROUGH_OPEN_BLOCKED");
});

test("open O8: window.open throws -> DRILLTHROUGH_OPEN_INTERNAL", () => {
  const { service } = loadService({ windowOpen: () => { throw new Error("popup exploded"); } });
  const result = service.openDrillthrough(OPEN_SPEC);
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "DRILLTHROUGH_OPEN_INTERNAL");
  assert.equal(result.errorMessage, "popup exploded");
});

test("service: labels merged under existing, service shape, no console.log on open", () => {
  const logged = [];
  const con = { log: (...args) => logged.push(args), warn() {}, info() {}, debug() {}, error() {} };
  const register = loadAmd(ENTRY, { stubs: { window: { location: { href: "https://x" }, open: () => ({}) }, console: con } });
  const KDB = { services: { tableData: { readRows: makeReadRows() } }, config: { links: LINKS, labels: { de: { drillthrough: { waitWindowTitle: "Eigener Titel" } } } } };
  const service = register(KDB);
  assert.equal(KDB.config.labels.de.drillthrough.waitWindowTitle, "Eigener Titel");
  assert.match(KDB.config.labels.de.drillthrough.loadFailedBody, /konnten nicht geladen werden/);
  assert.deepStrictEqual(Object.keys(service).sort(), ["buildDrillthroughUrl", "openDrillthrough"]);
  service.openDrillthrough(OPEN_SPEC);
  service.openDrillthrough(icon({ hostEnv: "dev", links: null }));
  assert.deepStrictEqual(logged, []);
});

if (RECORD) {
  process.on("beforeExit", () => {
    fs.writeFileSync(EXPECTED_FILE, `${JSON.stringify(recorded, null, 2)}\n`);
    console.log(`recorded ${Object.keys(recorded).length} expectations -> ${EXPECTED_FILE}`);
  });
}
