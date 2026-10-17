// W2 drillthrough: opener isolation, deferred-open timeout and destroy. The URL goldens stay in ws-d-drillthrough-url.test.mjs.
// Run: node --test tools/tests/w2-drillthrough-open.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const ENTRY = path.join(JS_ROOT, "core/services/drillthrough/index.js");
const LINKS = { pkzAnalysetool: { prod: "https://prod.example/pkz?run=1" } };
const BW_ROWS = [
  { level00: { text: "Magistrat", id: "mag" }, level01: { text: "Geschäftsgruppe Finanzen", id: "GGF#" }, level02: { text: "MA 05", id: "MA05#1" } }
];
const SPEC = {
  source: "icon", widgetId: "w1", kennzahlCode: "KZ_100", sicht: "BW", visType: "bar", selectedDimension: "Geschlecht",
  yearContext: { defaultYear: 2022 },
  orgSelection: { selectedValues: [{ idValue: "MA05#1", displayValue: "MA 05", level: 2 }] }
};

function fakeWindow() {
  const calls = { replace: [], closed: 0 };
  const handle = {
    closed: false,
    opener: "parent-window",
    close() { handle.closed = true; calls.closed += 1; },
    location: { replace: (url) => calls.replace.push(url) },
    document: { title: "", body: { firstChild: { textContent: "" }, textContent: "" }, open() {}, write() {}, close() {} }
  };
  return { handle, calls };
}

function quietConsole() {
  const errors = [];
  return { errors, log() {}, warn() {}, info() {}, debug() {}, error: (...args) => errors.push(args) };
}

function setup({ windowOpen, readRows = () => BW_ROWS, readPendingLoad = () => null, timeoutMs } = {}) {
  const con = quietConsole();
  const register = loadAmd(ENTRY, { stubs: { window: { location: { href: "https://cognos.example/x" }, open: (...a) => windowOpen(...a) }, console: con } });
  const KDB = { services: { tableData: { readRows, readPendingLoad, readTableState: () => ({ lifecycle: "ready" }) } }, config: { links: LINKS } };
  const service = register(KDB);
  return { service, con, KDB, timeoutMs };
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

test("opener: the opened window loses its opener, the URL and target stay the same", () => {
  const win = fakeWindow();
  const opened = [];
  const { service } = setup({ windowOpen: (...args) => (opened.push(args), win.handle) });
  const built = service.buildDrillthroughUrl(SPEC);
  const result = service.openDrillthrough(SPEC);
  assert.equal(result.ok, true);
  assert.deepStrictEqual(opened, [[built.url, "_blank"]]);
  assert.equal(win.handle.opener, null);
});

test("opener: the deferred wait window loses its opener as well", () => withFakeTimers(async () => {
  const win = fakeWindow();
  const { service } = setup({ windowOpen: () => win.handle, readRows: () => [], readPendingLoad: () => new Promise(() => {}) });
  const result = service.openDrillthrough(SPEC);
  assert.equal(result.ok, true);
  assert.equal(win.handle.opener, null);
}));

test("opener: a window.open result that rejects the opener write does not fail the open", () => {
  const handle = { get opener() { return null; }, set opener(_v) { throw new Error("cross-origin"); } };
  const { service, con } = setup({ windowOpen: () => handle });
  const result = service.openDrillthrough(SPEC);
  assert.equal(result.ok, true);
  assert.ok(con.errors.some((args) => String(args[0]).includes("detaching the opener")));
});

function withFakeTimers(run) {
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  const timers = new Map();
  let nextId = 1;
  globalThis.setTimeout = (fn, ms) => { timers.set(nextId, { fn, ms }); return nextId++; };
  globalThis.clearTimeout = (id) => { timers.delete(id); };
  return Promise.resolve(run(timers)).finally(() => {
    globalThis.setTimeout = realSetTimeout;
    globalThis.clearTimeout = realClearTimeout;
  });
}

test("timeout: a hierarchy load that never settles ends in the load-failed text after 120 s", () => withFakeTimers(async (timers) => {
  const win = fakeWindow();
  const { service, con } = setup({ windowOpen: () => win.handle, readRows: () => [], readPendingLoad: () => new Promise(() => {}) });
  service.openDrillthrough(SPEC);
  assert.equal(timers.size, 1);
  const [timer] = timers.values();
  assert.equal(timer.ms, 120000);
  timer.fn();
  assert.match(win.handle.document.body.textContent, /konnten nicht geladen werden/);
  assert.ok(con.errors.some((args) => String(args[0]).includes("timed out")));
  assert.equal(win.calls.replace.length, 0);
}));

test("timeout: settling the load clears the timer and a later timer callback does nothing", () => withFakeTimers(async (timers) => {
  const win = fakeWindow();
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const { service } = setup({ windowOpen: () => win.handle, readRows: () => [], readPendingLoad: () => pending });
  service.openDrillthrough(SPEC);
  const [timer] = timers.values();
  release();
  await pending;
  await tick();
  assert.equal(timers.size, 0);
  const before = win.handle.document.body.textContent;
  timer.fn();
  assert.equal(win.handle.document.body.textContent, before);
}));

test("timeout: a late fulfilment after the timeout does not navigate", () => withFakeTimers(async (timers) => {
  const win = fakeWindow();
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  let ready = false;
  const { service } = setup({ windowOpen: () => win.handle, readRows: () => (ready ? BW_ROWS : []), readPendingLoad: () => pending });
  service.openDrillthrough(SPEC);
  const [timer] = timers.values();
  timer.fn();
  ready = true;
  release();
  await pending;
  await tick();
  assert.deepStrictEqual(win.calls.replace, []);
}));

test("destroy: closes pending wait windows, cancels the timer and ignores a late fulfilment", () => withFakeTimers(async (timers) => {
  const win = fakeWindow();
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  let ready = false;
  const { service } = setup({ windowOpen: () => win.handle, readRows: () => (ready ? BW_ROWS : []), readPendingLoad: () => pending });
  service.openDrillthrough(SPEC);
  assert.equal(timers.size, 1);
  service.destroy();
  assert.equal(timers.size, 0);
  assert.equal(win.handle.closed, true);
  ready = true;
  release();
  await pending;
  await tick();
  assert.deepStrictEqual(win.calls.replace, []);
}));

test("destroy: is idempotent, later opens return DRILLTHROUGH_DISPOSED without window.open, build stays available", () => {
  const opened = [];
  const { service } = setup({ windowOpen: (...args) => (opened.push(args), fakeWindow().handle) });
  service.destroy();
  service.destroy();
  const result = service.openDrillthrough(SPEC);
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "DRILLTHROUGH_DISPOSED");
  assert.deepStrictEqual(opened, []);
  assert.equal(service.buildDrillthroughUrl(SPEC).ok, true);
});

test("destroy: a settled open is unaffected and keeps its window", () => withFakeTimers(async () => {
  const win = fakeWindow();
  let ready = false;
  const { service } = setup({ windowOpen: () => win.handle, readRows: () => (ready ? BW_ROWS : []), readPendingLoad: () => Promise.resolve() });
  service.openDrillthrough(SPEC);
  ready = true;
  await tick();
  service.destroy();
  assert.equal(win.handle.closed, false);
  assert.equal(win.calls.replace.length, 1);
}));
