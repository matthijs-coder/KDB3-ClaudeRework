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

function createEnv({ applyMs = 20, cleanupMs = 20, launchpadMs = 0 } = {}) {
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
        async dispatch(action) {
          if (launchpadMs > 0) await sleep(launchpadMs);
          const tabSlot = doc.querySelector(`[data-kdb-launchpad-pad="topN"][cor_page_id="${action.payload.tabId}"]`);
          return { ok: true, widgets: (tabSlot ? tabSlot.children : []).map((el) => ({ widgetId: el.id })) };
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
  const registerTopN = loadAmd(WIDGET_TOPN, { modules: { "../widgetVis/visualization.js": { applyVisualizationProperties: visProps } } });
  registerBase(_KDB, { autoRouteAll: false });
  loadAmd(resolve(JS_DIR, "core/services/widgetBinding/index.js"))(_KDB);
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

test("remove of a settled TopN owner releases the claim, prunes its records and frees the helper", async () => {
  await withEnv({}, async (env, messages) => {
    const first = await env.resolve("o1", 1);
    assert.equal(first.status, "success");
    await env.settle();
    assert.equal(env.ownerState("o1").helperWidgetId, "h1");
    assert.ok(env.helperAttrs("h1")[1]);

    const removed = await env.remove("o1");
    assert.equal(removed.ok, true);
    assert.equal(removed.placement, "removed");
    await waitUntil(() => env.ownerState("o1") === undefined);
    await env.settle();

    assert.equal(env._KDB.state.widgets.base.byId.o1.placement, "removed");
    assert.equal(env.ownerState("o1"), undefined, "state record pruned");
    assert.equal(env.ownerRuntime("o1"), undefined, "runtime record pruned");
    assert.deepEqual(env.helperAttrs("h1"), [null, null], "mirror cleared");
    assert.equal(env.helperInSlot("h1"), true);
    assert.deepEqual(env.visDispatches.map((a) => a.type), ["widgetVis/disposeWidgetRuntime"]);

    const second = await env.resolve("o2", 1);
    assert.equal(second.status, "success", "the next owner gets the helper");
    assert.equal(env.ownerState("o2").helperWidgetId, "h1");
    await env.settle();
    assert.deepEqual(topNMessages(messages), []);
  });
});

test("remove while the TopN bind is running: the resolve ends stale, the helper goes back to its slot, the claim is released", async () => {
  await withEnv({ applyMs: 200 }, async (env, messages) => {
    const running = env.resolve("o1", 1);
    await sleep(80);
    assert.equal(env.ownerRuntime("o1").helperWidgetId, "h1");
    assert.equal(env.doc.getElementById("h1").parentNode.id, "canvas", "helper is parked beside the owner during the bind");

    await env.remove("o1");
    const result = await running;
    await env.settle();

    assert.equal(result.stale, true);
    assert.equal(result.status, "aborted");
    assert.deepEqual(env.terminals, [], "no terminal for a removed owner");
    assert.equal(env.helperInSlot("h1"), true, "helper restored through the placement lease");
    assert.equal(env.ownerRuntime("o1"), undefined);
    assert.equal(env.ownerState("o1"), undefined);
    assert.deepEqual(env.helperAttrs("h1"), [null, null]);
    const second = await env.resolve("o2", 1);
    assert.equal(second.status, "success");
    assert.deepEqual(topNMessages(messages).map((m) => m.text), ["[widgetBase.dispatchWidgetTopNCleanup] cleanup failed"],
      "the clear that cannot be planned is logged once");
  });
});

test("remove before the first bind has finished releases the claim although the helper clear cannot be planned", async () => {
  await withEnv({ applyMs: 300 }, async (env, messages) => {
    const running = env.resolve("o1", 1);
    await sleep(30);
    assert.equal(env.ownerRuntime("o1").helperWidgetId, "h1");
    assert.equal(env.ownerRuntime("o1").lastHelperDataConfig, null);
    const removed = await env.remove("o1");
    assert.equal(removed.ok, true, "remove itself is not affected by the cleanup outcome");
    await running;
    await env.settle();
    assert.equal(env.ownerState("o1"), undefined);
    assert.deepEqual(env.helperAttrs("h1"), [null, null]);
    assert.equal(env.helperInSlot("h1"), true);
    const second = await env.resolve("o2", 1);
    assert.equal(second.status, "success");
    assert.ok(messages.every((m) => m.text.indexOf("WIDGET_TOPN_NO_HELPER_AVAILABLE") === -1));
  });
});

test("remove twice is idempotent: one widgetVis dispose, one history step, one TopN cleanup", async () => {
  await withEnv({}, async (env) => {
    const topNCalls = [];
    const topNDispatch = env.topN().dispatch;
    env._KDB.api.widgetTopN = Object.assign({}, env.topN(), { dispatch: (action) => (topNCalls.push(action), topNDispatch(action)) });
    const first = await env.remove("o2");
    const second = await env.remove("o2");
    assert.equal(first.ok, true);
    assert.equal(first.skipped, false);
    assert.equal(second.ok, true);
    assert.equal(second.skipped, true);
    assert.equal(second.placement, "removed");
    assert.equal(env.visDispatches.filter((a) => a.type === "widgetVis/disposeWidgetRuntime").length, 1);
    assert.equal(env.history.filter((s) => s.key === "widget_removed").length, 1);
    assert.deepEqual(topNCalls.map((a) => a.payload.reason), ["remove"]);
  });
});

test("a destroy remove sends the destroy reason and pushes no history step", async () => {
  await withEnv({}, async (env) => {
    const calls = [];
    const topNDispatch = env.topN().dispatch;
    env._KDB.api.widgetTopN = Object.assign({}, env.topN(), { dispatch: (action) => (calls.push(action), topNDispatch(action)) });
    await env.remove("o2", "destroy");
    assert.deepEqual(calls.map((a) => [a.type, a.widgetId, a.payload.reason, a.payload.clearHelperBinding, a.payload.releaseClaim]),
      [["widgetTopN/cleanup", "o2", "destroy", true, true]]);
    assert.equal(env.history.length, 0);
  });
});

test("a release for an owner whose frame is removed prunes its records", async () => {
  await withEnv({}, async (env) => {
    await env.resolve("o1", 1);
    await env.settle();
    await env.remove("o1");
    const released = await env.topN().dispatch({
      type: "widgetTopN/cleanup",
      widgetId: "o1",
      payload: { ownerVisId: "o1", reason: "remove", clearHelperBinding: true, releaseClaim: true }
    });
    assert.equal(released.ok, true);
    assert.equal(env.ownerState("o1"), undefined, "state record pruned");
    assert.equal(env.ownerRuntime("o1"), undefined, "runtime record pruned");
    assert.deepEqual(env.helperAttrs("h1"), [null, null]);
    const second = await env.resolve("o2", 1);
    assert.equal(second.status, "success");
  });
});

test("two overlapping releases of a removed owner leave no records", async () => {
  await withEnv({ cleanupMs: 100 }, async (env) => {
    await env.resolve("o1", 1);
    await waitUntil(() => env.applyStarts.some((e) => e.kind === "cleanup"));
    await env.remove("o1");
    const release = () => env.topN().dispatch({
      type: "widgetTopN/cleanup",
      widgetId: "o1",
      payload: { ownerVisId: "o1", reason: "remove", clearHelperBinding: true, releaseClaim: true }
    });
    const first = release();
    await sleep(10);
    const results = await Promise.all([first, release()]);
    await env.settle();
    assert.deepEqual(results.map((r) => r.ok), [true, true]);
    assert.equal(env.ownerRuntime("o1"), undefined);
    assert.equal(env.ownerState("o1"), undefined, "state record pruned");
    assert.deepEqual(env.helperAttrs("h1"), [null, null]);
  });
});

test("a remove/destroy release whose helper clear cannot be planned still releases the claim", async () => {
  await withEnv({ applyMs: 300 }, async (env) => {
    const running = env.resolve("o1", 1);
    await sleep(30);
    assert.equal(env.ownerRuntime("o1").lastHelperDataConfig, null);
    const released = await env.topN().dispatch({
      type: "widgetTopN/cleanup",
      widgetId: "o1",
      payload: { ownerVisId: "o1", reason: "remove", clearHelperBinding: true, releaseClaim: true }
    });
    await running;
    await env.settle();
    assert.equal(released.ok, false, "the failure is still reported");
    assert.equal(released.errorCode, "WIDGET_TOPN_CLEANUP_FAILED");
    assert.equal(env.ownerState("o1").helperWidgetId, null, "claim released in state");
    assert.equal(env.ownerRuntime("o1").claimToken, null, "claim released in runtime");
    assert.deepEqual(env.helperAttrs("h1"), [null, null], "mirror cleared");
    const second = await env.resolve("o2", 1);
    assert.equal(second.status, "success");
  });
});

test("an explicit clear that cannot be planned keeps the claim (only remove and destroy release anyway)", async () => {
  await withEnv({ applyMs: 300 }, async (env) => {
    const running = env.resolve("o1", 1);
    await sleep(30);
    const cleared = await env.topN().dispatch({
      type: "widgetTopN/cleanup",
      widgetId: "o1",
      payload: { ownerVisId: "o1", reason: "cleanup", clearHelperBinding: true, releaseClaim: true }
    });
    await running;
    await env.settle();
    assert.equal(cleared.ok, false);
    assert.equal(env.ownerState("o1").helperWidgetId, "h1");
    assert.equal(env.helperAttrs("h1")[0], "o1");
  });
});

test("a late resolve for an owner that was removed binds nothing and claims no helper", async () => {
  await withEnv({}, async (env) => {
    await env.remove("o1");
    await env.settle();
    const late = await env.resolve("o1", 5);
    await env.settle();
    assert.equal(late.status, "aborted");
    assert.equal(late.stale, true);
    assert.deepEqual(env.terminals, []);
    assert.equal(env.ownerState("o1"), undefined);
    assert.equal(env.ownerRuntime("o1"), undefined);
    assert.deepEqual(env.helperAttrs("h1"), [null, null]);
    const other = await env.resolve("o2", 1);
    assert.equal(other.status, "success");
  });
});

test("remove while the helper discovery is in flight: an aborted resolve writes no claim", async () => {
  await withEnv({ launchpadMs: 100 }, async (env) => {
    const running = env.resolve("o1", 1);
    await sleep(30);
    await env.remove("o1");
    const result = await running;
    await env.settle();
    assert.equal(result.status, "aborted");
    assert.deepEqual(env.terminals, []);
    assert.equal(env.ownerState("o1"), undefined);
    assert.equal(env.ownerRuntime("o1"), undefined);
    assert.deepEqual(env.helperAttrs("h1"), [null, null]);
    const other = await env.resolve("o2", 1);
    assert.equal(other.status, "success");
  });
});

test("remove of a text widget sends no TopN cleanup and creates no TopN record", async () => {
  await withEnv({}, async (env) => {
    const calls = [];
    const topNDispatch = env.topN().dispatch;
    env._KDB.api.widgetTopN = Object.assign({}, env.topN(), { dispatch: (action) => (calls.push(action), topNDispatch(action)) });
    const removed = await env.remove("txt1");
    assert.equal(removed.ok, true);
    await env.settle();
    assert.deepEqual(calls, []);
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
