// Golden tests for _____________KDB3API/KDB3/js/dashboard/filters/sicht
// Run: node --test tools/tests/sicht.test.mjs   (Node >= 22, no dependencies)
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const SICHT = path.join(JS_ROOT, "dashboard/filters/sicht");
const at = (rel) => path.join(SICHT, rel);

const T0 = 1700000000000;

function makeConsole() {
  const logged = { warn: [], error: [] };
  return {
    logged,
    warn: (...args) => logged.warn.push(args),
    error: (...args) => logged.error.push(args),
    log() {},
    info() {}
  };
}

function load(rel, stubs) {
  return loadAmd(at(rel), { stubs: Object.assign({ console: makeConsole(), Date: { now: () => T0 } }, stubs) });
}

// Module adapter: the only place that knows file locations.
const config = load("config.js");
const stateModule = load("state.js");
const availability = load("availability.js");
const T = {
  actions: stateModule.actions,
  createInitialState: stateModule.createInitialState,
  createReducer: stateModule.createSichtReducer,
  tableInputs: availability,
  tableKeys: config.TABLE_KEYS,
  readAvailability: availability.readSichtAvailabilityFromTableData,
  evaluateOptions: availability.evaluateSichtOptions,
  selectStartupDefault: load("options.js").selectStartupSichtDefault,
  mapCommitSourceFlags: load("commit.js").mapCommitSourceFlags,
  isDelegatedSource: load("validation.js").isDelegatedCommitSource,
  mapFilterDockHandoff: load("delegation.js").mapFilterDockHandoff,
  buildCommittedStep: load("history.js").buildCommittedStep,
  selectors: load("state/selectors.js"),
  chrome: config.SELECTORS,
  registerSicht: (stubs) => load("__orchestratorSicht.js", stubs)
};

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.keys(value).forEach((key) => deepFreeze(value[key]));
  }
  return value;
}

const json = (value) => JSON.parse(JSON.stringify(value));

// ---------------------------------------------------------------------------------------------
// state: initial state + reducer
// ---------------------------------------------------------------------------------------------

const EXPECTED_INITIAL = {
  lifecycle: "idle",
  activeSichtValue: null,
  activeFilterInstanceId: null,
  currentSelection: { displayValue: "", useValue: "", displaySource: "unavailable" },
  backupSelection: { displayValue: "", useValue: "", displaySource: "unavailable" },
  pendingSelection: { displayValue: "" },
  byOption: {
    BW: {
      displayValue: "BW",
      useValue: "",
      optionTableKey: "sicht_bw",
      defaultTableKey: "dienststelle_bw_default",
      isVisible: false,
      isDefaultReady: false,
      isEnabled: false,
      lastSyncedAt: null
    },
    DEZPV: {
      displayValue: "DEZPV",
      useValue: "",
      optionTableKey: "sicht_dezpv",
      defaultTableKey: "dienststelle_dezpv_default",
      isVisible: false,
      isDefaultReady: false,
      isEnabled: false,
      lastSyncedAt: null
    }
  },
  meta: {
    lastHandoffAt: null,
    lastCommittedAt: null,
    lastInventoryGeneration: null,
    lastInventorySource: null,
    lastInventoryAt: null,
    startupDefaultCommitted: false,
    startupDefaultInProgress: false
  },
  lastHistoryStep: null,
  errorCode: null,
  errorMessage: null
};

test("initial state snapshot", () => {
  assert.deepStrictEqual(T.createInitialState(), EXPECTED_INITIAL);
  assert.notStrictEqual(T.createInitialState(), T.createInitialState());
});

test("action type strings are frozen", () => {
  assert.deepStrictEqual(Object.assign({}, T.actions), {
    MOUNT_SUCCEEDED: "sicht/mountSucceeded",
    FILTER_DOCK_STATE_CHANGED: "sicht/filterDockStateChanged",
    FILTER_DOCK_POPUP_READY: "sicht/filterDockPopupReady",
    SINGLE_SELECT_COMMITTED: "sicht/singleSelectCommitted",
    SINGLE_SELECT_DRAFT_CHANGED: "sicht/singleSelectDraftChanged",
    SINGLE_SELECT_DRAFT_REVERTED: "sicht/singleSelectDraftReverted",
    SINGLE_SELECT_INVENTORY_RECONCILED: "sicht/singleSelectInventoryReconciled",
    HISTORY_STEP_FINALIZED: "sicht/historyStepFinalized",
    PARAMETER_SET_CLEAR_REQUESTED: "sicht/parameterSetClearRequested",
    PARAMETER_SET_RESTORE_REQUESTED: "sicht/parameterSetRestoreRequested",
    PARAMETER_SET_DOWNSTREAM_VISIBILITY_REQUESTED: "sicht/parameterSetDownstreamVisibilityRequested",
    TABLE_DATA_CHANGED: "sicht/tableDataChanged",
    SYNC_REQUESTED: "sicht/syncRequested",
    SYNC_OPTIONS_EVALUATED: "sicht/syncOptionsEvaluated",
    STARTUP_DEFAULT_IN_PROGRESS: "sicht/startupDefaultInProgress",
    STARTUP_DEFAULT_FAILED: "sicht/startupDefaultFailed",
    ERROR: "sicht/error",
    DESTROY: "sicht/destroy"
  });
});

function reduce(state, type, payload) {
  return T.createReducer()(state, { type, payload });
}

const BW_SELECTION = { displayValue: "BW", useValue: "uBW", displaySource: "host" };

const REDUCER_CASES = [
  {
    name: "mountSucceeded",
    type: "sicht/mountSucceeded",
    payload: { mountedAt: 5 },
    expected: (s) => Object.assign({}, s, { lifecycle: "ready" })
  },
  {
    name: "syncOptionsEvaluated",
    type: "sicht/syncOptionsEvaluated",
    payload: { byOption: { BW: { displayValue: "BW", useValue: "uBW", isVisible: true } } },
    expected: (s) => Object.assign({}, s, {
      byOption: Object.assign({}, s.byOption, { BW: { displayValue: "BW", useValue: "uBW", isVisible: true } })
    })
  },
  {
    name: "inventoryReconciled (generation field)",
    type: "sicht/singleSelectInventoryReconciled",
    payload: { generation: 4, timestamp: 9 },
    expected: (s) => Object.assign({}, s, {
      meta: Object.assign({}, s.meta, { lastInventoryGeneration: 4, lastInventorySource: null, lastInventoryAt: 9 })
    })
  },
  {
    name: "inventoryReconciled (inventoryGeneration + source)",
    type: "sicht/singleSelectInventoryReconciled",
    payload: { inventoryGeneration: 6, generation: 4, source: "x", timestamp: 9 },
    expected: (s) => Object.assign({}, s, {
      meta: Object.assign({}, s.meta, { lastInventoryGeneration: 6, lastInventorySource: "x", lastInventoryAt: 9 })
    })
  },
  {
    name: "startupDefaultInProgress",
    type: "sicht/startupDefaultInProgress",
    payload: { startedAt: 1 },
    expected: (s) => Object.assign({}, s, { meta: Object.assign({}, s.meta, { startupDefaultInProgress: true }) })
  },
  {
    name: "startupDefaultFailed with payload",
    type: "sicht/startupDefaultFailed",
    payload: { errorCode: "C", errorMessage: 42 },
    expected: (s) => Object.assign({}, s, { errorCode: "C", errorMessage: "42" })
  },
  {
    name: "startupDefaultFailed defaults",
    type: "sicht/startupDefaultFailed",
    payload: {},
    expected: (s) => Object.assign({}, s, { errorCode: "SICHT_STARTUP_DEFAULT_FAILED", errorMessage: "" })
  },
  {
    name: "filterDockStateChanged",
    type: "sicht/filterDockStateChanged",
    payload: { timestamp: 77 },
    expected: (s) => Object.assign({}, s, { meta: Object.assign({}, s.meta, { lastHandoffAt: 77 }) })
  },
  {
    name: "filterDockPopupReady without timestamp keeps previous",
    type: "sicht/filterDockPopupReady",
    payload: {},
    expected: (s) => Object.assign({}, s)
  },
  {
    name: "singleSelectCommitted",
    type: "sicht/singleSelectCommitted",
    payload: { selection: BW_SELECTION, timestamp: 12, filterInstanceId: 5, historyStep: null },
    expected: (s) => Object.assign({}, s, {
      lifecycle: "ready",
      activeFilterInstanceId: "5",
      currentSelection: { displayValue: "BW", useValue: "uBW", displaySource: "host" },
      backupSelection: { displayValue: "BW", useValue: "uBW", displaySource: "host" },
      pendingSelection: { displayValue: "BW" },
      activeSichtValue: "BW",
      meta: Object.assign({}, s.meta, { lastCommittedAt: 12 }),
      lastHistoryStep: null
    })
  },
  {
    name: "singleSelectCommitted startup default",
    type: "sicht/singleSelectCommitted",
    payload: { selection: BW_SELECTION, timestamp: 12, filterInstanceId: "a", isStartupDefault: true },
    expected: (s) => Object.assign({}, s, {
      lifecycle: "ready",
      activeFilterInstanceId: "a",
      currentSelection: { displayValue: "BW", useValue: "uBW", displaySource: "host" },
      backupSelection: { displayValue: "BW", useValue: "uBW", displaySource: "host" },
      pendingSelection: { displayValue: "BW" },
      activeSichtValue: "BW",
      meta: Object.assign({}, s.meta, {
        lastCommittedAt: 12,
        startupDefaultCommitted: true,
        startupDefaultInProgress: false
      })
    })
  },
  {
    name: "singleSelectCommitted parameter clear",
    type: "sicht/singleSelectCommitted",
    payload: { selection: { displayValue: "", useValue: "" }, isParameterClear: true },
    expected: (s) => Object.assign({}, s, {
      lifecycle: "ready",
      currentSelection: { displayValue: "", useValue: "", displaySource: "unknown" },
      backupSelection: { displayValue: "", useValue: "", displaySource: "unknown" },
      pendingSelection: { displayValue: "" },
      activeSichtValue: null,
      meta: Object.assign({}, s.meta, { startupDefaultCommitted: false, startupDefaultInProgress: false })
    })
  },
  {
    name: "historyStepFinalized",
    type: "sicht/historyStepFinalized",
    payload: { historyStep: { key: "filter_sicht" } },
    expected: (s) => Object.assign({}, s, { lastHistoryStep: { key: "filter_sicht" } })
  },
  {
    name: "draftChanged",
    type: "sicht/singleSelectDraftChanged",
    payload: { pendingSelection: { displayValue: "DEZPV" } },
    expected: (s) => Object.assign({}, s, { pendingSelection: { displayValue: "DEZPV" } })
  },
  {
    name: "draftReverted with legacy field",
    type: "sicht/singleSelectDraftReverted",
    payload: { pendingDisplayValue: "BW" },
    expected: (s) => Object.assign({}, s, { pendingSelection: { displayValue: "BW" } })
  },
  {
    name: "error",
    type: "sicht/error",
    payload: { errorCode: "E1", errorMessage: "boom" },
    expected: (s) => Object.assign({}, s, { lifecycle: "error", errorCode: "E1", errorMessage: "boom" })
  },
  {
    name: "error defaults",
    type: "sicht/error",
    payload: {},
    expected: (s) => Object.assign({}, s, { lifecycle: "error", errorCode: "SICHT_ERROR", errorMessage: "" })
  },
  {
    name: "destroy",
    type: "sicht/destroy",
    payload: {},
    expected: (s) => Object.assign({}, s, {
      lifecycle: "disposed",
      pendingSelection: { displayValue: "" },
      meta: Object.assign({}, s.meta, { lastHandoffAt: null })
    })
  }
];

REDUCER_CASES.forEach((entry) => {
  test("reducer: " + entry.name, () => {
    const prev = deepFreeze(T.createInitialState());
    const copy = json(prev);
    const next = reduce(prev, entry.type, entry.payload);
    assert.deepStrictEqual(next, entry.expected(copy));
    assert.deepStrictEqual(prev, copy, "input state was mutated");
  });
});

test("reducer: unknown action returns the same state, undefined state yields initial state", () => {
  const prev = T.createInitialState();
  assert.strictEqual(reduce(prev, "sicht/unknown", {}), prev);
  assert.deepStrictEqual(reduce(undefined, "sicht/unknown", {}), EXPECTED_INITIAL);
  assert.deepStrictEqual(T.createReducer()(undefined, undefined), EXPECTED_INITIAL);
});

test("reducer: changed actions produce a new top-level object", () => {
  const prev = T.createInitialState();
  const next = reduce(prev, "sicht/mountSucceeded", {});
  assert.notStrictEqual(next, prev);
  assert.strictEqual(prev.lifecycle, "idle");
});

// ---------------------------------------------------------------------------------------------
// table data inputs, availability, option evaluation, startup default
// ---------------------------------------------------------------------------------------------

test("table keys keep their order", () => {
  assert.deepStrictEqual(T.tableKeys, [
    "sicht_bw",
    "sicht_dezpv",
    "dienststelle_bw_default",
    "dienststelle_dezpv_default"
  ]);
});

test("isRelevantTableName matches keys and configured names, case-insensitively", () => {
  const KDB = { config: { tables: { sicht_bw: { name: " Sicht_BW_Query " } } } };
  const isRelevant = (name) => T.tableInputs.isRelevantTableName(KDB, name);
  assert.equal(isRelevant("sicht_bw"), true);
  assert.equal(isRelevant("SICHT_DEZPV"), true);
  assert.equal(isRelevant("dienststelle_bw_default"), true);
  assert.equal(isRelevant("dienststelle_dezpv_default"), true);
  assert.equal(isRelevant("sicht_bw_query"), true);
  assert.equal(isRelevant("jahr"), false);
  assert.equal(isRelevant(""), false);
  assert.equal(isRelevant(undefined), false);
  assert.equal(T.tableInputs.isRelevantTableName(undefined, "sicht_bw"), true);
});

function makeTableKDB(rowsByTable, extra) {
  const tables = {};
  Object.keys(rowsByTable).forEach((key) => {
    tables[key] = { shape: "s-" + key, pick: ["p-" + key] };
  });
  const reads = [];
  return Object.assign({
    config: { tables },
    services: {
      tableData: {
        readRows(input) {
          reads.push(input);
          const rows = rowsByTable[input[0].tableName];
          return rows === undefined ? null : rows;
        }
      }
    },
    _reads: reads
  }, extra || {});
}

const AVAILABILITY_CASES = [
  {
    name: "BW only",
    tables: { sicht_bw: [{ c: "uBW" }], dienststelle_bw_default: [{ x: 1 }], sicht_dezpv: [], dienststelle_dezpv_default: [] },
    expected: {
      BW: { known: true, isVisible: true, isDefaultReady: true, useValue: "uBW" },
      DEZPV: { known: true, isVisible: false, isDefaultReady: false, useValue: "" }
    }
  },
  {
    name: "DEZPV only",
    tables: { sicht_bw: [], sicht_dezpv: [{ c: { use: "uDEZPV" } }], dienststelle_dezpv_default: [{ x: 1 }] },
    expected: {
      BW: { known: true, isVisible: false, isDefaultReady: false, useValue: "" },
      DEZPV: { known: true, isVisible: true, isDefaultReady: true, useValue: "uDEZPV" }
    }
  },
  {
    name: "both visible, DEZPV default table empty",
    tables: {
      sicht_bw: [{ c: { u: "uBW" } }],
      dienststelle_bw_default: [{ x: 1 }],
      sicht_dezpv: [{ a: "", b: { d: "dDEZPV" } }],
      dienststelle_dezpv_default: []
    },
    expected: {
      BW: { known: true, isVisible: true, isDefaultReady: true, useValue: "uBW" },
      DEZPV: { known: true, isVisible: true, isDefaultReady: false, useValue: "dDEZPV" }
    }
  },
  {
    name: "none (no rows)",
    tables: { sicht_bw: [], sicht_dezpv: [] },
    expected: {
      BW: { known: true, isVisible: false, isDefaultReady: false, useValue: "" },
      DEZPV: { known: true, isVisible: false, isDefaultReady: false, useValue: "" }
    }
  },
  {
    name: "tables not configured",
    tables: {},
    expected: {
      BW: { known: false, isVisible: false, isDefaultReady: false, useValue: "" },
      DEZPV: { known: false, isVisible: false, isDefaultReady: false, useValue: "" }
    }
  },
  {
    name: "default table missing",
    tables: { sicht_bw: [{ c: "uBW" }] },
    expected: {
      BW: { known: true, isVisible: true, isDefaultReady: false, useValue: "uBW" },
      DEZPV: { known: false, isVisible: false, isDefaultReady: false, useValue: "" }
    }
  },
  {
    name: "row without usable cell",
    tables: { sicht_bw: [{ a: "  ", b: null }], dienststelle_bw_default: [{ x: 1 }], sicht_dezpv: [] },
    expected: {
      BW: { known: true, isVisible: false, isDefaultReady: false, useValue: "" },
      DEZPV: { known: true, isVisible: false, isDefaultReady: false, useValue: "" }
    }
  }
];

AVAILABILITY_CASES.forEach((entry) => {
  test("availability: " + entry.name, () => {
    const KDB = makeTableKDB(entry.tables);
    assert.deepStrictEqual(T.readAvailability(KDB), entry.expected);
  });
});

test("availability: reads rows with the configured shape/pick input", () => {
  const KDB = makeTableKDB({ sicht_bw: [{ c: "uBW" }], dienststelle_bw_default: [{ x: 1 }], sicht_dezpv: [] });
  T.readAvailability(KDB);
  assert.deepStrictEqual(KDB._reads[0], [{ tableName: "sicht_bw", shape: "s-sicht_bw", pick: ["p-sicht_bw"] }]);
});

test("availability: tableData service missing -> unknown", () => {
  assert.deepStrictEqual(T.readAvailability({}), {
    BW: { known: false, isVisible: false, isDefaultReady: false, useValue: "" },
    DEZPV: { known: false, isVisible: false, isDefaultReady: false, useValue: "" }
  });
});

test("evaluateSichtOptions builds enabled = visible && default ready", () => {
  const availability = {
    BW: { isVisible: true, isDefaultReady: true, useValue: "uBW" },
    DEZPV: { isVisible: true, isDefaultReady: false, useValue: 7 }
  };
  const evaluated = T.evaluateOptions({}, availability);
  assert.equal(evaluated.evaluatedAt, T0);
  assert.deepStrictEqual(evaluated.byOption, {
    BW: {
      displayValue: "BW", useValue: "uBW", optionTableKey: "sicht_bw", defaultTableKey: "dienststelle_bw_default",
      isVisible: true, isDefaultReady: true, isEnabled: true, lastSyncedAt: T0
    },
    DEZPV: {
      displayValue: "DEZPV", useValue: "7", optionTableKey: "sicht_dezpv", defaultTableKey: "dienststelle_dezpv_default",
      isVisible: true, isDefaultReady: false, isEnabled: false, lastSyncedAt: T0
    }
  });
  assert.deepStrictEqual(Object.keys(T.evaluateOptions({}, undefined).byOption), ["BW", "DEZPV"]);
  assert.equal(T.evaluateOptions({}, undefined).byOption.BW.isEnabled, false);
});

test("selectStartupSichtDefault picks the first enabled option (BW before DEZPV)", () => {
  const opt = (displayValue, useValue, enabled) => ({ displayValue, useValue, isVisible: enabled, isEnabled: enabled });
  assert.deepStrictEqual(
    T.selectStartupDefault({}, { BW: opt("BW", "uBW", true), DEZPV: opt("DEZPV", "uD", true) }),
    { ok: true, selection: { displayValue: "BW", useValue: "uBW" }, reason: "firstEnabled" }
  );
  assert.deepStrictEqual(
    T.selectStartupDefault({}, { BW: opt("BW", "uBW", false), DEZPV: opt("DEZPV", "uD", true) }),
    { ok: true, selection: { displayValue: "DEZPV", useValue: "uD" }, reason: "firstEnabled" }
  );
  assert.deepStrictEqual(
    T.selectStartupDefault({}, { BW: opt("BW", "", true), DEZPV: opt("DEZPV", "uD", false) }),
    { ok: false, reason: "noEnabledSichtDefault" }
  );
  assert.deepStrictEqual(T.selectStartupDefault({}, undefined), { ok: false, reason: "noEnabledSichtDefault" });
  assert.deepStrictEqual(
    T.selectStartupDefault({}, { BW: opt("Alle", "x", true) }),
    { ok: false, reason: "noEnabledSichtDefault" }
  );
});

test("config: variants derive table keys, display lookup and startup order", () => {
  assert.deepStrictEqual(config.VARIANT_KEYS, ["BW", "DEZPV"]);
  assert.equal(config.VARIANT_BY_DISPLAY.BW, "BW");
  assert.equal(config.VARIANT_BY_DISPLAY.DEZPV, "DEZPV");
  assert.equal(config.VARIANT_BY_DISPLAY.Alle, undefined);
  assert.equal(config.VARIANT_BY_DISPLAY.constructor, undefined);
  assert.equal(config.ALLE_LABEL, "Alle");
  assert.deepStrictEqual(config.LIVE_SICHT_QUERY, { scopeType: "global", status: "active", hostStatus: "present" });
});

// ---------------------------------------------------------------------------------------------
// commit source flags, handoff mapping, history step, selectors
// ---------------------------------------------------------------------------------------------

test("commit source flags", () => {
  const flags = (isStartupDefault, isHistoryReplay, skipDownstreamVisibility) => ({
    isStartupDefault, isHistoryReplay, skipDownstreamVisibility
  });
  assert.deepStrictEqual(T.mapCommitSourceFlags("sichtStartup"), flags(true, false, false));
  assert.deepStrictEqual(T.mapCommitSourceFlags("startup"), flags(true, false, false));
  assert.deepStrictEqual(T.mapCommitSourceFlags("startupDefault"), flags(true, false, false));
  assert.deepStrictEqual(T.mapCommitSourceFlags("historyReplay"), flags(false, true, false));
  assert.deepStrictEqual(T.mapCommitSourceFlags("parameterRestore"), flags(false, false, true));
  assert.deepStrictEqual(T.mapCommitSourceFlags("user"), flags(false, false, false));
  assert.deepStrictEqual(T.mapCommitSourceFlags(undefined), flags(false, false, false));
});

test("delegated commit sources", () => {
  ["sichtStartup", "startup", "startupDefault", "parameterRestore", "historyReplay"].forEach((source) => {
    assert.equal(T.isDelegatedSource(source), true, source);
  });
  ["user", "popup", "", undefined, null].forEach((source) => {
    assert.equal(T.isDelegatedSource(source), false, String(source));
  });
});

test("mapFilterDockHandoff: foreign or invalid handoffs map to null", () => {
  assert.strictEqual(T.mapFilterDockHandoff(null), null);
  assert.strictEqual(T.mapFilterDockHandoff("x"), null);
  assert.strictEqual(T.mapFilterDockHandoff({ filterType: "singleSelect" }), null);
});

test("mapFilterDockHandoff: minimal and full handoff", () => {
  assert.deepStrictEqual(T.mapFilterDockHandoff({ filterType: "sicht" }), {
    filterId: null,
    filterKey: "global__",
    filterInstanceId: null,
    filterLabel: "",
    filterScope: "global",
    filterType: "sicht",
    scopeType: "global",
    tabId: null,
    scopeId: "global",
    scopeResolution: "global",
    itemIdHint: null,
    itemNameHint: "",
    semanticInstanceKeyHint: null,
    filterConfig: {},
    interactionType: "unknown",
    optionLabel: null,
    isAlleOption: false,
    popup: null,
    capabilities: {},
    timestamp: T0
  });
  assert.deepStrictEqual(
    T.mapFilterDockHandoff({
      filterType: "sicht",
      filterId: "f1",
      filterInstanceId: "fi-1",
      filterLabel: "Sicht",
      scopeType: "pageContext",
      tabId: "t1",
      scopeId: "s1",
      itemIdHint: 4,
      semanticInstanceKeyHint: "k",
      filterConfig: { a: 1 },
      interactionType: "click",
      selectedOptionLabel: "BW",
      isAlleOption: true,
      popup: { isVisible: true, hasOptions: true, optionCount: 3, hasOkButton: true, extra: 1 },
      capabilities: { hasAlleOption: true },
      observedAt: 55
    }),
    {
      filterId: "f1",
      filterKey: "f1",
      filterInstanceId: "fi-1",
      filterLabel: "Sicht",
      filterScope: "pageContext",
      filterType: "sicht",
      scopeType: "pageContext",
      tabId: "t1",
      scopeId: "s1",
      scopeResolution: "ownerRequired",
      itemIdHint: 4,
      itemNameHint: "Sicht",
      semanticInstanceKeyHint: "k",
      filterConfig: { a: 1 },
      interactionType: "click",
      optionLabel: "BW",
      isAlleOption: true,
      popup: {
        isVisible: true, hasOptions: true, optionCount: 3, hasOkButton: true, hasCancelButton: false, observedAt: null
      },
      capabilities: { hasAlleOption: true },
      timestamp: 55
    }
  );
});

test("buildCommittedStep: step shape with and without dependencies", () => {
  const identity = { filterInstanceId: "fi-1", scopeType: "global", scopeId: "global", itemId: 3, semanticInstanceKey: "k" };
  const oldDeps = { specialSingleSelect: { filters: { a: 1 } }, dienststelle: { lifecycle: "ready" } };
  const newDeps = { specialSingleSelect: { filters: { a: 2 } }, dienststelle: null };
  const step = T.buildCommittedStep({ displayValue: "BW", useValue: "uBW" }, { displayValue: "DEZPV", useValue: "uD" }, oldDeps, newDeps, identity);
  const value = (displayValue, useValue, dependencies) => ({
    filterInstanceId: "fi-1", scopeType: "global", scopeId: "global", itemId: 3, semanticInstanceKey: "k",
    displayValue, useValue, activeSichtValue: displayValue, dependencies
  });
  assert.deepStrictEqual(step, {
    key: "filter_sicht",
    timestamp: T0,
    old: value("BW", "uBW", { specialSingleSelect: { filters: { a: 1 } }, dienststelle: { lifecycle: "ready" } }),
    new: value("DEZPV", "uD", { specialSingleSelect: { filters: { a: 2 } }, dienststelle: null })
  });
  const bare = T.buildCommittedStep({ displayValue: "", useValue: "" }, { displayValue: "BW", useValue: "uBW" }, null, null, null);
  assert.deepStrictEqual(bare.old, {
    filterInstanceId: null, scopeType: "global", scopeId: "global", itemId: null, semanticInstanceKey: null,
    displayValue: "", useValue: "", activeSichtValue: "", dependencies: { specialSingleSelect: null, dienststelle: null }
  });
  assert.deepStrictEqual(bare.new.dependencies, { specialSingleSelect: null, dienststelle: null });
});

test("selectors: confirmed selection, active value, state read", () => {
  const stateOf = (sicht) => ({ state: { filters: { sicht } } });
  assert.strictEqual(T.selectors.readConfirmedSichtSelection(undefined), null);
  assert.strictEqual(T.selectors.readConfirmedSichtSelection({}), null);
  assert.strictEqual(T.selectors.readConfirmedSichtSelection(stateOf(T.createInitialState())), null);
  assert.deepStrictEqual(
    T.selectors.readConfirmedSichtSelection(stateOf({
      activeFilterInstanceId: "fi-1",
      currentSelection: { displayValue: "BW", useValue: "uBW", displaySource: "host" }
    })),
    { filterInstanceId: "fi-1", displayValue: "BW", useValue: "uBW", displaySource: "host" }
  );
  assert.deepStrictEqual(
    T.selectors.readConfirmedSichtSelection(stateOf({ currentSelection: { displayValue: "BW" } })),
    { filterInstanceId: null, displayValue: "BW", useValue: "", displaySource: "unknown" }
  );
  const state = T.createInitialState();
  assert.deepStrictEqual(T.selectors.readSichtState(stateOf(state)), state);
  assert.strictEqual(T.selectors.readSichtState({}), undefined);
  assert.strictEqual(T.selectors.readSichtState(undefined), undefined);
});

test("selectors: option lookups by display and use value", () => {
  const byOption = T.createInitialState().byOption;
  byOption.BW.useValue = "uBW";
  byOption.DEZPV.useValue = "uDEZPV";
  assert.strictEqual(T.selectors.findOptionByDisplay(byOption, "DEZPV"), byOption.DEZPV);
  assert.strictEqual(T.selectors.findOptionByDisplay(byOption, "Alle"), null);
  assert.strictEqual(T.selectors.findOptionByDisplay(undefined, "BW"), null);
  assert.strictEqual(T.selectors.findOptionByUse(byOption, "uBW"), byOption.BW);
  assert.strictEqual(T.selectors.findOptionByUse(byOption, "nope"), null);
  assert.strictEqual(T.selectors.findOptionByUse(null, "uBW"), null);
});

test("selectors: active value falls back to the confirmed display value", () => {
  const stateOf = (sicht) => ({ state: { filters: { sicht } } });
  assert.strictEqual(T.selectors.readActiveSichtValue({}), null);
  assert.strictEqual(T.selectors.readActiveSichtValue(stateOf({ activeSichtValue: "BW" })), "BW");
  assert.strictEqual(T.selectors.readActiveSichtValue(stateOf({ activeSichtValue: " ", currentSelection: { displayValue: "DEZPV" } })), "DEZPV");
  assert.strictEqual(T.selectors.readActiveSichtValue(stateOf({ activeSichtValue: null, currentSelection: { displayValue: "" } })), null);
});

test("selectors: readSichtState returns the stored object, not a copy", () => {
  const sicht = T.createInitialState();
  assert.strictEqual(T.selectors.readSichtState({ state: { filters: { sicht } } }), sicht);
});

// ---------------------------------------------------------------------------------------------
// controller level: fake _KDB around the real register function
// ---------------------------------------------------------------------------------------------

function makeOptionLabelEl(label, extraClasses) {
  const classes = new Set(extraClasses || []);
  const attrs = {};
  const labelEl = { textContent: label, getAttribute: () => label };
  const el = {
    style: {},
    classes,
    attrs,
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name)
    },
    setAttribute: (name, value) => { attrs[name] = String(value); },
    getAttribute: (name) => (name in attrs ? attrs[name] : null),
    removeAttribute: (name) => { delete attrs[name]; },
    querySelector: (selector) => (selector === T.chrome.optionLabelSelector ? labelEl : null)
  };
  return el;
}

function makeFakeDocument(optionEls) {
  const popupMount = {
    classes: new Set(),
    classList: { add(name) { popupMount.classes.add(name); } },
    querySelectorAll: (selector) => (selector === T.chrome.optionSelector ? optionEls : []),
    querySelector: () => null
  };
  return {
    popupMount,
    document: { querySelector: (selector) => (selector === T.chrome.popupMountFallbackSelector ? popupMount : null) }
  };
}

const LIVE_INSTANCE = {
  filterInstanceId: "fi-1",
  scopeType: "global",
  scopeId: "global",
  filterLabel: "Sicht",
  itemName: "Sicht",
  itemId: "item-1",
  semanticInstanceKey: "sk-1",
  filterType: "sicht",
  selectionOwner: "sicht",
  identityQuality: "exact",
  status: "active",
  hostStatus: "present"
};

const BOTH_TABLES = {
  sicht_bw: [{ c: "uBW" }],
  dienststelle_bw_default: [{ x: 1 }],
  sicht_dezpv: [{ c: "uDEZPV" }],
  dienststelle_dezpv_default: [{ x: 1 }]
};

const BW_ONLY_TABLES = {
  sicht_bw: [{ c: "uBW" }],
  dienststelle_bw_default: [{ x: 1 }],
  sicht_dezpv: [],
  dienststelle_dezpv_default: []
};

function makeEnv(options) {
  const opts = Object.assign({ tables: BOTH_TABLES, withTableData: true, autoCommit: true, instances: { "fi-1": LIVE_INSTANCE } }, options);
  const clock = { t: T0 };
  const consoleStub = makeConsole();
  const dom = makeFakeDocument(opts.optionEls || []);
  const calls = { singleSelect: [], dienststelle: [], special: [], history: [], subscribe: [], unsubscribed: 0 };
  const handlers = {};
  const env = { clock, console: consoleStub, calls, dom, handlers, controller: null };
  const KDB = makeTableKDB(opts.tables);
  if (!opts.withTableData) {
    delete KDB.services.tableData;
  }
  KDB.services.history = {
    pushCommittedStep(step) { calls.history.push(step); return true; }
  };
  KDB.state = { filters: { singleSelect: { instancesById: opts.instances, inventory: { generation: 7 } } } };
  KDB.events = {
    subscribe(name, handler) {
      calls.subscribe.push(name);
      handlers[name] = handler;
      return function unsubscribe() { calls.unsubscribed += 1; };
    }
  };
  KDB.api = {
    singleSelect: {
      async dispatch(action) {
        calls.singleSelect.push(action);
        if (action.type !== "singleSelect/applyOwnerSelection") {
          return { ok: true };
        }
        if (opts.applyResult) {
          return opts.applyResult(action);
        }
        if (!opts.autoCommit) {
          return { ok: true, degraded: false, applied: [], diagnostics: [] };
        }
        clock.t += 1;
        const p = action.payload;
        const ack = await env.controller.dispatch({
          type: "sicht/singleSelectCommitted",
          payload: {
            filterInstanceId: p.filterInstanceId,
            operationId: p.operationId,
            source: p.source,
            selection: Object.assign({ displaySource: "host" }, p.selection),
            timestamp: clock.t,
            skipHistory: p.skipHistory
          }
        });
        env.lastCommitAck = ack;
        return { ok: true, degraded: false, applied: [], diagnostics: [] };
      }
    },
    dienststelle: {
      dispatch(action) { calls.dienststelle.push(action); return true; },
      getState() { return { lifecycle: "ready", marker: "dst" }; }
    },
    specialSingleSelect: {
      dispatch(action) { calls.special.push(action); return { ok: true }; },
      getState() { return { lifecycle: "ready", filters: { personengruppe: { isVisible: true } } }; }
    }
  };
  env.KDB = KDB;
  const register = T.registerSicht({
    console: consoleStub,
    Date: { now: () => clock.t },
    document: dom.document
  });
  env.controller = register(KDB);
  return env;
}

const SYNC = { type: "sicht/syncRequested", payload: {} };

test("register: namespaces, runtime, history contribution, tableData subscription", () => {
  const env = makeEnv();
  const { KDB, controller } = env;
  assert.deepStrictEqual(Object.keys(controller).sort(), ["destroy", "dispatch", "getState", "mount"]);
  assert.strictEqual(KDB.api.sicht, controller);
  assert.deepStrictEqual(KDB.state.filters.sicht, EXPECTED_INITIAL);
  assert.equal(typeof KDB.elements.selectors.sicht.rootClass, "string");
  assert.equal(KDB.elements.selectors.sicht.rootClass, "KDB_sichtSingleSelect");
  const rt = KDB.runtime.sicht;
  ["domRefs", "listeners", "abortControllers", "observers", "timers", "pendingPromises", "delegatedOperationIds"]
    .forEach((bucket) => assert.deepStrictEqual(rt[bucket], {}, bucket));
  assert.deepStrictEqual(Object.keys(rt.subscriptions), ["tableDataLoadFinished"]);
  assert.strictEqual(rt.parameterSetRunId, null);
  assert.equal(typeof rt.historyReplayHandlerContribution.apply, "function");
  assert.equal(typeof rt.subscriptions.tableDataLoadFinished, "function");
  assert.deepStrictEqual(env.calls.subscribe, ["tableData:loadFinished"]);
});

test("register: re-registering unsubscribes the previous tableData subscription", () => {
  const env = makeEnv();
  const register = T.registerSicht({ console: env.console, Date: { now: () => env.clock.t }, document: env.dom.document });
  register(env.KDB);
  assert.equal(env.calls.unsubscribed, 1);
  assert.equal(env.calls.subscribe.length, 2);
});

test("mount: lifecycle ready, returns true; getState is a copy-compatible snapshot", () => {
  const env = makeEnv({ withTableData: false });
  assert.equal(env.controller.mount({}), true);
  const state = env.controller.getState();
  assert.equal(state.lifecycle, "ready");
  assert.deepStrictEqual(state, Object.assign({}, EXPECTED_INITIAL, { lifecycle: "ready" }));
  assert.equal(env.calls.singleSelect.length, 0);
});

test("getState returns a deep copy: mutating it never reaches the store", () => {
  const env = makeEnv({ withTableData: false });
  env.controller.mount({});
  const state = env.controller.getState();
  state.byOption.BW.displayValue = "mutated";
  state.meta.startupDefaultCommitted = true;
  assert.equal(env.KDB.state.filters.sicht.byOption.BW.displayValue, "BW");
  assert.equal(env.KDB.state.filters.sicht.meta.startupDefaultCommitted, false);
});

test("dispatch returns the live state for non-ack actions, getState returns a copy", async () => {
  const env = makeEnv({ withTableData: false });
  env.controller.mount({});
  const live = env.controller.dispatch({ type: "sicht/unknown" });
  assert.strictEqual(live, env.KDB.state.filters.sicht);
  const copy = env.controller.getState();
  assert.notStrictEqual(copy, env.KDB.state.filters.sicht);
  assert.deepStrictEqual(copy, env.KDB.state.filters.sicht);
});

test("tableData loadFinished: relevant table triggers re-evaluation, others are ignored", async () => {
  const env = makeEnv({ withTableData: true, tables: BW_ONLY_TABLES, autoCommit: false });
  const handler = env.handlers["tableData:loadFinished"];
  handler({ tableName: "jahr", rowCount: 3 });
  assert.equal(env.KDB.state.filters.sicht.byOption.BW.isVisible, false);
  handler({ tableName: "sicht_bw", rowCount: 1 });
  assert.equal(env.KDB.state.filters.sicht.byOption.BW.isEnabled, true);
  assert.equal(env.KDB.state.filters.sicht.byOption.BW.useValue, "uBW");
  assert.equal(env.KDB.state.filters.sicht.byOption.DEZPV.isEnabled, false);
  assert.equal(env.KDB.state.filters.sicht.meta.startupDefaultInProgress, true);
  await new Promise((resolve) => setImmediate(resolve));
});

test("syncRequested: startup default is delegated, committed, downstream notified, no history", async () => {
  const env = makeEnv({ tables: BW_ONLY_TABLES });
  const ack = await env.controller.dispatch(SYNC);
  assert.deepStrictEqual(ack, {
    ok: true,
    acknowledged: true,
    degraded: false,
    retried: false,
    code: null,
    diagnostics: [],
    startupResult: {
      ok: true,
      degraded: false,
      diagnostics: [],
      selection: { displayValue: "BW", useValue: "uBW" },
      reason: "firstEnabled"
    }
  });
  assert.equal(env.calls.singleSelect.length, 1);
  assert.deepStrictEqual(env.calls.singleSelect[0], {
    type: "singleSelect/applyOwnerSelection",
    payload: {
      notifyOwner: "sicht",
      skipHistory: true,
      filterInstanceId: "fi-1",
      operationId: "sicht:startup:" + T0 + ":1",
      selection: { displayValue: "BW", useValue: "uBW" },
      source: "sichtStartup",
      inventoryGeneration: 7
    }
  });
  assert.equal(env.lastCommitAck.ok, true);
  assert.equal(env.lastCommitAck.degraded, false);
  const state = env.KDB.state.filters.sicht;
  assert.deepStrictEqual(state.currentSelection, { displayValue: "BW", useValue: "uBW", displaySource: "host" });
  assert.equal(state.activeSichtValue, "BW");
  assert.equal(state.activeFilterInstanceId, "fi-1");
  assert.equal(state.meta.startupDefaultCommitted, true);
  assert.equal(state.meta.startupDefaultInProgress, false);
  assert.equal(state.lifecycle, "ready");
  assert.equal(state.lastHistoryStep, null);
  assert.deepStrictEqual(env.calls.history, []);
  assert.deepStrictEqual(env.calls.special, [{
    type: "specialSingleSelect/sichtChanged",
    payload: { activeSichtValue: "BW" }
  }]);
  assert.deepStrictEqual(env.calls.dienststelle, [{
    type: "dienststelle/sichtChanged",
    payload: {
      activeSichtValue: "BW",
      selection: { displayValue: "BW", useValue: "uBW" },
      source: "startup",
      observedAt: T0 + 1
    }
  }]);
  assert.deepStrictEqual(env.KDB.runtime.sicht.delegatedOperationIds["sicht:startup:" + T0 + ":1"].status, "committed");
  const again = await env.controller.dispatch(SYNC);
  assert.equal(again.ok, true);
  assert.equal(again.startupResult.skipReason, "startupDefaultCommitted");
  assert.equal(env.calls.singleSelect.length, 1);
});

test("syncRequested: nothing enabled -> not ok, nothing delegated", async () => {
  const env = makeEnv({ tables: { sicht_bw: [], sicht_dezpv: [] } });
  const ack = await env.controller.dispatch(SYNC);
  assert.equal(ack.ok, false);
  assert.equal(ack.acknowledged, false);
  assert.equal(ack.degraded, true);
  assert.deepStrictEqual(ack.startupResult, { ok: false, reason: "noEnabledSichtDefault" });
  assert.equal(env.calls.singleSelect.length, 0);
});

test("syncRequested: no live instance -> startupInstanceUnresolved and error state", async () => {
  const env = makeEnv({ tables: BW_ONLY_TABLES, instances: {} });
  const ack = await env.controller.dispatch(SYNC);
  assert.deepStrictEqual(ack.startupResult, { ok: false, reason: "startupInstanceUnresolved" });
  assert.equal(ack.ok, false);
  const state = env.KDB.state.filters.sicht;
  assert.equal(state.errorCode, "SICHT_STARTUP_DEFAULT_FAILED");
  assert.equal(state.errorMessage, "no unique live global Sicht instance available");
  assert.equal(state.meta.startupDefaultInProgress, false);
});

test("syncRequested: failed delegation -> startupCommitFailed, state error", async () => {
  const env = makeEnv({
    tables: BW_ONLY_TABLES,
    applyResult: () => ({ ok: false, diagnostics: [{ code: "X", message: "single select said no" }] })
  });
  const ack = await env.controller.dispatch(SYNC);
  assert.deepStrictEqual(ack.startupResult, { ok: false, reason: "startupCommitFailed" });
  assert.equal(ack.ok, false);
  assert.equal(env.KDB.state.filters.sicht.errorCode, "SICHT_STARTUP_DEFAULT_FAILED");
  assert.equal(env.KDB.state.filters.sicht.errorMessage, "single select said no");
  assert.deepStrictEqual(env.KDB.runtime.sicht.delegatedOperationIds, {});
  assert.equal(env.console.logged.error.length >= 1, true);
});

test("syncRequested: single select dispatch throwing -> coded diagnostics and startupCommitFailed", async () => {
  const env = makeEnv({
    tables: BW_ONLY_TABLES,
    applyResult: () => { throw new Error("kaput"); }
  });
  const ack = await env.controller.dispatch(SYNC);
  assert.deepStrictEqual(ack.startupResult, { ok: false, reason: "startupCommitFailed" });
  assert.equal(env.KDB.state.filters.sicht.errorMessage, "kaput");
  assert.deepStrictEqual(env.KDB.runtime.sicht.delegatedOperationIds, {});
});

test("syncRequested: inventory not ready", async () => {
  const env = makeEnv({ tables: BW_ONLY_TABLES });
  delete env.KDB.state.filters.singleSelect.inventory;
  const ack = await env.controller.dispatch(SYNC);
  assert.deepStrictEqual(ack.startupResult, { ok: false, reason: "inventoryNotReady" });
});

async function startWith(tables) {
  const env = makeEnv({ tables });
  await env.controller.dispatch(SYNC);
  env.calls.singleSelect.length = 0;
  env.calls.special.length = 0;
  env.calls.dienststelle.length = 0;
  return env;
}

function committedAction(overrides) {
  return {
    type: "sicht/singleSelectCommitted",
    payload: Object.assign({
      filterInstanceId: "fi-1",
      source: "popup",
      selection: { displayValue: "DEZPV", useValue: "uDEZPV", displaySource: "popup" },
      timestamp: T0 + 100
    }, overrides)
  };
}

test("interactive commit without operationId: accepted with compatibility diagnostic and one history step", async () => {
  const env = await startWith(BOTH_TABLES);
  const ack = await env.controller.dispatch(committedAction());
  assert.deepStrictEqual(ack, {
    ok: true,
    degraded: true,
    diagnostics: [{ code: "SICHT_OPERATION_ID_COMPATIBILITY", message: "interactive commit accepted without operationId" }]
  });
  assert.equal(env.calls.history.length, 1);
  const value = (displayValue, useValue, specialFilters) => ({
    filterInstanceId: "fi-1", scopeType: "global", scopeId: "global", itemId: "item-1", semanticInstanceKey: "sk-1",
    displayValue, useValue, activeSichtValue: displayValue,
    dependencies: {
      specialSingleSelect: { lifecycle: "ready", filters: { personengruppe: { isVisible: true } } },
      dienststelle: { lifecycle: "ready", marker: "dst" }
    }
  });
  assert.deepStrictEqual(env.calls.history[0], {
    key: "filter_sicht",
    timestamp: T0 + 1,
    old: value("BW", "uBW"),
    new: value("DEZPV", "uDEZPV")
  });
  const state = env.KDB.state.filters.sicht;
  assert.equal(state.activeSichtValue, "DEZPV");
  assert.deepStrictEqual(state.lastHistoryStep, env.calls.history[0]);
  assert.deepStrictEqual(state.backupSelection, { displayValue: "DEZPV", useValue: "uDEZPV", displaySource: "popup" });
  assert.deepStrictEqual(env.calls.special, [{ type: "specialSingleSelect/sichtChanged", payload: { activeSichtValue: "DEZPV" } }]);
  assert.equal(env.calls.dienststelle.length, 1);
  assert.equal(env.calls.dienststelle[0].payload.source, "user");
  assert.equal(env.calls.dienststelle[0].payload.observedAt, T0 + 100);
});

test("history step dependency snapshots are copies of the dependency state", async () => {
  const env = await startWith(BOTH_TABLES);
  const shared = { lifecycle: "ready", nested: { a: 1 } };
  env.KDB.api.dienststelle.getState = () => shared;
  await env.controller.dispatch(committedAction());
  const step = env.calls.history[0];
  assert.deepStrictEqual(step.new.dependencies.dienststelle, shared);
  assert.notStrictEqual(step.new.dependencies.dienststelle, shared);
  assert.notStrictEqual(step.old.dependencies.dienststelle, step.new.dependencies.dienststelle);
});

test("commit with skipHistory or history replay creates no history step", async () => {
  const env = await startWith(BOTH_TABLES);
  await env.controller.dispatch(committedAction({ skipHistory: true }));
  assert.equal(env.calls.history.length, 0);
  assert.equal(env.KDB.state.filters.sicht.activeSichtValue, "DEZPV");
  assert.equal(env.calls.dienststelle.length, 1);
});

test("commit validation: coded rejections and error state", async () => {
  const env = await startWith(BOTH_TABLES);
  const reject = async (overrides, code, message) => {
    const ack = await env.controller.dispatch(committedAction(overrides));
    assert.deepStrictEqual(ack, { ok: false, code, message });
  };
  await reject({ filterInstanceId: "" }, "SICHT_INSTANCE_INVALID", "filterInstanceId is required");
  await reject({ filterInstanceId: "other" }, "SICHT_INSTANCE_INVALID", "filterInstanceId is not the unique live global Sicht descriptor");
  await reject({ timestamp: "x" }, "SICHT_COMMIT_STALE", "callback timestamp predates the current confirmed Sicht state");
  await reject({ timestamp: T0 }, "SICHT_COMMIT_STALE", "callback timestamp predates the current confirmed Sicht state");
  await reject({ source: "startup" }, "SICHT_OPERATION_ID_INVALID", "delegated singleSelect commit requires operationId");
  await reject({ source: "startup", operationId: "unknown-op" }, "SICHT_COMMIT_STALE", "delegated callback has no pending Sicht operation");
  await reject({ selection: { displayValue: "", useValue: "" } }, "SICHT_DISPLAY_VALUE_INVALID", "selection.displayValue is required");
  await reject({ selection: { displayValue: "NOPE", useValue: "u" } }, "SICHT_DISPLAY_VALUE_INVALID", "displayValue is not a configured enabled Sicht option");
  await reject({ selection: { displayValue: "DEZPV", useValue: "" } }, "SICHT_USE_VALUE_MISSING", "selection.useValue is required for a non-empty Sicht selection");
  await reject({ selection: { displayValue: "DEZPV", useValue: "wrong" } }, "SICHT_DISPLAY_VALUE_INVALID", "selection display/use pair is not configured for Sicht");
  assert.equal(env.KDB.state.filters.sicht.lifecycle, "error");
  assert.equal(env.KDB.state.filters.sicht.errorCode, "SICHT_DISPLAY_VALUE_INVALID");
  assert.equal(env.KDB.state.filters.sicht.activeSichtValue, "BW");
  assert.equal(env.calls.history.length, 0);
});

test("delegated commit without operationId is rejected", async () => {
  const env = await startWith(BOTH_TABLES);
  const ack = await env.controller.dispatch(committedAction({ source: "parameterRestore" }));
  assert.deepStrictEqual(ack, {
    ok: false,
    code: "SICHT_OPERATION_ID_INVALID",
    message: "delegated singleSelect commit requires operationId"
  });
  assert.equal(env.KDB.state.filters.sicht.errorCode, "SICHT_OPERATION_ID_INVALID");
});

test("duplicate delegated operationId is acknowledged as stale, other instance is rejected", async () => {
  const env = await startWith(BOTH_TABLES);
  const opId = "sicht:startup:" + T0 + ":1";
  const duplicate = await env.controller.dispatch(committedAction({ operationId: opId, source: "sichtStartup", timestamp: T0 + 200 }));
  assert.deepStrictEqual(duplicate, { ok: true, code: "SICHT_COMMIT_STALE", message: "duplicate delegated operationId ignored" });
  const foreign = await env.controller.dispatch(committedAction({ operationId: opId, source: "sichtStartup", filterInstanceId: "other", timestamp: T0 + 200 }));
  assert.deepStrictEqual(foreign, { ok: false, code: "SICHT_INSTANCE_INVALID", message: "operationId was reused for another Sicht instance" });
});

test("draft changed / reverted only touch pendingSelection", async () => {
  const env = await startWith(BOTH_TABLES);
  const draft = (type, payload) => env.controller.dispatch({ type, payload: Object.assign({ filterInstanceId: "fi-1", timestamp: T0 + 300 }, payload) });
  assert.deepStrictEqual(
    await draft("sicht/singleSelectDraftChanged", { pendingSelection: { displayValue: "DEZPV" } }),
    { ok: true }
  );
  assert.deepStrictEqual(env.KDB.state.filters.sicht.pendingSelection, { displayValue: "DEZPV" });
  assert.deepStrictEqual(
    await draft("sicht/singleSelectDraftChanged", { pendingSelection: { displayValue: "NOPE" } }),
    { ok: false, code: "SICHT_DISPLAY_VALUE_INVALID", message: "draft displayValue is not a configured enabled Sicht option" }
  );
  assert.deepStrictEqual(
    await draft("sicht/singleSelectDraftReverted", { pendingSelection: { displayValue: "DEZPV" } }),
    { ok: false, code: "SICHT_COMMIT_STALE", message: "reverted draft differs from confirmed Sicht backup" }
  );
  assert.deepStrictEqual(await draft("sicht/singleSelectDraftReverted", {}), { ok: true });
  assert.deepStrictEqual(env.KDB.state.filters.sicht.pendingSelection, { displayValue: "BW" });
  assert.deepStrictEqual(
    await env.controller.dispatch({ type: "sicht/singleSelectDraftChanged", payload: { filterInstanceId: "zzz", timestamp: T0 + 300 } }),
    { ok: false, code: "SICHT_INSTANCE_INVALID", message: "draft callback does not target the unique live global Sicht instance" }
  );
  assert.deepStrictEqual(
    await draft("sicht/singleSelectDraftChanged", { timestamp: T0 - 5, pendingSelection: { displayValue: "DEZPV" } }),
    { ok: false, code: "SICHT_COMMIT_STALE", message: "draft callback predates the current confirmed Sicht state" }
  );
  assert.equal(env.calls.history.length, 0);
});

test("inventory reconciled acks", async () => {
  const env = makeEnv({ tables: BW_ONLY_TABLES });
  const reconcile = (payload) => env.controller.dispatch({ type: "sicht/singleSelectInventoryReconciled", payload });
  const base = { ok: true, acknowledged: true, degraded: false, retried: false, code: null, diagnostics: [] };
  assert.deepStrictEqual(await reconcile({ generation: "x" }), Object.assign({}, base, {
    ok: false,
    acknowledged: false,
    code: "SICHT_INVENTORY_GENERATION_INVALID",
    message: "singleSelect inventory callback requires numeric inventoryGeneration"
  }));
  assert.deepStrictEqual(await reconcile({ inventoryGeneration: 3, source: "s" }), Object.assign({}, base, {
    code: "SICHT_INVENTORY_STARTUP_SKIPPED_BY_FLAG"
  }));
  assert.equal(env.KDB.state.filters.sicht.meta.lastInventoryGeneration, 3);
  assert.equal(env.KDB.state.filters.sicht.meta.lastInventorySource, "s");
  assert.deepStrictEqual(await reconcile({ inventoryGeneration: 2 }), Object.assign({}, base, { code: "SICHT_INVENTORY_GENERATION_STALE" }));
  assert.deepStrictEqual(await reconcile({ inventoryGeneration: 3 }), Object.assign({}, base, { code: "SICHT_INVENTORY_GENERATION_DUPLICATE" }));
  const started = await reconcile({ inventoryGeneration: 4, allowStartupDefault: true });
  assert.equal(started.ok, true);
  assert.equal(started.retried, true);
  assert.equal(started.degraded, false);
  assert.equal(started.code, undefined);
  assert.equal(started.startupResult.ok, true);
  assert.equal(env.KDB.state.filters.sicht.meta.lastInventoryGeneration, 4);
  assert.equal(env.KDB.state.filters.sicht.activeSichtValue, "BW");
});

test("inventory reconciled: startup retry pending when nothing is available", async () => {
  const env = makeEnv({ tables: { sicht_bw: [], sicht_dezpv: [] } });
  const ack = await env.controller.dispatch({
    type: "sicht/singleSelectInventoryReconciled",
    payload: { inventoryGeneration: 4, allowStartupDefault: true }
  });
  assert.equal(ack.ok, true);
  assert.equal(ack.degraded, true);
  assert.equal(ack.code, "SICHT_INVENTORY_STARTUP_RETRY_PENDING");
  assert.equal(ack.retried, false);
  assert.equal(env.KDB.state.filters.sicht.meta.lastInventoryGeneration, null);
});

// parameter set ---------------------------------------------------------------------------------

function parameterSet(env, type, payload) {
  return env.controller.dispatch({ type: "sicht/" + type, payload });
}

test("parameterSetRestore: delegates by use value and commits without downstream notifications", async () => {
  const env = await startWith(BOTH_TABLES);
  const ack = await parameterSet(env, "parameterSetRestoreRequested", { runId: 1, sicht: " uDEZPV ", inventoryGeneration: 7 });
  assert.deepStrictEqual(ack, { ok: true, degraded: false, diagnostics: [] });
  assert.deepStrictEqual(env.calls.singleSelect[0], {
    type: "singleSelect/applyOwnerSelection",
    payload: {
      notifyOwner: "sicht",
      skipHistory: true,
      filterInstanceId: "fi-1",
      operationId: "sicht:restore:" + (T0 + 1) + ":2",
      selection: { displayValue: "DEZPV", useValue: "uDEZPV" },
      source: "parameterRestore",
      inventoryGeneration: 7
    }
  });
  assert.equal(env.KDB.state.filters.sicht.activeSichtValue, "DEZPV");
  assert.equal(env.calls.dienststelle.length, 0);
  assert.equal(env.calls.special.length, 0);
  assert.equal(env.calls.history.length, 0);
  assert.equal(env.KDB.runtime.sicht.parameterSetRunId, 1);
});

test("parameterSetRestore: compatibility without generation, invalid and stale inputs", async () => {
  const env = await startWith(BOTH_TABLES);
  const compat = await parameterSet(env, "parameterSetRestoreRequested", { runId: 1, sicht: "uBW" });
  assert.equal(compat.ok, true);
  assert.equal(compat.degraded, true);
  assert.deepStrictEqual(compat.diagnostics.map((d) => d.code), ["WRITEBACK_SICHT_INVENTORY_GENERATION_COMPATIBILITY"]);
  assert.deepStrictEqual(compat.diagnostics[0].currentGeneration, 7);

  const fail = (ack, code, message) => {
    assert.equal(ack.ok, false);
    assert.equal(ack.degraded, false);
    assert.equal(ack.diagnostics.length, 1);
    assert.equal(ack.diagnostics[0].code, code);
    if (message) { assert.equal(ack.diagnostics[0].message, message); }
  };
  fail(await parameterSet(env, "parameterSetRestoreRequested", {}), "WRITEBACK_RESTORE_CANCELLED", "parameterSet action requires numeric runId");
  fail(await parameterSet(env, "parameterSetRestoreRequested", { runId: 0, sicht: "uBW" }), "WRITEBACK_RESTORE_CANCELLED", "stale parameterSet runId 0 superseded by 1");
  fail(await parameterSet(env, "parameterSetRestoreRequested", { runId: 2 }), "WRITEBACK_INVALID_V3_PAYLOAD");
  fail(await parameterSet(env, "parameterSetRestoreRequested", { runId: 3, sicht: "uBW", inventoryGeneration: "7" }), "WRITEBACK_INVALID_V3_PAYLOAD", "payload.inventoryGeneration must be numeric when provided");
  fail(await parameterSet(env, "parameterSetRestoreRequested", { runId: 4, sicht: "uBW", inventoryGeneration: 6 }), "WRITEBACK_RESTORE_CANCELLED", "stale inventoryGeneration for sicht restore");
  fail(await parameterSet(env, "parameterSetRestoreRequested", { runId: 5, sicht: "nope", inventoryGeneration: 7 }), "WRITEBACK_INVALID_V3_PAYLOAD", "unsupported Sicht use value \"nope\"");
  env.KDB.state.filters.singleSelect.instancesById = {};
  fail(await parameterSet(env, "parameterSetRestoreRequested", { runId: 6, sicht: "uBW", inventoryGeneration: 7 }), "WRITEBACK_SICHT_RESTORE_FAILED", "no unique live global Sicht instance available for restore");
});

test("parameterSetRestore: failed delegation and superseded run", async () => {
  const failing = makeEnv({ applyResult: () => ({ ok: false, diagnostics: [{ code: "Z", message: "no" }] }) });
  await failing.controller.dispatch({ type: "sicht/tableDataChanged", payload: {} });
  const ack = await parameterSet(failing, "parameterSetRestoreRequested", { runId: 1, sicht: "uBW", inventoryGeneration: 7 });
  assert.equal(ack.ok, false);
  assert.deepStrictEqual(ack.diagnostics, [{
    code: "WRITEBACK_SICHT_RESTORE_FAILED",
    message: "sicht restore failed while delegating to singleSelect",
    diagnostics: [{ code: "Z", message: "no" }]
  }]);

  const superseded = makeEnv({
    applyResult: () => {
      if (superseded.KDB.runtime.sicht.parameterSetRunId === 1) {
        superseded.KDB.runtime.sicht.parameterSetRunId = 9;
      }
      return { ok: true, diagnostics: [] };
    }
  });
  await superseded.controller.dispatch({ type: "sicht/tableDataChanged", payload: {} });
  const cancelled = await parameterSet(superseded, "parameterSetRestoreRequested", { runId: 1, sicht: "uBW", inventoryGeneration: 7 });
  assert.equal(cancelled.ok, false);
  assert.equal(cancelled.diagnostics[0].code, "WRITEBACK_RESTORE_CANCELLED");
  assert.equal(cancelled.diagnostics[0].message, "parameterSet run 1 superseded by 9");
  assert.equal(cancelled.diagnostics[0].runId, 1);
});

test("parameterSetClear: clears via delegated clear operation", async () => {
  const env = await startWith(BOTH_TABLES);
  const ack = await parameterSet(env, "parameterSetClearRequested", { runId: 1, inventoryGeneration: 7 });
  assert.deepStrictEqual(ack, { ok: true, degraded: false, diagnostics: [] });
  assert.deepStrictEqual(env.calls.singleSelect[0].payload, {
    notifyOwner: "sicht",
    skipHistory: true,
    filterInstanceId: "fi-1",
    operationId: "sicht:clear:" + (T0 + 1) + ":2",
    operationKind: "clear",
    selection: { displayValue: "Alle", useValue: "" },
    source: "parameterRestore",
    inventoryGeneration: 7
  });
  const state = env.KDB.state.filters.sicht;
  assert.deepStrictEqual(state.currentSelection, { displayValue: "", useValue: "", displaySource: "policy" });
  assert.equal(state.activeSichtValue, null);
  assert.equal(state.meta.startupDefaultCommitted, false);
  assert.equal(env.calls.history.length, 0);
});

test("parameterSetClear: compatibility, no live instance, ambiguous instances, stale generation", async () => {
  const env = await startWith(BOTH_TABLES);
  const compat = await parameterSet(env, "parameterSetClearRequested", { runId: 1 });
  assert.equal(compat.ok, true);
  assert.equal(compat.degraded, true);
  assert.deepStrictEqual(compat.diagnostics.map((d) => d.code), ["WRITEBACK_SICHT_INVENTORY_GENERATION_COMPATIBILITY"]);

  const stale = await parameterSet(env, "parameterSetClearRequested", { runId: 2, inventoryGeneration: 1 });
  assert.equal(stale.ok, false);
  assert.equal(stale.diagnostics[0].code, "WRITEBACK_RESTORE_CANCELLED");
  assert.equal(stale.diagnostics[0].message, "stale inventoryGeneration for sicht clear");

  const invalid = await parameterSet(env, "parameterSetClearRequested", { runId: 3, inventoryGeneration: "1" });
  assert.equal(invalid.diagnostics[0].code, "WRITEBACK_INVALID_V3_PAYLOAD");

  const instances = env.KDB.state.filters.singleSelect.instancesById;
  instances["fi-2"] = Object.assign({}, LIVE_INSTANCE, { filterInstanceId: "fi-2" });
  const ambiguous = await parameterSet(env, "parameterSetClearRequested", { runId: 4 });
  assert.equal(ambiguous.ok, false);
  assert.equal(ambiguous.diagnostics[0].code, "WRITEBACK_SICHT_RESTORE_FAILED");
  assert.equal(ambiguous.diagnostics[0].message, "multiple live global Sicht instances make clear ambiguous");

  env.KDB.state.filters.singleSelect.instancesById = {};
  const none = await parameterSet(env, "parameterSetClearRequested", { runId: 5 });
  assert.equal(none.ok, true);
  assert.equal(none.degraded, true);
  assert.equal(none.diagnostics[0].code, "WRITEBACK_SICHT_CLEAR_NO_LIVE_INSTANCE");
});

test("parameterSetClear: failed delegation is ok for newDashboard, failure otherwise", async () => {
  const env = makeEnv({ applyResult: () => ({ ok: false, diagnostics: [{ code: "Q", message: "q" }] }) });
  const failed = await parameterSet(env, "parameterSetClearRequested", { runId: 1, inventoryGeneration: 7 });
  assert.equal(failed.ok, false);
  assert.equal(failed.diagnostics[0].code, "WRITEBACK_SICHT_RESTORE_FAILED");
  assert.equal(failed.diagnostics[0].message, "sicht clear failed while delegating to singleSelect");
  const tolerated = await parameterSet(env, "parameterSetClearRequested", { runId: 2, inventoryGeneration: 7, status: "newDashboard" });
  assert.equal(tolerated.ok, true);
  assert.equal(tolerated.degraded, true);
});

test("parameterSetDownstreamVisibility: notifies special; dienststelle only when it does not follow", async () => {
  const env = await startWith(BOTH_TABLES);
  const missing = makeEnv();
  const noSelection = await parameterSet(missing, "parameterSetDownstreamVisibilityRequested", { runId: 1 });
  assert.equal(noSelection.ok, false);
  assert.equal(noSelection.diagnostics[0].code, "WRITEBACK_SICHT_RESTORE_FAILED");
  assert.equal(noSelection.diagnostics[0].message, "downstream visibility requires an active Sicht selection");

  const delegated = await parameterSet(env, "parameterSetDownstreamVisibilityRequested", { runId: 1, dstlWillFollow: true });
  assert.deepStrictEqual(delegated, {
    ok: true,
    degraded: false,
    diagnostics: [{
      code: "WRITEBACK_SICHT_DOWNSTREAM_DSTL_DELEGATED",
      message: "dienststelle realignment is delegated to the following dienststelle restore step"
    }]
  });
  assert.equal(env.calls.special.length, 1);
  assert.equal(env.calls.dienststelle.length, 0);

  const full = await parameterSet(env, "parameterSetDownstreamVisibilityRequested", { runId: 2 });
  assert.deepStrictEqual(full, { ok: true, degraded: false, diagnostics: [] });
  assert.equal(env.calls.special.length, 2);
  assert.deepStrictEqual(env.calls.dienststelle, [{
    type: "dienststelle/sichtChanged",
    payload: {
      activeSichtValue: "BW",
      selection: { displayValue: "BW", useValue: "uBW" },
      source: "writebackSet",
      isHistoryReplay: true,
      observedAt: T0 + 1
    }
  }]);
});

test("parameterSetDownstreamVisibility: downstream failure is reported, not thrown", async () => {
  const env = await startWith(BOTH_TABLES);
  env.KDB.api.dienststelle.dispatch = () => { throw new Error("dst down"); };
  const ack = await parameterSet(env, "parameterSetDownstreamVisibilityRequested", { runId: 1 });
  assert.deepStrictEqual(ack, {
    ok: true,
    degraded: true,
    diagnostics: [{ code: "WRITEBACK_SICHT_DOWNSTREAM_DSTL_FAILED", message: "dst down" }]
  });
});

test("commit downstream failures degrade the commit ack with coded diagnostics", async () => {
  const env = await startWith(BOTH_TABLES);
  env.KDB.api.dienststelle.dispatch = () => { throw new Error("dst down"); };
  env.KDB.api.specialSingleSelect.dispatch = () => { throw new Error("special down"); };
  const ack = await env.controller.dispatch(committedAction({ operationId: undefined }));
  assert.equal(ack.ok, true);
  assert.equal(ack.degraded, true);
  assert.deepStrictEqual(ack.diagnostics.map((d) => d.code), [
    "SICHT_DOWNSTREAM_SPECIAL_FAILED",
    "SICHT_DOWNSTREAM_DIENSTSTELLE_FAILED",
    "SICHT_OPERATION_ID_COMPATIBILITY"
  ]);
  assert.equal(env.calls.history.length, 1);
});

// history replay -------------------------------------------------------------------------------

test("history replay handler: delegates, resolves legacy use values, replays dienststelle dependency", async () => {
  const env = await startWith(BOTH_TABLES);
  const handler = env.KDB.runtime.sicht.historyReplayHandlerContribution;
  assert.equal(handler.apply(env.KDB, {}, { key: "other" }), false);
  assert.equal(await handler.apply(env.KDB, null, { key: "filter_sicht" }), false);

  const legacy = await handler.apply(env.KDB, { displayValue: "DEZPV" }, { key: "filter_sicht" });
  assert.equal(legacy, true);
  const call = env.calls.singleSelect[0];
  assert.equal(call.type, "singleSelect/applyOwnerSelection");
  assert.equal(call.payload.source, "historyReplay");
  assert.deepStrictEqual(call.payload.selection, { displayValue: "DEZPV", useValue: "uDEZPV" });
  assert.equal(call.payload.operationId, "sicht:historyReplay:" + (T0 + 1) + ":2");
  assert.equal(call.payload.inventoryGeneration, 7);
  assert.equal(env.KDB.state.filters.sicht.activeSichtValue, "DEZPV");
  assert.equal(env.calls.dienststelle.length, 0, "replay commit must not notify dienststelle");
  assert.equal(env.calls.history.length, 0);

  const target = { displayValue: "BW", useValue: "uBW", filterInstanceId: "fi-1", dependencies: { dienststelle: { lifecycle: "ready" } } };
  const step = { key: "filter_sicht", old: null, new: target };
  assert.equal(await handler.apply(env.KDB, target, step), true);
  assert.deepStrictEqual(env.calls.dienststelle, [{
    type: "dienststelle/historyReplayRequested",
    payload: { targetValue: { lifecycle: "ready" }, step: step, source: "sichtHistoryReplay" }
  }]);
});

test("history replay handler: no live instance or inventory not ready -> false with warning", async () => {
  const env = await startWith(BOTH_TABLES);
  const handler = env.KDB.runtime.sicht.historyReplayHandlerContribution;
  const before = env.console.logged.warn.length;
  env.KDB.state.filters.singleSelect.inventory = null;
  assert.equal(await handler.apply(env.KDB, { displayValue: "BW", useValue: "uBW" }, { key: "filter_sicht" }), false);
  env.KDB.state.filters.singleSelect.instancesById = {};
  assert.equal(await handler.apply(env.KDB, { displayValue: "BW", useValue: "uBW" }, { key: "filter_sicht" }), false);
  assert.equal(env.console.logged.warn.length - before, 2);
});

// filterDock handoff + popup view --------------------------------------------------------------

test("filterDock handoff: delegates to singleSelect and styles the popup options", async () => {
  const alle = makeOptionLabelEl("Alle");
  const bw = makeOptionLabelEl("BW");
  const dezpv = makeOptionLabelEl("DEZPV");
  const bwDuplicate = makeOptionLabelEl("BW");
  const other = makeOptionLabelEl("Foo");
  const env = makeEnv({ tables: BW_ONLY_TABLES, optionEls: [alle, bw, dezpv, bwDuplicate, other], autoCommit: false });
  await env.controller.dispatch({ type: "sicht/tableDataChanged", payload: {} });
  const handoff = {
    filterType: "sicht",
    filterLabel: "Sicht",
    scopeType: "global",
    popup: { isVisible: true, hasOptions: true, optionCount: 5 },
    timestamp: T0 + 10
  };
  const result = await env.controller.dispatch({ type: "sicht/filterDockPopupReady", payload: handoff });
  assert.equal(result.meta.lastHandoffAt, T0 + 10);
  assert.deepStrictEqual(result, env.controller.getState());

  const forwarded = env.calls.singleSelect[env.calls.singleSelect.length - 1];
  assert.equal(forwarded.type, "singleSelect/filterDockPopupReady");
  const payload = forwarded.payload;
  assert.equal(payload.filterType, "sicht");
  assert.equal(payload.authorizedByOwner, "sicht");
  assert.equal(payload.operationId, "sicht:handoff:" + T0 + ":" + 2);
  assert.deepStrictEqual(payload.filterConfig.selectionValuesByDisplay, { BW: { d: "BW", u: "uBW" } });
  assert.equal(payload.filterConfig.initialSelection, undefined);
  assert.deepStrictEqual(payload.capabilities, { hasAlleOption: false });
  assert.deepStrictEqual(payload.ownerSelectionContext, {
    currentSelection: { displayValue: "", useValue: "", displaySource: "unavailable" },
    backupSelection: { displayValue: "", useValue: "", displaySource: "unavailable" },
    pendingSelection: { displayValue: "" }
  });

  assert.equal(env.dom.popupMount.classes.has("KDB_sichtSingleSelect"), true);
  assert.equal(alle.classes.has("KDB_sichtHideAlle"), true);
  assert.equal(alle.style.display, "none");
  assert.equal(alle.attrs["aria-hidden"], "true");
  assert.equal(bw.style.display, "");
  assert.equal(bw.classes.has("KDB_sichtOptionBw"), true);
  assert.equal(bw.classes.has("KDB_sichtOptionDisabled"), false);
  // Current behaviour: the duplicate pass hides the second BW, the per-option pass then shows it again.
  assert.equal(bwDuplicate.style.display, "");
  assert.equal(dezpv.style.display, "none");
  assert.equal(other.style.display, "none");
});

test("filterDock handoff: disabled option stays visible when active, and gets disabled classes", async () => {
  const bw = makeOptionLabelEl("BW");
  const dezpv = makeOptionLabelEl("DEZPV");
  const env = makeEnv({
    tables: { sicht_bw: [{ c: "uBW" }], dienststelle_bw_default: [], sicht_dezpv: [{ c: "uD" }], dienststelle_dezpv_default: [{ x: 1 }] },
    optionEls: [bw, dezpv],
    autoCommit: false
  });
  await env.controller.dispatch({ type: "sicht/tableDataChanged", payload: {} });
  await env.controller.dispatch({
    type: "sicht/filterDockStateChanged",
    payload: { filterType: "sicht", filterLabel: "Sicht", popup: { isVisible: true }, timestamp: T0 + 10 }
  });
  assert.equal(bw.classes.has("KDB_sichtOptionDisabled"), true);
  assert.equal(bw.attrs["aria-disabled"], "true");
  assert.equal(bw.style.pointerEvents, "none");
  assert.equal(bw.style.display, "");
  assert.equal(dezpv.classes.has("KDB_sichtOptionDezpv"), true);
  assert.equal(dezpv.classes.has("KDB_sichtOptionDisabled"), false);
  assert.equal(dezpv.style.pointerEvents, "");
});

test("filterDock handoff: non-sicht handoff is ignored; popup closed skips the DOM sync", async () => {
  const bw = makeOptionLabelEl("BW");
  const env = makeEnv({ tables: BW_ONLY_TABLES, optionEls: [bw], autoCommit: false });
  await env.controller.dispatch({ type: "sicht/filterDockPopupReady", payload: { filterType: "singleSelect" } });
  assert.equal(env.calls.singleSelect.length, 0);
  await env.controller.dispatch({
    type: "sicht/filterDockStateChanged",
    payload: { filterType: "sicht", filterLabel: "Sicht", popup: { isVisible: false }, timestamp: T0 + 1 }
  });
  assert.equal(env.calls.singleSelect.length, 1);
  assert.equal(env.calls.singleSelect[0].type, "singleSelect/filterDockStateChanged");
  assert.equal(env.dom.popupMount.classes.size, 0);
});

test("filterDock handoff: confirmed selection becomes initialSelection", async () => {
  const env = await startWith(BW_ONLY_TABLES);
  await env.controller.dispatch({
    type: "sicht/filterDockStateChanged",
    payload: { filterType: "sicht", filterLabel: "Sicht", popup: { isVisible: false }, timestamp: T0 + 50 }
  });
  const payload = env.calls.singleSelect[0].payload;
  assert.deepStrictEqual(payload.filterConfig.initialSelection, { displayValue: "BW", useValue: "uBW" });
  assert.deepStrictEqual(payload.ownerSelectionContext.currentSelection, { displayValue: "BW", useValue: "uBW", displaySource: "host" });
});

// dispatch routing + lifecycle -----------------------------------------------------------------

test("dispatch: unknown and non-routable actions return the state; error action records it", async () => {
  const env = makeEnv({ withTableData: false });
  env.controller.mount({});
  assert.equal(env.controller.dispatch({ type: "sicht/unknown" }).lifecycle, "ready");
  assert.equal(env.controller.dispatch(undefined).lifecycle, "ready");
  const afterError = env.controller.dispatch({ type: "sicht/error", payload: { errorCode: "E", errorMessage: "m" } });
  assert.equal(afterError.lifecycle, "error");
  assert.equal(env.controller.getState().errorCode, "E");
});

test("destroy: ack actions get disposed acks, getState is undefined, mount refuses", async () => {
  const env = makeEnv();
  env.controller.mount({});
  const unsubscribedBefore = env.calls.unsubscribed;
  env.controller.destroy();
  assert.equal(env.calls.unsubscribed, unsubscribedBefore + 1);
  assert.strictEqual(env.KDB.runtime.sicht.historyReplayHandlerContribution, null);
  assert.equal(env.KDB.state.filters.sicht.lifecycle, "disposed");
  assert.deepStrictEqual(env.KDB.runtime.sicht.delegatedOperationIds, {});
  assert.deepStrictEqual(env.KDB.runtime.sicht.subscriptions, {});
  env.controller.destroy();

  const ack = env.controller.dispatch({ type: "sicht/singleSelectInventoryReconciled", payload: { inventoryGeneration: 5 } });
  assert.deepStrictEqual(ack, {
    ok: false,
    acknowledged: false,
    degraded: true,
    disposed: true,
    inventoryGeneration: 5,
    code: "SICHT_DISPOSED",
    message: "sicht controller is disposed",
    diagnostics: [{ code: "SICHT_DISPOSED", message: "sicht controller is disposed" }]
  });
  assert.equal(env.console.logged.warn[0][0], "[sicht.dispatch] called after destroy");
  assert.deepStrictEqual(
    env.controller.dispatch({ type: "sicht/singleSelectInventoryReconciled", payload: {} }).inventoryGeneration,
    null
  );
  assert.strictEqual(env.controller.dispatch({ type: "sicht/filterDockPopupReady", payload: {} }), undefined);
  assert.strictEqual(env.controller.dispatch({ type: "sicht/unknown" }), undefined);
  const paramAck = await env.controller.dispatch({ type: "sicht/parameterSetClearRequested", payload: { runId: 1 } });
  assert.deepStrictEqual(paramAck, {
    ok: false,
    degraded: false,
    diagnostics: [{ code: "WRITEBACK_RESTORE_CANCELLED", message: "sicht controller is disposed" }]
  });
  assert.strictEqual(env.controller.getState(), undefined);
  assert.equal(env.controller.mount({}), false);
});

test("dispatch failure: ack actions get SICHT_DISPATCH_FAILED, state records the error", () => {
  const env = makeEnv();
  const throwing = (type) => ({ type, get payload() { throw new Error("bad payload"); } });
  const ack = env.controller.dispatch(throwing("sicht/singleSelectDraftChanged"));
  assert.deepStrictEqual(ack, { ok: false, code: "SICHT_DISPATCH_FAILED", message: "bad payload" });
  assert.equal(env.KDB.state.filters.sicht.errorCode, "SICHT_DISPATCH_FAILED");
  assert.equal(env.KDB.state.filters.sicht.errorMessage, "bad payload");
  assert.equal(env.KDB.state.filters.sicht.lifecycle, "error");
  assert.strictEqual(env.controller.dispatch(throwing("sicht/error")), undefined);
  assert.equal(env.console.logged.error.length, 2);
});
