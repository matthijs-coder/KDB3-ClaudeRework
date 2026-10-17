// Tests for dashboard/controls/toolbarControls: one shared host (one wait, one observer) for four buttons that
// KDB.js registers, mounts and destroys separately; declared order; DOM identical to the pre-refactor markup.
// Run: node --test tools/tests/toolbarControls.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";
import { createFakeDom } from "./lib/toolbar-fake-dom.mjs";

const KEYS = ["historyControls", "pdfExportControls", "wienKiControls", "shareControls"];

// Markup produced by the four original modules (light toolbar), left to right.
const GOLDEN_LIGHT = [
  "<div class=\"kdb-share-controls\" data-kdb-share-controls=\"true\"><div class=\"kdb-share-controls__item\"><button type=\"button\" class=\"kdb-share-controls__button\" data-kdb-share-button=\"true\" aria-label=\"Dashboard teilen\" title=\"Teilen\"><img class=\"kdb-share-controls__icon\" data-kdb-share-icon=\"true\" aria-hidden=\"true\" src=\"./v1/ext/KDB3/images/share.png\"></img><span class=\"kdb-share-controls__label\" data-kdb-share-label=\"true\">Teilen</span></button></div></div>",
  "<div class=\"kdb-wien-ki-controls\" data-kdb-wien-ki-controls=\"true\"><div class=\"kdb-wien-ki-controls__item\"><button type=\"button\" class=\"kdb-wien-ki-controls__button\" data-kdb-wien-ki-button=\"true\" aria-label=\"Wien-KI öffnen\" title=\"Wien-KI\"><svg viewBox=\"0 0 24 24\" width=\"24\" height=\"24\" class=\"kdb-wien-ki-controls__icon\" data-kdb-wien-ki-icon=\"true\" aria-hidden=\"true\" focusable=\"false\"><path fill=\"currentColor\" fill-rule=\"evenodd\" d=\"M5.5 1.6h13a3.1 3.1 0 0 1 3.1 3.1v8.6a3.1 3.1 0 0 1-3.1 3.1h-7.4L4.2 22.2l2.2-5.8H5.5A3.1 3.1 0 0 1 2.4 13.3V4.7A3.1 3.1 0 0 1 5.5 1.6zM6.15 4.7h2.35v3.15L12.05 4.7h2.55L11.1 8.85l3.75 5.15h-2.6L8.5 9.85v4.15H6.15zm9.7 0h2.4v9.3h-2.4z\"></path></svg><span class=\"kdb-wien-ki-controls__label\" data-kdb-wien-ki-label=\"true\">Wien-KI</span></button></div></div>",
  "<div class=\"kdb-pdf-export-controls\" data-kdb-pdf-export-controls=\"true\"><div class=\"kdb-pdf-export-controls__item\"><button type=\"button\" class=\"kdb-pdf-export-controls__button\" data-kdb-pdf-export-button=\"true\" aria-label=\"Dashboard als PDF exportieren\" title=\"Dashboard als PDF exportieren\" aria-busy=\"false\"><img class=\"kdb-pdf-export-controls__icon\" data-kdb-pdf-export-icon=\"true\" aria-hidden=\"true\" src=\"./v1/ext/KDB3/images/pdf-black.png\"></img><span class=\"kdb-pdf-export-controls__label\" data-kdb-pdf-export-label=\"true\" aria-live=\"polite\" aria-atomic=\"true\">PDF</span></button></div></div>",
  "<div class=\"kdb-history-controls\" data-kdb-history-controls=\"true\"><div class=\"kdb-history-controls__item\"><button type=\"button\" class=\"kdb-history-controls__button\" data-kdb-history-action=\"undo\" aria-label=\"Undo\" title=\"Undo\" aria-disabled=\"false\"><span class=\"kdb-history-controls__icon\" aria-hidden=\"true\">↶</span></button></div><div class=\"kdb-history-controls__item\"><button type=\"button\" class=\"kdb-history-controls__button kdb-history-controls__button--disabled\" data-kdb-history-action=\"redo\" aria-label=\"Redo\" title=\"Redo\" disabled=\"\" aria-disabled=\"true\"><span class=\"kdb-history-controls__icon\" aria-hidden=\"true\">↷</span></button></div></div>"
];

// Same markup on a dark toolbar: share icon inverted, white pdf icon.
const GOLDEN_DARK_SHARE_AND_PDF = [
  "<div class=\"kdb-share-controls\" data-kdb-share-controls=\"true\"><div class=\"kdb-share-controls__item\"><button type=\"button\" class=\"kdb-share-controls__button\" data-kdb-share-button=\"true\" aria-label=\"Dashboard teilen\" title=\"Teilen\"><img class=\"kdb-share-controls__icon kdb-share-controls__icon--invert\" data-kdb-share-icon=\"true\" aria-hidden=\"true\" src=\"./v1/ext/KDB3/images/share.png\"></img><span class=\"kdb-share-controls__label\" data-kdb-share-label=\"true\">Teilen</span></button></div></div>",
  "<div class=\"kdb-pdf-export-controls\" data-kdb-pdf-export-controls=\"true\"><div class=\"kdb-pdf-export-controls__item\"><button type=\"button\" class=\"kdb-pdf-export-controls__button\" data-kdb-pdf-export-button=\"true\" aria-label=\"Dashboard als PDF exportieren\" title=\"Dashboard als PDF exportieren\" aria-busy=\"false\"><img class=\"kdb-pdf-export-controls__icon\" data-kdb-pdf-export-icon=\"true\" aria-hidden=\"true\" src=\"./v1/ext/KDB3/images/pdf-white.png\"></img><span class=\"kdb-pdf-export-controls__label\" data-kdb-pdf-export-label=\"true\" aria-live=\"polite\" aria-atomic=\"true\">PDF</span></button></div></div>"
];

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function trackHistoryHandlers(events, counter) {
  const subscribe = events.subscribe;
  events.subscribe = (name, handler, options) => subscribe(name, (payload) => {
    if (name === "history:changed") counter.handlerCalls += 1;
    handler(payload);
  }, options);
  return events;
}

function createHarness(options = {}) {
  const dom = options.dom || createFakeDom();
  const logs = { warn: [], error: [], debug: [] };
  const stubs = {
    document: dom.document,
    Node: dom.Node,
    MutationObserver: dom.MutationObserver,
    requestAnimationFrame: dom.requestAnimationFrame,
    cancelAnimationFrame: dom.cancelAnimationFrame,
    console: {
      log() {},
      debug: (...args) => logs.debug.push(args.map(String).join(" ")),
      warn: (...args) => logs.warn.push(args.join(" ")),
      error: (...args) => logs.error.push(args.map(String).join(" "))
    }
  };
  const createEventBus = loadAmd(path.join(JS_ROOT, "core/events/createEventBus.js"), { stubs });
  const waits = [];
  const calls = [];
  const host = options.host || dom.createHost();
  if (!options.host) host.appendChild(dom.document.createElement("span"));
  const historyEvents = { handlerCalls: 0 };
  const _KDB = {
    api: {},
    runtime: {},
    config: { links: { wienKiUrl: "https://wienki.test/chat" } },
    elements: { selectors: { toolbar: { actionBarLeadingSelector: "#host" }, root: { dashboardClassHost: "#chost" } } },
    events: trackHistoryHandlers(createEventBus(), historyEvents),
    utils: {
      waitForElObserver(selector, _root, opts) {
        return new Promise((resolve, reject) => {
          waits.push({ resolve: () => resolve(dom.document.querySelector(selector)) });
          opts.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { code: "ABORTED" })));
        });
      }
    },
    services: {
      history: {
        canUndo: () => true,
        canRedo: () => false,
        undo: () => calls.push("undo"),
        redo: () => calls.push("redo")
      },
      dashboardPdf: options.pdfService || {
        exportDashboardPdf: (opts) => {
          calls.push("pdf");
          opts.onProgress({ stage: "capture" });
          return Promise.resolve({ ok: true });
        }
      },
      message: {
        showAlert: (opts) => calls.push("alert " + opts.title),
        showCopyable: (opts) => {
          calls.push("copyable " + opts.title + "|" + (opts.toggle ? opts.copyText : opts.actionLabel));
          return { whenDone() {} };
        }
      },
      writebackBridge: { readSelectedParameterSet: () => ({ id: 7, label: "Set A" }) },
      cognosHost: {
        dashboard: {
          getBoardId: () => ({ ok: true, data: "B1" }),
          getDashboardBiBaseUrl: () => ({ ok: true, data: "https://bi.test/" })
        }
      }
    }
  };
  loadAmd(path.join(JS_ROOT, "dashboard/controls/toolbarControls/index.js"), { stubs })(_KDB);
  const settle = async () => {
    await tick();
    dom.flushFrames();
    await tick();
    dom.flushFrames();
    await tick();
  };
  const rootIds = () => host.childNodes
    .filter((node) => node.attributes.has("class") && /controls/.test(node.getAttribute("class")))
    .map((node) => node.getAttribute("class"));
  return { dom, host, _KDB, waits, calls, logs, historyEvents, settle, rootIds, runtime: () => _KDB.runtime.toolbarControls };
}

async function mountAll(harness, order = KEYS) {
  order.forEach((key) => harness._KDB.api[key].mount({}));
  harness.dom.attachHost(harness.host);
  harness.waits.forEach((wait) => wait.resolve());
  await harness.settle();
}

const BUTTON_CLASSES = ["kdb-share-controls", "kdb-wien-ki-controls", "kdb-pdf-export-controls", "kdb-history-controls"];

test("four buttons share one toolbar wait and one body observer, in the declared order", async () => {
  const harness = createHarness();
  await mountAll(harness);
  assert.equal(harness.waits.length, 1);
  assert.equal(harness.dom.liveObserverCount(), 1);
  assert.deepEqual(harness.rootIds(), BUTTON_CLASSES);
  assert.equal(harness.logs.error.length, 0);
});

test("markup matches the original four modules (light toolbar)", async () => {
  const harness = createHarness();
  await mountAll(harness);
  const serialized = harness.host.childNodes.filter((node) => node.tagName === "div").map(harness.dom.serialize);
  assert.deepEqual(serialized, GOLDEN_LIGHT);
});

test("dark toolbar: share icon inverted, white pdf icon", async () => {
  const harness = createHarness();
  harness.dom.setTextColor("rgb(240, 240, 240)");
  await mountAll(harness);
  const nodes = harness.host.childNodes.filter((node) => node.tagName === "div");
  assert.deepEqual([nodes[0], nodes[2]].map(harness.dom.serialize), GOLDEN_DARK_SHARE_AND_PDF);
});

test("every mount order and destroy order keeps one observer and ends with a clean toolbar", async () => {
  const mountOrders = [KEYS, [...KEYS].reverse(), ["wienKiControls", "shareControls", "historyControls", "pdfExportControls"]];
  const destroyOrders = [
    ["pdfExportControls", "wienKiControls", "shareControls", "historyControls"],
    ["historyControls", "shareControls", "wienKiControls", "pdfExportControls"]
  ];
  for (const mountOrder of mountOrders) {
    for (const destroyOrder of destroyOrders) {
      const harness = createHarness();
      await mountAll(harness, mountOrder);
      assert.deepEqual(harness.rootIds(), BUTTON_CLASSES, `mount ${mountOrder}`);
      destroyOrder.slice(0, -1).forEach((key) => harness._KDB.api[key].destroy());
      assert.equal(harness.dom.liveObserverCount(), 1, "observer stays while a button is mounted");
      await harness.settle();
      assert.equal(harness.rootIds().length, 1);
      harness._KDB.api[destroyOrder[destroyOrder.length - 1]].destroy();
      await harness.settle();
      assert.equal(harness.dom.liveObserverCount(), 0);
      assert.equal(harness.dom.pendingFrameCount(), 0);
      assert.deepEqual(harness.rootIds(), []);
      assert.equal(harness.runtime().isHostReady, false);
      assert.equal(harness.logs.error.length, 0);
    }
  }
});

test("destroying every button before the toolbar exists aborts the single wait", async () => {
  const harness = createHarness();
  KEYS.forEach((key) => harness._KDB.api[key].mount({}));
  assert.equal(harness.waits.length, 1);
  KEYS.forEach((key) => harness._KDB.api[key].destroy());
  harness.dom.attachHost(harness.host);
  harness.waits.forEach((wait) => wait.resolve());
  await harness.settle();
  assert.equal(harness.dom.liveObserverCount(), 0);
  assert.deepEqual(harness.rootIds(), []);
  assert.equal(harness.logs.error.length, 0);
});

test("a button mounted after the toolbar is ready is placed in order without a second wait", async () => {
  const harness = createHarness();
  await mountAll(harness, ["historyControls", "pdfExportControls"]);
  assert.deepEqual(harness.rootIds(), ["kdb-pdf-export-controls", "kdb-history-controls"]);
  harness._KDB.api.shareControls.mount({});
  harness._KDB.api.wienKiControls.mount({});
  await harness.settle();
  assert.equal(harness.waits.length, 1);
  assert.equal(harness.dom.liveObserverCount(), 1);
  assert.deepEqual(harness.rootIds(), BUTTON_CLASSES);
});

test("mount after destroy is refused and warns once", async () => {
  const harness = createHarness();
  harness._KDB.api.historyControls.destroy();
  assert.equal(harness._KDB.api.historyControls.mount({}), false);
  assert.equal(harness._KDB.api.historyControls.mount({}), false);
  assert.deepEqual(harness.logs.warn.filter((line) => /called after destroy/.test(line)), ["[historyControls.mount] called after destroy"]);
});

test("Cognos re-render of the toolbar restores the buttons and click handlers once", async () => {
  const harness = createHarness();
  await mountAll(harness);
  harness.host.childNodes.slice().forEach((node) => harness.host.removeChild(node));
  harness.host.appendChild(harness.dom.document.createElement("span"));
  await harness.settle();
  assert.deepEqual(harness.rootIds(), BUTTON_CLASSES);
  const undoEl = harness.host.querySelector('[data-kdb-history-action="undo"]');
  undoEl.click();
  await tick();
  assert.deepEqual(harness.calls, ["undo"]);
  const shareButtonEl = harness.host.querySelector('[data-kdb-share-button="true"]');
  assert.equal(shareButtonEl.activeListenerCount("click"), 1);
  assert.equal(harness.dom.liveObserverCount(), 1);
});

test("history buttons follow history:changed", async () => {
  const harness = createHarness();
  await mountAll(harness);
  const redoEl = harness.host.querySelector('[data-kdb-history-action="redo"]');
  assert.equal(redoEl.disabled, true);
  harness._KDB.events.emit("history:changed", { canUndo: false, canRedo: true });
  assert.equal(redoEl.disabled, false);
  assert.equal(harness.host.querySelector('[data-kdb-history-action="undo"]').disabled, true);
});

test("pdf button shows the busy state during the export and recovers", async () => {
  let finishExport;
  const harness = createHarness({
    pdfService: {
      exportDashboardPdf: () => new Promise((resolve) => { finishExport = resolve; })
    }
  });
  await mountAll(harness);
  const buttonEl = harness.host.querySelector('[data-kdb-pdf-export-button="true"]');
  buttonEl.click();
  assert.equal(buttonEl.getAttribute("aria-busy"), "true");
  assert.equal(buttonEl.disabled, true);
  assert.equal(harness.host.querySelector('[data-kdb-pdf-export-label="true"]').textContent, "PDF...");
  finishExport({ ok: true });
  await tick();
  assert.equal(buttonEl.getAttribute("aria-busy"), "false");
  assert.equal(buttonEl.disabled, false);
  assert.equal(harness.host.querySelector('[data-kdb-pdf-export-label="true"]').textContent, "PDF");
});

test("share click opens the copy dialog with the read-only link first; wienKi opens the instruction dialog", async () => {
  const harness = createHarness();
  await mountAll(harness);
  harness.host.querySelector('[data-kdb-share-button="true"]').click();
  harness.host.querySelector('[data-kdb-wien-ki-button="true"]').click();
  const [shareCall, wienKiCall] = harness.calls;
  assert.match(shareCall, /^copyable Link zum Dashboard \(Parameterset: "Set A"\)\|https:\/\/bi\.test\/#.*readOnly=1/);
  assert.equal(wienKiCall, "copyable Wien-KI|Wien-KI öffnen");
});

test("unavailable services disable the buttons and warn once", async () => {
  const harness = createHarness();
  delete harness._KDB.services.dashboardPdf;
  delete harness._KDB.config.links.wienKiUrl;
  await mountAll(harness);
  assert.equal(harness.host.querySelector('[data-kdb-pdf-export-button="true"]').disabled, true);
  assert.equal(harness.host.querySelector('[data-kdb-wien-ki-button="true"]').disabled, true);
  assert.ok(harness.host.querySelector('[data-kdb-pdf-export-controls="true"]').classList.contains("is-unavailable"));
  assert.equal(harness.logs.warn.filter((line) => /dashboardPdf is missing/.test(line)).length, 1);
  assert.equal(harness.logs.warn.filter((line) => /wienKiUrl is missing/.test(line)).length, 1);
});

test("applyReadOnlyChrome toggles the class from the url token", async () => {
  const harness = createHarness();
  const classHost = harness.dom.document.createElement("div");
  harness.dom.document.querySelector = ((original) => (selector) => (selector === "#chost" ? classHost : original(selector)))(
    harness.dom.document.querySelector
  );
  harness.dom.document.location.href = "https://host.test/dashboard#perspective=dashboard&readOnly=1";
  harness._KDB.api.shareControls.applyReadOnlyChrome();
  assert.ok(classHost.classList.contains("kdb-share-read-only"));
  harness.dom.document.location.href = "https://host.test/dashboard#perspective=dashboard";
  harness._KDB.api.shareControls.applyReadOnlyChrome();
  assert.equal(classHost.classList.contains("kdb-share-read-only"), false);
});

function createRejectingPdfHarness(reason) {
  return createHarness({ pdfService: { exportDashboardPdf: () => reason() } });
}

async function clickPdf(harness) {
  harness.host.querySelector('[data-kdb-pdf-export-button="true"]').click();
  await tick();
  await tick();
}

function readPdfState(harness) {
  const buttonEl = harness.host.querySelector('[data-kdb-pdf-export-button="true"]');
  return { busy: buttonEl.getAttribute("aria-busy"), disabled: buttonEl.disabled };
}

test("pdf export rejection recovers the button and logs the failure once", async () => {
  const harness = createRejectingPdfHarness(() => Promise.reject(new Error("boom")));
  await mountAll(harness);
  await clickPdf(harness);
  assert.deepEqual(readPdfState(harness), { busy: "false", disabled: false });
  assert.equal(harness.logs.error.filter((line) => /pdfExportControls\.export/.test(line)).length, 1);
  assert.deepEqual(harness.calls, []);
});

test("pdf export stopped by abort or dispose does not show the fatal alert", async () => {
  const aborted = createRejectingPdfHarness(() => Promise.resolve({ ok: false, errorCode: "DASHBOARD_PDF_ABORTED" }));
  await mountAll(aborted);
  await clickPdf(aborted);
  const disposedCode = createRejectingPdfHarness(() => Promise.reject(Object.assign(new Error("x"), { code: "DASHBOARD_PDF_DISPOSED" })));
  await mountAll(disposedCode);
  await clickPdf(disposedCode);
  assert.deepEqual(aborted.logs.debug.filter((line) => /pdfExportControls\.export/.test(line)), ["[pdfExportControls.export] stopped (aborted) DASHBOARD_PDF_ABORTED"]);
  assert.deepEqual(disposedCode.logs.debug.filter((line) => /pdfExportControls\.export/.test(line)), [
    "[pdfExportControls.export] stopped (disposed: the dashboard was closed during the export) DASHBOARD_PDF_DISPOSED"
  ]);
  for (const harness of [aborted, disposedCode]) {
    assert.deepEqual(harness.calls, []);
    assert.deepEqual(harness.logs.error, []);
    assert.deepEqual(readPdfState(harness), { busy: "false", disabled: false });
  }
});

test("pdf export failure shows the alert, unless the button was destroyed meanwhile", async () => {
  const failed = createRejectingPdfHarness(() => Promise.resolve({ ok: false, errorCode: "DASHBOARD_PDF_EXPORT_FAILED" }));
  await mountAll(failed);
  await clickPdf(failed);
  assert.deepEqual(failed.calls, ["alert Dashboard PDF Export"]);

  let finish;
  const destroyed = createRejectingPdfHarness(() => new Promise((resolve) => { finish = resolve; }));
  await mountAll(destroyed);
  destroyed.host.querySelector('[data-kdb-pdf-export-button="true"]').click();
  destroyed._KDB.api.pdfExportControls.destroy();
  finish({ ok: false, errorCode: "DASHBOARD_PDF_EXPORT_FAILED" });
  await tick();
  await tick();
  assert.deepEqual(destroyed.calls, []);
});

test("icons follow a theme change on the next toolbar sync", async () => {
  const harness = createHarness();
  await mountAll(harness);
  const pdfIcon = () => harness.host.querySelector('[data-kdb-pdf-export-icon="true"]');
  const shareIcon = () => harness.host.querySelector('[data-kdb-share-icon="true"]');
  assert.equal(pdfIcon().getAttribute("src"), "./v1/ext/KDB3/images/pdf-black.png");
  assert.equal(shareIcon().classList.contains("kdb-share-controls__icon--invert"), false);
  harness.dom.setTextColor("rgb(240, 240, 240)");
  harness.host.appendChild(harness.dom.document.createElement("span"));
  await harness.settle();
  assert.equal(pdfIcon().getAttribute("src"), "./v1/ext/KDB3/images/pdf-white.png");
  assert.equal(shareIcon().classList.contains("kdb-share-controls__icon--invert"), true);
  harness.dom.setTextColor("rgb(0, 0, 0)");
  harness.host.appendChild(harness.dom.document.createElement("span"));
  await harness.settle();
  assert.equal(pdfIcon().getAttribute("src"), "./v1/ext/KDB3/images/pdf-black.png");
  assert.equal(shareIcon().classList.contains("kdb-share-controls__icon--invert"), false);
});

test("history:changed has one live subscription after a re-render and none after destroy", async () => {
  const harness = createHarness();
  await mountAll(harness);
  harness.host.childNodes.slice().forEach((node) => harness.host.removeChild(node));
  harness.host.appendChild(harness.dom.document.createElement("span"));
  await harness.settle();
  harness._KDB.events.emit("history:changed", { canUndo: true, canRedo: true });
  assert.equal(harness.historyEvents.handlerCalls, 1);
  harness._KDB.api.historyControls.destroy();
  harness._KDB.events.emit("history:changed", { canUndo: true, canRedo: true });
  assert.equal(harness.historyEvents.handlerCalls, 1);
});

test("two _KDB instances on one document: destroying the first keeps the second working", async () => {
  const first = createHarness();
  const second = createHarness({ dom: first.dom, host: first.host });
  await mountAll(first);
  KEYS.forEach((key) => second._KDB.api[key].mount({}));
  second.waits.forEach((wait) => wait.resolve());
  await second.settle();
  assert.deepEqual(first.rootIds(), BUTTON_CLASSES);
  KEYS.forEach((key) => first._KDB.api[key].destroy());
  await second.settle();
  assert.deepEqual(second.rootIds(), BUTTON_CLASSES);
  assert.equal(first.runtime().isHostReady, false);
  assert.equal(second.runtime().isHostReady, true);
  second.host.querySelector('[data-kdb-history-action="undo"]').click();
  await tick();
  assert.deepEqual(second.calls, ["undo"]);
  assert.deepEqual(first.calls, []);
  KEYS.forEach((key) => second._KDB.api[key].destroy());
  await second.settle();
  assert.deepEqual(second.rootIds(), []);
  assert.equal(first.dom.liveObserverCount(), 0);
});

test("a throwing onDetach still unregisters the button and disposes the host", async () => {
  const harness = createHarness();
  await mountAll(harness);
  harness.runtime().abortControllers.pdfExportRun = { abort() { throw new Error("abort failed"); } };
  harness._KDB.api.pdfExportControls.destroy();
  assert.ok(harness.logs.error.some((line) => /pdfExportControls\.destroy/.test(line)));
  assert.equal(harness.runtime().buttons.pdf, undefined);
  ["wienKiControls", "shareControls", "historyControls"].forEach((key) => harness._KDB.api[key].destroy());
  await harness.settle();
  assert.equal(harness.dom.liveObserverCount(), 0);
  assert.equal(harness.dom.pendingFrameCount(), 0);
  assert.equal(harness.runtime().isHostReady, false);
  assert.deepEqual(harness.rootIds(), []);
});

test("a throwing onDetach on the last button still disposes the host", async () => {
  const harness = createHarness();
  await mountAll(harness, ["pdfExportControls"]);
  harness.runtime().abortControllers.pdfExportRun = { abort() { throw new Error("abort failed"); } };
  harness._KDB.api.pdfExportControls.destroy();
  assert.equal(harness.dom.liveObserverCount(), 0);
  assert.equal(harness.runtime().isHostReady, false);
  assert.deepEqual(harness.rootIds(), []);
});

test("mount rolls back its registration when the toolbar wait throws synchronously", async () => {
  const harness = createHarness();
  harness._KDB.utils.waitForElObserver = () => { throw new Error("wait failed"); };
  assert.equal(harness._KDB.api.historyControls.mount({}), false);
  assert.ok(harness.logs.error.some((line) => /historyControls\.mount/.test(line)));
  assert.deepEqual(harness.runtime().buttons, {});
  assert.equal(harness.dom.liveObserverCount(), 0);
});
