// W2 label move: user-visible German text must stay byte-identical when it moves to config.labels.
// fixtures/w2-labels.old.json holds the literals as they were in the code before the move.
// Run: node --test tools/tests/w2-labels.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const old = JSON.parse(fs.readFileSync(path.join(HERE, "fixtures/w2-labels.old.json"), "utf8"));

function sourceOf(relPath) {
  return fs.readFileSync(path.join(JS_ROOT, relPath), "utf8");
}

test("chrome flush labels equal the old literals", () => {
  const labels = loadAmd(path.join(JS_ROOT, "core/cognosHost/config/chromeLabels.js"));
  assert.deepStrictEqual({ ...labels }, old.chrome.labels);
});

test("chrome flush alert shows the old text, registered labels override it", () => {
  const alerts = [];
  const kdb = { services: { message: { showAlert: (a) => alerts.push(a) } }, _isDisposed: false };
  loadAmd(path.join(JS_ROOT, "core/cognosHost/registerCognosHostSelectors.js"))(kdb);
  assert.deepStrictEqual({ ...kdb.config.labels.de.chrome }, old.chrome.labels);
  const checks = kdb.runtime.cognosHost.chromeChecks;
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  const miss = () => {
    kdb.runtime.cognosHost.flushed = false;
    kdb.runtime.cognosHost.misses = { k: { key: "k", selector: "x" } };
    checks.scheduleFlush(kdb);
    return flush();
  };
  const quiet = console.error;
  console.error = () => {};
  return miss().then(() => {
    assert.deepStrictEqual(alerts, [{ title: old.chrome.labels.flushTitle, severity: "error", message: old.chrome.labels.flushMessage }]);
    kdb.config.labels.de.chrome.flushTitle = "Eigener Titel";
    return miss();
  }).then(() => {
    assert.equal(alerts[1].title, "Eigener Titel");
    assert.equal(alerts[1].message, old.chrome.labels.flushMessage);
  }).finally(() => { console.error = quiet; });
});

test("dashboardPdf text literals are present in the old sources", () => {
  for (const [file, labels] of Object.entries(old.dashboardPdf.files)) {
    const source = sourceOf(file);
    for (const literal of Object.values(labels)) {
      assert.ok(source.includes(JSON.stringify(literal)), `${file}: ${literal}`);
    }
  }
});
