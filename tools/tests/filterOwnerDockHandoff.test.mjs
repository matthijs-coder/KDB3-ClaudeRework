// Characterisation of the four mapFilterDockHandoff implementations (dienststelle, singleSelect, sicht,
// specialSingleSelect): every owner maps the same raw filterDock handoff matrix to the recorded result.
// The fixture was recorded on the code BEFORE the one normalised handoff (Phase 2 W5) and is not edited.
// Re-record only on purpose: FILTER_HANDOFF_RECORD=1 node --test tools/tests/filterOwnerDockHandoff.test.mjs
// Run: node --test tools/tests/filterOwnerDockHandoff.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const FILTERS = path.join(JS_ROOT, "dashboard/filters");
const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures/filterOwnerDockHandoff.golden.json");
const NOW = 1700000000000;
const quietConsole = { log() {}, info() {}, debug() {}, warn() {}, error() {} };
const fakeDocument = { querySelector: () => null, querySelectorAll: () => [], contains: () => true };

const popupFull = {
  isVisible: true, hasOptions: true, optionCount: 4, hasOkButton: true, hasCancelButton: true, observedAt: 9, extra: "x", nested: { a: 1 }
};

const RAW = {
  nullValue: null,
  string: "x",
  number: 5,
  array: [],
  empty: {},
  typeOnly_dienststelle: { filterType: "dienststelle" },
  typeOnly_sicht: { filterType: "sicht" },
  typeOnly_singleSelect: { filterType: "singleSelect" },
  typeOnly_special: { filterType: "specialSingleSelect" },
  scope_filterScopePage: { filterType: "dienststelle", filterScope: "pageContext" },
  scope_scopeTypePage: { filterType: "sicht", scopeType: "pageContext" },
  scope_both_different: { filterType: "singleSelect", filterScope: "pageContext", scopeType: "global" },
  scope_both_reverse: { filterType: "specialSingleSelect", filterId: "personengruppe", filterScope: "global", scopeType: "pageContext" },
  scope_onlyScope: { filterType: "dienststelle", scope: "tab1" },
  scope_scopeIdZero: { filterType: "singleSelect", scopeId: 0, scope: "tab2" },
  scope_scopeIdEmpty: { filterType: "sicht", scopeId: "", scope: "tab3" },
  scope_scopeIdAndScope: { filterType: "dienststelle", scopeId: "t1", scope: "t2", filterScope: "pageContext" },
  scope_pageNoScopeId: { filterType: "sicht", scopeType: "pageContext", tabId: "tab9" },
  keys_filterKey: { filterType: "singleSelect", filterKey: "K1", filterId: "F1", filterLabel: "L1" },
  keys_filterIdOnly: { filterType: "sicht", filterId: "F2", filterLabel: "L2" },
  keys_labelOnly: { filterType: "dienststelle", filterLabel: "Dienststelle_BW" },
  keys_pageLabel: { filterType: "dienststelle", filterScope: "pageContext", filterLabel: "Dienststelle_DEZPV", scopeId: "tab1" },
  label_empty: { filterType: "singleSelect", filterLabel: "" },
  interaction_confirm: { filterType: "dienststelle", interactionType: "confirm", observedAt: 3 },
  interaction_cancel: { filterType: "singleSelect", interactionType: "cancel" },
  interaction_clear: { filterType: "sicht", interactionType: "clear" },
  interaction_close: { filterType: "dienststelle", interactionType: "close" },
  interaction_option: { filterType: "singleSelect", interactionType: "option", optionLabel: "Frau", selectedOptionLabel: "Mann" },
  interaction_selectedOption: { filterType: "sicht", interactionType: "option", selectedOptionLabel: "Mann", isAlleOption: true },
  interaction_alleString: { filterType: "dienststelle", isAlleOption: "true" },
  interaction_bogus: { filterType: "singleSelect", interactionType: "bogus" },
  popup_full: { filterType: "singleSelect", popup: popupFull },
  popup_full_sicht: { filterType: "sicht", popup: popupFull },
  popup_full_dienststelle: { filterType: "dienststelle", popup: popupFull },
  popup_partial: { filterType: "sicht", popup: { isVisible: "yes", optionCount: 0, hasOkButton: 1 } },
  popup_string: { filterType: "sicht", popup: "popup" },
  popup_empty: { filterType: "dienststelle", popup: {} },
  capabilities_all: { filterType: "singleSelect", capabilities: { hasAlleOption: true, condition: "Personengruppe", other: 1 } },
  capabilities_condition: { filterType: "specialSingleSelect", capabilities: { condition: "Dienststellenleitung" } },
  capabilities_hasAlleString: { filterType: "singleSelect", capabilities: { hasAlleOption: "true", condition: 0 } },
  capabilities_null: { filterType: "dienststelle", capabilities: null },
  time_timestamp: { filterType: "singleSelect", timestamp: 5 },
  time_observedAt: { filterType: "sicht", observedAt: 7 },
  time_bothTimestampFirst: { filterType: "singleSelect", timestamp: 5, observedAt: 7 },
  time_timestampZero: { filterType: "sicht", timestamp: 0, observedAt: 7 },
  time_observedAtZero: { filterType: "dienststelle", observedAt: 0 },
  time_timestampOnlyDienststelle: { filterType: "dienststelle", timestamp: 11 },
  time_none: { filterType: "sicht" },
  hints_all: {
    filterType: "singleSelect", filterInstanceId: "inst-1", scopeResolution: "global", tabId: "tab-1", itemNameHint: "Item", itemIdHint: "[id]",
    semanticInstanceKeyHint: "key", semanticSpecialFilterId: "personengruppe", authorizedByOwner: "specialSingleSelect"
  },
  hints_falsy: {
    filterType: "sicht", filterInstanceId: 0, scopeResolution: "", tabId: 0, itemNameHint: "", itemIdHint: 0, semanticInstanceKeyHint: "",
    scopeType: "pageContext"
  },
  hints_sichtPage: { filterType: "sicht", scopeType: "pageContext", filterLabel: "Sicht", tabId: null, itemIdHint: null },
  operation_number: { filterType: "singleSelect", operationId: 12, source: "tabs", skipHistory: true },
  operation_zero: { filterType: "singleSelect", operationId: 0 },
  operation_string: { filterType: "singleSelect", operationId: "op-3", skipHistory: "yes" },
  config_object: { filterType: "singleSelect", filterConfig: { a: 1, nested: { b: 2 } } },
  config_dienststelle: { filterType: "dienststelle", filterConfig: { a: 1 } },
  resync_source: { filterType: "dienststelle", resyncSource: "mountMutation", observedAt: 4 },
  owner_context: {
    filterType: "singleSelect",
    ownerSelectionContext: { currentSelection: { displayValue: "A", useValue: "a" }, backupSelection: { displayValue: "B" }, pendingSelection: null, extra: 1 }
  },
  owner_context_bad: { filterType: "singleSelect", ownerSelectionContext: "nope" },
  special_byId: { filterType: "specialSingleSelect", filterId: "personengruppe", filterLabel: "x", observedAt: 8, tabId: "t" },
  special_byCondition: {
    filterType: "specialSingleSelect", filterId: "unknown", capabilities: { condition: "dienststellenleitung" }, filterLabel: "L", scopeType: "pageContext", scope: "tab5"
  },
  special_conditionFallback: { filterType: "specialSingleSelect", condition: "Personengruppe", filterLabel: "L", scopeId: 0 },
  special_byLabel: { filterType: "specialSingleSelect", filterLabel: "Dienststellenleitung", filterConfig: { a: 1 }, timestamp: 3, observedAt: 5 },
  special_unresolved: { filterType: "specialSingleSelect", filterId: "other", filterLabel: "Other" },
  special_keyScope_filterScopeOnly: { filterType: "specialSingleSelect", filterLabel: "Dienststellenleitung", filterScope: "pageContext" },
  special_keyScope_scopeTypeOnly: { filterType: "specialSingleSelect", filterLabel: "Dienststellenleitung", scopeType: "pageContext" },
  special_keyScope_both: { filterType: "specialSingleSelect", filterLabel: "Personengruppe", filterScope: "pageContext", scopeType: "global" },
  special_keyScope_conditionOnly: { filterType: "specialSingleSelect", capabilities: { condition: "Personengruppe" }, filterScope: "pageContext" },
  keys_pageScopeLabel: { filterType: "singleSelect", filterScope: "pageContext", filterLabel: "Geschlecht" },
  keys_scopeTypeLabel: { filterType: "sicht", scopeType: "pageContext", filterLabel: "Sicht" },
  time_observedAtNull: { filterType: "dienststelle", observedAt: null, timestamp: 5 },
  time_observedAtEmpty: { filterType: "dienststelle", observedAt: "", timestamp: 5 },
  time_observedAtString: { filterType: "sicht", observedAt: "7" },
  time_timestampString: { filterType: "singleSelect", timestamp: "7", observedAt: 3 },
  full_singleSelect: {
    filterType: "singleSelect", filterId: "F", filterKey: "K", filterLabel: "Geschlecht", filterScope: "pageContext", scopeType: "pageContext",
    scopeId: "tab1", scope: "tab1", scopeResolution: "pageContext", tabId: "tab1", filterInstanceId: "I", itemNameHint: "Geschlecht", itemIdHint: "[g]",
    semanticInstanceKeyHint: "S", semanticSpecialFilterId: null, authorizedByOwner: null, operationId: "op", source: "dock", skipHistory: false,
    filterConfig: { c: 1 }, interactionType: "confirm", isAlleOption: false, optionLabel: "Frau", popup: popupFull,
    capabilities: { hasAlleOption: true, condition: null }, timestamp: 100, observedAt: 200
  },
  full_dienststelle: {
    filterType: "dienststelle", filterId: "D", filterKey: "Dienststelle_BW", filterLabel: "Dienststelle_BW", filterScope: "pageContext",
    scopeType: "pageContext", scopeId: "tab1", scope: "tab1", filterConfig: { c: 1 }, interactionType: "confirm", isAlleOption: true,
    optionLabel: "Alle", popup: popupFull, capabilities: { hasAlleOption: true }, resyncSource: "mountMutation", observedAt: 77, timestamp: 99
  }
};

// Second pass per owner: the raw handoff forced into the owner's own type, so the accepted branches see every field combination.
const FORCED_BY_OWNER = {
  dienststelle: (raw) => Object.assign({}, raw, { filterType: "dienststelle" }),
  sicht: (raw) => Object.assign({}, raw, { filterType: "sicht" }),
  specialSingleSelect: (raw) => Object.assign({ filterId: "personengruppe" }, raw, { filterType: "specialSingleSelect" })
};

const realNow = Date.now;
function withFixedNow(fn) {
  Date.now = () => NOW;
  try { return fn(); } finally { Date.now = realNow; }
}

function loadOwners() {
  const stubs = { console: quietConsole, document: fakeDocument };
  const sicht = loadAmd(path.join(FILTERS, "sicht/delegation.js"), { stubs });
  const special = loadAmd(path.join(FILTERS, "specialSingleSelect/delegation.js"), { stubs });
  const single = loadAmd(path.join(FILTERS, "singleSelect/dockHandoff/handoff.js"), { stubs });
  const routeModule = loadAmd(path.join(FILTERS, "dienststelle/effects/dispatchRoute.js"), {
    stubs,
    modules: {
      "../view/syncView.js": { syncViewFromState() {} },
      "../view/dockNames.js": { syncFilterDockNames() {} },
      "../history.js": { pushDienststelleHistoryStep: (_KDB, _old, result) => result }
    }
  });
  const stateModule = loadAmd(path.join(FILTERS, "dienststelle/state.js"), { stubs });
  async function mapDienststelle(raw) {
    const dispatched = [];
    await routeModule.routeDienststelleDispatch(
      { _KDB: { state: { filters: {} }, runtime: {} } },
      (action) => dispatched.push(action),
      () => Promise.resolve(null),
      { type: stateModule.ACTIONS.FILTER_DOCK_POPUP_READY, payload: raw }
    );
    return dispatched.length ? dispatched[0].payload : null;
  }
  return {
    dienststelle: mapDienststelle,
    singleSelect: async (raw) => single.mapFilterDockHandoff(raw),
    sicht: async (raw) => sicht.mapFilterDockHandoff(raw),
    specialSingleSelect: async (raw) => special.mapFilterDockHandoff(raw)
  };
}

function canonical(value) {
  return value === undefined ? null : JSON.parse(JSON.stringify(value, (key, v) => (v === undefined ? "__undefined__" : v)));
}

async function mapAll() {
  const owners = loadOwners();
  const result = {};
  for (const [ownerName, map] of Object.entries(owners)) {
    result[ownerName] = {};
    for (const [rawName, raw] of Object.entries(RAW)) {
      const input = raw === null || typeof raw !== "object" ? raw : JSON.parse(JSON.stringify(raw));
      const before = JSON.stringify(input);
      const mapped = await withFixedNow(() => map(input));
      assert.equal(JSON.stringify(input), before, ownerName + "/" + rawName + ": input must not be mutated");
      result[ownerName][rawName] = canonical(mapped);
      if (FORCED_BY_OWNER[ownerName] && raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
        const forced = FORCED_BY_OWNER[ownerName](JSON.parse(JSON.stringify(raw)));
        result[ownerName][rawName + " [forced]"] = canonical(await withFixedNow(() => map(forced)));
      }
    }
  }
  return result;
}

test("filterDock handoff: every owner maps the raw matrix as recorded on the pre-W5 code", async () => {
  const actual = await mapAll();
  if (process.env.FILTER_HANDOFF_RECORD === "1") {
    const lines = Object.keys(actual).map((owner) => JSON.stringify(owner) + ": {\n" + Object.keys(actual[owner])
      .map((raw) => "  " + JSON.stringify(raw) + ": " + JSON.stringify(actual[owner][raw])).join(",\n") + "\n }");
    fs.writeFileSync(FIXTURE, "{\n" + lines.join(",\n") + "\n}\n");
  }
  const expected = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
  for (const ownerName of Object.keys(expected)) {
    for (const rawName of Object.keys(expected[ownerName])) {
      assert.deepStrictEqual(actual[ownerName][rawName], expected[ownerName][rawName], ownerName + "/" + rawName);
    }
  }
  assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort());
  for (const ownerName of Object.keys(expected)) {
    assert.deepEqual(Object.keys(actual[ownerName]).sort(), Object.keys(expected[ownerName]).sort(), ownerName);
  }
});

test("filterDock handoff: filterConfig is shared by reference for singleSelect and sicht, copied for dienststelle and specialSingleSelect", async () => {
  const owners = loadOwners();
  const shared = { singleSelect: true, sicht: true, dienststelle: false, specialSingleSelect: false };
  for (const [ownerName, isShared] of Object.entries(shared)) {
    const raw = FORCED_BY_OWNER[ownerName] ? FORCED_BY_OWNER[ownerName]({ filterConfig: { a: 1 } }) : { filterType: "singleSelect", filterConfig: { a: 1 } };
    const mapped = await owners[ownerName](raw);
    assert.deepEqual(mapped.filterConfig, { a: 1 }, ownerName);
    assert.equal(mapped.filterConfig === raw.filterConfig, isShared, ownerName);
  }
});

test("filterDock handoff: the matrix reaches every accept/reject branch of the four mappers", async () => {
  const actual = await mapAll();
  const nullCount = (owner) => Object.values(actual[owner]).filter((v) => v === null).length;
  assert.ok(nullCount("dienststelle") > 10);
  assert.ok(nullCount("sicht") > 10);
  assert.ok(Object.values(actual.sicht).filter((v) => v !== null).length > 60);
  assert.ok(Object.values(actual.dienststelle).filter((v) => v !== null).length > 60);
  assert.ok(Object.values(actual.specialSingleSelect).filter((v) => v !== null).length > 40);
  assert.ok(nullCount("specialSingleSelect") >= 1);
  assert.ok(nullCount("singleSelect") >= 3);
  assert.equal(actual.specialSingleSelect.special_byId.filterId, "personengruppe");
  assert.equal(actual.specialSingleSelect.special_byCondition.filterId, "dienststellenleitung");
  assert.equal(actual.specialSingleSelect.special_unresolved, null);
  assert.equal(actual.singleSelect.operation_number.operationId, "12");
  assert.equal(actual.sicht.scope_scopeTypePage.scopeId, null);
  assert.equal(actual.sicht.typeOnly_sicht.scopeId, "global");
  assert.equal(actual.dienststelle.time_observedAtZero.timestamp, 0);
  assert.equal(actual.singleSelect.time_timestampZero.timestamp, 7);
  assert.equal(actual.specialSingleSelect.special_keyScope_filterScopeOnly.filterKey, "global__Dienststellenleitung");
  assert.equal(actual.specialSingleSelect.special_keyScope_scopeTypeOnly.filterKey, "pageContext__Dienststellenleitung");
  assert.equal(actual.specialSingleSelect.special_keyScope_both.filterKey, "global__Personengruppe");
  assert.equal(actual.singleSelect.keys_pageScopeLabel.filterKey, "pageContext__Geschlecht");
});
