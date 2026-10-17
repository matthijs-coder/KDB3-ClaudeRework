// Replay handler registration of the 11 owners (Phase 2 W12): which phase (register or mount) stamps the history replay
// contribution, which keys it covers, and that the handler the history service holds for a key is that contribution.
// Run: node --test tools/tests/w12-replay-registration.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const quiet = { log() {}, info() {}, warn() {}, error() {}, debug() {} };
const DASHBOARD = path.join(JS_ROOT, "dashboard");

// owner (runtime key) -> [entry file relative to dashboard/, phase that stamps, replay keys]
const OWNERS = {
  kdbControl: ["canvas/kdbControl/index.js", "mount", ["kdbControl_settingsChange"]],
  header: ["header/index.js", "mount", ["header_chromeChange", "header_textChange"]],
  footer: ["footer/index.js", "mount", ["footer_chromeChange"]],
  singleSelect: ["filters/singleSelect/index.js", "register", ["filter_singleSelect"]],
  sicht: ["filters/sicht/index.js", "register", ["filter_sicht"]],
  dienststelle: ["filters/dienststelle/index.js", "register", ["filter_dienststelle"]],
  nativeMultiSelect: ["filters/nativeMultiSelect/index.js", "register", ["filter_nativeMultiSelect"]],
  widgetBase: ["widgets/widgetBase/index.js", "register", ["widget_canvasDrop", "widget_launchpadTransfer", "widget_layoutMove", "widget_layoutResize"]],
  widgetSettings: ["widgets/widgetSettings/index.js", "register", ["widgetSettings_optionSelect"]],
  widgetText: ["widgets/widgetText/index.js", "register", ["widget_textEdit"]],
  tabs: ["tabs/index.js", "register", ["tabs_move", "tabs_delete", "tabs_duplicate", "tabs_rename"]]
};

class FakeElement {
  constructor() { this.children = []; this.style = {}; this.attributes = {}; this.classList = { add() {}, remove() {}, toggle() {} }; this.parentNode = null; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return name in this.attributes ? this.attributes[name] : null; }
  removeAttribute() {}
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  insertBefore(child) { child.parentNode = this; this.children.push(child); return child; }
  removeChild() {}
  addEventListener() {}
  querySelector() { return null; }
  querySelectorAll() { return []; }
  contains() { return false; }
}

function createWorld() {
  const registered = [];
  const mounts = { ".pageViewContent": new FakeElement(), ".ba-common-tabList__container": new FakeElement() };
  const fakeDocument = {
    createElement: () => new FakeElement(),
    querySelector: (selector) => mounts[selector] || null,
    querySelectorAll: () => [],
    getElementById: () => null,
    addEventListener() {},
    location: { href: "https://host/bi/x/y", protocol: "https:", host: "host", origin: "https://host" }
  };
  const stubs = { console: quiet, document: fakeDocument, window: { top: {} } };
  const createEventBus = loadAmd(path.join(JS_ROOT, "core/events/createEventBus.js"), { stubs });
  const _KDB = {
    state: { tabs: { activeTabId: "t1", tabs: [{ tabId: "t1" }] } },
    runtime: {},
    api: {},
    services: {
      history: {
        registerReplayHandler: (key, handler) => { registered.push({ key, handler }); return () => {}; },
        pushCommittedStep: () => true
      }
    },
    utils: {},
    properties: {},
    events: createEventBus(),
    config: { options: {}, labels: { de: {} } },
    elements: { selectors: { root: { pageViewContent: ".pageViewContent", footerMountRoot: ".ba-common-tabList__container" } } }
  };
  return { _KDB, stubs, registered };
}

function runPhases(name) {
  const [file] = OWNERS[name];
  const world = createWorld();
  const register = loadAmd(path.join(DASHBOARD, file), { stubs: world.stubs });
  const read = () => (world._KDB.runtime[name] || {}).historyReplayHandlerContribution || null;
  register(world._KDB);
  const afterRegister = read();
  const registeredAfterRegister = world.registered.slice();
  try {
    world._KDB.api[name].mount({});
  } catch (error) {
    assert.fail(name + " mount threw: " + error);
  }
  const afterMount = read();
  world._KDB.api[name].destroy();
  return { world, afterRegister, registeredAfterRegister, afterMount };
}

for (const name of Object.keys(OWNERS)) {
  const [, phase, keys] = OWNERS[name];
  test(name + ": stamps its replay contribution and registers " + keys.length + " key(s) with the history service at " + phase, () => {
    const run = runPhases(name);
    if (phase === "register") {
      assert.equal(typeof (run.afterRegister || {}).apply, "function");
      assert.deepStrictEqual(run.registeredAfterRegister.map((entry) => entry.key), keys);
    } else {
      assert.equal(run.afterRegister, null);
      assert.deepStrictEqual(run.registeredAfterRegister, [], "nothing is registered before the mount stamps");
    }
    assert.equal(typeof (run.afterMount || {}).apply, "function");
    assert.deepStrictEqual(run.world.registered.map((entry) => entry.key), keys);
    run.world.registered.forEach((entry) => assert.strictEqual(entry.handler, run.afterMount, entry.key));
  });
}

test("the 11 owners together register exactly the 18 replay keys once each", () => {
  const all = Object.keys(OWNERS).flatMap((name) => runPhases(name).world.registered.map((entry) => entry.key));
  assert.equal(all.length, 18);
  assert.equal(new Set(all).size, 18);
});

test("a missing history service is a silent no-op for register and mount", () => {
  const warnings = [];
  const world = createWorld();
  delete world._KDB.services.history;
  const consoleStub = Object.assign({}, quiet, { warn: (...args) => warnings.push(args) });
  const register = loadAmd(path.join(DASHBOARD, OWNERS.widgetText[0]), { stubs: Object.assign({}, world.stubs, { console: consoleStub }) });
  register(world._KDB);
  assert.equal(typeof world._KDB.runtime.widgetText.historyReplayHandlerContribution.apply, "function");
  assert.deepStrictEqual(warnings, []);
});
