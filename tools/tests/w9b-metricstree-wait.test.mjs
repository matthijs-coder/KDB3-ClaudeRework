// W9b: metricsTree passes its mount signal to the tableData waits, so closing it while the table loads ends the
// mount at once. Run: node --test tools/tests/w9b-metricstree-wait.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const MT = path.join(JS_ROOT, "dashboard/metricsTree");
const ROWS = [{ k: { d: "a", u: "a" } }];

function setup(waitForRows) {
  const log = { waits: [], finished: 0, errors: [], rendered: 0 };
  const view = {
    renderMetricsTrees: () => { log.rendered += 1; return Promise.resolve(true); },
    cleanupMetricsTrees() {},
    bindMetricsTreeSearch() {}
  };
  const register = loadAmd(path.join(MT, "index.js"), {
    modules: { "./view.js": view, "./dragSource.js": { bindMetricsTreeDragSources() {} } },
    stubs: { document: { querySelector: () => null }, console: { log() {}, warn() {}, error: (...a) => log.errors.push(a) } }
  });
  const kdb = {
    config: { tables: { personal_kdb: { schema: "x" } } },
    utils: { getTableConfigObject: () => ({ key: "personal_kdb", name: "Personal" }) },
    services: {
      loading: { startLoading() {}, finishLoading() { log.finished += 1; } },
      tableData: {
        waitForRows: (input, options) => { log.waits.push({ table: input[0].tableName, signal: options && options.signal }); return waitForRows(input, options); },
        readRows: () => ROWS
      }
    }
  };
  return { api: register(kdb), kdb, log };
}

function hangUntilAbort(input, options) {
  return new Promise((resolve, reject) => {
    options.signal.addEventListener("abort", () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      reject(error);
    }, { once: true });
  });
}

test("both table waits receive the mount signal", async () => {
  const { api, log, kdb } = setup(() => Promise.resolve(ROWS));
  assert.equal(await api.mount(), true);
  assert.deepEqual(log.waits.map((wait) => wait.table), ["personal_kdb", "superuser"]);
  assert.equal(log.waits.every((wait) => wait.signal && typeof wait.signal.addEventListener === "function"), true);
  assert.equal(log.waits[0].signal, log.waits[1].signal);
  assert.equal(kdb.state.metricsTree.errorCode, null);
});

test("destroy while the source table loads ends the mount at once without an error state", async () => {
  const { api, log, kdb } = setup(hangUntilAbort);
  const pending = api.mount();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(log.waits.length, 1);
  api.destroy();
  assert.equal(await Promise.race([pending, new Promise((resolve) => setTimeout(() => resolve("timeout"), 500))]), false);
  assert.equal(log.finished >= 1, true, "loading overlay finished");
  assert.equal(kdb.state.metricsTree.errorCode, null);
  assert.equal(log.rendered, 0);
  assert.deepEqual(log.errors, []);
});

test("destroy while the superuser table loads ends the mount without rendering", async () => {
  let call = 0;
  const { api, log } = setup((input, options) => (++call === 1 ? Promise.resolve(ROWS) : hangUntilAbort(input, options)));
  const pending = api.mount();
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(log.waits.length, 2);
  api.destroy();
  assert.equal(await Promise.race([pending, new Promise((resolve) => setTimeout(() => resolve("timeout"), 500))]), false);
  assert.equal(log.rendered, 0);
  assert.deepEqual(log.errors, []);
});
