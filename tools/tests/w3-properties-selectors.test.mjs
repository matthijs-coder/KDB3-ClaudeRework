// core/properties/selectors.js: named reads over the Cognos content adapter and the loaded properties (W3, additive).
// Run: node --test tools/tests/w3-properties-selectors.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

function consoleSpy() {
  const errors = [];
  return { errors, stub: { error: (...args) => errors.push(args), warn() {}, log() {}, info() {}, debug() {} } };
}

function load(spy) {
  return loadAmd(path.join(JS_ROOT, "core/properties/selectors.js"), { stubs: { console: spy.stub } });
}

const kdbWith = (content, properties) => ({ runtime: { core: { adapters: { content } } }, properties });

test("readPropertyValue returns the raw host value and degrades to undefined with a log", () => {
  const spy = consoleSpy();
  const selectors = load(spy);
  const content = { getPropertyValue: (id) => ({ a: "raw", boom: undefined })[id] };
  assert.equal(selectors.readPropertyValue(kdbWith(content), "a"), "raw");
  assert.equal(selectors.readPropertyValue(kdbWith(content), "nope"), undefined);
  assert.equal(spy.errors.length, 0);

  for (const kdb of [{}, { runtime: {} }, kdbWith(null), kdbWith({}), kdbWith({ getPropertyValue: "no" })]) {
    assert.equal(selectors.readPropertyValue(kdb, "x"), undefined);
  }
  assert.equal(spy.errors.length, 5);
  assert.match(spy.errors[0][0], /content adapter unavailable/);

  const thrower = kdbWith({ getPropertyValue() { throw new Error("host"); } });
  assert.equal(selectors.readPropertyValue(thrower, "x"), undefined);
  assert.match(spy.errors[5][0], /getPropertyValue failed/);
});

test("readToggleProperty normalises like the boot loader", () => {
  const selectors = load(consoleSpy());
  const cases = [[true, true], [false, false], [null, false], [undefined, false], ["true", true], [" YES ", true], ["1", true], ["false", false],
    ["0", false], ["no", false], ["", false], ["maybe", true], [2, true], [0, false]];
  for (const [raw, expected] of cases) {
    assert.equal(selectors.readToggleProperty(kdbWith({ getPropertyValue: () => raw }), "T"), expected, String(raw));
  }
  assert.equal(selectors.readToggleProperty({}, "T"), false);
});

test("the facet delegates to the existing loader functions (no second copy of the logic)", () => {
  const selectors = load(consoleSpy());
  const loader = loadAmd(path.join(JS_ROOT, "core/properties/loadProperties.js"), { stubs: { console: consoleSpy().stub } });
  assert.equal(typeof loader.readPropertyValue, "function");
  assert.equal(typeof loader.loadProperties, "function");
  const kdb = kdbWith({ getPropertyValue: (id) => (id === "T" ? "yes" : "v") });
  assert.equal(selectors.readPropertyValue(kdb, "p"), loader.readPropertyValue(kdb, "p"));
  assert.equal(selectors.readToggleProperty(kdb, "T"), loader.readToggleProperty(kdb, "T"));
});

test("readLoadedProperty and isDeveloperModeEnabled read _KDB.properties without throwing", () => {
  const selectors = load(consoleSpy());
  assert.equal(selectors.readLoadedProperty({ properties: { filterPropObj: { a: 1 } } }, "filterPropObj").a, 1);
  assert.equal(selectors.readLoadedProperty({ properties: {} }, "filterPropObj"), undefined);
  assert.equal(selectors.readLoadedProperty({}, "filterPropObj"), undefined);
  assert.equal(selectors.readLoadedProperty(undefined, "filterPropObj"), undefined);
  assert.equal(selectors.isDeveloperModeEnabled({ properties: { KDBHideWidgetsToggle: true } }), true);
  for (const value of [false, "true", 1, undefined, null]) {
    assert.equal(selectors.isDeveloperModeEnabled({ properties: { KDBHideWidgetsToggle: value } }), false, String(value));
  }
  assert.equal(selectors.isDeveloperModeEnabled({}), false);
  assert.equal(selectors.isDeveloperModeEnabled(null), false);
});

test("isMultiStelleDefaultEnabled is true only for the boolean true on _KDB.properties", () => {
  const selectors = load(consoleSpy());
  assert.equal(selectors.isMultiStelleDefaultEnabled({ properties: { KDBMultiStelleDefaultToggle: true } }), true);
  for (const value of [false, "true", 1, undefined, null]) {
    assert.equal(selectors.isMultiStelleDefaultEnabled({ properties: { KDBMultiStelleDefaultToggle: value } }), false, String(value));
  }
  assert.equal(selectors.isMultiStelleDefaultEnabled({ properties: { KDBHideWidgetsToggle: true } }), false);
  assert.equal(selectors.isMultiStelleDefaultEnabled({}), false);
  assert.equal(selectors.isMultiStelleDefaultEnabled(null), false);
});

test("subscribePropertyChange registers on the content adapter and returns the matching off()", () => {
  const spy = consoleSpy();
  const selectors = load(spy);
  const calls = [];
  const content = {
    on(name, handler) { calls.push(["on", name, handler]); },
    off(name, handler) { calls.push(["off", name, handler, this === content]); }
  };
  const handler = () => {};
  const unsubscribe = selectors.subscribePropertyChange(kdbWith(content), "KDBHideWidgetsToggle", handler);
  assert.equal(typeof unsubscribe, "function");
  assert.deepEqual(calls, [["on", "KDBHideWidgetsToggle", handler]]);
  unsubscribe();
  assert.deepEqual(calls[1], ["off", "KDBHideWidgetsToggle", handler, true]);
  assert.equal(spy.errors.length, 0);
});

test("subscribePropertyChange without on/off returns null and logs once per call", () => {
  const spy = consoleSpy();
  const selectors = load(spy);
  for (const kdb of [{}, kdbWith(null), kdbWith({ on() {} }), kdbWith({ off() {} })]) {
    assert.equal(selectors.subscribePropertyChange(kdb, "e", () => {}), null);
  }
  assert.equal(spy.errors.length, 4);
  assert.match(spy.errors[0][0], /content adapter on\/off unavailable/);
});
