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

test("dashboardPdf labels equal the old literals", () => {
  const config = loadAmd(path.join(JS_ROOT, "workflows/pdfExport/config.js"));
  const flat = Object.assign({}, ...Object.values(old.dashboardPdf.files));
  assert.deepStrictEqual({ ...config.pdfLabels }, flat);
});

test("dashboardPdf readLabels: registered labels override single keys, missing config falls back to the defaults", () => {
  const config = loadAmd(path.join(JS_ROOT, "workflows/pdfExport/config.js"));
  assert.equal(config.readLabels({}).attachmentTitle, "Anhang");
  assert.equal(config.readLabels(null).unnamedTab, "Unbenannter Tab");
  const labels = config.readLabels({ config: { labels: { de: { dashboardPdf: { attachmentTitle: "Appendix" } } } } });
  assert.equal(labels.attachmentTitle, "Appendix");
  assert.equal(labels.unnamedTab, "Unbenannter Tab");
});

test("dashboardPdf registration publishes the labels under config.labels.de.dashboardPdf", () => {
  const register = loadAmd(path.join(JS_ROOT, "workflows/pdfExport/index.js"));
  const kdb = { config: { labels: { de: { dashboardPdf: { attachmentTitle: "Appendix" } } } } };
  register(kdb);
  const flat = Object.assign({}, ...Object.values(old.dashboardPdf.files));
  assert.deepStrictEqual({ ...kdb.config.labels.de.dashboardPdf }, { ...flat, attachmentTitle: "Appendix" });
});
