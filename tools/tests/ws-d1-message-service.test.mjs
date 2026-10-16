// Golden tests for core/services/messageService (WS-D1). They lock the public surface and DOM contract through
// the stable entry core/services/messageService/__orchestratorMessageService.js.
// Run: node --test tools/tests/ws-d1-message-service.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";
import { createEnv } from "./ws-d1-fake-dom.mjs";

const ENTRY = path.join(JS_ROOT, "core/services/messageService/__orchestratorMessageService.js");

function setup(options = {}) {
  const writes = [];
  const navigator = {
    clipboard: options.noClipboard ? null : { writeText: (text) => { writes.push(text); return Promise.resolve(); } }
  };
  const env = createEnv({ navigator });
  if (options.insecure) env.window.isSecureContext = false;
  const toasts = [];
  const facet = { showToast: (message, severity) => { toasts.push({ message, severity }); return { ok: true }; } };
  const _KDB = {
    services: { cognosHost: { messages: options.noFacet ? null : facet } },
    elements: { selectors: { root: { dashboardFrame: ".dashboardFrame" } } },
    config: { labels: { de: options.labels ? { message: options.labels } : {} } }
  };
  const register = loadAmd(ENTRY, { stubs: env.stubs });
  const service = register(_KDB);
  return { env, _KDB, service, register, toasts, writes, facet };
}

const notifications = (env) => env.document.querySelectorAll(".kdb-message-notification");
const backdrops = (env) => env.document.querySelectorAll(".kdb-message-backdrop");
const button = (env, action) => env.document.querySelector("[data-kdb-message-action='" + action + "']");
const clickButton = (env, el) => backdrops(env)[0].dispatch({ type: "click", target: el });
const key = (env, name, target) => backdrops(env)[0].dispatch({ type: "keydown", key: name, target: target || backdrops(env)[0] });
const flushMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

function createAnchor(env, rect) {
  const anchor = env.document.createElement("button");
  if (rect) anchor.rect = rect;
  env.document.body.appendChild(anchor);
  return anchor;
}

function triggerObservers(env) {
  env.FakeMutationObserver.instances.forEach((o) => o.trigger());
  env.clock.flushFrames();
}

test("register: service surface, labels merge, selectors, runtime stamp, returns existing service", () => {
  const { _KDB, service, register } = setup({ labels: { close: "Zu" } });
  assert.deepEqual(Object.keys(service).sort(), ["choose", "confirm", "destroy", "notify", "notifyAnchored", "showAlert", "showCopyable"]);
  assert.equal(_KDB.services.message, service);
  assert.equal(register(_KDB), service);
  assert.equal(_KDB.config.labels.de.message.close, "Zu");
  assert.equal(_KDB.config.labels.de.message.cancel, "Nein");
  assert.equal(_KDB.config.labels.de.message.title, "Meldung");
  assert.equal(_KDB.elements.selectors.messageService.root, "#kdb-message-root");
  const runtime = _KDB.runtime.messageService;
  assert.equal(runtime.messagesFacet, _KDB.services.cognosHost.messages);
  assert.equal(runtime.queues.activeModalRequest, null);
  assert.deepEqual(runtime.queues.modalRequests, []);
  assert.deepEqual(runtime.domRefs.globalNotifications, []);
  assert.deepEqual(runtime.domRefs.anchoredNotifications, []);
});

test("notify info: global notification in the message root, centred and stacked, closes by button and by timer", () => {
  const { env, service } = setup();
  assert.equal(service.notify({ message: "Hallo", severity: "info" }), undefined);
  service.notify({ message: "Zwei" });
  const root = env.document.querySelector("#kdb-message-root");
  assert.equal(root.className, "kdb-message-root");
  assert.equal(root.getAttribute("data-kdb-owner"), "messageService");
  assert.equal(root.parentNode, env.document.body);
  const list = notifications(env);
  assert.equal(list.length, 2);
  assert.equal(list[0].className, "kdb-message-notification kdb-message-notification--info");
  assert.equal(list[0].getAttribute("role"), "status");
  assert.equal(list[0].querySelector(".kdb-message-notification__text").textContent, "Hallo");
  assert.equal(list[0].querySelector(".kdb-message-notification__close").getAttribute("aria-label"), "Schließen");
  assert.deepEqual([list[0].style.left, list[0].style.top], ["450px", "8px"]);
  assert.deepEqual([list[1].style.left, list[1].style.top], ["450px", "36px"]);

  list[0].querySelector(".kdb-message-notification__close").click();
  assert.equal(notifications(env).length, 1);
  assert.equal(notifications(env)[0].style.top, "8px");
  env.clock.advance(14999);
  assert.equal(notifications(env).length, 1);
  env.clock.advance(1);
  assert.equal(notifications(env).length, 0);
});

test("notify: non-info severity goes through the cognosHost messages facet; durationMs 0 stays open", () => {
  const { env, service, toasts } = setup();
  service.notify({ message: "Fehler", severity: "error" });
  service.notify({ message: "Ok", severity: "success" });
  assert.deepEqual(toasts, [{ message: "Fehler", severity: "error" }, { message: "Ok", severity: "success" }]);
  assert.equal(notifications(env).length, 0);
  service.notify({ message: "Bleibt", durationMs: 0 });
  env.clock.advance(60000);
  assert.equal(notifications(env).length, 1);
});

test("notify: missing facet is logged and never thrown from the public method", () => {
  const { env, service } = setup({ noFacet: true });
  assert.doesNotThrow(() => service.notify({ message: "x", severity: "warning" }));
  assert.ok(env.console.calls.error.length >= 1);
  assert.equal(notifications(env).length, 0);
});

test("notifyAnchored: positioned under the anchor, stacked per anchor, deduped by dedupeKey or code", () => {
  const { env, service } = setup();
  const anchor = createAnchor(env, { left: 10, top: 10, right: 210, bottom: 50, width: 200, height: 40 });
  const other = createAnchor(env, { left: 300, top: 10, right: 500, bottom: 50, width: 200, height: 40 });
  service.notifyAnchored({ anchor, message: "A", severity: "warning", dedupeKey: "k1" });
  service.notifyAnchored({ anchor, message: "A again", severity: "warning", dedupeKey: "k1" });
  service.notifyAnchored({ anchor, message: "B", code: "c2" });
  service.notifyAnchored({ anchor, message: "B again", code: "c2" });
  service.notifyAnchored({ anchor: other, message: "C", dedupeKey: "k1" });
  const list = notifications(env);
  assert.equal(list.length, 3);
  assert.equal(list[0].className, "kdb-message-notification kdb-message-notification--warning");
  assert.deepEqual([list[0].style.left, list[0].style.top], ["60px", "58px"]);
  assert.deepEqual([list[1].style.left, list[1].style.top], ["60px", "86px"]);
  assert.deepEqual([list[2].style.left, list[2].style.top], ["350px", "58px"]);
  env.clock.advance(4999);
  assert.equal(notifications(env).length, 3);
  env.clock.advance(1);
  assert.equal(notifications(env).length, 0);
});

test("notifyAnchored: anchor not connected falls back to a global notification", () => {
  const { env, service } = setup();
  const detached = env.document.createElement("div");
  service.notifyAnchored({ anchor: detached, message: "Fallback" });
  const list = notifications(env);
  assert.equal(list.length, 1);
  assert.equal(list[0].querySelector(".kdb-message-notification__text").textContent, "Fallback");
  assert.equal(list[0].style.top, "8px");
});

test("notifyAnchored: anchor disappearing moves the toast to the global position once", () => {
  const { env, service } = setup();
  const anchor = createAnchor(env);
  service.notifyAnchored({ anchor, message: "Weg", severity: "info" });
  assert.equal(notifications(env).length, 1);
  assert.equal(notifications(env)[0].style.top, "58px");
  env.document.body.removeChild(anchor);
  triggerObservers(env);
  triggerObservers(env);
  const list = notifications(env);
  assert.equal(list.length, 1);
  assert.equal(list[0].querySelector(".kdb-message-notification__text").textContent, "Weg");
  assert.equal(list[0].style.top, "8px");
});

test("notifications leave no window listeners or connected observers once closed", () => {
  const { env, service } = setup();
  const anchor = createAnchor(env);
  service.notifyAnchored({ anchor, message: "a1", durationMs: 100 });
  service.notifyAnchored({ anchor, message: "a2", durationMs: 100 });
  service.notify({ message: "g1", durationMs: 100 });
  assert.ok(env.window.countListeners("scroll") >= 1);
  env.clock.advance(100);
  assert.equal(notifications(env).length, 0);
  assert.equal(env.window.countListeners("scroll"), 0);
  assert.equal(env.window.countListeners("resize"), 0);
  assert.ok(env.FakeMutationObserver.instances.every((o) => !o.connected));
  assert.equal(env.clock.pendingTimeouts(), 0);
});

test("destroy with open notifications removes root, listeners, observers and timers", () => {
  const { env, _KDB, service } = setup();
  const anchor = createAnchor(env);
  service.notifyAnchored({ anchor, message: "a1" });
  service.notify({ message: "g1" });
  service.destroy();
  assert.equal(env.document.querySelector("#kdb-message-root"), null);
  assert.equal(env.window.countListeners("scroll"), 0);
  assert.equal(env.window.countListeners("resize"), 0);
  assert.ok(env.FakeMutationObserver.instances.every((o) => !o.connected));
  assert.equal(env.clock.pendingTimeouts(), 0);
  assert.equal(_KDB.services.message, null);
});

test("confirm: selected / cancelled / dismissed by Escape / dismissed by backdrop", async () => {
  const { env, service } = setup();
  let promise = service.confirm({ message: "Sicher?", title: "Titel" });
  assert.equal(backdrops(env).length, 1);
  assert.equal(env.document.querySelector(".kdb-message-dialog__title").textContent, "Titel");
  assert.equal(env.document.querySelector(".kdb-message-dialog__message").textContent, "Sicher?");
  assert.equal(button(env, "cancel").textContent, "Nein");
  assert.equal(button(env, "confirm").textContent, "Ja");
  assert.equal(env.document.activeElement, button(env, "cancel"));
  clickButton(env, button(env, "confirm"));
  assert.deepEqual(await promise, { confirmed: true, reason: "selected" });
  assert.equal(backdrops(env).length, 0);

  promise = service.confirm({ message: "x" });
  clickButton(env, button(env, "cancel"));
  assert.deepEqual(await promise, { confirmed: false, reason: "cancelled" });

  promise = service.confirm({ message: "x" });
  key(env, "Escape");
  assert.deepEqual(await promise, { confirmed: false, reason: "dismissed" });

  promise = service.confirm({ message: "x" });
  clickButton(env, backdrops(env)[0]);
  assert.deepEqual(await promise, { confirmed: false, reason: "dismissed" });
  assert.equal(env.document.activeElement, env.document.body);
});

test("confirm: dismissible false ignores Escape and backdrop, no close button", async () => {
  const { env, service } = setup();
  const promise = service.confirm({ message: "x", dismissible: false });
  assert.equal(env.document.querySelector(".kdb-message-dialog__close"), null);
  key(env, "Escape");
  clickButton(env, backdrops(env)[0]);
  assert.equal(backdrops(env).length, 1);
  clickButton(env, button(env, "cancel"));
  assert.deepEqual(await promise, { confirmed: false, reason: "cancelled" });
});

test("modal requests are queued one at a time", async () => {
  const { env, service } = setup();
  const first = service.confirm({ message: "eins" });
  const second = service.confirm({ message: "zwei" });
  assert.equal(backdrops(env).length, 1);
  assert.equal(env.document.querySelector(".kdb-message-dialog__message").textContent, "eins");
  clickButton(env, button(env, "confirm"));
  await first;
  assert.equal(backdrops(env).length, 1);
  assert.equal(env.document.querySelector(".kdb-message-dialog__message").textContent, "zwei");
  clickButton(env, button(env, "cancel"));
  assert.deepEqual(await second, { confirmed: false, reason: "cancelled" });
});

test("choose: selected choice, cancel, arrow key focus, rejects on empty choices", async () => {
  const { env, service } = setup();
  await assert.rejects(service.choose({ choices: [] }), /requires non-empty choices/);
  await assert.rejects(service.choose(), /requires non-empty choices/);
  const choices = [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }, { id: "c", label: "Gamma", disabled: true }];
  let promise = service.choose({ message: "Wahl", choices });
  const buttons = env.document.querySelectorAll(".kdb-message-dialog__choice");
  assert.equal(buttons.length, 3);
  assert.equal(buttons[0].textContent, "Alpha");
  assert.equal(buttons[2].disabled, true);
  assert.equal(env.document.activeElement, buttons[0]);
  const arrow = key(env, "ArrowRight", buttons[0]);
  assert.equal(arrow.defaultPrevented, true);
  assert.equal(env.document.activeElement, buttons[1]);
  clickButton(env, buttons[1]);
  assert.deepEqual(await promise, { choice: "b", reason: "selected" });

  promise = service.choose({ choices, showCancel: false });
  assert.equal(button(env, "cancel"), null);
  key(env, "Escape");
  assert.deepEqual(await promise, { choice: null, reason: "dismissed" });

  promise = service.choose({ choices });
  clickButton(env, button(env, "cancel"));
  assert.deepEqual(await promise, { choice: null, reason: "cancelled" });
});

test("showAlert: acknowledge closes the dialog", () => {
  const { env, service } = setup();
  assert.equal(service.showAlert({ message: "Achtung", severity: "warning" }), undefined);
  assert.equal(env.document.querySelector(".kdb-message-dialog").className, "kdb-message-dialog kdb-message-dialog--warning");
  assert.equal(button(env, "acknowledge").textContent, "OK");
  clickButton(env, button(env, "acknowledge"));
  assert.equal(backdrops(env).length, 0);
});

test("showCopyable without actionLabel: passive dialog, no handle, close and copy buttons", () => {
  const { env, service, writes } = setup();
  assert.equal(service.showCopyable({ message: "Link", copyText: "https://x.example/a" }), undefined);
  const textarea = env.document.querySelector(".kdb-message-dialog__copy-text");
  assert.equal(textarea.value, "https://x.example/a");
  assert.equal(textarea.readOnly, true);
  assert.equal(textarea.getAttribute("aria-label"), "Zu kopierender Text");
  assert.equal(env.document.activeElement, textarea);
  assert.equal(button(env, "action"), null);
  assert.equal(button(env, "close").textContent, "Schließen");
  assert.equal(button(env, "copy").textContent, "Kopieren");
  clickButton(env, button(env, "close"));
  assert.equal(backdrops(env).length, 0);
  assert.deepEqual(writes, []);
});

test("showCopyable with actionLabel: whenDone gets selected / dismissed / destroyed", async () => {
  const { env, service } = setup();
  const results = [];
  const handle = service.showCopyable({ message: "m", copyText: "t", actionLabel: "  Öffnen  " });
  assert.equal(typeof handle.whenDone, "function");
  handle.whenDone((r) => results.push(r));
  assert.equal(button(env, "action").textContent, "Öffnen");
  assert.equal(env.document.querySelector(".kdb-message-dialog__actions").className, "kdb-message-dialog__actions kdb-message-dialog__actions--with-action");
  clickButton(env, button(env, "action"));
  assert.deepEqual(results, [{ action: "selected", reason: "selected" }]);

  service.showCopyable({ message: "m", copyText: "t", actionLabel: "Go" }).whenDone((r) => results.push(r));
  key(env, "Escape");
  assert.deepEqual(results[1], { action: null, reason: "dismissed" });

  service.showCopyable({ message: "m", copyText: "t", actionLabel: "Go" }).whenDone((r) => results.push(r));
  service.destroy();
  assert.deepEqual(results[2], { action: null, reason: "destroyed" });
  assert.equal(backdrops(env).length, 0);
});

test("showCopyable copy button: clipboard success shows success toast, failure selects the text and warns", async () => {
  let ctx = setup();
  ctx.service.showCopyable({ message: "m", copyText: "https://copy.me" });
  clickButton(ctx.env, button(ctx.env, "copy"));
  await flushMicrotasks();
  assert.deepEqual(ctx.writes, ["https://copy.me"]);
  assert.deepEqual(ctx.toasts, [{ message: "In Zwischenablage kopiert.", severity: "success" }]);
  assert.equal(backdrops(ctx.env).length, 1);

  ctx = setup({ insecure: true });
  ctx.service.showCopyable({ message: "m", copyText: "t" });
  clickButton(ctx.env, button(ctx.env, "copy"));
  await flushMicrotasks();
  assert.deepEqual(ctx.writes, []);
  assert.deepEqual(ctx.toasts, [{ message: "Bitte Text markieren und Strg+C drücken.", severity: "warning" }]);
  assert.equal(ctx.env.document.querySelector(".kdb-message-dialog__copy-text").selected, true);
});

test("showCopyable toggle switches the copy text", () => {
  const { env, service } = setup();
  service.showCopyable({
    message: "m",
    copyText: "unchecked-url",
    toggle: { label: "Mit Filter", title: "t", isChecked: false, copyTextChecked: "checked-url", copyTextUnchecked: "unchecked-url" }
  });
  const input = env.document.querySelector(".kdb-control_switch-input");
  assert.equal(input.checked, false);
  input.checked = true;
  input.dispatch({ type: "change" });
  assert.equal(env.document.querySelector(".kdb-message-dialog__copy-text").value, "checked-url");
  input.checked = false;
  input.dispatch({ type: "change" });
  assert.equal(env.document.querySelector(".kdb-message-dialog__copy-text").value, "unchecked-url");
});

test("destroy: pending dialogs resolve destroyed, service disposed, methods guarded, register creates a fresh service", async () => {
  const { env, _KDB, service, register } = setup();
  const pending = service.confirm({ message: "x" });
  const queued = service.choose({ choices: [{ id: "a", label: "A" }] });
  service.destroy();
  service.destroy();
  assert.deepEqual(await pending, { confirmed: false, reason: "destroyed" });
  assert.deepEqual(await queued, { choice: null, reason: "destroyed" });
  assert.equal(backdrops(env).length, 0);
  assert.equal(env.document.querySelector("#kdb-message-root"), null);
  assert.equal(_KDB.services.message, null);
  assert.equal(service.notify({ message: "x" }), undefined);
  assert.equal(service.showAlert({ message: "x" }), undefined);
  await assert.rejects(service.confirm({}), /messageService\.confirm called after destroy/);
  await assert.rejects(service.choose({ choices: [{ id: "a" }] }), /messageService\.choose called after destroy/);
  assert.equal(env.console.calls.warn.filter((w) => /called after destroy/.test(w[0])).length, 4);
  const fresh = register(_KDB);
  assert.notEqual(fresh, service);
  fresh.notify({ message: "again" });
  assert.equal(notifications(env).length, 1);
});

test("notifications share one scroll listener, one resize listener and one observer; scroll bursts coalesce into one frame", () => {
  const { env, service } = setup();
  const anchor = createAnchor(env);
  for (let i = 0; i < 5; i += 1) service.notifyAnchored({ anchor, message: "a" + i, durationMs: 1000 });
  service.notify({ message: "g1", durationMs: 1000 });
  service.notify({ message: "g2", durationMs: 1000 });
  assert.equal(notifications(env).length, 7);
  assert.equal(env.window.countListeners("scroll"), 1);
  assert.equal(env.window.countListeners("resize"), 1);
  assert.equal(env.FakeMutationObserver.instances.filter((o) => o.connected).length, 1);

  env.window.dispatch({ type: "scroll" });
  env.window.dispatch({ type: "scroll" });
  env.window.dispatch({ type: "resize" });
  assert.equal(env.clock.pendingFrames(), 1);
  env.clock.flushFrames();
  assert.equal(env.clock.pendingFrames(), 0);

  env.clock.advance(1000);
  assert.equal(notifications(env).length, 0);
  assert.equal(env.window.countListeners("scroll"), 0);
  assert.equal(env.window.countListeners("resize"), 0);
  assert.equal(env.FakeMutationObserver.instances.filter((o) => o.connected).length, 0);
});

test("global-only notifications do not attach a document observer", () => {
  const { env, service } = setup();
  service.notify({ message: "g1", durationMs: 1000 });
  assert.equal(env.FakeMutationObserver.instances.filter((o) => o.connected).length, 0);
  assert.equal(env.window.countListeners("scroll"), 1);
});

test("a scroll repositions stacked notifications after the frame", () => {
  const { env, service } = setup();
  const anchor = createAnchor(env, { left: 10, top: 10, right: 210, bottom: 50, width: 200, height: 40 });
  service.notifyAnchored({ anchor, message: "A" });
  assert.equal(notifications(env)[0].style.top, "58px");
  anchor.rect = { left: 10, top: -30, right: 210, bottom: 10, width: 200, height: 40 };
  env.window.dispatch({ type: "scroll" });
  env.clock.flushFrames();
  assert.equal(notifications(env)[0].style.top, "18px");
});

test("modal bind failure removes the backdrop and resolves unavailable", async () => {
  const { env, service } = setup();
  const createElement = env.document.createElement;
  env.document.createElement = (tag) => {
    const el = createElement(tag);
    if (tag === "button") el.focus = function () { if (this.getAttribute("data-kdb-message-action") === "cancel") throw new Error("focus failed"); };
    return el;
  };
  const result = await service.confirm({ message: "x" });
  assert.deepEqual(result, { confirmed: false, reason: "unavailable" });
  assert.equal(backdrops(env).length, 0);
  assert.equal(env.console.calls.error.length, 1);
  env.document.createElement = createElement;
  const next = service.confirm({ message: "again" });
  clickButton(env, button(env, "confirm"));
  assert.deepEqual(await next, { confirmed: true, reason: "selected" });
});

test("a rejecting facet toast is logged once and not left unhandled", async () => {
  const { env, service, facet } = setup();
  facet.showToast = () => Promise.reject(new Error("facet down"));
  service.notify({ message: "x", severity: "error" });
  await flushMicrotasks();
  assert.equal(env.console.calls.error.length, 1);
});
