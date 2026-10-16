// Unit tests of dashboard/filters/_core/dockHandoff.js (the normalised filterDock handoff of the filter owner kit).
// The four owner mappers are pinned against the pre-W5 code in filterOwnerDockHandoff.test.mjs.
// Run: node --test tools/tests/filterOwnerKit.dockHandoff.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const kit = loadAmd(path.join(JS_ROOT, "dashboard/filters/_core/dockHandoff.js"));

function profile(extra) {
  return Object.assign({
    labelDefault: "Default",
    scopeMode: "filterScopeFirst",
    keyScope: "filterScope",
    timestamp: "timestampFirst",
    fields: [
      ["filterLabel", "derived"], ["filterKey", "derived"], ["filterScope", "derived"], ["scopeType", "derived"],
      ["scopeId", "scopeIdPair"], ["scope", "scopePair"], ["interactionType", "derived"], ["clickedOk", "derived"],
      ["timestamp", "derived"]
    ]
  }, extra || {});
}

test("dock handoff: non-objects and a foreign filterType map to null, the input is not mutated", () => {
  const gated = profile({ filterType: "sicht" });
  for (const bad of [null, undefined, "x", 5, true]) {
    assert.strictEqual(kit.mapDockHandoff(bad, gated), null);
  }
  const raw = { filterType: "singleSelect", popup: { a: 1 } };
  const before = JSON.stringify(raw);
  assert.strictEqual(kit.mapDockHandoff(raw, gated), null);
  assert.equal(JSON.stringify(raw), before);
  assert.notStrictEqual(kit.mapDockHandoff(raw, profile()), null);
  assert.equal(JSON.stringify(raw), before);
});

test("dock handoff: scope modes, key scope and label default", () => {
  const raw = { filterScope: "pageContext", interactionType: "confirm", timestamp: 4 };
  const first = kit.mapDockHandoff(raw, profile());
  assert.deepEqual([first.filterScope, first.scopeType, first.filterKey, first.filterLabel], ["pageContext", "pageContext", "pageContext__Default", "Default"]);
  assert.equal(first.clickedOk, true);
  const only = kit.mapDockHandoff(raw, profile({ scopeMode: "scopeTypeOnly", keyScope: "scopeType" }));
  assert.deepEqual([only.filterScope, only.scopeType, only.filterKey], ["global", "global", "global__Default"]);
  const mixed = kit.mapDockHandoff({ filterScope: "pageContext", scopeType: "global" }, profile({ keyScope: "scopeType" }));
  assert.deepEqual([mixed.filterScope, mixed.scopeType, mixed.filterKey], ["pageContext", "global", "global__Default"]);
  assert.equal(kit.mapDockHandoff({ filterKey: "K", filterId: "I" }, profile()).filterKey, "K");
  assert.equal(kit.mapDockHandoff({ filterId: "I" }, profile()).filterKey, "I");
});

test("dock handoff: timestamp modes", () => {
  const realNow = Date.now;
  Date.now = () => 99;
  try {
    const timestamps = (mode, raw) => kit.mapDockHandoff(raw, profile({ timestamp: mode })).timestamp;
    assert.equal(timestamps("timestampFirst", { timestamp: 5, observedAt: 7 }), 5);
    assert.equal(timestamps("timestampFirst", { timestamp: 0, observedAt: 7 }), 7);
    assert.equal(timestamps("timestampFirst", {}), 99);
    assert.equal(timestamps("observedAtNullable", { observedAt: 0, timestamp: 5 }), 0);
    assert.equal(timestamps("observedAtNullable", { timestamp: 5 }), 99);
    assert.equal(timestamps("observedAtOnly", { observedAt: 0, timestamp: 5 }), 99);
    assert.equal(timestamps("observedAtOnly", { observedAt: 6 }), 6);
  } finally {
    Date.now = realNow;
  }
});

test("dock handoff: value rules", () => {
  const rules = {
    fields: [
      ["a", "orNull"], ["b", "nonNull"], ["c", "isTrue"], ["optionLabel", "optionLabel"], ["filterType", "filterType"],
      ["z", "alwaysNull"], ["copy", "copyOrEmpty", "src"], ["copyNull", "copyOrNull", "src"], ["ref", "refOrEmpty", "src"],
      ["scopeId", "scopeIdNullable"], ["global", "scopeIdGlobalDefault", "scopeId"], ["fn", (_raw, _derived) => _derived.caps.k || "none"]
    ]
  };
  const src = { x: 1 };
  const empty = kit.mapDockHandoff({}, profile(rules));
  assert.deepEqual(empty, {
    a: null, b: null, c: false, optionLabel: null, filterType: "unknown", z: null, copy: {}, copyNull: null, ref: {},
    scopeId: null, global: "global", fn: "none"
  });
  const full = kit.mapDockHandoff({
    a: 0, b: 0, c: "true", selectedOptionLabel: "S", filterType: "t", src, scope: "tab1", scopeType: "pageContext", capabilities: { k: "v" }
  }, profile(rules));
  assert.deepEqual([full.a, full.b, full.c, full.optionLabel, full.filterType], [null, 0, false, "S", "t"]);
  assert.deepEqual(full.copy, src);
  assert.notStrictEqual(full.copy, src);
  assert.strictEqual(full.ref, src);
  assert.deepEqual([full.scopeId, full.global, full.fn], ["tab1", null, "v"]);
});

test("dock handoff: finish may replace or reject the mapped object; capabilities are copied", () => {
  const caps = { condition: "c" };
  const withCaps = profile({ fields: [["capabilities", "derived"]], finish: (mapped) => mapped });
  const mapped = kit.mapDockHandoff({ capabilities: caps }, withCaps);
  assert.deepEqual(mapped.capabilities, caps);
  assert.notStrictEqual(mapped.capabilities, caps);
  assert.strictEqual(kit.mapDockHandoff({}, profile({ finish: () => null })), null);
  assert.deepEqual(kit.mapDockHandoff({}, profile({ fields: [], finish: (m) => Object.assign(m, { done: true }) })), { done: true });
});
