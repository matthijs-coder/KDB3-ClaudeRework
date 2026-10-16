// Unit tests for _____________KDB3API/KDB3/js/dashboard/widgets/widgetText (pure logic plus a minimal fake DOM).
// Run: node --test tools/tests/widgetText.test.mjs   (Node >= 22, no dependencies)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import vm from "node:vm";

const JS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../_____________KDB3API/KDB3/js");
const TEXT_DIR = resolve(JS_ROOT, "dashboard/widgets/widgetText");

const registry = new Map();

function loadAmd(absPath) {
  if (registry.has(absPath)) return registry.get(absPath);
  const source = readFileSync(absPath, "utf8");
  let exported;
  const define = (deps, factory) => {
    const args = deps.map((dep) => loadAmd(resolve(dirname(absPath), dep)));
    exported = factory(...args);
  };
  vm.runInThisContext(`(function (define) {\n${source}\n})`, { filename: absPath })(define);
  registry.set(absPath, exported);
  return exported;
}

const load = (name) => loadAmd(resolve(TEXT_DIR, name));

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag;
    this.attributes = {};
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.textContent = "";
    this.id = "";
    this.contentEditable = "inherit";
    this.classList = { add() {}, remove() {}, contains: () => false };
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
  removeAttribute(name) {
    delete this.attributes[name];
  }
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    this.children = this.children.filter((c) => c !== child);
    child.parentNode = null;
    return child;
  }
  contains(other) {
    return other === this;
  }
}

function installFakeDocument() {
  const head = new FakeElement("head");
  const byId = new Map();
  globalThis.document = {
    head,
    createElement: (tag) => new FakeElement(tag),
    getElementById: (id) => {
      if (byId.has(id)) return byId.get(id);
      return head.children.find((el) => el.id === id) || null;
    }
  };
  return { head, register: (id, el) => byId.set(id, el) };
}

function createKdb(extra = {}) {
  return {
    state: { widgets: {} },
    runtime: {},
    api: {},
    services: { cognosHost: { widgets: { setWidgetProperty: async () => ({ ok: true }) } }, ...extra }
  };
}

test("normalizeTextColor accepts everything the real producer emits", () => {
  const readable = loadAmd(resolve(JS_ROOT, "core/utils/readableTextColorForHex.js"));
  const { normalizeTextColor } = load("textStyle.js");
  const backgrounds = ["#ffffff", "#000000", "#FFF", "#336699", "transparent", "", "#12345678", "#ABC", "zzz", "#00000000"];
  for (const background of backgrounds) {
    const produced = readable(background);
    assert.equal(normalizeTextColor(produced), produced, `producer value ${produced} for ${background}`);
  }
  assert.equal(normalizeTextColor("#FFFFFF"), "#FFFFFF");
  assert.equal(normalizeTextColor("  #fff  "), "#fff");
  assert.equal(normalizeTextColor("rgb(0, 0, 0)"), "rgb(0, 0, 0)");
  assert.equal(normalizeTextColor("rgba(255,255,255,.5)"), "rgba(255,255,255,.5)");
  assert.equal(normalizeTextColor("RGBA(10%, 20%, 30%, 0.5)"), "RGBA(10%, 20%, 30%, 0.5)");
});

test("normalizeTextColor rejects anything that could break out of the style rule", () => {
  const { normalizeTextColor } = load("textStyle.js");
  const bad = [
    "red; } body{display:none} x{",
    "red",
    "#12345",
    "#ggg",
    "url(http://x)",
    "rgb(1,2,3) !important",
    "rgb(1,2,3); x",
    "rgb(1,2)",
    "}",
    "",
    null,
    undefined
  ];
  for (const value of bad) {
    assert.equal(normalizeTextColor(value), null, String(value));
  }
});

test("applyReadableTextColor writes only validated colours and removeAllScopedStyles clears them", () => {
  const dom = installFakeDocument();
  const kdb = createKdb();
  const textStyle = load("textStyle.js");
  const invalid = textStyle.applyReadableTextColor(kdb, "w1", "red; } body{display:none} x{");
  assert.deepEqual(invalid, { ok: false, errorCode: "WIDGET_TEXT_COLOR_VALUE_INVALID" });
  assert.equal(dom.head.children.length, 0);

  const ok = textStyle.applyReadableTextColor(kdb, "w1", "#FFFFFF");
  assert.equal(ok.ok, true);
  assert.equal(ok.styleElementId, "KDB_widgetTextColor_w1");
  assert.match(dom.head.children[0].textContent, /color: #FFFFFF !important;/);

  textStyle.applyFixedFontSize(kdb, "w1", "14");
  assert.equal(dom.head.children.length, 2);
  const runtime = kdb.runtime.widgetText.byId.w1;
  textStyle.removeAllScopedStyles(runtime, "w1");
  assert.equal(dom.head.children.length, 0);
});

test("reducer keeps the persisted record shape", () => {
  const { createInitialWidgetTextState, reduceWidgetText } = load("state.js");
  const types = load("config/actionTypes.js");
  let state = createInitialWidgetTextState();
  state = reduceWidgetText(state, { type: types.REGISTER_CONTENT, widgetId: "w1", payload: { text: "Hallo" } });
  assert.deepEqual(state.byId.w1, {
    widgetId: "w1",
    content: { text: "Hallo" },
    pending: { kind: null, opSeq: null },
    errorCode: null,
    errorMessage: null
  });
  state = reduceWidgetText(state, { type: types.COMMIT_TEXT_CONTENT, widgetId: "w1", payload: { text: "Neu" } });
  assert.equal(state.byId.w1.content.text, "Neu");
  state = reduceWidgetText(state, { type: types.CLEANUP_CONTENT_SUCCEEDED, widgetId: "w1", payload: { reason: "remove" } });
  assert.deepEqual(state.byId, {});
  assert.equal(reduceWidgetText(state, { type: types.DESTROY }).lifecycle, "disposed");
});

test("history: replay handler only knows widget_textEdit; pushed step keeps key and shape", async () => {
  const history = load("history.js");
  const pushed = [];
  const kdb = createKdb({ history: { pushCommittedStep: (step) => (pushed.push(step), true) } });
  assert.deepEqual(history.pushTextEditHistory(kdb, "w1", "a", "b"), { ok: true });
  assert.equal(pushed[0].key, "widget_textEdit");
  assert.deepEqual(pushed[0].old, { widgetId: "w1", text: "a" });
  assert.deepEqual(pushed[0].new, { widgetId: "w1", text: "b" });

  const handler = history.createWidgetTextReplayHandler();
  assert.equal(handler.apply(kdb, {}, { key: "other" }), false);
  const dispatched = [];
  kdb.api.widgetText = { dispatch: async (action) => (dispatched.push(action), { ok: true }) };
  assert.equal(await handler.apply(kdb, { widgetId: "w1", text: "x" }, { key: "widget_textEdit" }), true);
  assert.equal(dispatched[0].type, "widgetText/commitTextEdit");
  assert.equal(dispatched[0].payload.isHistoryReplay, true);
  assert.equal(await handler.apply(kdb, {}, { key: "widget_textEdit" }), false);
});

test("module: registration stamps, routing codes, unknown actions and disposed guard", async () => {
  installFakeDocument();
  const kdb = createKdb();
  const register = load("index.js");
  const controller = register(kdb, {});
  assert.equal(kdb.api.widgetText, controller);
  assert.equal(typeof kdb.runtime.widgetText.historyReplayHandlerContribution.apply, "function");
  assert.equal(kdb.runtime.widgetText.widgetsFacet, kdb.services.cognosHost.widgets);
  assert.equal(controller.mount({}), true);
  assert.equal(controller.getState().lifecycle, "ready");

  assert.equal((await controller.dispatch({})).errorCode, "WIDGET_TEXT_UNKNOWN_ACTION");
  assert.equal((await controller.dispatch({ type: "widgetText/scaffoldNoop" })).errorCode, "WIDGET_TEXT_UNKNOWN_ACTION");
  assert.equal((await controller.dispatch({ type: "widgetText/commitTextEdit" })).errorCode, "WIDGET_TEXT_WIDGET_ID_MISSING");
  assert.equal(
    (await controller.dispatch({ type: "widgetText/applyFontSize", widgetId: "a", payload: { widgetId: "b" } })).errorCode,
    "WIDGET_TEXT_WIDGET_ID_CONFLICT"
  );
  const title = await controller.dispatch({ type: "widgetText/applyTitle", widgetId: "w1" });
  assert.equal(title.ok, true);
  assert.equal(title.skipped, true);
  assert.equal(title.reasonCode, "WIDGET_TEXT_TITLE_DROPDOWN_DISPLAY_ONLY");

  const missingColour = await controller.dispatch({ type: "widgetText/applyReadableTextColor", widgetId: "w1", payload: {} });
  assert.equal(missingColour.errorCode, "WIDGET_TEXT_COLOR_VALUE_MISSING");
  const badColour = await controller.dispatch({
    type: "widgetText/applyReadableTextColor",
    widgetId: "w1",
    payload: { textColor: "red; } body{display:none}" }
  });
  assert.equal(badColour.ok, false);
  assert.equal(badColour.errorCode, "WIDGET_TEXT_COLOR_VALUE_INVALID");
  const goodColour = await controller.dispatch({
    type: "widgetText/applyReadableTextColor",
    widgetId: "w1",
    payload: { textColor: "#000000" }
  });
  assert.equal(goodColour.ok, true);
  assert.equal(goodColour.status, "success");

  const shellMissing = await controller.dispatch({ type: "widgetText/applyRestyle", widgetId: "missing" });
  assert.equal(shellMissing.errorCode, "WIDGET_TEXT_RESTYLE_TARGET_MISSING");
  assert.equal(kdb.state.widgets.text.byId.missing, undefined);

  controller.destroy();
  assert.equal(controller.getState(), undefined);
  assert.equal(controller.mount({}), false);
  const afterDestroy = await controller.dispatch({ type: "widgetText/applyTitle", widgetId: "w1" });
  assert.equal(afterDestroy.ok, false);
  assert.equal(afterDestroy.reason, "disposed");
  assert.equal(kdb.runtime.widgetText.historyReplayHandlerContribution, null);
  assert.equal(kdb.runtime.widgetText.widgetsFacet, kdb.services.cognosHost.widgets);
});

test("cleanup during an open inline edit ends contenteditable, restores the text and removes the style elements", async () => {
  const dom = installFakeDocument();
  const kdb = createKdb();
  const register = load("index.js");
  const controller = register(kdb, {});
  controller.mount({});

  const shell = new FakeElement("div");
  const editable = new FakeElement("div");
  const span = new FakeElement("span");
  span.textContent = "typed text";
  const paragraph = new FakeElement("p");
  editable.contentEditable = "true";
  editable.setAttribute("data-kdb-text-edit-active", "1");
  shell.querySelector = (selector) => (selector.includes("Editable") || selector.includes("editable") ? editable : null);
  shell.contains = (el) => el === editable;
  editable.querySelector = (selector) => (selector === "p" ? paragraph : selector === "span" ? span : null);
  dom.register("w1", shell);

  const widgetRuntime = load("widgetRuntime.js");
  const runtime = widgetRuntime.ensureWidgetRuntime(kdb, "w1");
  runtime.editSession = { isActive: true, originalText: "original", startedAt: 1 };
  runtime.domRefs = { shellEl: shell, editableEl: editable, paragraphEl: paragraph, spanEl: span };
  const abortController = new AbortController();
  runtime.abortControllers.edit = abortController;
  load("textStyle.js").applyReadableTextColor(kdb, "w1", "#000000");
  assert.equal(dom.head.children.length, 1);

  const result = await controller.dispatch({ type: "widgetText/cleanupContent", widgetId: "w1", payload: { reason: "remove" } });
  assert.equal(result.ok, true);
  assert.equal(editable.contentEditable, "false");
  assert.equal(editable.attributes["data-kdb-text-edit-active"], undefined);
  assert.equal(span.textContent, "original");
  assert.equal(abortController.signal.aborted, true);
  assert.equal(dom.head.children.length, 0);
  assert.equal(kdb.runtime.widgetText.byId.w1, undefined);

  runtime.editSession = { isActive: false, originalText: null, startedAt: null };
  const second = widgetRuntime.ensureWidgetRuntime(kdb, "w2");
  second.editSession = { isActive: true, originalText: "keep", startedAt: 1 };
  second.domRefs = { shellEl: shell, editableEl: editable, paragraphEl: paragraph, spanEl: span };
  editable.contentEditable = "true";
  controller.destroy();
  assert.equal(editable.contentEditable, "false");
  assert.deepEqual(kdb.runtime.widgetText.byId, {});
});

function createTextWidgetFixture(dom, widgetId, text) {
  const config = load("config.js");
  const listeners = {};
  const editable = new FakeElement("div");
  const paragraph = new FakeElement("p");
  const span = new FakeElement("span");
  span.textContent = text;
  paragraph.textContent = text;
  editable.addEventListener = (type, handler, options) => {
    listeners[type] = { handler, options };
  };
  editable.focus = () => {};
  editable.contains = (el) => el === editable;
  editable.querySelector = (selector) => (selector === "p" ? paragraph : selector === "span" ? span : null);
  editable.querySelectorAll = () => [span];
  const shell = new FakeElement("div");
  shell.querySelector = (selector) => (selector === config.contentWrapperSelector ? null : editable);
  shell.contains = (el) => el === editable;
  dom.register(widgetId, shell);
  return { shell, editable, paragraph, span, listeners };
}

test("inline edit: Escape cancels and restores, blur commits through history, listener timer is tracked", async () => {
  const dom = installFakeDocument();
  globalThis.window = { getSelection: () => ({ removeAllRanges() {}, addRange() {} }), dispatchEvent() {} };
  globalThis.document.createRange = () => ({ selectNodeContents() {} });
  const pushed = [];
  const kdb = createKdb({ history: { pushCommittedStep: (step) => (pushed.push(step), true) } });
  const controller = load("index.js")(kdb, {});
  controller.mount({});
  const fixture = createTextWidgetFixture(dom, "w1", "before");

  const started = await controller.dispatch({ type: "widgetText/commitTextEdit", widgetId: "w1", payload: {} });
  assert.equal(started.ok, true);
  const runtime = kdb.runtime.widgetText.byId.w1;
  assert.equal(fixture.editable.contentEditable, "true");
  assert.equal(runtime.editSession.isActive, true);
  assert.equal(Object.keys(runtime.timers).includes("editArm"), true);
  assert.equal(fixture.listeners.keydown, undefined);
  assert.equal(runtime.listeners.editKeyDown, undefined);

  await new Promise((done) => setTimeout(done, 5));
  assert.equal(typeof fixture.listeners.keydown.handler, "function");
  assert.equal(Object.keys(runtime.timers).includes("editArm"), false);

  fixture.span.textContent = "typed";
  let prevented = false;
  fixture.listeners.keydown.handler({ key: "Escape", preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(fixture.editable.contentEditable, "false");
  assert.equal(fixture.span.textContent, "before");
  assert.equal(pushed.length, 0);

  await controller.dispatch({ type: "widgetText/commitTextEdit", widgetId: "w1", payload: {} });
  await new Promise((done) => setTimeout(done, 5));
  fixture.paragraph.textContent = "after";
  fixture.listeners.focusout.handler({ relatedTarget: null });
  await new Promise((done) => setTimeout(done, 5));
  assert.equal(fixture.editable.contentEditable, "false");
  assert.equal(pushed.length, 1);
  assert.deepEqual(pushed[0].old, { widgetId: "w1", text: "before" });
  assert.deepEqual(pushed[0].new, { widgetId: "w1", text: "after" });
  assert.equal(kdb.state.widgets.text.byId.w1, undefined, "record is only created by contentCreate");
});

test("destroy before the edit-arming timer fires leaves no listener behind", async () => {
  const dom = installFakeDocument();
  globalThis.window = { getSelection: () => ({ removeAllRanges() {}, addRange() {} }), dispatchEvent() {} };
  globalThis.document.createRange = () => ({ selectNodeContents() {} });
  const kdb = createKdb();
  const controller = load("index.js")(kdb, {});
  controller.mount({});
  const fixture = createTextWidgetFixture(dom, "w1", "before");
  await controller.dispatch({ type: "widgetText/commitTextEdit", widgetId: "w1", payload: {} });
  controller.destroy();
  await new Promise((done) => setTimeout(done, 5));
  assert.equal(fixture.listeners.keydown, undefined);
  assert.equal(fixture.listeners.focusout, undefined);
  assert.equal(fixture.editable.contentEditable, "false");
  assert.equal(fixture.editable.attributes["data-kdb-text-edit-active"], undefined);
});

function quietConsoleError(fn) {
  const original = console.error;
  const calls = [];
  console.error = (...args) => calls.push(args);
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      console.error = original;
    })
    .then((value) => ({ value, calls }));
}

function setupEditorEnv() {
  const dom = installFakeDocument();
  globalThis.window = { getSelection: () => ({ removeAllRanges() {}, addRange() {} }), dispatchEvent() {} };
  globalThis.document.createRange = () => ({ selectNodeContents() {} });
  return dom;
}

function throwingShell(dom, widgetId) {
  const shell = new FakeElement("div");
  shell.querySelector = () => {
    throw new Error("boom " + widgetId);
  };
  dom.register(widgetId, shell);
  return shell;
}

test("parameter-set restore isolates a throwing entry: others restored, old per-entry diagnostic recorded", async () => {
  const dom = setupEditorEnv();
  const kdb = createKdb();
  const controller = load("index.js")(kdb, {});
  controller.mount({});
  const w1 = createTextWidgetFixture(dom, "w1", "x");
  throwingShell(dom, "w2");
  const w3 = createTextWidgetFixture(dom, "w3", "x");

  const { value: result, calls } = await quietConsoleError(() => controller.dispatch({
    type: "widgetText/parameterSetRestoreRequested",
    payload: {
      runId: 1,
      skipHistory: true,
      widgets: [{ kind: "txt", text: "A" }, { kind: "txt", text: "B" }, { kind: "txt", text: "C" }],
      widgetCorrelation: { 0: { widgetId: "w1" }, 1: { widgetId: "w2" }, 2: { widgetId: "w3" } }
    }
  }));
  assert.equal(result.ok, false);
  assert.equal(w1.span.textContent, "A");
  assert.equal(w3.span.textContent, "C");
  assert.ok(calls.length >= 1);
  assert.deepEqual(result.diagnostics.map((d) => [d.code, d.entryIndex]), [["WRITEBACK_WIDGET_RESTORE_FAILED", "1"]]);
  assert.match(result.diagnostics[0].message, /widgetId w2: WIDGET_TEXT_CONTENT_CREATE_FAILED/);
  assert.equal(kdb.state.widgets.text.lifecycle, "ready", "no module-level error state for restore");
});

test("parameter-set reset isolates a throwing entry and still cleans the others", async () => {
  const dom = setupEditorEnv();
  const kdb = createKdb();
  const controller = load("index.js")(kdb, {});
  controller.mount({});
  createTextWidgetFixture(dom, "w1", "x");
  createTextWidgetFixture(dom, "w2", "x");
  createTextWidgetFixture(dom, "w3", "x");
  for (const id of ["w1", "w2", "w3"]) {
    assert.equal((await controller.dispatch({ type: "widgetText/contentCreate", widgetId: id, payload: {} })).ok, true);
  }
  const bad = kdb.runtime.widgetText.byId.w2;
  bad.editSession = { isActive: true, originalText: "x", startedAt: 1 };
  bad.domRefs = { shellEl: throwingShell(dom, "w2") };

  const { value: result } = await quietConsoleError(() => controller.dispatch({
    type: "widgetText/parameterSetResetRequested",
    payload: { runId: 2, widgetIds: ["w1", "w2", "w3"] }
  }));
  assert.equal(result.ok, false);
  assert.equal(result.status, "error");
  assert.deepEqual(result.diagnostics.map((d) => [d.code, d.widgetId]), [["WRITEBACK_WIDGET_RESET_FAILED", "w2"]]);
  assert.equal(kdb.state.widgets.text.byId.w1, undefined);
  assert.equal(kdb.state.widgets.text.byId.w3, undefined);
});

test("a throwing automatic refit does not fail a committed edit; reflow failure only flags diagnostics", async () => {
  const dom = setupEditorEnv();
  const pushed = [];
  const kdb = createKdb({ history: { pushCommittedStep: (step) => (pushed.push(step), true) } });
  const controller = load("index.js")(kdb, {});
  controller.mount({});
  const fixture = createTextWidgetFixture(dom, "w1", "old");
  await controller.dispatch({ type: "widgetText/contentCreate", widgetId: "w1", payload: {} });

  const originalStyle = fixture.span.style;
  fixture.span.style = new Proxy({}, { set() { throw new Error("style boom"); } });
  const { value: committed, calls } = await quietConsoleError(() => controller.dispatch({
    type: "widgetText/commitTextEdit", widgetId: "w1", payload: { nextText: "new" }
  }));
  assert.equal(committed.ok, true);
  assert.equal(committed.status, "success");
  assert.equal(kdb.state.widgets.text.byId.w1.content.text, "new");
  assert.equal(pushed.length, 1);
  assert.ok(calls.some((args) => String(args[0]).includes("refitAutomaticFont")));
  fixture.span.style = originalStyle;

  Object.defineProperty(fixture.editable, "offsetHeight", { get() { throw new Error("layout boom"); } });
  const { value: fontResult } = await quietConsoleError(() => controller.dispatch({
    type: "widgetText/applyFontSize", widgetId: "w1", payload: { nextValue: "automatic" }
  }));
  assert.equal(fontResult.ok, true);
  assert.equal(fontResult.reportToSettings.diagnostics.reflow, false);
});

test("a throwing history push maps to WIDGET_TEXT_HISTORY_COMMIT_FAILED with the message", async () => {
  const dom = setupEditorEnv();
  const kdb = createKdb({ history: { pushCommittedStep: () => { throw new Error("history boom"); } } });
  const controller = load("index.js")(kdb, {});
  controller.mount({});
  createTextWidgetFixture(dom, "w1", "old");
  await controller.dispatch({ type: "widgetText/contentCreate", widgetId: "w1", payload: {} });
  const { value: result } = await quietConsoleError(() => controller.dispatch({
    type: "widgetText/commitTextEdit", widgetId: "w1", payload: { nextText: "new" }
  }));
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "WIDGET_TEXT_HISTORY_COMMIT_FAILED");
  assert.equal(result.errorMessage, "history boom");
});

test("route lookup uses own properties only", async () => {
  installFakeDocument();
  const kdb = createKdb();
  const controller = load("index.js")(kdb, {});
  controller.mount({});
  for (const type of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
    assert.equal((await controller.dispatch({ type, widgetId: "w1" })).errorCode, "WIDGET_TEXT_UNKNOWN_ACTION", type);
  }
  assert.equal(kdb.state.widgets.text.lifecycle, "ready");
});
