// W2b label move: the history replay failure texts stay byte-identical when they move to config.labels.
// fixtures/w2b-labels.old.json holds the literals as they were in replay.js before the move.
// Run: node --test tools/tests/w2b-labels.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const old = JSON.parse(fs.readFileSync(path.join(HERE, "fixtures/w2b-labels.old.json"), "utf8"));

test("history labels equal the old literals", () => {
  const config = loadAmd(path.join(JS_ROOT, "core/services/historyService/config.js"));
  assert.deepStrictEqual({ ...config.historyLabels }, old.history.labels);
});

test("history registration publishes the labels; existing values win; a replay failure notifies the label text", async () => {
  const register = loadAmd(path.join(JS_ROOT, "core/services/historyService/__orchestratorHistoryService.js"), {
    stubs: { console: { ...console, error() {}, warn() {} } }
  });
  const notified = [];
  const kdb = {
    events: { emit() {} },
    services: { message: { notify: (m) => notified.push(m) } },
    config: { labels: { de: { history: { replayFailedRedo: "Eigener Text" } } } }
  };
  const service = register(kdb);
  assert.deepStrictEqual({ ...kdb.config.labels.de.history }, { ...old.history.labels, replayFailedRedo: "Eigener Text" });
  service.pushCommittedStep({ key: "k", old: { a: 1 }, new: { a: 2 } });
  assert.equal(await service.undo(), false);
  service.registerReplayHandler("k", { apply: (_kdb, _value, _step, info) => info.direction === "undo" });
  assert.equal(await service.undo(), true);
  assert.equal(await service.redo(), false);
  assert.deepStrictEqual(notified.map((entry) => entry.message), [old.history.labels.replayFailedUndo, "Eigener Text"]);
});
