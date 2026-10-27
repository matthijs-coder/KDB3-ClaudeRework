// Share link with live pathRef: conversion, builder, location parse, click order.
// Run: node --test tools/tests/share-pathref.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";
import { createFakeDom } from "./lib/toolbar-fake-dom.mjs";

const COGNOS_API = path.join(JS_ROOT, "core/cognosAPI/index.js");
const COGNOS_HOST = path.join(JS_ROOT, "core/services/cognosHost/index.js");
const SHARE_LINK = path.join(JS_ROOT, "dashboard/controls/toolbarControls/shareLink.js");
const READ_URL = path.join(JS_ROOT, "dashboard/controls/toolbarControls/readUrlPathRef.js");
const TOOLBAR = path.join(JS_ROOT, "dashboard/controls/toolbarControls/index.js");

const WORKED_SEARCH_PATH = "/content/folder[@name='Spielwiese']/folder[@name='Personal']/folder[@name='Konfigurierbares Dashboard']/folder[@name='00_Sprint_33.1']/folder[@name='KDB3']/exploration[@name='PER130 konfigurierbares Personaldashboard (KDB3 v33.1.004)']";
const WORKED_PATH_REF = ".public_folders/Spielwiese/Personal/Konfigurierbares Dashboard/00_Sprint_33.1/KDB3/PER130 konfigurierbares Personaldashboard (KDB3 v33.1.004)";
const PATH_REF_MISSING_MESSAGE = "Der Dashboard-Pfad konnte nicht ermittelt werden. Bitte das Dashboard über das Cognos-Menü öffnen und erneut teilen.";
const BI_BASE_MISSING_MESSAGE = "Die Dashboard-Adresse konnte nicht ermittelt werden. Bitte das Dashboard schließen und erneut öffnen.";
const DIALOG_TITLE_WITHOUT_SET = "Link zum Dashboard (kein Parameterset: leeres Dashboard)";
const ROOT_MAP = [
  ["Public Folders", ".public_folders"],
  ["Öffentliche Ordner", ".public_folders"],
  ["Team Folders", ".team_folders"],
  ["Teamordner", ".team_folders"],
  ["My Folders", ".my_folders"],
  ["Meine Ordner", ".my_folders"]
];

const quietConsole = { log() {}, warn() {}, debug() {}, error() {} };
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function loadDashboardApi(stubs = {}) {
  const _KDB = {};
  loadAmd(COGNOS_API, { stubs })(_KDB);
  return _KDB.cognosAPI.dashboard;
}

function dashboardFromInfo(info, extraStubs = {}) {
  const host = info && typeof info.getDashboardInfo === "function" ? info : { getDashboardInfo: () => info };
  return loadDashboardApi({ __getDashboardAPI: () => host, ...extraStubs });
}

function dashboardFacetFromHost(host, extraStubs = {}) {
  const consoleStub = extraStubs.console || quietConsole;
  const _KDB = { services: {}, runtime: {} };
  loadAmd(COGNOS_API, { stubs: { __getDashboardAPI: () => host, console: consoleStub, ...extraStubs } })(_KDB);
  loadAmd(COGNOS_HOST, { stubs: { console: consoleStub } })(_KDB);
  return _KDB.services.cognosHost.dashboard;
}

function contentPath(rootName, extra) {
  return "/content/folder[@name='" + rootName + "']/folder[@name='A']/exploration[@name='B']" + (extra || "");
}

function loadShareLink() {
  return loadAmd(SHARE_LINK);
}

function loadUrlReader(stubs) {
  return loadAmd(READ_URL, { stubs });
}

function paramKeys(url) {
  return [...new URL(url).searchParams.keys()];
}

test("conversion: worked example searchPath to unencoded pathRef", () => {
  const api = dashboardFromInfo({ searchPath: WORKED_SEARCH_PATH, boardId: "ignored", type: "exploration" });
  assert.equal(api.getPathRef(), WORKED_PATH_REF);
  assert.equal(api.getPathRef(), WORKED_PATH_REF);
});

test("conversion: each of the six root-map names skips the first name", () => {
  for (const [rootName, mapped] of ROOT_MAP) {
    const api = dashboardFromInfo({ searchPath: contentPath(rootName) });
    assert.equal(api.getPathRef(), mapped + "/A/B", rootName);
  }
});

test("conversion: /content without a root name keeps all names; otherwise null", () => {
  assert.equal(dashboardFromInfo({ searchPath: "/content/folder[@name='A']/folder[@name='B']" }).getPathRef(), ".public_folders/A/B");
  assert.equal(dashboardFromInfo({ searchPath: "/folder[@name='A']/folder[@name='B']" }).getPathRef(), null);
  assert.equal(dashboardFromInfo({ searchPath: "/content/folder[@name='Public Folders']" }).getPathRef(), null);
  assert.equal(dashboardFromInfo({ searchPath: "/content" }).getPathRef(), null);
});

test("conversion: escaped quote in a name becomes a quote", () => {
  const api = dashboardFromInfo({ searchPath: "/content/folder[@name='O\\'Brien']/exploration[@name='X']" });
  assert.equal(api.getPathRef(), ".public_folders/O'Brien/X");
});

test("conversion: already-converted paths are trimmed and returned unchanged", () => {
  assert.equal(dashboardFromInfo({ searchPath: "  .public_folders/X/Y  " }).getPathRef(), ".public_folders/X/Y");
  assert.equal(dashboardFromInfo({ searchPath: ".team_folders/Team/Dash" }).getPathRef(), ".team_folders/Team/Dash");
});

test("conversion: empty, whitespace, missing, object and number searchPath", () => {
  assert.equal(dashboardFromInfo({ searchPath: "" }).getPathRef(), null);
  assert.equal(dashboardFromInfo({ searchPath: "   " }).getPathRef(), null);
  assert.equal(dashboardFromInfo({}).getPathRef(), null);
  assert.equal(dashboardFromInfo({ searchPath: { path: WORKED_SEARCH_PATH } }).getPathRef(), null);
  assert.equal(dashboardFromInfo({ searchPath: 42 }).getPathRef(), null);
});

test("conversion: constructor and toString are not roots (content rule)", () => {
  assert.equal(dashboardFromInfo({ searchPath: contentPath("constructor") }).getPathRef(), ".public_folders/constructor/A/B");
  assert.equal(dashboardFromInfo({ searchPath: contentPath("toString") }).getPathRef(), ".public_folders/toString/A/B");
});

test("conversion: null, undefined and thenable info; no boardId fallback", () => {
  assert.equal(dashboardFromInfo(null).getPathRef(), null);
  assert.equal(dashboardFromInfo(undefined).getPathRef(), null);
  assert.equal(dashboardFromInfo({ then: () => {} }).getPathRef(), null);
  assert.equal(dashboardFromInfo(Promise.resolve({ searchPath: WORKED_SEARCH_PATH })).getPathRef(), null);
  assert.equal(dashboardFromInfo({ boardId: "i95024D86BB244733BEA04BB5AE72658C" }).getPathRef(), null);
});

test("conversion: host throw propagates from getPathRef and becomes DASHBOARD_READ_FAILED through the facet", () => {
  const err = new Error("host down");
  const throwing = { getDashboardInfo() { throw err; } };
  const api = dashboardFromInfo(throwing);
  assert.throws(() => api.getPathRef(), (caught) => caught === err);
  const facet = dashboardFacetFromHost(throwing);
  const outcome = facet.getPathRef();
  assert.equal(outcome.ok, false);
  assert.equal(outcome.outcome, "failed");
  assert.equal(outcome.errorCode, "DASHBOARD_READ_FAILED");
  assert.equal(outcome.diagnostics[0].message, "host down");
});

test("facet: ok plus string; inner null is ok plus data null", () => {
  const present = dashboardFacetFromHost({ getDashboardInfo: () => ({ searchPath: WORKED_SEARCH_PATH }) });
  assert.deepEqual(present.getPathRef(), { ok: true, outcome: "ok", data: WORKED_PATH_REF });
  const missing = dashboardFacetFromHost({ getDashboardInfo: () => null });
  assert.deepEqual(missing.getPathRef(), { ok: true, outcome: "ok", data: null });
});

test("builder: full input key order, query form, no id or objRef or hash", () => {
  const url = loadShareLink().buildShareDashboardLink({
    biBase: "https://bi.test/",
    pathRef: WORKED_PATH_REF,
    subView: "model00000193df66c3ef_00000000",
    id: 7,
    label: "Set A extra",
    emptyParameterLabel: "leeres Dashboard",
    isKdbReadOnly: true
  });
  assert.equal(url.startsWith("https://bi.test/?"), true);
  assert.deepEqual(paramKeys(url), [
    "perspective", "pathRef", "action", "mode", "subView", "nav_filter", "parameterId", "parameterLabel", "readOnly"
  ]);
  assert.equal(url.includes("#"), false);
  assert.equal(new URL(url).searchParams.has("id"), false);
  assert.equal(new URL(url).searchParams.has("objRef"), false);
  assert.equal(new URL(url).searchParams.get("nav_filter"), "true");
  assert.equal(new URL(url).searchParams.get("readOnly"), "1");
});

test("builder: optional keys, empty label, id 0, single encode of the worked path", () => {
  const shareLink = loadShareLink();
  const base = { biBase: "https://bi.test/", pathRef: "p", emptyParameterLabel: "leeres Dashboard" };
  for (const subView of [undefined, null, ""]) {
    const url = shareLink.buildShareDashboardLink(Object.assign({}, base, { subView }));
    assert.equal(new URL(url).searchParams.has("subView"), false, String(subView));
    assert.equal(new URL(url).searchParams.get("nav_filter"), "true");
  }
  assert.equal(new URL(shareLink.buildShareDashboardLink(Object.assign({}, base, { id: null }))).searchParams.has("parameterId"), false);
  assert.equal(new URL(shareLink.buildShareDashboardLink(base)).searchParams.has("parameterId"), false);
  assert.equal(new URL(shareLink.buildShareDashboardLink(Object.assign({}, base, { id: 0 }))).searchParams.get("parameterId"), "0");
  assert.match(shareLink.buildShareDashboardLink(base), /parameterLabel=leeres\+Dashboard/);
  assert.match(shareLink.buildShareDashboardLink(Object.assign({}, base, { label: "" })), /parameterLabel=leeres\+Dashboard/);
  const withReadOnly = shareLink.buildShareDashboardLink(Object.assign({}, base, { isKdbReadOnly: true }));
  assert.deepEqual(paramKeys(withReadOnly).slice(-2), ["parameterLabel", "readOnly"]);
  const withoutReadOnly = shareLink.buildShareDashboardLink(Object.assign({}, base, { isKdbReadOnly: false }));
  assert.equal(new URL(withoutReadOnly).searchParams.has("readOnly"), false);

  const encoded = shareLink.buildShareDashboardLink({
    biBase: "https://bi.test/",
    pathRef: WORKED_PATH_REF,
    emptyParameterLabel: "leeres Dashboard"
  });
  const params = new URL(encoded).searchParams;
  assert.match(encoded, /pathRef=\.public_folders%2FSpielwiese%2F/);
  assert.match(encoded, /%28KDB3\+v33\.1\.004%29/);
  assert.equal(encoded.includes("%252F"), false);
  assert.equal(encoded.includes("%2528"), false);
  assert.equal(params.get("pathRef"), WORKED_PATH_REF);
});

test("location parse: navigation then href, query then hash, invalid skip, subView, encoded round-trip", () => {
  function reader(opts) {
    return loadUrlReader({
      performance: {
        getEntriesByType: (type) => (type === "navigation" && opts.nav != null ? [{ name: opts.nav }] : [])
      },
      document: { location: { href: opts.href, origin: opts.origin || "https://host.test" } }
    });
  }
  const navWins = reader({
    nav: "https://bi.test/?pathRef=fromNav",
    href: "https://host.test/dash?pathRef=fromHref"
  });
  assert.equal(navWins.readUrlPathRef(), "fromNav");

  const queryWins = reader({
    nav: null,
    href: "https://host.test/dash?pathRef=fromQuery#pathRef=fromHash"
  });
  assert.equal(queryWins.readUrlPathRef(), "fromQuery");

  const hashWithQuery = reader({
    nav: null,
    href: "https://host.test/dash#ignored?pathRef=fromHashQuery"
  });
  assert.equal(hashWithQuery.readUrlPathRef(), "fromHashQuery");

  const hashPlain = reader({
    nav: null,
    href: "https://host.test/dash#pathRef=fromHash&x=1"
  });
  assert.equal(hashPlain.readUrlPathRef(), "fromHash");

  const invalidNav = reader({
    nav: "http://[",
    href: "https://host.test/dash?pathRef=fromHref"
  });
  assert.equal(invalidNav.readUrlPathRef(), "fromHref");

  const nothing = reader({ nav: null, href: "https://host.test/dash?id=x" });
  assert.equal(nothing.readUrlPathRef(), null);
  assert.equal(nothing.readUrlSubView(), null);

  const subView = reader({
    nav: "https://bi.test/?subView=fromNav",
    href: "https://host.test/dash?subView=fromHref"
  });
  assert.equal(subView.readUrlSubView(), "fromNav");

  const encoded = reader({
    nav: null,
    href: "https://bi.test/?pathRef=.public_folders%2FX%2528Y%2529"
  });
  const onceDecoded = encoded.readUrlPathRef();
  assert.equal(onceDecoded, ".public_folders/X%28Y%29");
  const rebuilt = new URLSearchParams();
  rebuilt.set("pathRef", onceDecoded);
  assert.match(rebuilt.toString(), /%2528/);
  assert.equal(rebuilt.toString().includes("%252528"), false);
  assert.equal(new URL("https://bi.test/?" + rebuilt.toString()).searchParams.get("pathRef"), onceDecoded);
});

function loadUrlReaderWithConsole(opts) {
  const warns = [];
  const api = loadUrlReader({
    performance: {
      getEntriesByType: (type) => (type === "navigation" && opts.nav != null ? [{ name: opts.nav }] : [])
    },
    document: { location: { href: opts.href, origin: opts.origin || "https://host.test" } },
    console: {
      log() {},
      warn: (...args) => warns.push(args),
      error() {},
      debug() {}
    }
  });
  return { api, warns };
}

test("location parse: all invalid candidates warn once and return null", () => {
  const { api, warns } = loadUrlReaderWithConsole({ nav: "http://[", href: "http://[" });
  assert.equal(api.readUrlPathRef(), null);
  assert.equal(warns.length, 1);
  assert.equal(warns[0][0], "[shareControls.readUrlPathRef] invalid URL candidates");
  assert.deepEqual(warns[0][1], { count: 2 });
});

test("location parse: one invalid and one parsed-without-key does not warn", () => {
  const { api, warns } = loadUrlReaderWithConsole({
    nav: "http://[",
    href: "https://host.test/dash?id=x"
  });
  assert.equal(api.readUrlPathRef(), null);
  assert.deepEqual(warns, []);
});

test("location parse: invalid navigation then href with pathRef returns the value without warn", () => {
  const { api, warns } = loadUrlReaderWithConsole({
    nav: "http://[",
    href: "https://host.test/dash?pathRef=fromHref"
  });
  assert.equal(api.readUrlPathRef(), "fromHref");
  assert.deepEqual(warns, []);
});

function createShareHarness(options = {}) {
  const dom = options.dom || createFakeDom();
  const logs = { warn: [], error: [], debug: [] };
  const alerts = [];
  const dialogs = [];
  const boardIdCalls = [];
  const mutated = [];
  const locationSnapshot = { href: dom.document.location.href, origin: dom.document.location.origin };
  if (options.href) {
    const parsed = new URL(options.href, dom.document.location.origin);
    dom.document.location.href = options.href;
    dom.document.location.origin = parsed.origin;
    locationSnapshot.href = options.href;
    locationSnapshot.origin = parsed.origin;
  }
  const boardIdSpy = () => {
    boardIdCalls.push(true);
    return { ok: true, outcome: "ok", data: "B1" };
  };
  const facet = options.facet || {
    getPathRef: () => ({ ok: true, outcome: "ok", data: ".public_folders/Facet/Path" }),
    getDashboardBiBaseUrl: () => ({ ok: true, outcome: "ok", data: "https://bi.test/" }),
    getBoardId: boardIdSpy
  };
  if (typeof facet.getBoardId !== "function") facet.getBoardId = boardIdSpy;
  const stubs = {
    document: dom.document,
    Node: dom.Node,
    MutationObserver: dom.MutationObserver,
    requestAnimationFrame: dom.requestAnimationFrame,
    cancelAnimationFrame: dom.cancelAnimationFrame,
    performance: {
      getEntriesByType: (type) => (
        type === "navigation" && options.navigationName ? [{ name: options.navigationName }] : []
      )
    },
    history: {
      pushState: (...args) => mutated.push(["pushState", args]),
      replaceState: (...args) => mutated.push(["replaceState", args])
    },
    console: {
      log() {},
      debug: (...args) => logs.debug.push(args.map(String).join(" ")),
      warn: (...args) => logs.warn.push(args.join(" ")),
      error: (...args) => logs.error.push(args.map(String).join(" "))
    }
  };
  const createEventBus = loadAmd(path.join(JS_ROOT, "core/events/createEventBus.js"), { stubs });
  const waits = [];
  const host = options.host || dom.createHost();
  if (!options.host) host.appendChild(dom.document.createElement("span"));
  const _KDB = {
    api: {},
    runtime: {},
    config: { links: { wienKiUrl: "https://wienki.test/chat" } },
    elements: { selectors: { toolbar: { actionBarLeadingSelector: "#host" }, root: { dashboardClassHost: "#chost" } } },
    events: createEventBus(),
    utils: {
      waitForElObserver(selector, _root, opts) {
        return new Promise((resolve, reject) => {
          waits.push({ resolve: () => resolve(dom.document.querySelector(selector)) });
          opts.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { code: "ABORTED" })));
        });
      }
    },
    services: {
      history: { canUndo: () => true, canRedo: () => false, undo() {}, redo() {} },
      dashboardPdf: { exportDashboardPdf: () => Promise.resolve({ ok: true }) },
      message: {
        showAlert: (opts) => alerts.push(opts),
        showCopyable: (opts) => {
          dialogs.push(opts);
          return { whenDone() {} };
        }
      },
      writebackBridge: {
        readSelectedParameterSet: options.readSelectedParameterSet || (() => ({ id: 7, label: "Set A" }))
      },
      cognosHost: { dashboard: facet }
    }
  };
  loadAmd(TOOLBAR, { stubs })(_KDB);
  const settle = async () => {
    await tick();
    dom.flushFrames();
    await tick();
    dom.flushFrames();
    await tick();
  };
  return {
    dom, host, _KDB, waits, logs, alerts, dialogs, boardIdCalls, mutated, locationSnapshot, settle,
    clickShare() {
      this.host.querySelector('[data-kdb-share-button="true"]').click();
    }
  };
}

async function mountShare(harness) {
  ["historyControls", "pdfExportControls", "wienKiControls", "shareControls"].forEach((key) => harness._KDB.api[key].mount({}));
  harness.dom.attachHost(harness.host);
  harness.waits.forEach((wait) => wait.resolve());
  await harness.settle();
}

test("click: facet path wins over a different location pathRef", async () => {
  const harness = createShareHarness({
    href: "https://host.test/dash?pathRef=.public_folders/From/Location"
  });
  await mountShare(harness);
  harness.clickShare();
  assert.equal(harness.dialogs.length, 1);
  const url = harness.dialogs[0].copyText;
  assert.equal(new URL(url).searchParams.get("pathRef"), ".public_folders/Facet/Path");
  assert.equal(url.includes("From/Location"), false);
});

test("click: facet ok+null or failed uses location pathRef", async () => {
  for (const getPathRef of [
    () => ({ ok: true, outcome: "ok", data: null }),
    () => ({ ok: false, outcome: "failed", errorCode: "DASHBOARD_READ_FAILED", data: null })
  ]) {
    const harness = createShareHarness({
      href: "https://host.test/dash?pathRef=.public_folders/From/Location",
      facet: {
        getPathRef,
        getDashboardBiBaseUrl: () => ({ ok: true, outcome: "ok", data: "https://bi.test/" })
      }
    });
    await mountShare(harness);
    harness.clickShare();
    assert.equal(harness.dialogs.length, 1);
    assert.equal(new URL(harness.dialogs[0].copyText).searchParams.get("pathRef"), ".public_folders/From/Location");
  }
});

test("click: missing path shows the German alert, no dialog, getBoardId never called", async () => {
  const harness = createShareHarness({
    href: "https://host.test/dash?id=x",
    facet: {
      getPathRef: () => ({ ok: true, outcome: "ok", data: null }),
      getDashboardBiBaseUrl: () => ({ ok: true, outcome: "ok", data: "https://bi.test/" })
    }
  });
  await mountShare(harness);
  harness.clickShare();
  assert.deepEqual(harness.alerts, [{
    title: "Teilen nicht möglich",
    message: PATH_REF_MISSING_MESSAGE,
    severity: "error"
  }]);
  assert.equal(harness.dialogs.length, 0);
  assert.deepEqual(harness.boardIdCalls, []);
});

test("click: path present but bi-base missing shows the bi-base alert, no dialog", async () => {
  const harness = createShareHarness({
    facet: {
      getPathRef: () => ({ ok: true, outcome: "ok", data: ".public_folders/Facet/Path" }),
      getDashboardBiBaseUrl: () => ({ ok: true, outcome: "ok", data: null })
    }
  });
  await mountShare(harness);
  harness.clickShare();
  assert.deepEqual(harness.alerts, [{
    title: "Teilen nicht möglich",
    message: BI_BASE_MISSING_MESSAGE,
    severity: "error"
  }]);
  assert.equal(harness.dialogs.length, 0);
});

test("click: subView from the location appears in both URLs and is omitted otherwise", async () => {
  const withSub = createShareHarness({
    href: "https://host.test/dash?pathRef=ignored&subView=tabOne"
  });
  await mountShare(withSub);
  withSub.clickShare();
  const dialog = withSub.dialogs[0];
  assert.equal(new URL(dialog.copyText).searchParams.get("subView"), "tabOne");
  assert.equal(new URL(dialog.toggle.copyTextChecked).searchParams.get("subView"), "tabOne");
  assert.equal(new URL(dialog.toggle.copyTextUnchecked).searchParams.get("subView"), "tabOne");

  const withoutSub = createShareHarness({ href: "https://host.test/dash?pathRef=ignored" });
  await mountShare(withoutSub);
  withoutSub.clickShare();
  const other = withoutSub.dialogs[0];
  assert.equal(new URL(other.copyText).searchParams.has("subView"), false);
  assert.equal(new URL(other.toggle.copyTextUnchecked).searchParams.has("subView"), false);
});

test("click: bridge id null omits parameterId and uses the without-set title; Nur Lesen is the default copy text", async () => {
  const harness = createShareHarness({
    readSelectedParameterSet: () => ({ id: null, label: null })
  });
  await mountShare(harness);
  harness.clickShare();
  const dialog = harness.dialogs[0];
  assert.equal(dialog.title, DIALOG_TITLE_WITHOUT_SET);
  assert.equal(dialog.copyText, dialog.toggle.copyTextChecked);
  assert.equal(new URL(dialog.copyText).searchParams.has("parameterId"), false);
  assert.equal(new URL(dialog.copyText).searchParams.get("readOnly"), "1");
  assert.equal(new URL(dialog.toggle.copyTextUnchecked).searchParams.has("parameterId"), false);
  assert.equal(new URL(dialog.toggle.copyTextUnchecked).searchParams.has("readOnly"), false);
  assert.match(dialog.copyText, /parameterLabel=leeres\+Dashboard/);
});

test("click: facet without getPathRef makes the button unavailable, warns once, click is a no-op", async () => {
  const harness = createShareHarness({
    facet: {
      getDashboardBiBaseUrl: () => ({ ok: true, outcome: "ok", data: "https://bi.test/" })
    }
  });
  await mountShare(harness);
  const buttonEl = harness.host.querySelector('[data-kdb-share-button="true"]');
  const rootEl = harness.host.querySelector('[data-kdb-share-controls="true"]');
  assert.equal(buttonEl.disabled, true);
  assert.equal(rootEl.classList.contains("is-unavailable"), true);
  assert.equal(harness.logs.warn.filter((line) => /stamped dashboardFacet methods are missing/.test(line)).length, 1);
  harness.clickShare();
  assert.equal(harness.dialogs.length, 0);
  assert.equal(harness.alerts.length, 0);
});

test("click: does not mutate location or history", async () => {
  const harness = createShareHarness({ href: "https://host.test/dash?x=1" });
  const locationRef = harness.dom.document.location;
  await mountShare(harness);
  harness.clickShare();
  assert.equal(harness.dialogs.length, 1);
  assert.equal(harness.dom.document.location, locationRef);
  assert.equal(locationRef.href, harness.locationSnapshot.href);
  assert.equal(locationRef.origin, harness.locationSnapshot.origin);
  assert.deepEqual(harness.mutated, []);
});
