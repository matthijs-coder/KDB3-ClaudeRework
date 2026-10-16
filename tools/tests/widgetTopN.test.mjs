// Race tests for _____________KDB3API/KDB3/js/dashboard/widgets/widgetTopN (helper claim, placement lease, cleanup gate).
// Run: node --test tools/tests/widgetTopN.test.mjs   (Node >= 22, no dependencies)
// The module runs against a fake DOM and fake services; Cognos timing is simulated with small real delays.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";

const JS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../_____________KDB3API/KDB3/js");
const ENTRY = resolve(JS_DIR, "dashboard/widgets/widgetTopN/__orchestratorWidgetTopN.js");

const DATA_CONFIG = {
  datasourceId: "ds1",
  dimension: "dim",
  kennzahlenTable: "Personal_KDB",
  dataTableConfig: { dimensions: { dim: { topNItemId: "item", exclude: { itemId: "item" } } } }
};

// ---- fake DOM ---------------------------------------------------------------------------------
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
  appendChild(node) { return this.insertBefore(node, null); }
  contains(node) {
    for (let cur = node; cur; cur = cur.parentNode) if (cur === this) return true;
    return false;
  }
  querySelector() { return null; }
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

// ---- fake services ----------------------------------------------------------------------------
function delay(ms, signal) {
  return new Promise((resolveDelay) => {
    if (signal && signal.aborted) return resolveDelay(false);
    const timer = setTimeout(() => { cleanup(); resolveDelay(true); }, ms);
    const onAbort = () => { clearTimeout(timer); cleanup(); resolveDelay(false); };
    const cleanup = () => signal && signal.removeEventListener && signal.removeEventListener("abort", onAbort);
    if (signal && signal.addEventListener) signal.addEventListener("abort", onAbort);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function createEnv({ owners = ["o1"], helpers = ["h1"], applyMs = 20, cleanupMs = 300, readMs = 10 } = {}) {
  const t0 = Date.now();
  const now = () => Date.now() - t0;
  const doc = new FakeDocument();
  const canvas = doc.create("canvas", {});
  owners.forEach((id) => doc.create(id, {}, canvas));
  const pad = doc.create("KDB_topNPad", {});
  const slot = doc.create(null, { "data-kdb-launchpad-pad": "topN", cor_page_id: "t1", cor_page_index: "0" }, pad);
  helpers.forEach((id) => doc.create(id, {}, slot));

  const log = [];
  const terminals = [];
  const overlaps = [];
  const active = {};
  const mark = (helperId, kind, delta) => {
    const entry = active[helperId] || (active[helperId] = { cleanup: 0, apply: 0 });
    if (delta > 0 && (entry.cleanup > 0 || (kind === "cleanup" && entry.apply > 0))) {
      overlaps.push({ helperId, kind, t: now(), active: Object.assign({}, entry) });
    }
    entry[kind] += delta;
  };

  const _KDB = {
    state: {},
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
          terminals.push(Object.assign({ t: now() }, action.payload));
          return Promise.resolve({ ok: true });
        }
      }
    },
    services: {
      cognosHost: { widgets: { renderWidget: (id, options) => delay(2, options.signal).then((done) => (done ? { ok: true } : { ok: false, outcome: "aborted" })) } },
      widgetBindingPlan: {
        buildPlan: (spec) => ({
          ok: true,
          status: "success",
          reason: spec.reason,
          widgetId: spec.widgetId,
          managedFilterItemIds: spec.reason === "cleanup" ? [] : ["f1"],
          resetIntent: spec.resetIntent
        })
      },
      widgetBindingApply: {
        async applyBinding(plan, options) {
          const helperId = options.target.widgetId;
          const kind = plan.reason === "cleanup" ? "cleanup" : "apply";
          log.push({ ev: kind + "Start", helperId, owner: options.target.ownerWidgetId, opSeq: options.target.opSeq, t: now() });
          mark(helperId, kind, 1);
          const done = await delay(kind === "cleanup" ? cleanupMs : applyMs, options.signal);
          mark(helperId, kind, -1);
          log.push({ ev: kind + (done ? "End" : "Aborted"), helperId, owner: options.target.ownerWidgetId, opSeq: options.target.opSeq, t: now() });
          return done ? { status: "success", diagnostics: {} } : { status: "aborted" };
        }
      },
      tableData: {
        reloadTable: async () => {
          await delay(readMs);
          return [{ c: { d: "A", u: "A" } }, { c: { d: "B", u: "B" } }, { c: { d: "C", u: "C" } }];
        }
      }
    }
  };

  const modules = {};
  const shell = { resolveWidgetShell: (kdb, id) => (id ? doc.getElementById(id) : null) };
  const baseSelectors = { readFrame: () => ({ tabId: "t1" }) };
  const visProps = () => Promise.resolve({ diagnostics: {} });
  for (const prefix of ["../../", "../"]) {
    modules[prefix + "widgetBase/view/resolveWidgetShell.js"] = shell;
    modules[prefix + "widgetBase/state/selectors.js"] = baseSelectors;
    modules[prefix + "widgetVis/effects/applyVisualizationProperties.js"] = visProps;
  }
  const register = loadAmd(ENTRY, { modules });
  register(_KDB, {});
  _KDB.api.widgetTopN.mount({});

  const api = _KDB.api.widgetTopN;
  return {
    _KDB, api, doc, slot, canvas, log, terminals, overlaps, now,
    resolve(owner, opSeq, topNChoice) {
      return api.dispatch({
        type: "widgetTopN/resolveRequested",
        widgetId: owner,
        opSeq,
        payload: { ownerVisId: owner, topNChoice: topNChoice || "2", dataConfig: DATA_CONFIG, config: {}, tabId: "t1" }
      }).then((result) => Object.assign({ t: now() }, result));
    },
    release(owner) {
      return api.dispatch({
        type: "widgetTopN/cleanup",
        widgetId: owner,
        payload: { ownerVisId: owner, reason: "topNWaveRelease", clearHelperBinding: false, releaseClaim: true }
      });
    },
    clear(owner) {
      return api.dispatch({
        type: "widgetTopN/cleanup",
        widgetId: owner,
        payload: { ownerVisId: owner, reason: "cleanup", clearHelperBinding: true, releaseClaim: false }
      });
    },
    helperInSlot(id) { return doc.getElementById(id).parentNode === slot; },
    ownerRuntime(owner) { return _KDB.runtime.widgetTopN.byOwner[owner]; },
    idle() { return Object.keys(_KDB.runtime.widgetTopN.pendingPromises || {}).length === 0; }
  };
}

function captureConsole() {
  const saved = { warn: console.warn, error: console.error, info: console.info };
  const messages = [];
  for (const level of ["warn", "error", "info"]) {
    console[level] = (...args) => messages.push({ level, text: String(args[0]) });
  }
  return { messages, restore() { Object.assign(console, saved); } };
}

async function withEnv(options, body) {
  const capture = captureConsole();
  try {
    const env = createEnv(options);
    await body(env, capture.messages);
  } finally {
    capture.restore();
  }
}

async function waitUntil(predicate, timeoutMs = 3000) {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error("waitUntil timed out");
    await sleep(5);
  }
}

const widgetTopNWarnings = (messages) => messages.filter((m) => m.text.indexOf("[widgetTopN") === 0);

test("owner outcome does not wait for the post-resolution cleanup render", async () => {
  await withEnv({ cleanupMs: 400 }, async (env, messages) => {
    const result = await env.resolve("o1", 1);
    assert.equal(result.ok, true);
    assert.equal(result.status, "success");
    assert.equal(result.terminalDispatched, true);
    assert.equal(env.terminals.length, 1);
    assert.deepEqual(env.terminals[0].resultValues.map((v) => v.d), ["A", "B"]);
    const cleanupStart = env.log.find((e) => e.ev === "cleanupStart");
    assert.ok(cleanupStart, "cleanup started");
    assert.ok(result.t < cleanupStart.t + 400, "dispatch returned before the cleanup apply finished");
    assert.equal(env.helperInSlot("h1"), true, "helper is back in its pad slot before the cleanup runs");
    await waitUntil(() => env.idle());
    assert.ok(env.log.some((e) => e.ev === "cleanupEnd"), "cleanup completed in the background");
    assert.equal(env.ownerRuntime("o1").lastHelperPlan, null);
    assert.deepEqual(env.ownerRuntime("o1").helperManagedFilterItemIds, []);
    assert.equal(env.ownerRuntime("o1").helperPlacement, null);
    assert.equal(env.api.getState().byOwner.o1.helperWidgetId, "h1", "owner keeps its claim (releaseClaim false)");
    assert.deepEqual(widgetTopNWarnings(messages), []);
  });
});

test("rapid Top5 -> Top10 -> Top3 on one owner ends with the helper in its slot and one terminal", async () => {
  await withEnv({ applyMs: 40, cleanupMs: 200 }, async (env, messages) => {
    const first = env.resolve("o1", 1, "5");
    await sleep(60);
    const second = env.resolve("o1", 2, "10");
    await sleep(60);
    const third = env.resolve("o1", 3, "3");
    const results = await Promise.all([first, second, third]);
    assert.equal(results[0].stale, true);
    assert.equal(results[1].stale, true);
    assert.equal(results[2].status, "success");
    assert.deepEqual(env.terminals.map((t) => t.opSeq), [3]);
    await waitUntil(() => env.idle());
    assert.equal(env.helperInSlot("h1"), true);
    assert.equal(env.ownerRuntime("o1").helperPlacement, null);
    assert.deepEqual(env.overlaps, [], "no op used the helper while a cleanup ran on it");
    assert.deepEqual(widgetTopNWarnings(messages), []);
  });
});

test("a new resolve during a running cleanup aborts and awaits it before touching the helper", async () => {
  await withEnv({ cleanupMs: 400 }, async (env, messages) => {
    await env.resolve("o1", 1, "5");
    await waitUntil(() => env.log.some((e) => e.ev === "cleanupStart"));
    const second = await env.resolve("o1", 2, "3");
    assert.equal(second.status, "success");
    const cleanupAborted = env.log.find((e) => e.ev === "cleanupAborted" && e.opSeq === 1);
    const secondApply = env.log.find((e) => e.ev === "applyStart" && e.opSeq === 2);
    assert.ok(cleanupAborted, "first cleanup was aborted");
    assert.ok(cleanupAborted.t <= secondApply.t, "second apply starts after the first cleanup settled");
    await waitUntil(() => env.idle());
    assert.equal(env.helperInSlot("h1"), true);
    assert.deepEqual(env.overlaps, []);
    assert.deepEqual(widgetTopNWarnings(messages), []);
  });
});

test("two owners, one helper: the second owner waits for the first owner's cleanup", async () => {
  await withEnv({ owners: ["o1", "o2"], cleanupMs: 300 }, async (env, messages) => {
    const a = await env.resolve("o1", 1);
    assert.equal(a.status, "success");
    const released = await env.release("o1");
    assert.equal(released.ok, true);
    assert.ok(env.log.some((e) => e.ev === "cleanupStart" && e.owner === "o1"), "release-only cleanup does not abort the running cleanup");
    assert.ok(!env.log.some((e) => e.ev === "cleanupAborted" && e.owner === "o1"));
    const b = await env.resolve("o2", 1);
    assert.equal(b.status, "success", "no WIDGET_TOPN_NO_HELPER_AVAILABLE");
    assert.equal(env.api.getState().byOwner.o2.helperWidgetId, "h1");
    const firstCleanupDone = env.log.find((e) => e.owner === "o1" && (e.ev === "cleanupEnd" || e.ev === "cleanupAborted"));
    const secondApply = env.log.find((e) => e.ev === "applyStart" && e.owner === "o2");
    assert.ok(firstCleanupDone.t <= secondApply.t);
    await waitUntil(() => env.idle());
    assert.equal(env.helperInSlot("h1"), true);
    assert.deepEqual(env.overlaps, []);
    assert.deepEqual(widgetTopNWarnings(messages), []);
  });
});

test("Jahr wave over 3 charts with one helper: each owner returns before its cleanup; helper ends in its slot", async () => {
  await withEnv({ owners: ["o1", "o2", "o3"], cleanupMs: 250 }, async (env, messages) => {
    const returns = [];
    for (const owner of ["o1", "o2", "o3"]) {
      const result = await env.resolve(owner, 1);
      returns.push(result);
      await env.release(owner);
    }
    returns.forEach((r) => assert.equal(r.status, "success"));
    returns.forEach((r) => {
      const cleanupStart = env.log.find((e) => e.ev === "cleanupStart" && e.owner === r.ownerVisId);
      assert.ok(r.t < cleanupStart.t + 250, r.ownerVisId + " returned before its cleanup finished");
    });
    await waitUntil(() => env.idle());
    assert.ok(env.log.some((e) => e.ev === "cleanupEnd" && e.owner === "o3"), "the last cleanup runs to completion");
    assert.equal(env.helperInSlot("h1"), true);
    assert.deepEqual(env.overlaps, []);
    assert.deepEqual(widgetTopNWarnings(messages), []);
  });
});

test("destroy during a running cleanup aborts it without warnings", async () => {
  await withEnv({ cleanupMs: 400 }, async (env, messages) => {
    await env.resolve("o1", 1);
    await waitUntil(() => env.log.some((e) => e.ev === "cleanupStart"));
    env.api.destroy();
    await waitUntil(() => env.log.some((e) => e.ev === "cleanupAborted"), 1000);
    await sleep(20);
    assert.equal(env.helperInSlot("h1"), true);
    assert.equal(env.api.getState(), undefined);
    assert.deepEqual(widgetTopNWarnings(messages), []);
  });
});

test("an explicit clear during a running post-resolution cleanup replaces it instead of running in parallel", async () => {
  await withEnv({ cleanupMs: 200 }, async (env, messages) => {
    await env.resolve("o1", 1);
    await waitUntil(() => env.log.some((e) => e.ev === "cleanupStart"));
    const cleared = await env.clear("o1");
    assert.equal(cleared.ok, true);
    assert.equal(env.log.filter((e) => e.ev === "cleanupStart").length, 2);
    assert.deepEqual(env.overlaps, []);
    assert.equal(env.ownerRuntime("o1").lastHelperPlan, null);
    assert.deepEqual(widgetTopNWarnings(messages), []);
  });
});
