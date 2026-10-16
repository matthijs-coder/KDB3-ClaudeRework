// Shared helpers of the ws-a2-* golden tests (cognosHost facets filters, dataQuery, dataSources, messages, dashboard).
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const ORCHESTRATOR = path.join(JS_ROOT, "core/services/cognosHost/__orchestratorCognosHost.js");

export function create(cognosAPI, stubs = {}) {
  const _KDB = { cognosAPI, services: {}, runtime: {} };
  const svc = loadAmd(ORCHESTRATOR, { stubs })(_KDB);
  return { _KDB, svc };
}

export const quiet = (fn) => async () => {
  const saved = console.error;
  console.error = () => {};
  try {
    await fn();
  } finally {
    console.error = saved;
  }
};

export function countingSignal() {
  const controller = new AbortController();
  const signal = controller.signal;
  const counts = { added: 0, removed: 0 };
  const add = signal.addEventListener.bind(signal);
  const remove = signal.removeEventListener.bind(signal);
  signal.addEventListener = (...args) => { counts.added += 1; return add(...args); };
  signal.removeEventListener = (...args) => { counts.removed += 1; return remove(...args); };
  return { controller, signal, counts };
}

export const ok = (data) => ({ ok: true, outcome: "ok", data });
