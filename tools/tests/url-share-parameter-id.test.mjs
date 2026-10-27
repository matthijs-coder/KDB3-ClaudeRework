// URL-share missing-id alert: host option values are UTF-8-safe base64 of the set NAME.
// Run: node --test tools/tests/url-share-parameter-id.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const WB = path.join(JS_ROOT, "workflows/parameterSet");
const decode = loadAmd(path.join(WB, "urlShare/decodeParameterSetId.js"));
const labels = loadAmd(path.join(WB, "set/config/writebackLabels.js"));

function encodeUtf8Base64(name) {
  return btoa(unescape(encodeURIComponent(name)));
}

test("decodeParameterSetId: ASCII host option value is the set name", () => {
  assert.equal(decode("MjAyNi4xMC4yNyB2MDAx"), "2026.10.27 v001");
  assert.equal(decode(encodeUtf8Base64("2026.10.27 v001")), "2026.10.27 v001");
});

test("decodeParameterSetId: UTF-8 umlauts match the encode pair", () => {
  assert.equal(decode(encodeUtf8Base64("Büro v001")), "Büro v001");
  assert.equal(decode(btoa("Büro v001")), "Büro v001");
});

test("decodeParameterSetId: invalid base64 falls back to the raw id", () => {
  assert.equal(decode("not-valid-base64!!!"), "not-valid-base64!!!");
  assert.equal(decode("does-not-exist"), "does-not-exist");
  assert.equal(decode("77"), "77");
});

test("missingIdMessage names the set and mentions a private or deleted set", () => {
  const message = labels.missingIdMessage.split("{id}").join(decode("MjAyNi4xMC4yNyB2MDAx"));
  assert.equal(
    message,
    "Der in der URL angegebene Dashboard-Speicherstand (Parameterset „2026.10.27 v001“) wurde in der Auswahlliste nicht gefunden. "
      + "Es handelt sich möglicherweise um ein privates Parameterset oder es wurde gelöscht. "
      + "Das Dashboard wird ohne Parameterset gestartet."
  );
  assert.equal(message.includes("Parameterset-ID"), false);
  assert.equal(message.includes("MjAyNi4xMC4yNyB2MDAx"), false);
});
