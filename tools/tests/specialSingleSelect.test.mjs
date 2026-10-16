// Golden tests for _____________KDB3API/KDB3/js/dashboard/filters/specialSingleSelect/**
// Run: node --test tools/tests/specialSingleSelect.test.mjs   (Node >= 22, no dependencies)
// Unit targets are reached through loadUnits(); integration tests drive the frozen orchestrator path.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { JS_ROOT } from "../lib/amd-graph.mjs";
import { loadAmd } from "../lib/amd-loader.mjs";

const SPECIAL = path.join(JS_ROOT, "dashboard/filters/specialSingleSelect");
const load = (rel, stubs) => loadAmd(path.join(SPECIAL, rel), { stubs: stubs || { console: silentConsole() } });

function silentConsole() {
  const calls = { warn: [], error: [] };
  return { calls, log() {}, info() {}, debug() {}, warn: (...a) => calls.warn.push(a), error: (...a) => calls.error.push(a) };
}

function loadUnits() {
  const config = load("config/specialFilterDefinitions.js");
  const actions = load("config/actions.js");
  const resolver = load("config/resolveSpecialFilterId.js");
  const tableInputs = load("effects/buildSpecialTableDataInputs.js");
  const rights = load("effects/readSpecialRightsFromTableData.js");
  const options = load("effects/readDefaultOptionFromTableData.js");
  const visibility = load("effects/evaluateSpecialFilterVisibility.js");
  const inventory = load("effects/buildInventoryReconciledAck.js");
  const support = load("effects/buildSpecialSingleSelectRouteSupport.js");
  return {
    definitions: config,
    actions,
    TABLE_KEYS: tableInputs.tableKeys,
    isRelevantTableName: tableInputs.isRelevantTableName,
    buildTableInput: tableInputs.buildTableInput,
    resolveSpecialFilterId: resolver.resolveSpecialFilterId,
    normalizeUserSelectionCommittedPayload: resolver.normalizeUserSelectionCommittedPayload,
    mapFilterDockHandoff: load("effects/mapFilterDockHandoff.js"),
    createInitialState: load("state/initialState.js"),
    createReducer: load("state/createSpecialSingleSelectReducer.js"),
    readRightFromTableData: rights.readRightFromTableData,
    readFirstValidOptionRow: options.readFirstValidOptionRow,
    evaluateVisibility: visibility.evaluateSpecialFilterVisibility,
    validateInventoryPayload: inventory.validatePayload,
    buildInventoryAck: inventory.buildAck,
    buildStaleAck: inventory.buildStaleAck,
    buildTargetScopedAck: support.buildTargetScopedAck,
    reduceCommittedPayload: support.reduceCommittedPayload
  };
}

const U = loadUnits();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test("TABLE_KEYS keep the exact list and order", () => {
  assert.deepEqual(U.TABLE_KEYS, [
    "alle", "personengruppe", "dienststellenleitung", "personengruppe_filter", "dienststellenleitung_filter"
  ]);
});

test("definitions: both special filters, frozen shape", () => {
  assert.deepEqual(clone(U.definitions), {
    personengruppe: {
      filterId: "personengruppe", filterLabel: "Personengruppe", itemName: "Personengruppe",
      condition: "Personengruppe", rightTableKey: "personengruppe", optionTableKey: "personengruppe_filter",
      allowedSichtValues: ["BW"], sichtValueKind: "display"
    },
    dienststellenleitung: {
      filterId: "dienststellenleitung", filterLabel: "Dienststellenleitung", itemName: "Dienststellenleitung",
      condition: "Dienststellenleitung", rightTableKey: "dienststellenleitung",
      optionTableKey: "dienststellenleitung_filter", allowedSichtValues: ["BW"], sichtValueKind: "display"
    }
  });
});

test("isRelevantTableName / buildTableInput", () => {
  const KDB = { config: { tables: { alle: { name: "Alle_Tbl", shape: "s", pick: "p" } } } };
  assert.equal(U.isRelevantTableName(KDB, "alle"), true);
  assert.equal(U.isRelevantTableName(KDB, " ALLE_TBL "), true);
  assert.equal(U.isRelevantTableName(KDB, "Personengruppe_Filter"), true);
  assert.equal(U.isRelevantTableName(KDB, "sicht_bw"), false);
  assert.equal(U.isRelevantTableName(KDB, ""), false);
  assert.equal(U.isRelevantTableName(null, "alle"), true);
  assert.deepEqual(U.buildTableInput(KDB, "alle"), [{ tableName: "alle", shape: "s", pick: "p" }]);
  assert.equal(U.buildTableInput(KDB, "personengruppe"), null);
  assert.equal(U.buildTableInput(null, "alle"), null);
});

test("resolveSpecialFilterId: by id, condition, label; unknown -> null", () => {
  const r = (payload) => U.resolveSpecialFilterId(U.definitions, payload);
  assert.equal(r({ filterId: "personengruppe" }), "personengruppe");
  assert.equal(r({ condition: "DIENSTSTELLENLEITUNG" }), "dienststellenleitung");
  assert.equal(r({ filterLabel: "personengruppe" }), "personengruppe");
  assert.equal(r({ filterId: "unknown", condition: "Personengruppe" }), "personengruppe");
  assert.equal(r({ filterId: "unknown" }), null);
  assert.equal(r({}), null);
  assert.equal(r(null), null);
  assert.equal(U.resolveSpecialFilterId(null, { filterId: "personengruppe" }), null);
});

test("mapFilterDockHandoff: unknown filter -> null, full handoff mapped", () => {
  assert.equal(U.mapFilterDockHandoff(null), null);
  assert.equal(U.mapFilterDockHandoff("x"), null);
  assert.equal(U.mapFilterDockHandoff({ filterLabel: "Einheit", filterId: "f1" }), null);
  const mapped = U.mapFilterDockHandoff({
    filterLabel: "Personengruppe", filterId: "runtime-1", scopeType: "global", tabId: "t1", scopeId: "g",
    filterType: "singleSelect", filterConfig: { a: 1 }, capabilities: { condition: "Personengruppe", x: true },
    interactionType: "click", isAlleOption: true, optionLabel: "Alle", popup: { open: true }, observedAt: 42,
    itemNameHint: "n", itemIdHint: "i", semanticInstanceKeyHint: "k"
  });
  assert.deepEqual(mapped, {
    filterLabel: "Personengruppe", filterKey: "runtime-1", filterScope: "global", filterType: "singleSelect",
    scopeType: "global", tabId: "t1", scopeId: "g", filterConfig: { a: 1 }, condition: "Personengruppe",
    semanticSpecialFilterId: "personengruppe", itemNameHint: "n", itemIdHint: "i", semanticInstanceKeyHint: "k",
    interactionType: "click", isAlleOption: true, optionLabel: "Alle", popup: { open: true },
    capabilities: { condition: "Personengruppe", x: true }, timestamp: 42, runtimeFilterId: "runtime-1",
    filterId: "personengruppe"
  });
  const minimal = U.mapFilterDockHandoff({ filterLabel: "Dienststellenleitung" });
  assert.equal(minimal.filterId, "dienststellenleitung");
  assert.equal(minimal.filterKey, "global__Dienststellenleitung");
  assert.equal(minimal.filterScope, "global");
  assert.equal(minimal.filterType, "unknown");
  assert.equal(minimal.interactionType, "unknown");
  assert.equal(minimal.scopeId, null);
  assert.equal(minimal.popup, null);
});

test("normalizeUserSelectionCommittedPayload", () => {
  const n = (p) => U.normalizeUserSelectionCommittedPayload(U.definitions, p);
  assert.equal(n({ filterId: "nope" }), null);
  assert.deepEqual(
    n({
      filterId: "personengruppe", filterInstanceId: "i1", filterLabel: "Personengruppe", filterKey: "k",
      filterScope: "global", condition: "Personengruppe", selection: { displayValue: "D", useValue: "u" }, observedAt: 7
    }),
    {
      filterId: "personengruppe", runtimeFilterId: "personengruppe", filterInstanceId: "i1",
      semanticSpecialFilterId: "personengruppe", filterKey: "k", filterLabel: "Personengruppe",
      filterScope: "global", condition: "Personengruppe", displayValue: "D", useValue: "u", observedAt: 7
    }
  );
  const flat = n({ filterLabel: "Dienststellenleitung", displayValue: "A", useValue: 0, observedAt: 1, runtimeFilterId: "r" });
  assert.equal(flat.filterId, "dienststellenleitung");
  assert.equal(flat.useValue, 0);
  assert.equal(flat.filterInstanceId, null);
});

test("reduceCommittedPayload", () => {
  assert.equal(U.reduceCommittedPayload(null), null);
  assert.equal(U.reduceCommittedPayload({ filterId: "personengruppe" }), null);
  assert.equal(U.reduceCommittedPayload({ filterId: "p", filterInstanceId: "i", displayValue: "d" }), null);
  assert.deepEqual(
    U.reduceCommittedPayload({ filterId: "p", filterInstanceId: "i", displayValue: "d", useValue: "u", extra: 1 }),
    { filterId: "p", semanticSpecialFilterId: "p", filterInstanceId: "i", displayValue: "d", useValue: "u" }
  );
});

test("initial state snapshot", () => {
  const perFilter = (label, right, option) => ({
    filterLabel: label, filterKey: null, rightTableKey: right, optionTableKey: option, rightAllowed: false,
    alleAllowed: false, isVisibleForSicht: false, isVisible: false, selectionSource: "none",
    selectionSourceByInstanceId: {}, wasSetBySpecialSingleSelect: false, parkedSelectionsByInstanceId: {},
    lastAppliedUseValue: null, lastAppliedDisplayValue: null, lastPolicyAppliedAt: null, lastSyncedAt: null,
    errorCode: null, errorMessage: null
  });
  assert.deepEqual(U.createInitialState(), {
    lifecycle: "idle",
    activeSichtValue: null,
    byFilterId: {
      personengruppe: perFilter("Personengruppe", "personengruppe", "personengruppe_filter"),
      dienststellenleitung: perFilter("Dienststellenleitung", "dienststellenleitung", "dienststellenleitung_filter")
    },
    errorCode: null,
    errorMessage: null
  });
});

test("reducer: every action, input never mutated", () => {
  const A = U.actions;
  const reducer = U.createReducer();
  const initial = U.createInitialState();
  const step = (state, action) => {
    const before = clone(state);
    const next = reducer(state, action);
    assert.deepEqual(state, before, "input state mutated by " + action.type);
    return next;
  };

  const mounted = step(initial, { type: A.MOUNT_SUCCEEDED, payload: {} });
  assert.notEqual(mounted, initial);
  assert.equal(mounted.lifecycle, "ready");

  const sicht = step(mounted, { type: A.SICHT_CHANGED, payload: { activeSichtValue: "BW" } });
  assert.equal(sicht.activeSichtValue, "BW");
  assert.equal(step(sicht, { type: A.SICHT_CHANGED, payload: {} }).activeSichtValue, null);

  assert.equal(step(sicht, { type: A.SYNC_FILTER_EVALUATED, payload: { filterId: "nope", patch: {} } }), sicht);
  assert.equal(step(sicht, { type: A.SYNC_FILTER_EVALUATED, payload: { patch: {} } }), sicht);
  const parked = { i1: { displayValue: "D", useValue: "u" } };
  const evaluated = step(sicht, {
    type: A.SYNC_FILTER_EVALUATED,
    payload: {
      filterId: "personengruppe",
      patch: { isVisible: true, parkedSelectionsByInstanceId: parked, selectionSourceByInstanceId: { i1: "user" } }
    }
  });
  assert.equal(evaluated.byFilterId.personengruppe.isVisible, true);
  assert.deepEqual(evaluated.byFilterId.personengruppe.parkedSelectionsByInstanceId, parked);
  assert.notEqual(evaluated.byFilterId.personengruppe.parkedSelectionsByInstanceId.i1, parked.i1);
  assert.equal(evaluated.byFilterId.dienststellenleitung, sicht.byFilterId.dienststellenleitung);

  assert.equal(step(evaluated, { type: A.USER_SELECTION_COMMITTED, payload: { filterId: "nope" } }), evaluated);
  const committed = step(evaluated, {
    type: A.USER_SELECTION_COMMITTED,
    payload: { filterId: "personengruppe", filterInstanceId: "i1", displayValue: "Neu", useValue: "n", filterKey: "fk", observedAt: 99 }
  });
  const pg = committed.byFilterId.personengruppe;
  assert.equal(pg.selectionSource, "user");
  assert.deepEqual(pg.selectionSourceByInstanceId, { i1: "user" });
  assert.deepEqual(pg.parkedSelectionsByInstanceId, {});
  assert.equal(pg.lastAppliedUseValue, "n");
  assert.equal(pg.lastAppliedDisplayValue, "Neu");
  assert.equal(pg.wasSetBySpecialSingleSelect, false);
  assert.equal(pg.filterKey, "fk");
  assert.equal(pg.lastPolicyAppliedAt, 99);

  const failed = step(committed, { type: A.ERROR, payload: { errorCode: "X", errorMessage: 5 } });
  assert.equal(failed.lifecycle, "error");
  assert.equal(failed.errorCode, "X");
  assert.equal(failed.errorMessage, "5");
  const failedDefault = step(committed, { type: A.ERROR, payload: {} });
  assert.equal(failedDefault.errorCode, "SPECIAL_SINGLE_SELECT_ERROR");
  assert.equal(failedDefault.errorMessage, "");

  assert.equal(step(committed, { type: A.DESTROY, payload: {} }).lifecycle, "disposed");
  assert.equal(step(committed, { type: "other/unknown" }), committed);
  assert.equal(reducer(undefined, { type: A.MOUNT_SUCCEEDED }).lifecycle, "ready");
});

test("readRightFromTableData / readFirstValidOptionRow", () => {
  const tables = {};
  const KDB = {
    config: { tables: { personengruppe: { shape: "s", pick: "p" }, personengruppe_filter: { shape: "s", pick: "p" } } },
    services: { tableData: { readRows: (input) => tables[input[0].tableName] } }
  };
  const right = (rows) => {
    tables.personengruppe = rows;
    return U.readRightFromTableData(KDB, "personengruppe");
  };
  assert.deepEqual(right([{ a: 1 }]), { known: true, allowed: true });
  assert.deepEqual(right([{ a: "1" }]), { known: true, allowed: true });
  assert.deepEqual(right([{ a: true }]), { known: true, allowed: true });
  assert.deepEqual(right([{ a: 0 }]), { known: true, allowed: false });
  assert.deepEqual(right([{ a: { use: "1" } }]), { known: true, allowed: true });
  assert.deepEqual(right([{ a: { u: 1 } }]), { known: true, allowed: true });
  assert.deepEqual(right([{ a: { d: true } }]), { known: true, allowed: true });
  assert.deepEqual(right([]), { known: true, allowed: false });
  assert.deepEqual(right([{}]), { known: true, allowed: false });
  assert.deepEqual(right(undefined), { known: false, allowed: false });
  assert.deepEqual(U.readRightFromTableData(KDB, "dienststellenleitung"), { known: false, allowed: false });
  assert.deepEqual(U.readRightFromTableData({}, "personengruppe"), { known: false, allowed: false });
  assert.deepEqual(U.readRightFromTableData(KDB, ""), { known: false, allowed: false });

  const option = (rows) => {
    tables.personengruppe_filter = rows;
    return U.readFirstValidOptionRow(KDB, "personengruppe_filter");
  };
  assert.deepEqual(option([{ x: { display: " Alle PG ", use: " pg " } }]), { known: true, option: { display: "Alle PG", use: "pg" } });
  assert.deepEqual(option([{ x: { d: "D", u: "U" } }]), { known: true, option: { display: "D", use: "U" } });
  assert.deepEqual(option([{ x: "text", y: { d: "D2", u: "U2" } }]), { known: true, option: { display: "D2", use: "U2" } });
  assert.deepEqual(option([{ x: { d: "", u: "U" } }]), { known: true, option: null });
  assert.deepEqual(option([{ x: [1] }]), { known: true, option: null });
  assert.deepEqual(option([]), { known: false, option: null });
  assert.deepEqual(option(null), { known: false, option: null });
  assert.deepEqual(U.readFirstValidOptionRow(KDB, "dienststellenleitung_filter"), { known: false, option: null });
});

test("evaluateSpecialFilterVisibility: sicht x right x default option", () => {
  const def = U.definitions.personengruppe;
  const run = (sicht, rightKnown, rightAllowed, alleKnown, alleAllowed, hasDefaultOption) =>
    U.evaluateVisibility(def, {
      activeSichtValue: sicht, rightKnown, rightAllowed, alleKnown, alleAllowed, hasDefaultOption
    });
  const bwRight = run("BW", true, true, true, false, true);
  assert.deepEqual(bwRight, {
    alleAllowed: false, rightAllowed: true, isVisibleForSicht: true, isVisible: true,
    shouldApplyDefault: true, shouldClearHidden: false, rightsUnknown: false
  });
  assert.equal(run("BW", true, true, true, false, false).shouldApplyDefault, false);
  assert.equal(run("BW", true, true, true, true, true).shouldApplyDefault, false);
  const bwNoRight = run("BW", true, false, true, false, true);
  assert.equal(bwNoRight.isVisible, false);
  assert.equal(bwNoRight.shouldClearHidden, true);
  const dezpv = run("DEZPV", true, true, true, false, true);
  assert.equal(dezpv.isVisibleForSicht, false);
  assert.equal(dezpv.isVisible, false);
  assert.equal(dezpv.shouldClearHidden, true);
  const noSicht = run(null, true, true, true, false, true);
  assert.equal(noSicht.isVisibleForSicht, false);
  assert.equal(!!noSicht.shouldClearHidden, false);
  const unknown = run("BW", false, false, true, false, true);
  assert.equal(unknown.rightsUnknown, true);
  assert.equal(unknown.shouldClearHidden, false);
  assert.equal(run(" BW ", true, true, false, false, true).rightsUnknown, true);
});

test("inventory ack builders", () => {
  assert.deepEqual(U.validateInventoryPayload({ inventoryGeneration: 1, source: "s" }), null);
  const bad = {
    code: "SPECIAL_SINGLE_SELECT_INVENTORY_PAYLOAD_INVALID",
    message: "inventoryGeneration must be a non-negative integer"
  };
  assert.deepEqual(U.validateInventoryPayload({ inventoryGeneration: -1, source: "s" }), bad);
  assert.deepEqual(U.validateInventoryPayload({ inventoryGeneration: 1.5, source: "s" }), bad);
  assert.deepEqual(U.validateInventoryPayload({ source: "s" }), bad);
  assert.deepEqual(U.validateInventoryPayload({ inventoryGeneration: 1, source: " " }), {
    code: "SPECIAL_SINGLE_SELECT_INVENTORY_PAYLOAD_INVALID", message: "inventory reconcile source is required"
  });
  assert.deepEqual(
    U.buildInventoryAck({ ok: true, diagnostics: [{ code: "c", message: "m" }] }, { inventoryGeneration: 2, source: "s" }),
    { ok: true, acknowledged: true, degraded: false, disposed: false, inventoryGeneration: 2, source: "s", diagnostics: [{ code: "c", message: "m" }] }
  );
  assert.deepEqual(
    U.buildInventoryAck({ ok: true, degraded: true }, { inventoryGeneration: 2, source: "s" }),
    { ok: true, acknowledged: false, degraded: true, disposed: false, inventoryGeneration: 2, source: "s", diagnostics: [] }
  );
  assert.deepEqual(U.buildStaleAck({ inventoryGeneration: 1, source: "s" }), {
    ok: false, acknowledged: false, degraded: true, disposed: false, inventoryGeneration: 1, source: "s",
    diagnostics: [{
      code: "SPECIAL_SINGLE_SELECT_INVENTORY_STALE",
      message: "inventory generation is older than the latest scheduled generation"
    }]
  });
});

test("buildTargetScopedAck: ok / missing target / failed target / unrelated diagnostics", () => {
  const target = { filterId: "personengruppe", semanticSpecialFilterId: "personengruppe" };
  const ok = U.buildTargetScopedAck({ ok: true, results: [{ filterId: "personengruppe", ok: true }], diagnostics: [] }, target);
  assert.deepEqual(ok, {
    ok: true, acknowledged: true, degraded: false, disposed: false, retryable: false,
    errorCode: null, errorMessage: null, diagnostics: []
  });
  const unrelated = U.buildTargetScopedAck({
    ok: false,
    results: [{ filterId: "personengruppe", ok: true }, { filterId: "dienststellenleitung", ok: false }],
    diagnostics: [{ code: "X", filterId: "dienststellenleitung", message: "boom" }]
  }, target);
  assert.equal(unrelated.ok, true);
  assert.equal(unrelated.degraded, true);
  assert.equal(unrelated.retryable, true);
  const missing = U.buildTargetScopedAck({ ok: true, results: [] }, target);
  assert.deepEqual(missing, {
    ok: false, acknowledged: false, degraded: true, disposed: false, retryable: true,
    errorCode: "SPECIAL_SINGLE_SELECT_OWNER_CALLBACK_FAILED",
    errorMessage: "target special filter result missing from sync results", diagnostics: []
  });
  const failed = U.buildTargetScopedAck({
    ok: false,
    results: [{ filterId: "personengruppe", ok: false, errorCode: "E1", errorMessage: "bad" }],
    diagnostics: [{ code: "E1", filterId: "personengruppe", message: "bad" }]
  }, target);
  assert.equal(failed.ok, false);
  assert.equal(failed.errorCode, "E1");
  assert.equal(failed.errorMessage, "bad");
  assert.equal(failed.retryable, false);
  const aborted = U.buildTargetScopedAck({
    ok: false, results: [{ filterId: "personengruppe", ok: false, aborted: true }], diagnostics: []
  }, target);
  assert.equal(aborted.retryable, true);
  assert.equal(aborted.errorMessage, "target special filter sync aborted before owner ack");
  const disposed = U.buildTargetScopedAck({ ok: false, disposed: true, results: [], diagnostics: [] }, target);
  assert.equal(disposed.disposed, true);
  assert.equal(disposed.errorMessage, "specialSingleSelect sync failed");
});

// ---------------------------------------------------------------------------------------------
// Integration: orchestrator + controller + sync pipeline against a fake _KDB and fake DOM.
// ---------------------------------------------------------------------------------------------

function createClassList() {
  const set = new Set();
  return {
    set,
    add: (c) => set.add(c),
    remove: (c) => set.delete(c),
    toggle(c, force) {
      if (force) set.add(c); else set.delete(c);
      return force;
    },
    contains: (c) => set.has(c)
  };
}

function createFakeDocument(labels) {
  const root = { classList: createClassList() };
  const wrappers = {};
  const nodes = {};
  labels.forEach((label) => {
    wrappers[label] = { classList: createClassList() };
    nodes[label] = { closest: () => wrappers[label] };
  });
  root.querySelectorAll = (selector) => {
    const match = /data-id="([^"]+)"/.exec(selector);
    return match && nodes[match[1]] ? [nodes[match[1]]] : [];
  };
  return {
    root,
    wrappers,
    document: { querySelector: (selector) => (selector === "#filterDockContainer" ? root : null) }
  };
}

function specialInstance(id, label, selection) {
  return {
    filterInstanceId: id, filterType: "specialSingleSelect", selectionOwner: "singleSelect", status: "active",
    hostStatus: "present", filterLabel: label, itemName: label, condition: label, scopeType: "global",
    scopeId: "g", semanticInstanceKey: "key-" + id, currentSelection: selection || null
  };
}

function createHarness(options) {
  const opts = options || {};
  const tables = Object.assign({
    alle: [{ c: 0 }],
    personengruppe: [{ c: 1 }],
    dienststellenleitung: [{ c: 0 }],
    personengruppe_filter: [{ c: { display: "PG-Default", use: "pg-default" } }],
    dienststellenleitung_filter: [{ c: { display: "DL-Default", use: "dl-default" } }]
  }, opts.tables || {});
  const dom = createFakeDocument(["Personengruppe", "Dienststellenleitung"]);
  const stubConsole = silentConsole();
  const reads = [];
  const policyCalls = [];
  const subscribers = {};
  const instances = opts.instances || {
    pg1: specialInstance("pg1", "Personengruppe", null),
    dl1: specialInstance("dl1", "Dienststellenleitung", { displayValue: "Alt", useValue: "alt" })
  };
  const tableConfig = {};
  Object.keys(tables).forEach((key) => { tableConfig[key] = { shape: "s", pick: "p" }; });
  const KDB = {
    config: { tables: tableConfig },
    events: {
      subscribe(name, handler) {
        subscribers[name] = handler;
        return () => { delete subscribers[name]; };
      }
    },
    services: {
      tableData: {
        readRows(input) {
          reads.push(input[0].tableName);
          return tables[input[0].tableName];
        }
      }
    },
    state: { filters: { singleSelect: { inventory: { generation: 3, freshness: "fresh" }, instancesById: instances } } },
    api: {
      singleSelect: {
        dispatch(action) {
          policyCalls.push(clone(action));
          const payload = action.payload || {};
          if (opts.policyThrows) throw new Error("policy boom");
          return Promise.resolve({
            ok: true,
            applied: (payload.filterInstanceIds || []).map((id) => ({ filterInstanceId: id, ok: true }))
          });
        }
      }
    }
  };
  const register = loadAmd(path.join(SPECIAL, "__orchestratorSpecialSingleSelect.js"), {
    stubs: { console: stubConsole, document: dom.document }
  });
  return { KDB, register, dom, stubConsole, reads, policyCalls, subscribers, tables, instances };
}

const SSS = "specialSingleSelect/";
const settle = () => new Promise((resolve) => setTimeout(resolve, 5));

function bootWithSicht(harness, sicht) {
  const api = harness.register(harness.KDB);
  assert.equal(api, harness.KDB.api.specialSingleSelect);
  assert.equal(api.mount({}), true);
  api.dispatch({ type: SSS + "sichtChanged", payload: { activeSichtValue: sicht } });
  return api;
}

test("register: initial state, selectors, runtime buckets, mount lifecycle", async () => {
  const h = createHarness();
  const api = h.register(h.KDB);
  assert.deepEqual(Object.keys(api).sort(), ["destroy", "dispatch", "getState", "mount"]);
  assert.equal(api.getState().lifecycle, "idle");
  assert.equal(h.KDB.elements.selectors.specialSingleSelect.markerClass, "KDB_specialSingleSelect");
  assert.equal(h.KDB.elements.selectors.specialSingleSelect.rightClass, "KDB_SSS_right");
  assert.equal(h.KDB.elements.selectors.specialSingleSelect.alleOptionClass, "KDB_SSS_alleOption");
  assert.deepEqual(h.KDB.elements.selectors.specialSingleSelect.rootSichtClassByValue, {
    BW: "KDB_sssSicht_BW", DEZPV: "KDB_sssSicht_DEZPV"
  });
  assert.equal(typeof h.subscribers["tableData:loadFinished"], "function");
  ["domRefs", "listeners", "subscriptions", "abortControllers", "observers", "timers", "pendingPromises"].forEach((bucket) => {
    assert.equal(typeof h.KDB.runtime.specialSingleSelect[bucket], "object", bucket);
  });
  assert.equal(api.mount({}), true);
  assert.equal(api.getState().lifecycle, "ready");
  await settle();
});

test("sync: BW sees personengruppe (default applied), dienststellenleitung hidden (cleared); DOM classes", async () => {
  const h = createHarness();
  const api = bootWithSicht(h, "BW");
  await settle();
  const state = api.getState();
  assert.equal(state.activeSichtValue, "BW");
  const pg = state.byFilterId.personengruppe;
  const dl = state.byFilterId.dienststellenleitung;
  assert.deepEqual(
    [pg.rightAllowed, pg.alleAllowed, pg.isVisibleForSicht, pg.isVisible, pg.selectionSource, pg.wasSetBySpecialSingleSelect],
    [true, false, true, true, "specialDefault", true]
  );
  assert.deepEqual(pg.selectionSourceByInstanceId, { pg1: "specialDefault" });
  assert.equal(pg.filterKey, "global__Personengruppe");
  assert.equal(pg.errorCode, null);
  assert.deepEqual(
    [dl.rightAllowed, dl.isVisible, dl.selectionSource],
    [false, false, "clearedBySpecialSingleSelect"]
  );
  assert.deepEqual(dl.selectionSourceByInstanceId, { dl1: "clearedBySpecialSingleSelect" });
  assert.deepEqual(h.policyCalls.map((c) => [c.type, c.payload.operation, c.payload.filterInstanceIds]), [
    ["singleSelect/applySpecialSelectionPolicy", "applyDefault", ["pg1"]],
    ["singleSelect/applySpecialSelectionPolicy", "clearHidden", ["dl1"]]
  ]);
  assert.deepEqual(h.policyCalls[0].payload, {
    semanticSpecialFilterId: "personengruppe", filterInstanceIds: ["pg1"], operation: "applyDefault",
    source: "specialSingleSelect", skipHistory: true,
    selection: { displayValue: "PG-Default", useValue: "pg-default" }
  });
  assert.deepEqual([...h.dom.root.classList.set], ["KDB_sssSicht_BW"]);
  assert.deepEqual([...h.dom.wrappers.Personengruppe.classList.set].sort(), ["KDB_SSS_right", "KDB_specialSingleSelect"]);
  assert.deepEqual([...h.dom.wrappers.Dienststellenleitung.classList.set], ["KDB_specialSingleSelect"]);
  assert.equal(h.KDB.runtime.specialSingleSelect.domRefs.personengruppe, h.dom.wrappers.Personengruppe);
});

test("sync: switching BW -> DEZPV clears and parks the user selection, back to BW restores it", async () => {
  const h = createHarness({
    tables: { alle: [{ c: 1 }], dienststellenleitung: [{ c: 1 }] },
    instances: {
      pg1: specialInstance("pg1", "Personengruppe", { displayValue: "Mein PG", useValue: "mine" }),
      dl1: specialInstance("dl1", "Dienststellenleitung", null)
    }
  });
  const api = bootWithSicht(h, "BW");
  await settle();
  api.dispatch({
    type: SSS + "userSelectionCommitted",
    payload: {
      filterId: "personengruppe", filterInstanceId: "pg1", filterLabel: "Personengruppe",
      selection: { displayValue: "Mein PG", useValue: "mine" }, observedAt: 5
    }
  });
  await settle();
  assert.equal(api.getState().byFilterId.personengruppe.selectionSource, "user");
  h.policyCalls.length = 0;

  api.dispatch({ type: SSS + "sichtChanged", payload: { activeSichtValue: "DEZPV" } });
  await settle();
  let pg = api.getState().byFilterId.personengruppe;
  assert.equal(pg.isVisible, false);
  assert.equal(pg.isVisibleForSicht, false);
  assert.equal(pg.selectionSource, "clearedBySpecialSingleSelect");
  assert.equal(typeof pg.parkedSelectionsByInstanceId.pg1.parkedAt, "number");
  assert.deepEqual(
    { d: pg.parkedSelectionsByInstanceId.pg1.displayValue, u: pg.parkedSelectionsByInstanceId.pg1.useValue },
    { d: "Mein PG", u: "mine" }
  );
  assert.deepEqual(h.policyCalls.map((c) => [c.payload.operation, c.payload.filterInstanceIds]), [
    ["clearHidden", ["pg1"]], ["clearHidden", ["dl1"]]
  ]);
  assert.deepEqual([...h.dom.root.classList.set], ["KDB_sssSicht_DEZPV"]);
  h.policyCalls.length = 0;

  api.dispatch({ type: SSS + "sichtChanged", payload: { activeSichtValue: "BW" } });
  await settle();
  pg = api.getState().byFilterId.personengruppe;
  assert.equal(pg.isVisible, true);
  assert.equal(pg.selectionSource, "user");
  assert.deepEqual(pg.parkedSelectionsByInstanceId, {});
  assert.deepEqual(h.policyCalls.map((c) => [c.payload.operation, c.payload.filterInstanceIds, c.payload.selection]), [
    ["restoreParked", ["pg1"], { displayValue: "Mein PG", useValue: "mine" }]
  ]);
});

test("syncRequested ack carries the restore hints on parameterRestore", async () => {
  const h = createHarness({
    tables: { alle: [{ c: 1 }], personengruppe: [{ c: 0 }] },
    instances: {
      pg1: specialInstance("pg1", "Personengruppe", { displayValue: "Alt", useValue: "alt" }),
      dl1: specialInstance("dl1", "Dienststellenleitung", null)
    }
  });
  const api = bootWithSicht(h, "BW");
  await settle();
  const ack = await api.dispatch({ type: SSS + "syncRequested", payload: { reason: "parameterRestore" } });
  assert.equal(ack.ok, true);
  assert.equal(ack.acknowledged, true);
  assert.equal(ack.degraded, false);
  assert.equal(ack.inventoryGeneration, null);
  assert.deepEqual(ack.specialSingleSelectRestoreHint, { clearedRestoredValues: ["Personengruppe"], appliedDefaultLabels: [] });

  const bad = await api.dispatch({ type: SSS + "syncRequested", payload: { inventoryGeneration: -1 } });
  assert.equal(bad.ok, false);
  assert.equal(bad.diagnostics[0].code, "SPECIAL_SINGLE_SELECT_INVENTORY_PAYLOAD_INVALID");
  const stale = await api.dispatch({ type: SSS + "syncRequested", payload: { inventoryGeneration: 1 } });
  assert.equal(stale.diagnostics[0].code, "SPECIAL_SINGLE_SELECT_INVENTORY_STALE");
});

test("sync: stale inventory generation and missing instances surface as error codes", async () => {
  const h = createHarness();
  const api = bootWithSicht(h, "BW");
  await settle();
  const stale = await api.dispatch({ type: SSS + "syncRequested", payload: { inventoryGeneration: 3 } });
  assert.equal(stale.ok, true);
  h.KDB.state.filters.singleSelect.inventory.freshness = "stale";
  const notReady = await api.dispatch({ type: SSS + "syncRequested", payload: { reason: "x" } });
  assert.equal(notReady.ok, false);
  assert.deepEqual(
    notReady.diagnostics.map((d) => [d.code, d.filterId]),
    [
      ["SPECIAL_SINGLE_SELECT_INVENTORY_NOT_READY", "personengruppe"],
      ["SPECIAL_SINGLE_SELECT_INVENTORY_NOT_READY", "dienststellenleitung"]
    ]
  );
  h.KDB.state.filters.singleSelect.inventory.freshness = "fresh";
  delete h.instances.pg1;
  const missing = await api.dispatch({ type: SSS + "syncRequested", payload: { reason: "y" } });
  assert.deepEqual(missing.diagnostics.map((d) => d.code), ["SPECIAL_SINGLE_SELECT_INSTANCE_MISSING"]);
  assert.equal(api.getState().byFilterId.personengruppe.errorCode, "SPECIAL_SINGLE_SELECT_INSTANCE_MISSING");
});

test("policy dispatch failure becomes POLICY_APPLY_FAILED in the sync ack", async () => {
  const h = createHarness({ policyThrows: true });
  const api = bootWithSicht(h, "BW");
  await settle();
  const ack = await api.dispatch({ type: SSS + "syncRequested", payload: { reason: "z" } });
  assert.equal(ack.ok, false);
  assert.deepEqual(ack.diagnostics.map((d) => d.code), [
    "SPECIAL_SINGLE_SELECT_POLICY_APPLY_FAILED", "SPECIAL_SINGLE_SELECT_POLICY_APPLY_FAILED"
  ]);
  assert.equal(api.getState().byFilterId.personengruppe.errorMessage, "policy boom");
});

test("inventoryReconciled: validation, dedupe by generation, stale, skip, ack shape", async () => {
  const h = createHarness();
  const api = bootWithSicht(h, "BW");
  await settle();
  const invalid = await api.dispatch({ type: SSS + "singleSelectInventoryReconciled", payload: { inventoryGeneration: "x", source: "s" } });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.diagnostics[0].code, "SPECIAL_SINGLE_SELECT_INVENTORY_PAYLOAD_INVALID");

  const skipped = await api.dispatch({
    type: SSS + "singleSelectInventoryReconciled",
    payload: { inventoryGeneration: 4, source: "s", allowSpecialPolicy: false }
  });
  assert.deepEqual(skipped, {
    ok: true, acknowledged: true, degraded: false, disposed: false, inventoryGeneration: 4, source: "s",
    diagnostics: [{
      code: "SPECIAL_SINGLE_SELECT_POLICY_SYNC_SKIPPED",
      message: "special policy sync was skipped because allowSpecialPolicy is false"
    }]
  });

  const first = await api.dispatch({ type: SSS + "singleSelectInventoryReconciled", payload: { inventoryGeneration: 3, source: "a" } });
  assert.equal(first.ok, true);
  assert.equal(first.acknowledged, true);
  assert.equal(first.inventoryGeneration, 3);
  assert.equal(first.source, "a");
  const repeat = await api.dispatch({ type: SSS + "singleSelectInventoryReconciled", payload: { inventoryGeneration: 3, source: "b" } });
  assert.deepEqual(repeat, Object.assign({}, first, { source: "b" }));
  const stale = await api.dispatch({ type: SSS + "singleSelectInventoryReconciled", payload: { inventoryGeneration: 2, source: "c" } });
  assert.equal(stale.ok, false);
  assert.equal(stale.diagnostics[0].code, "SPECIAL_SINGLE_SELECT_INVENTORY_STALE");
});

test("userSelectionCommitted: owner ack, target-scoped, invalid payload", async () => {
  const h = createHarness();
  const api = bootWithSicht(h, "BW");
  await settle();
  // A non-promise owner ack from routeAction is dropped by controller.dispatch: callers get the state back.
  const invalid = api.dispatch({ type: SSS + "userSelectionCommitted", payload: { filterId: "personengruppe" } });
  assert.equal(invalid.ok, undefined);
  assert.equal(invalid.lifecycle, "ready");
  const ack = await api.dispatch({
    type: SSS + "userSelectionCommitted",
    payload: {
      filterId: "personengruppe", filterInstanceId: "pg1", filterLabel: "Personengruppe",
      selection: { displayValue: "Neu", useValue: "neu" }
    }
  });
  assert.equal(ack.ok, true);
  assert.equal(ack.acknowledged, true);
  assert.equal(api.getState().byFilterId.personengruppe.lastAppliedUseValue, "neu");
});

test("filterDock handoff: delegated to singleSelect only for visible filters", async () => {
  const h = createHarness();
  const api = bootWithSicht(h, "BW");
  await settle();
  h.policyCalls.length = 0;
  api.dispatch({ type: SSS + "filterDockStateChanged", payload: { filterLabel: "Personengruppe", filterId: "r1", scopeType: "global", filterType: "specialSingleSelect" } });
  api.dispatch({ type: SSS + "filterDockPopupReady", payload: { filterLabel: "Dienststellenleitung", filterId: "r2", filterType: "specialSingleSelect" } });
  api.dispatch({ type: SSS + "filterDockPopupReady", payload: { filterLabel: "Personengruppe", filterId: "r3", filterType: "specialSingleSelect" } });
  const delegated = h.policyCalls.filter((c) => c.type !== "singleSelect/applySpecialSelectionPolicy");
  assert.deepEqual(delegated.map((c) => [c.type, c.payload.filterId, c.payload.filterType, c.payload.capabilities.hasAlleOption]), [
    ["singleSelect/filterDockStateChanged", "personengruppe", "specialSingleSelect", false],
    ["singleSelect/filterDockPopupReady", "personengruppe", "specialSingleSelect", false]
  ]);
  assert.equal(delegated[0].payload.authorizedByOwner, "specialSingleSelect");
  await settle();
});

test("tableData subscription dispatches only for relevant tables", async () => {
  const h = createHarness();
  const api = bootWithSicht(h, "BW");
  await settle();
  h.reads.length = 0;
  h.subscribers["tableData:loadFinished"]({ tableName: "sicht_bw", rowCount: 1 });
  await settle();
  assert.equal(h.reads.length, 0);
  h.subscribers["tableData:loadFinished"]({ tableName: "alle", rowCount: 1 });
  await settle();
  assert.equal(h.reads.filter((n) => n === "alle").length, 1);
  api.destroy();
});

test("sync queue: new request aborts the running one, both callers get the latest result", async () => {
  const h = createHarness();
  const api = bootWithSicht(h, "BW");
  await settle();
  h.reads.length = 0;
  const first = api.dispatch({ type: SSS + "syncRequested", payload: { reason: "first" } });
  const second = api.dispatch({ type: SSS + "syncRequested", payload: { reason: "second" } });
  const [a, b] = await Promise.all([first, second]);
  assert.equal(h.reads.filter((n) => n === "alle").length, 2, "aborted run + latest run");
  assert.deepEqual(a, b);
  assert.equal(a.ok, true);
  assert.equal(a.degraded, false);
});

test("sync queue: same input object while running is deduplicated, a new object is not", async () => {
  const h = createHarness();
  const api = bootWithSicht(h, "BW");
  await settle();
  h.reads.length = 0;
  const payload = { reason: "same" };
  const first = api.dispatch({ type: SSS + "syncRequested", payload });
  const second = api.dispatch({ type: SSS + "syncRequested", payload });
  await Promise.all([first, second]);
  assert.equal(h.reads.filter((n) => n === "alle").length, 1);
  h.reads.length = 0;
  await api.dispatch({ type: SSS + "syncRequested", payload: { reason: "other" } });
  await api.dispatch({ type: SSS + "syncRequested", payload: { reason: "other" } });
  assert.equal(h.reads.filter((n) => n === "alle").length, 2);
});

test("sync queue: three rapid requests collapse to the first (running) and the last", async () => {
  const h = createHarness();
  const api = bootWithSicht(h, "BW");
  await settle();
  h.reads.length = 0;
  const calls = [1, 2, 3].map((n) => api.dispatch({ type: SSS + "syncRequested", payload: { reason: "r" + n } }));
  const acks = await Promise.all(calls);
  assert.equal(h.reads.filter((n) => n === "alle").length, 2);
  assert.ok(acks.every((ack) => ack.ok === true));
});

test("destroy: state undefined, subscription removed, buckets reset, disposed acks, warn once per method", async () => {
  const h = createHarness();
  const api = bootWithSicht(h, "BW");
  await settle();
  api.destroy();
  assert.equal(api.getState(), undefined);
  assert.equal(h.subscribers["tableData:loadFinished"], undefined);
  const rt = h.KDB.runtime.specialSingleSelect;
  ["domRefs", "listeners", "subscriptions", "abortControllers", "observers", "timers", "pendingPromises"].forEach((bucket) => {
    assert.deepEqual(rt[bucket], {}, bucket);
  });
  assert.equal(h.KDB.state.filters.specialSingleSelect.lifecycle, "disposed");

  assert.equal(api.dispatch({ type: SSS + "tableDataChanged", payload: {} }), undefined);
  const syncAck = api.dispatch({ type: SSS + "syncRequested", payload: { inventoryGeneration: 9 } });
  assert.deepEqual(syncAck, {
    ok: false, acknowledged: false, degraded: true, disposed: true,
    errorCode: "SPECIAL_SINGLE_SELECT_DISPOSED", errorMessage: "specialSingleSelect controller is disposed",
    actionType: SSS + "syncRequested", inventoryGeneration: 9,
    diagnostics: [{ code: "SPECIAL_SINGLE_SELECT_DISPOSED", message: "specialSingleSelect controller is disposed" }]
  });
  assert.equal(api.mount({}), false);
  assert.equal(api.dispatch({ type: SSS + "tableDataChanged" }), undefined);
  api.destroy();
  const warnings = h.stubConsole.calls.warn.map((args) => String(args[0]));
  assert.ok(warnings.length >= 1, warnings.join("|"));
  assert.ok(warnings.every((w) => w.indexOf("[specialSingleSelect.") === 0 && w.endsWith("called after destroy")));
  assert.equal(warnings.some((w) => w.indexOf("dispatch") !== -1), true);
  assert.equal(new Set(warnings).size, warnings.length, "no method warns twice");
});

test("destroy during a running sync does not throw or log errors", async () => {
  const h = createHarness();
  const api = bootWithSicht(h, "BW");
  const pending = api.dispatch({ type: SSS + "syncRequested", payload: { reason: "late" } });
  api.destroy();
  await pending;
  await settle();
  assert.deepEqual(h.stubConsole.calls.error, []);
});

test("re-register on the same _KDB keeps runtime object and replaces the subscription", async () => {
  const h = createHarness();
  const api1 = h.register(h.KDB);
  const rt = h.KDB.runtime.specialSingleSelect;
  const api2 = h.register(h.KDB);
  assert.notEqual(api1, api2);
  assert.equal(h.KDB.runtime.specialSingleSelect, rt);
  assert.equal(h.KDB.api.specialSingleSelect, api2);
  assert.equal(typeof h.subscribers["tableData:loadFinished"], "function");
});

test("dispatch: unknown action returns the state, error action records the error", async () => {
  const h = createHarness();
  const api = bootWithSicht(h, "BW");
  await settle();
  const state = api.dispatch({ type: SSS + "unknown" });
  assert.equal(state.lifecycle, "ready");
  api.dispatch({ type: SSS + "error", payload: { errorCode: "E", errorMessage: "m" } });
  assert.equal(api.getState().lifecycle, "error");
  assert.equal(api.getState().errorCode, "E");
});
