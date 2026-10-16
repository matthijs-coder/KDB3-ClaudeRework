// W2 writeback leftovers: publishRestoreTabCaption error handling (one boundary catch) and the restore payload
// validation without the dead resolveRuntimePackageKey wrapper. Run: node --test tools/tests/w2-writeback-leftovers.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const WB = path.join(JS_ROOT, "core/services/writeback");
const publish = loadAmd(path.join(WB, "set/effects/publishRestoreTabCaption.js"));

const LABELS = {
  tabProgressNamedCounted: "Registerkarte {n} von {m}: {name}",
  tabProgressCounted: "Registerkarte {n} von {m}",
  tabProgressName: "{name}"
};

function tab(index, name) {
  return { index, tabId: "t" + index, name, role: "dashboard", visible: true };
}

function makeKdb({ labels = LABELS, tabs = [tab(0, "Alpha"), tab(1, ""), tab(2, "Gamma")], updates, updateResult } = {}) {
  const byIndex = {};
  tabs.forEach((entry) => { byIndex[String(entry.index)] = entry; });
  return {
    state: { tabs: { order: tabs.map((entry) => entry.index), byIndex } },
    config: { labels: { de: { loading: labels } } },
    services: { loading: { updateLoadingMessage: (arg) => { updates.push(arg); return updateResult; } } }
  };
}

const RUN = { loadingStarted: true, loadingHandle: { mountKey: "m" } };

async function withConsole(fn) {
  const logs = { warn: [], error: [] };
  const saved = { warn: console.warn, error: console.error };
  console.warn = (...args) => logs.warn.push(args.map(String).join(" "));
  console.error = (...args) => logs.error.push(args.map(String).join(" "));
  try {
    await fn(logs);
  } finally {
    Object.assign(console, saved);
  }
}

test("caption: tab index request publishes the named, counted caption", async () => {
  const updates = [];
  await withConsole(() => publish(makeKdb({ updates }), RUN, { tabIdx: 0 }));
  assert.deepStrictEqual(updates, [{ handle: RUN.loadingHandle, message: "Registerkarte 1 von 3: Alpha" }]);
});

test("caption: unnamed tab publishes the counted caption, landing publishes the first visible tab", async () => {
  const updates = [];
  await withConsole(async () => {
    publish(makeKdb({ updates }), RUN, { tabIdx: 1 });
    publish(makeKdb({ updates }), RUN, { landing: true });
  });
  assert.deepStrictEqual(updates.map((entry) => entry.message), ["Registerkarte 2 von 3", "Registerkarte 1 von 3: Alpha"]);
});

test("caption: no tab for the index, no loading handle or no loading service publish nothing", async () => {
  const updates = [];
  await withConsole(async (logs) => {
    publish(makeKdb({ updates }), RUN, { tabIdx: 9 });
    assert.deepStrictEqual(logs.warn, ["[writebackSet.publishRestoreTabCaption] tab index missed [object Object]"]);
    publish(makeKdb({ updates }), { loadingStarted: false }, { tabIdx: 0 });
    const kdb = makeKdb({ updates });
    kdb.services.loading = null;
    publish(kdb, RUN, { tabIdx: 0 });
  });
  assert.deepStrictEqual(updates, []);
});

test("caption: a missing label publishes an empty caption and logs the failure (format boundary stays)", async () => {
  const updates = [];
  await withConsole(async (logs) => {
    publish(makeKdb({ updates, labels: {} }), RUN, { tabIdx: 0 });
    assert.deepStrictEqual(logs.error, ["[writebackSet.formatRestoreTabCaption] failed Error: missing label"]);
  });
  assert.deepStrictEqual(updates, [{ handle: RUN.loadingHandle, message: "" }]);
});

test("caption: a failing tab state read publishes nothing and warns once", async () => {
  const updates = [];
  const kdb = makeKdb({ updates });
  Object.defineProperty(kdb.state, "tabs", { get() { throw new Error("state boom"); } });
  await withConsole(async (logs) => {
    assert.doesNotThrow(() => publish(kdb, RUN, { tabIdx: 0 }));
    assert.deepStrictEqual(logs.warn, ["[writebackSet.publishRestoreTabCaption] failed Error: state boom"]);
  });
  assert.deepStrictEqual(updates, []);
});

test("caption: a tab without a role stops at the role warning and publishes nothing", async () => {
  const updates = [];
  const tabs = [{ index: 0, tabId: "t0", name: "A", visible: true }];
  await withConsole(async (logs) => {
    publish(makeKdb({ updates, tabs }), RUN, { tabIdx: 0 });
    assert.deepStrictEqual(logs.warn, ["[writebackSet.publishRestoreTabCaption] tab role missing"]);
  });
  assert.deepStrictEqual(updates, []);
});

test("caption: updateLoadingMessage returning false only warns", async () => {
  const updates = [];
  await withConsole(async (logs) => {
    publish(makeKdb({ updates, updateResult: false }), RUN, { tabIdx: 0 });
    assert.deepStrictEqual(logs.warn, ["[writebackSet.publishRestoreTabCaption] updateLoadingMessage returned false"]);
  });
  assert.equal(updates.length, 1);
});
