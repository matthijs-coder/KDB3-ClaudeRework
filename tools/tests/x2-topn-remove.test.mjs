// Phase 2 X2: removing a TopN owner chart through widgetBase/remove (real widgetBase + real widgetTopN on a fake DOM).
// Run: node --test tools/tests/x2-topn-remove.test.mjs   (Node >= 22, no dependencies)
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";

const JS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../_____________KDB3API/KDB3/js");
const WIDGET_BASE = resolve(JS_DIR, "dashboard/widgets/widgetBase/index.js");
const WIDGET_TOPN = resolve(JS_DIR, "dashboard/widgets/widgetTopN/index.js");

const DATA_CONFIG = {
  datasourceId: "ds1",
  dimension: "dim",
  kennzahlenTable: "Personal_KDB",
  dataTableConfig: { dimensions: { dim: { topNItemId: "item", exclude: { itemId: "item" } } } }
};
const CLAIM_ATTRS = ["data-connected-vis-widget-id", "data-kdb-topn-claim-token"];

class FakeElement {
  constructor(doc, id, attrs) {
    this.ownerDocument = doc;
    this.id = id || null;
    this.attrs = Object.assign({}, attrs || {});
    this.children = [];
    this.parentNode = null;
  }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  removeAttribute(name) { delete this.attrs[name]; }
  get nextSibling() {
    if (!this.parentNode) return null;
    const list = this.parentNode.children;
    return list[list.indexOf(this) + 1] || null;
  }
  insertBefore(node, ref) {
    if (node.parentNode) node.parentNode.children.splice(node.parentNode.children.indexOf(node), 1);
    const index = ref ? this.children.indexOf(ref) : -1;
    if (index < 0) this.children.push(node); else this.children.splice(index, 0, node);
    node.parentNode = this;
    return node;
  }
  removeChild(node) {
    this.children.splice(this.children.indexOf(node), 1);
    node.parentNode = null;
    return node;
  }
  appendChild(node) { return this.insertBefore(node, null); }
  contains(node) {
    for (let cur = node; cur; cur = cur.parentNode) if (cur === this) return true;
    return false;
  }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  blur() {}
}

class FakeDocument {
  constructor() { this.roots = []; this.activeElement = null; }
  create(id, attrs, parent) {
    const el = new FakeElement(this, id, attrs);
    if (parent) parent.appendChild(el); else this.roots.push(el);
    return el;
  }
  all() {
    const out = [];
    const walk = (el) => { out.push(el); el.children.forEach(walk); };
    this.roots.forEach(walk);
    return out;
  }
  getElementById(id) { return this.all().find((el) => el.id === id) || null; }
  querySelector(selector) {
    const pairs = [...selector.matchAll(/\[([^=\]]+)="((?:[^"\\]|\\.)*)"\]/g)].map((m) => [m[1], m[2].replace(/\\(.)/g, "$1")]);
    return this.all().find((el) => pairs.every(([k, v]) => el.getAttribute(k) === v)) || null;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function delay(ms, signal) {
  return new Promise((resolveDelay) => {
    if (signal && signal.aborted) return resolveDelay(false);
    const timer = setTimeout(() => { cleanup(); resolveDelay(true); }, ms);
    const onAbort = () => { clearTimeout(timer); cleanup(); resolveDelay(false); };
    const cleanup = () => signal && signal.removeEventListener && signal.removeEventListener("abort", onAbort);
    if (signal && signal.addEventListener) signal.addEventListener("abort", onAbort);
  });
}

async function waitUntil(predicate, timeoutMs = 3000) {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error("waitUntil timed out");
    await sleep(5);
  }
}

function captureConsole() {
  const saved = { warn: console.warn, error: console.error, info: console.info };
  const messages = [];
  for (const level of ["warn", "error", "info"]) {
    console[level] = (...args) => messages.push({ level, text: String(args[0]) });
  }
  return { messages, restore() { Object.assign(console, saved); } };
}

function createEnv({ applyMs = 20, cleanupMs = 20 } = {}) {
  const doc = new FakeDocument();
  const canvas = doc.create("canvas", {});
  ["o1", "o2", "txt1"].forEach((id) => doc.create(id, {}, canvas));
  const pad = doc.create("KDB_topNPad", {});
  const slot = doc.create(null, { "data-kdb-launchpad-pad": "topN", cor_page_id: "t1", cor_page_index: "0" }, pad);
  doc.create("h1", {}, slot);

  const terminals = [];
  const visDispatches = [];
  const history = [];
  const applyStarts = [];
  const _KDB = {
    state: { widgets: {} },
    runtime: {},
    elements: { kdbWidget: { ownerDocument: doc } },
    api: {
      launchpad: {
        dispatch(action) {
          const tabSlot = doc.querySelector(`[data-kdb-launchpad-pad="topN"][cor_page_id="${action.payload.tabId}"]`);
          return Promise.resolve({ ok: true, widgets: (tabSlot ? tabSlot.children : []).map((el) => ({ widgetId: el.id })) });
        }
      },
      widgetVis: {
        dispatch(action) {
          if (action.type === "widgetVis/topNResolved") terminals.push(action.payload);
          else visDispatches.push(action);
          return Promise.resolve({ ok: true });
        }
      },
      widgetSettings: { dispatch: () => Promise.resolve({ ok: true }) }
    },
    services: {
      history: { pushCommittedStep(step) { history.push(step); return true; } },
      cognosHost: { widgets: { renderWidget: (id, options) => delay(2, options.signal).then((done) => (done ? { ok: true } : { ok: false, outcome: "aborted" })) } },
      widgetBindingPlan: {
        buildPlan: (spec) => ({ ok: true, status: "success", reason: spec.reason, widgetId: spec.widgetId, managedFilterItemIds: [], resetIntent: spec.resetIntent })
      },
      widgetBindingApply: {
        async applyBinding(plan, options) {
          const isCleanup = plan.reason === "cleanup";
          applyStarts.push({ kind: isCleanup ? "cleanup" : "apply", helperId: options.target.widgetId });
          const done = await delay(isCleanup ? cleanupMs : applyMs, options.signal);
          return done ? { status: "success", diagnostics: {} } : { status: "aborted" };
        }
      },
      tableData: {
        reloadTable: async () => [{ c: { d: "A", u: "A" } }, { c: { d: "B", u: "B" } }, { c: { d: "C", u: "C" } }]
      }
    }
  };

  const visProps = () => Promise.resolve({ diagnostics: {} });
  const registerBase = loadAmd(WIDGET_BASE);
  const registerTopN = loadAmd(WIDGET_TOPN, { modules: { "../widgetVis/effects/applyVisualizationProperties.js": visProps } });
  registerBase(_KDB, { autoRouteAll: false });
  registerTopN(_KDB, {});
  _KDB.api.widgetTopN.mount({});
  const frames = _KDB.state.widgets.base.byId;
  frames.o1 = { widgetId: "o1", kind: "vis", tabId: "t1", placement: "onCanvas", lifecycle: "ready" };
  frames.o2 = { widgetId: "o2", kind: "vis", tabId: "t1", placement: "onCanvas", lifecycle: "ready" };
  frames.txt1 = { widgetId: "txt1", kind: "text", tabId: "t1", placement: "onCanvas", lifecycle: "ready" };

  return {
    _KDB, doc, slot, terminals, visDispatches, history, applyStarts,
    topN: () => _KDB.api.widgetTopN,
    ownerState: (id) => _KDB.api.widgetTopN.getState().byOwner[id],
    ownerRuntime: (id) => _KDB.runtime.widgetTopN.byOwner[id],
    helperAttrs: (id) => CLAIM_ATTRS.map((name) => doc.getElementById(id).getAttribute(name)),
    helperInSlot: (id) => doc.getElementById(id).parentNode === slot,
    idle: () => Object.keys(_KDB.runtime.widgetTopN.pendingPromises || {}).length === 0,
    resolve(owner, opSeq) {
      return _KDB.api.widgetTopN.dispatch({
        type: "widgetTopN/resolveRequested",
        widgetId: owner,
        opSeq,
        payload: { ownerVisId: owner, topNChoice: "2", dataConfig: DATA_CONFIG, config: {}, tabId: "t1" }
      });
    },
    remove(widgetId, reason) {
      return _KDB.api.widgetBase.dispatch({ type: "widgetBase/remove", widgetId, payload: { reason: reason || "user" } });
    },
    async settle() {
      await sleep(80);
      await waitUntil(() => this.idle());
    }
  };
}

async function withEnv(options, body) {
  const capture = captureConsole();
  try {
    await body(createEnv(options), capture.messages);
  } finally {
    capture.restore();
  }
}

const topNMessages = (messages) => messages.filter((m) => m.text.indexOf("[widgetTopN") === 0 || m.text.indexOf("[widgetBase") === 0);

test("remove of a settled TopN owner: the claim in state, runtime and helper mirror, and a second owner's claim", async () => {
  await withEnv({}, async (env, messages) => {
    const first = await env.resolve("o1", 1);
    assert.equal(first.status, "success");
    await env.settle();
    assert.equal(env.ownerState("o1").helperWidgetId, "h1");
    assert.ok(env.helperAttrs("h1")[1]);

    const removed = await env.remove("o1");
    assert.equal(removed.ok, true);
    assert.equal(removed.placement, "removed");
    await env.settle();

    assert.equal(env._KDB.state.widgets.base.byId.o1.placement, "removed");
    assert.equal(env.ownerState("o1").helperWidgetId, "h1", "claim still in state");
    assert.ok(env.ownerState("o1").claimToken);
    assert.equal(env.ownerRuntime("o1").helperWidgetId, "h1", "claim still in runtime");
    assert.deepEqual(env.helperAttrs("h1")[0], "o1", "mirror still on the helper shell");
    assert.equal(env.helperInSlot("h1"), true);

    const second = await env.resolve("o2", 1);
    assert.equal(second.status, "noHelperAvailable");
    assert.equal(second.errorCode, "WIDGET_TOPN_NO_HELPER_AVAILABLE");
    assert.deepEqual(topNMessages(messages), []);
  });
});

test("remove while the TopN bind is running: the resolve and the claim afterwards", async () => {
  await withEnv({ applyMs: 200 }, async (env) => {
    const running = env.resolve("o1", 1);
    await sleep(80);
    assert.equal(env.ownerRuntime("o1").helperWidgetId, "h1");
    assert.equal(env.doc.getElementById("h1").parentNode.id, "canvas", "helper is parked beside the owner during the bind");

    await env.remove("o1");
    const result = await running;
    await env.settle();

    assert.equal(result.status, "success", "resolve ran to its end for the removed owner");
    assert.equal(env.terminals.length, 1);
    assert.equal(env.helperInSlot("h1"), true);
    assert.equal(env.ownerRuntime("o1").helperPlacement, null);
    assert.equal(env.ownerRuntime("o1").helperWidgetId, "h1", "claim still in runtime");
    assert.equal(env.ownerState("o1").helperWidgetId, "h1", "claim still in state");
    assert.equal(env.helperAttrs("h1")[0], "o1");
  });
});

test("remove before the first bind has finished: the claim afterwards", async () => {
  await withEnv({ applyMs: 300 }, async (env) => {
    const running = env.resolve("o1", 1);
    await sleep(30);
    assert.equal(env.ownerRuntime("o1").helperWidgetId, "h1");
    assert.equal(env.ownerRuntime("o1").lastHelperDataConfig, null);
    await env.remove("o1");
    await running;
    await env.settle();
    assert.equal(env.ownerState("o1").helperWidgetId, "h1");
    assert.equal(env.helperAttrs("h1")[0], "o1");
  });
});

test("remove twice: widgetVis dispose and history steps", async () => {
  await withEnv({}, async (env) => {
    const first = await env.remove("o2");
    const second = await env.remove("o2");
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.equal(second.skipped, false);
    assert.equal(env.visDispatches.filter((a) => a.type === "widgetVis/disposeWidgetRuntime").length, 2);
    assert.equal(env.history.filter((s) => s.key === "widget_removed").length, 2);
  });
});

test("remove of a text widget creates no TopN record", async () => {
  await withEnv({}, async (env) => {
    const removed = await env.remove("txt1");
    assert.equal(removed.ok, true);
    await env.settle();
    assert.equal(env.ownerState("txt1"), undefined);
    assert.equal(env.ownerRuntime("txt1"), undefined);
  });
});

test("remove of a vis widget that never used TopN leaves no TopN record behind", async () => {
  await withEnv({}, async (env) => {
    const removed = await env.remove("o2");
    assert.equal(removed.ok, true);
    await env.settle();
    assert.equal(env.ownerRuntime("o2"), undefined);
    assert.equal(env.ownerState("o2"), undefined);
  });
});

test("remove still succeeds without widgetTopN, with a throwing one and after its destroy", async () => {
  await withEnv({}, async (env, messages) => {
    env.topN().destroy();
    const afterDestroy = await env.remove("o1");
    assert.equal(afterDestroy.ok, true);

    const savedApi = env._KDB.api.widgetTopN;
    env._KDB.api.widgetTopN = { dispatch() { throw new Error("boom"); } };
    const throwing = await env.remove("o2");
    assert.equal(throwing.ok, true);
    env._KDB.api.widgetTopN = { dispatch: () => Promise.reject(new Error("rejected")) };
    env._KDB.state.widgets.base.byId.o2.placement = "onCanvas";
    const rejecting = await env.remove("o2");
    assert.equal(rejecting.ok, true);
    await sleep(20);
    env._KDB.api.widgetTopN = savedApi;
    delete env._KDB.api.widgetTopN;
    env._KDB.state.widgets.base.byId.o1.placement = "onCanvas";
    const absent = await env.remove("o1");
    assert.equal(absent.ok, true);
    assert.equal(messages.some((m) => m.level === "error" && m.text.indexOf("widgetBase") === -1 && m.text.indexOf("widgetTopN") === -1), false);
  });
});
