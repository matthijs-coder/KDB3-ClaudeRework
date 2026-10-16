// Shared helpers of the WS-A3 golden tests (not a test file: check-all only runs *.test.mjs).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

export const ORCHESTRATOR = path.join(JS_ROOT, "core/services/cognosHost/__orchestratorCognosHost.js");
export const FIXTURE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

export function create(cognosAPI) {
  const _KDB = { cognosAPI, services: {}, runtime: {} };
  const svc = loadAmd(ORCHESTRATOR)(_KDB);
  return { _KDB, svc };
}

export function jsonSafe(value) {
  return JSON.parse(
    JSON.stringify(value === undefined ? null : value, (_k, v) => {
      if (typeof v === "function") return "[fn]";
      if (v instanceof Error) return "[error:" + v.message + "]";
      return v;
    })
  );
}

// Optional-argument modes of the signal: none | aborted (before the call) | during (host call aborts it).
export function makeSignalState(kind) {
  const controller = new AbortController();
  if (kind === "aborted") controller.abort();
  return { controller, options: kind === "none" ? undefined : { signal: controller.signal }, abortDuring: kind === "during" };
}

// Runs one facet call against a stub host and records outcome, host call log and console.error tags.
export async function runCase(buildHost, mode, signalKind, invoke, { dispose = false } = {}) {
  const log = [];
  const errors = [];
  const sig = makeSignalState(signalKind);
  const host = buildHost(mode, log, () => {
    if (sig.abortDuring) sig.controller.abort();
  });
  const { svc } = create(host);
  if (dispose) svc.destroy();
  const saved = console.error;
  console.error = (tag) => errors.push(String(tag));
  let result;
  try {
    const raw = await invoke(svc, sig.options);
    result = jsonSafe(raw);
  } catch (error) {
    result = { threw: String(error && error.message) };
  } finally {
    console.error = saved;
  }
  return { result, calls: log, errors };
}

export function checkSnapshot(name, snapshot) {
  const file = path.join(FIXTURE_DIR, name);
  const text = Object.keys(snapshot)
    .map((k) => JSON.stringify(k) + ": " + JSON.stringify(snapshot[k]))
    .join(",\n");
  const serialized = "{\n" + text + "\n}\n";
  if (process.env.UPDATE_SNAPSHOTS === "1") {
    fs.writeFileSync(file, serialized);
  }
  assert.ok(fs.existsSync(file), "missing fixture " + name + " (record with UPDATE_SNAPSHOTS=1)");
  const recorded = JSON.parse(fs.readFileSync(file, "utf8"));
  const actual = JSON.parse(serialized);
  const keys = Object.keys(recorded);
  assert.deepEqual(Object.keys(actual), keys);
  for (const key of keys) {
    assert.deepEqual(actual[key], recorded[key], key);
  }
}
