// Golden tests for the singleSelect core modules (state, inventory, dockHandoff, commit, history, index).
// Run: node --test tools/tests/singleSelect.core.golden.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { getEventListeners } from "node:events";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const SS = path.join(JS_ROOT, "dashboard/filters/singleSelect");
const logged = [];
const quietConsole = {
  log() {}, info() {}, debug() {},
  warn(...a) { logged.push(["warn", ...a]); },
  error(...a) { logged.push(["error", ...a]); }
};

const fakeDocument = {
  catcher: null,
  dockRoot: null,
  querySelector(selector) {
    if (selector === "#filterOutClickCatcher") { return fakeDocument.catcher; }
    if (selector === "#filterDockContainer") { return fakeDocument.dockRoot; }
    return null;
  },
  contains() { return true; }
};

function load(rel, extra) {
  return loadAmd(path.join(SS, rel), Object.assign({ stubs: { console: quietConsole, document: fakeDocument } }, extra || {}));
}

function adapter() {
  const instance = load("state/instance.js");
  const reducer = load("state/reducer.js");
  const enumerate = load("inventory/enumerate.js");
  const handoff = load("dockHandoff/handoff.js");
  const interaction = load("dockHandoff/interaction.js");
  const history = load("history.js");
  return {
    register: load("__orchestratorSingleSelect.js"),
    buildFilterInstanceId: instance.buildFilterInstanceId,
    createFilterInstanceState: instance,
    ensureFilterState: instance.ensureFilterState,
    lookupLiveFilterState: instance.lookupLiveFilterState,
    reconcileInstanceState: load("inventory/identity.js").reconcileFilterInstanceState,
    enumerateFilterInstances: enumerate.enumerateFilterInstances,
    waitForFilterInventory: enumerate.waitForFilterInventory,
    notifyOwners: load("inventory/ownerAck.js").notifyInventoryReconciledOwners,
    mapHandoff: handoff.mapFilterDockHandoff,
    deriveIntent: interaction.deriveInteractionIntent,
    applyPendingSelection: interaction.applyPendingSelection,
    revertToBackupSelection: interaction.revertToBackupSelection,
    processFilterDockHandoff: handoff.processFilterDockHandoff,
    stepValue: { normalize: history.normalizeStepValue, sameInstance: history.sameInstance },
    buildCommittedStep: history.buildCommittedStep,
    pushGenericHistory: history.pushCommittedSelectionStep,
    reducer: { initialState: reducer.initialState, create: reducer.createSingleSelectReducer },
    selectors: load("state/selectors.js")
  };
}

const A = adapter();

function fakeFacet(initial, opts) {
  const o = opts || {};
  const facet = {
    stored: (initial || []).slice(),
    writes: [],
    readFilterValues() {
      return { ok: true, data: facet.stored.slice() };
    },
    async writeFilter(req) {
      facet.writes.push(req.values.slice());
      if (o.failWrite) { return { ok: false }; }
      facet.stored = req.values.slice();
      return { ok: true };
    },
    listFilterItems(input) {
      const list = o.items || [];
      return { ok: true, data: input.scopeId === "global" ? list : [] };
    }
  };
  return facet;
}

const GESCHLECHT = { itemId: "g1", itemName: "Geschlecht", scopeId: "global", values: [{ d: "Frau", u: "2" }] };
const SICHT = { itemId: "s1", itemName: "Sicht", scopeId: "global", values: [{ d: "Summe", u: "1" }] };

function makeKDB(facet, extra) {
  const pushed = [];
  const KDB = {
    properties: {
      kennzahlenTablesPropObj: { personal: {} },
      filterPropObj: { personal: { filterInstances: {
        i1: { scopeType: "global", itemName: "Geschlecht", itemId: "g1", filterLabel: "Geschlecht", instanceKey: "geschlecht", isSingleSelect: true }
      } } }
    },
    state: {},
    runtime: {},
    api: {},
    elements: {},
    services: {
      cognosHost: { filters: facet },
      history: { pushCommittedStep(step) { pushed.push(step); return true; } }
    }
  };
  return Object.assign(KDB, extra || {}, { pushed });
}

async function bootReconciled(facet, extra) {
  const KDB = makeKDB(facet, extra);
  const api = A.register(KDB, {});
  const result = await api.dispatch({ type: "singleSelect/reconcileFilterInstances", payload: { reason: "parameterRestore" } });
  return { KDB, api, result, rt: KDB.runtime.singleSelect };
}

test("buildFilterInstanceId: itemId, label fallback, global/page scope", () => {
  const build = A.buildFilterInstanceId;
  assert.deepEqual(build("global", "global", " g1 ", "Geschlecht"), {
    filterInstanceId: "g|s=global|i=g1", identityQuality: "itemId", normalizedScopeId: "global"
  });
  assert.deepEqual(build("global", "global", "", " Geschlecht "), {
    filterInstanceId: "g|s=global|l=Geschlecht", identityQuality: "labelFallback", normalizedScopeId: "global"
  });
  const page = build("pageContext", "page1", "a/b", "x");
  assert.equal(page.filterInstanceId, "p|s=page1|i=a%2Fb");
  assert.equal(page.identityQuality, "itemId");
  assert.equal(build("global", "page1", "", "x").filterInstanceId, "p|s=page1|l=x");
});

test("createFilterInstanceState: new, existing, Alle, unavailable, delegated", () => {
  const create = A.createFilterInstanceState.createFilterInstanceState;
  const read = A.createFilterInstanceState.readSelectionFromValues;
  assert.deepEqual(read([]), { displayValue: "Alle", useValue: "", displaySource: "policy" });
  assert.deepEqual(read([{ d: "", u: "5" }]), { displayValue: null, useValue: "5", displaySource: "unavailable" });
  assert.deepEqual(read([{ d: "Frau", u: "2" }]), { displayValue: "Frau", useValue: "2", displaySource: "cognos" });
  const descriptor = {
    filterInstanceId: "g|s=global|i=g1", scopeType: "global", scopeId: "global", normalizedScopeId: "global",
    filterLabel: "Geschlecht", itemName: "Geschlecht", itemId: "g1", semanticInstanceKey: "geschlecht",
    identityQuality: "itemId", filterType: "singleSelect", selectionOwner: "singleSelect", hasAlleOption: true,
    condition: null, values: [{ d: "Frau", u: "2" }]
  };
  const fresh = create(descriptor, undefined);
  assert.deepEqual(fresh.currentSelection, { displayValue: "Frau", useValue: "2", displaySource: "cognos" });
  assert.deepEqual(fresh.backupSelection, { displayValue: "Frau", useValue: "2", displaySource: "cognos" });
  assert.deepEqual(fresh.pendingSelection, { displayValue: "Frau" });
  assert.equal(fresh.isCommitInProgress, false);
  assert.equal(fresh.appliedInteractionSeq, 0);
  assert.equal(fresh.status, "active");
  assert.equal(fresh.hostStatus, "present");
  assert.equal("values" in fresh, false);
  assert.equal("normalizedScopeId" in fresh, false);
  const existing = Object.assign({}, fresh, {
    currentSelection: { displayValue: "Weiblich", useValue: "2", displaySource: "table" },
    pendingSelection: { displayValue: "Mann" },
    isCommitInProgress: true,
    appliedInteractionSeq: 4,
    timestamps: { discoveredAt: 5, interactionAt: 6, confirmedAt: 7 }
  });
  const again = create(descriptor, existing);
  assert.equal(again.currentSelection.displayValue, "Weiblich");
  assert.equal(again.currentSelection.displaySource, "table");
  assert.deepEqual(again.pendingSelection, { displayValue: "Mann" });
  assert.equal(again.isCommitInProgress, true);
  assert.equal(again.appliedInteractionSeq, 4);
  assert.equal(again.timestamps.discoveredAt, 5);
  assert.equal(again.timestamps.interactionAt, 6);
  const alle = create(Object.assign({}, descriptor, { values: [] }), undefined);
  assert.deepEqual(alle.currentSelection, { displayValue: "Alle", useValue: "", displaySource: "policy" });
  const delegated = create(Object.assign({}, descriptor, { selectionOwner: "sicht", filterType: "sicht" }), undefined);
  assert.equal(delegated.currentSelection, undefined);
  assert.equal(delegated.selectionOwner, "sicht");
});

test("ensureFilterState: canonical, delegated, missing, rights-forced", () => {
  const ensure = A.ensureFilterState;
  const KDB = { state: { filters: { singleSelect: { instancesById: {
    "g|s=global|i=g1": {
      filterInstanceId: "g|s=global|i=g1", selectionOwner: "singleSelect",
      currentSelection: { displayValue: "Alle", useValue: "" }, backupSelection: { displayValue: "Alle", useValue: "" },
      pendingSelection: { displayValue: "Alle" }, timestamps: {}
    },
    "g|s=global|i=s1": { filterInstanceId: "g|s=global|i=s1", selectionOwner: "sicht" }
  } } } } };
  assert.throws(() => ensure(KDB, {}), /filterInstanceId is required/);
  assert.throws(() => ensure(KDB, { filterInstanceId: "nope" }), /canonical filter instance is missing: nope/);
  const state = ensure(KDB, {
    filterInstanceId: "g|s=global|i=g1", filterLabel: "Geschlecht", filterScope: "global", filterType: "singleSelect",
    hasAlleOption: false, condition: "c1", filterConfig: { displayValue: " Frau ", useValue: " 2 " }
  });
  assert.equal(state.filterKey, "global__Geschlecht");
  assert.equal(state.hasAlleOption, false);
  assert.equal(state.condition, "c1");
  assert.equal(state.hostStatus, "present");
  assert.equal(state.wasHydratedFromRights, true);
  assert.deepEqual(state.currentSelection, { displayValue: "Frau", useValue: "2" });
  assert.deepEqual(state.pendingSelection, { displayValue: "Frau" });
  assert.deepEqual(state.backupSelection, { displayValue: "Frau", useValue: "2" });
  const handoff = {
    filterInstanceId: "g|s=global|i=s1", filterType: "sicht",
    ownerSelectionContext: { currentSelection: { displayValue: "Summe", useValue: "1" } }
  };
  const delegated = ensure(KDB, handoff);
  assert.deepEqual(delegated.currentSelection, { displayValue: "Summe", useValue: "1" });
  assert.deepEqual(delegated.backupSelection, { displayValue: "Summe", useValue: "1" });
  assert.deepEqual(delegated.pendingSelection, { displayValue: "Summe" });
  assert.equal(delegated.isCommitInProgress, false);
  assert.equal(ensure(KDB, handoff), delegated);
});

test("lookupLiveFilterState: live record, delegated state, captured fallback", () => {
  const lookup = A.lookupLiveFilterState;
  const captured = { captured: true };
  const live = { live: true };
  const KDB = { state: { filters: { singleSelect: { instancesById: { a: live, s: { selectionOwner: "sicht" } } } } } };
  assert.equal(lookup(null, {}, captured), captured);
  assert.equal(lookup({ state: {} }, { filterInstanceId: "a" }, captured), captured);
  assert.equal(lookup(KDB, { filterInstanceId: "a" }, captured), live);
  assert.equal(lookup(KDB, { filterInstanceId: "zz" }, captured), captured);
  const working = { working: true };
  assert.equal(lookup(KDB, { filterInstanceId: "s", _delegatedWorkingState: working }, captured), working);
  assert.equal(lookup(KDB, { filterInstanceId: "x", filterType: "sicht" }, captured), captured);
});

function candidate(id, overrides) {
  const descriptor = Object.assign({
    filterInstanceId: id, scopeType: "global", scopeId: "global", normalizedScopeId: "global",
    filterLabel: "L", itemName: "L", itemId: "i", semanticInstanceKey: "l", identityQuality: "itemId",
    filterType: "singleSelect", selectionOwner: "singleSelect", hasAlleOption: false, condition: null, values: []
  }, overrides || {});
  return { descriptor };
}

test("reconcileFilterInstanceState: discovered, updated, removed, collisions", () => {
  const reconcile = A.reconcileInstanceState;
  const existing = {
    "g|s=global|i=a": { filterInstanceId: "g|s=global|i=a", scopeType: "global", scopeId: "global", itemName: "A", filterLabel: "A", status: "active", hostStatus: "present" },
    "g|s=global|i=gone": { filterInstanceId: "g|s=global|i=gone", scopeType: "global", scopeId: "global", itemName: "Gone", status: "active", hostStatus: "present" }
  };
  const diagnostics = [];
  const out = reconcile(existing, [
    candidate("g|s=global|i=a", { itemName: "A", filterLabel: "A" }),
    candidate("g|s=global|i=new", { itemName: "New", filterLabel: "New", itemId: "new" })
  ], diagnostics, {}, false);
  assert.deepEqual(out.discovered, ["g|s=global|i=new"]);
  assert.deepEqual(out.updated, ["g|s=global|i=a"]);
  assert.deepEqual(out.removed, ["g|s=global|i=gone"]);
  assert.equal(out.instancesById["g|s=global|i=gone"].status, "removed");
  assert.equal(out.instancesById["g|s=global|i=gone"].hostStatus, "missing");
  assert.equal(out.instancesById["g|s=global|i=a"].status, "active");
  assert.deepEqual(diagnostics, []);

  const dupDiagnostics = [];
  const dup = reconcile({}, [candidate("same"), candidate("same")], dupDiagnostics, {}, false);
  assert.deepEqual(dup.discovered, []);
  assert.deepEqual(dupDiagnostics.map((d) => d.code), ["SINGLE_SELECT_IDENTITY_COLLISION", "SINGLE_SELECT_IDENTITY_COLLISION"]);

  const fbDiagnostics = [];
  const mounted = {
    "g|s=global|l=Alpha": { filterInstanceId: "g|s=global|l=Alpha", scopeType: "global", scopeId: "global", itemName: "Alpha", filterLabel: "Alpha", status: "active", hostStatus: "present" }
  };
  const enriched = reconcile(mounted, [
    candidate("g|s=global|i=7", { itemName: "Alpha", filterLabel: "Alpha", itemId: "7" })
  ], fbDiagnostics, {}, false);
  assert.deepEqual(Object.keys(enriched.instancesById), ["g|s=global|l=Alpha"]);
  assert.deepEqual(enriched.updated, ["g|s=global|l=Alpha"]);
  assert.deepEqual(fbDiagnostics.map((d) => d.code), ["SINGLE_SELECT_IDENTITY_ENRICHED"]);

  const unprovenDiagnostics = [];
  const unproven = reconcile(mounted, [
    candidate("g|s=global|l=Beta", { itemName: "Beta", filterLabel: "Beta", itemId: null, identityQuality: "labelFallback" })
  ], unprovenDiagnostics, {}, true);
  assert.equal(unproven.instancesById["g|s=global|l=Alpha"].hostStatus, "missing");
  assert.deepEqual(unproven.updated, ["g|s=global|l=Alpha"]);
  assert.deepEqual(unproven.discovered, []);
  assert.deepEqual(unprovenDiagnostics.map((d) => d.code), ["SINGLE_SELECT_HOST_VALUE_READ_FAILED", "SINGLE_SELECT_HOST_VALUE_READ_FAILED"]);
});

test("enumerateFilterInstances: candidates, unknown items, semantic keys", () => {
  const facet = fakeFacet([], { items: [
    GESCHLECHT,
    { itemId: "x9", itemName: "Unbekannt", scopeId: "global", values: [] },
    { itemId: "d1", itemName: "Dienststelle", scopeId: "global", values: [] }
  ] });
  const KDB = makeKDB(facet);
  KDB.runtime.singleSelect = { filtersFacet: facet };
  const out = A.enumerateFilterInstances(KDB);
  assert.deepEqual(out.candidates.map((c) => c.descriptor.filterInstanceId), ["g|s=global|i=g1"]);
  assert.equal(out.candidates[0].descriptor.semanticInstanceKey, "geschlecht");
  assert.deepEqual(out.diagnostics.map((d) => d.code), ["SINGLE_SELECT_HOST_ITEM_UNKNOWN"]);
  assert.equal(out.uniquenessUnproven, false);
  assert.equal(out.rawFallbackCounts["global|global|Geschlecht"], 1);
  facet.listFilterItems = () => ({ ok: false });
  assert.throws(() => A.enumerateFilterInstances(KDB), /inventory methods unavailable \(global\)/);
});

test("waitForFilterInventory: retries, abort, timeout code", async () => {
  const KDB = { runtime: { singleSelect: { timers: {} } } };
  let calls = 0;
  const flaky = () => {
    calls += 1;
    if (calls < 3) { throw new Error("not ready " + calls); }
    return { ready: true };
  };
  assert.deepEqual(await A.waitForFilterInventory(KDB, flaky, 2000), { ready: true });
  assert.equal(calls, 3);
  assert.equal(Object.keys(KDB.runtime.singleSelect.timers).length, 0);

  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() => A.waitForFilterInventory(KDB, () => ({}), 2000, controller.signal), /reconcile aborted/);

  const later = new AbortController();
  setTimeout(() => later.abort(), 30);
  await assert.rejects(() => A.waitForFilterInventory(KDB, () => { throw new Error("no"); }, 2000, later.signal), /reconcile aborted/);

  await assert.rejects(
    () => A.waitForFilterInventory(KDB, () => { throw new Error("host down"); }, 120),
    (error) => error.code === "SINGLE_SELECT_RECONCILE_TIMEOUT" &&
      error.message === "singleSelect filter inventory readiness timed out: host down"
  );
  await assert.rejects(
    () => A.waitForFilterInventory(KDB, () => { throw new Error("x"); }, 20000, AbortSignal.abort()),
    /reconcile aborted/
  );
});

test("waitForFilterInventory: concurrent waits do not cancel each other and leave no listeners", async () => {
  const KDB = { runtime: { singleSelect: { timers: {}, abortControllers: {} } } };
  const makeEnumerate = (name) => {
    let calls = 0;
    return () => {
      calls += 1;
      if (calls < 4) { throw new Error(name + " not ready"); }
      return { name };
    };
  };
  const controller = new AbortController();
  const [first, second] = await Promise.all([
    A.waitForFilterInventory(KDB, makeEnumerate("a"), 2000, controller.signal),
    A.waitForFilterInventory(KDB, makeEnumerate("b"), 2000, controller.signal)
  ]);
  assert.deepEqual([first.name, second.name], ["a", "b"]);
  assert.equal("inventoryRetry" in KDB.runtime.singleSelect.timers, false);
  assert.equal(getEventListeners(controller.signal, "abort").length, 0);
});

test("notifyInventoryReconciledOwners: policy flags, acks, dedupe, failures", async () => {
  const notify = A.notifyOwners;
  const received = [];
  const KDB = { api: {
    sicht: { dispatch: async (a) => { received.push(["sicht", a]); return { ok: true, acknowledged: true }; } },
    specialSingleSelect: { dispatch: async (a) => { received.push(["special", a]); return { ok: false, message: "no" }; } }
  } };
  const runtime = {};
  const result = await notify(KDB, runtime, { inventoryGeneration: 3, reason: "mount", timestamp: 9 });
  assert.equal(result.notified, true);
  assert.deepEqual(received.map((r) => r[0]), ["sicht", "special"]);
  assert.equal(received[0][1].type, "sicht/singleSelectInventoryReconciled");
  assert.equal(received[1][1].type, "specialSingleSelect/singleSelectInventoryReconciled");
  assert.deepEqual(received[0][1].payload, {
    inventoryGeneration: 3, source: "singleSelect", reason: "mount", timestamp: 9, allowStartupDefault: true, allowSpecialPolicy: true
  });
  assert.deepEqual(result.diagnostics.map((d) => [d.code, d.owner]), [["SINGLE_SELECT_INVENTORY_OWNER_REJECTED", "specialSingleSelect"]]);
  assert.deepEqual(Object.keys(runtime.inventoryOwnerNotifications.sicht), ["3"]);
  assert.deepEqual(runtime.inventoryOwnerNotifications.specialSingleSelect, {});
  received.length = 0;
  await notify(KDB, runtime, { inventoryGeneration: 3, reason: "tabMutation" });
  assert.deepEqual(received.map((r) => r[0]), ["special"]);
  assert.equal(received[0][1].payload.allowStartupDefault, false);
  assert.equal(received[0][1].payload.allowSpecialPolicy, true);
  assert.deepEqual(await notify(KDB, runtime, { inventoryGeneration: 4, reason: "historyReplay" }), { notified: false, diagnostics: [] });
  const invalid = await notify(KDB, runtime, { inventoryGeneration: "x", reason: "mount" });
  assert.equal(invalid.notified, false);
  assert.equal(invalid.diagnostics[0].code, "SINGLE_SELECT_RECONCILE_FAILED");
  const missing = await notify({ api: {} }, {}, { inventoryGeneration: 1, reason: "filtersReady" });
  assert.deepEqual(missing.diagnostics.map((d) => d.code), ["SINGLE_SELECT_INVENTORY_OWNER_API_MISSING", "SINGLE_SELECT_INVENTORY_OWNER_API_MISSING"]);
  const stale = await notify(KDB, {}, { inventoryGeneration: 5, reason: "mount", isCurrent: () => false });
  assert.deepEqual(stale, { notified: false, diagnostics: [] });
  const controller = new AbortController();
  controller.abort();
  const aborted = await notify(
    { api: { sicht: { dispatch: () => new Promise(() => {}) } } }, {},
    { inventoryGeneration: 6, reason: "mount", signal: controller.signal }
  );
  assert.equal(aborted.diagnostics[0].code, "SINGLE_SELECT_INVENTORY_OWNER_DISPATCH_FAILED");
  assert.equal(aborted.diagnostics[0].details.reason, "aborted");
  assert.equal(aborted.diagnostics[1].code, "SINGLE_SELECT_INVENTORY_OWNER_API_MISSING");
  const disposed = await notify(
    { api: { sicht: { dispatch: async () => ({ ok: false, disposed: true }) } } }, {},
    { inventoryGeneration: 7, reason: "mount" }
  );
  assert.equal(disposed.diagnostics[0].code, "SINGLE_SELECT_INVENTORY_OWNER_DISPOSED");
});

test("mapFilterDockHandoff and deriveInteractionIntent", () => {
  const map = A.mapHandoff;
  assert.equal(map(null), null);
  const mapped = map({
    filterLabel: "Geschlecht", scopeType: "global", filterType: "singleSelect", interactionType: "confirm", operationId: 5,
    capabilities: { hasAlleOption: true, condition: "c" }, popup: { isVisible: true },
    ownerSelectionContext: { currentSelection: { displayValue: "A" } }, timestamp: 11
  });
  assert.equal(mapped.filterKey, "global__Geschlecht");
  assert.equal(mapped.clickedOk, true);
  assert.equal(mapped.clickedCancel, false);
  assert.equal(mapped.hasAlleOption, true);
  assert.equal(mapped.condition, "c");
  assert.equal(mapped.operationId, "5");
  assert.equal(mapped.filterScope, "global");
  assert.equal(mapped.skipHistory, false);
  assert.equal(mapped.timestamp, 11);
  assert.deepEqual(mapped.ownerSelectionContext, {
    currentSelection: { displayValue: "A" }, backupSelection: null, pendingSelection: null
  });
  const derive = A.deriveIntent;
  assert.deepEqual(derive(null), { type: "unknown", optionLabel: null });
  assert.deepEqual(derive({ interactionType: "option", optionLabel: "Frau" }), { type: "option", optionLabel: "Frau" });
  assert.deepEqual(derive({ interactionType: "bogus" }), { type: "unknown", optionLabel: null });
  assert.deepEqual(derive({ interactionType: "open", isAlleOption: true }), { type: "alle", optionLabel: "Alle" });
  assert.deepEqual(derive({ clickedOk: true }), { type: "confirm", optionLabel: null });
  assert.deepEqual(derive({ clickedClose: true }), { type: "close", optionLabel: null });
  assert.deepEqual(derive({ optionLabel: "x" }), { type: "open", optionLabel: "x" });
});

test("pending selection helpers", () => {
  const apply = A.applyPendingSelection;
  const revert = A.revertToBackupSelection;
  const state = { pendingSelection: { displayValue: "Frau" }, backupSelection: { displayValue: "Mann", useValue: "1" } };
  apply({ hasAlleOption: true }, state, { type: "alle" });
  assert.deepEqual(state.pendingSelection, { displayValue: "Alle" });
  apply({ hasAlleOption: false }, state, { type: "clear" });
  assert.deepEqual(state.pendingSelection, { displayValue: "Alle" });
  apply({ hasAlleOption: false }, state, { type: "option", optionLabel: " Frau " });
  assert.deepEqual(state.pendingSelection, { displayValue: "Frau" });
  apply({ hasAlleOption: true }, state, { type: "option", optionLabel: "Frau" });
  assert.deepEqual(state.pendingSelection, { displayValue: "Alle" });
  apply({ optionLabel: " Mann " }, state, { type: "option", optionLabel: "" });
  assert.deepEqual(state.pendingSelection, { displayValue: "Mann" });
  const before = state.pendingSelection;
  apply({}, state, { type: "option", optionLabel: "" });
  assert.equal(state.pendingSelection, before);
  assert.equal(logged.some((entry) => entry[0] === "warn" && String(entry[1]).indexOf("missing optionLabel") >= 0), true);
  assert.equal(revert(state), "Mann");
  assert.deepEqual(state.pendingSelection, { displayValue: "Mann" });
  assert.equal(revert(null), "Alle");
});

test("history step values: normalize and sameInstance", () => {
  const sv = A.stepValue;
  const base = { filterInstanceId: "g|s=global|i=g1", scopeType: "global", scopeId: "global", itemId: "g1", semanticInstanceKey: "geschlecht", filterLabel: "Geschlecht" };
  const fresh = sv.normalize(Object.assign({}, base, { displayValue: "Frau", useValue: "2", displaySource: "cognos" }));
  assert.deepEqual(fresh, {
    invalid: false, isLegacy: false, filterInstanceId: "g|s=global|i=g1", scopeType: "global", scopeId: "global", scopeHint: null,
    itemId: "g1", semanticInstanceKey: "geschlecht", filterLabel: "Geschlecht", displayValue: "Frau", useValue: "2", displaySource: "cognos"
  });
  assert.equal(sv.normalize(Object.assign({}, base, { displayValue: "Frau", displaySource: "bogus" })).invalid, true);
  assert.equal(sv.normalize(Object.assign({}, base, { displayValue: null, displaySource: "cognos" })).invalid, true);
  assert.equal(sv.normalize(Object.assign({}, base, { displayValue: null, useValue: "9", displaySource: "unavailable" })).displayValue, null);
  assert.equal(sv.normalize(Object.assign({}, base, { itemId: null, semanticInstanceKey: null, displaySource: "cognos" })).invalid, true);
  const legacy = sv.normalize({ filterLabel: "Geschlecht", filterScope: "global", itemId: "g1", displayValue: "Frau", useValue: "2" });
  assert.deepEqual(legacy, {
    invalid: false, isLegacy: true, filterInstanceId: null, scopeType: "global", scopeId: null, scopeHint: "global",
    itemId: "g1", semanticInstanceKey: null, filterLabel: "Geschlecht", displayValue: "Frau", useValue: "2", displaySource: "cognos"
  });
  assert.equal(sv.normalize({ filterLabel: "x" }).invalid, true);
  assert.equal(sv.normalize(null).invalid, true);
  const other = sv.normalize(Object.assign({}, base, { displayValue: "Mann", useValue: "1", displaySource: "cognos" }));
  assert.equal(sv.sameInstance(fresh, other), true);
  assert.equal(sv.sameInstance(fresh, Object.assign({}, other, { filterInstanceId: "other" })), false);
  assert.equal(sv.sameInstance(fresh, Object.assign({}, other, { itemId: "zz" })), false);
  assert.equal(sv.sameInstance(fresh, legacy), false);
  assert.equal(sv.sameInstance(fresh, { invalid: true }), false);
});

test("reducer, selectors and register facade", async () => {
  const reduce = A.reducer.create();
  const initial = A.reducer.initialState();
  assert.deepEqual(Object.keys(initial), [
    "lifecycle", "inventory", "instancesById", "meta", "lastInteraction", "lastConfirmedAt", "lastDiagnostics", "errorCode", "errorMessage"
  ]);
  assert.equal(reduce(undefined, { type: "singleSelect/mountSucceeded" }).lifecycle, "ready");
  assert.deepEqual(
    [reduce(initial, { type: "singleSelect/error", payload: {} }).errorCode, reduce(initial, { type: "singleSelect/error", payload: { errorCode: "E", errorMessage: "m" } }).errorMessage],
    ["SINGLE_SELECT_ERROR", "m"]
  );
  const destroyed = reduce(Object.assign({}, initial, { lastInteraction: { x: 1 } }), { type: "singleSelect/destroy" });
  assert.equal(destroyed.lifecycle, "disposed");
  assert.equal(destroyed.lastInteraction, null);
  assert.equal(reduce(initial, { type: "other" }), initial);

  const names = Object.keys(A.selectors).sort();
  assert.deepEqual(names, [
    "readCurrentSelection", "readFilterInstance", "readFilterInstances", "readFilterInstancesByScope",
    "readInventoryGeneration", "readPendingSelection", "readSingleSelectFilterState", "readSingleSelectState"
  ]);

  const facet = fakeFacet([GESCHLECHT.values[0]], { items: [GESCHLECHT, SICHT] });
  const KDB = makeKDB(facet);
  const api = A.register(KDB, {});
  assert.deepEqual(Object.keys(api).sort(), ["destroy", "dispatch", "getState", "mount"]);
  assert.equal(KDB.api.singleSelect, api);
  assert.equal(typeof KDB.elements.selectors.singleSelect.filterDockRootSelector, "string");
  assert.equal(KDB.runtime.singleSelect.filtersFacet, facet);
  assert.equal(typeof KDB.runtime.singleSelect.historyReplayHandlerContribution.apply, "function");
  assert.equal(KDB.state.filters.singleSelect.lifecycle, "idle");
  assert.equal(api.getState().lifecycle, "idle");
  assert.equal(api.dispatch({ type: "unknown/thing" }).lifecycle, "idle");
  assert.equal(api.dispatch(undefined).lifecycle, "idle");
  const errorState = api.dispatch({ type: "singleSelect/error", payload: { errorCode: "X" } });
  assert.equal(errorState.lifecycle, "error");
  assert.equal(errorState.errorCode, "X");
  assert.equal(api.mount({}), true);
  const reconciled = await api.dispatch({ type: "singleSelect/reconcileFilterInstances", payload: { reason: "mount" } });
  assert.equal(reconciled.ok, true);
  const state = api.getState();
  assert.equal(state.lifecycle, "ready");
  assert.deepEqual(Object.keys(state.instancesById).sort(), ["g|s=global|i=g1", "g|s=global|i=s1"]);
  assert.deepEqual(Object.keys(state.byScope.global), ["Geschlecht"]);
  assert.equal(A.selectors.readFilterInstance(KDB, "g|s=global|i=g1").displayValue, "Frau");
  assert.equal(A.selectors.readFilterInstances(KDB, { scopeType: "global" }).length, 2);
  assert.equal(A.selectors.readInventoryGeneration(KDB) >= 1, true);
  assert.equal(A.selectors.readInventoryGeneration({}), null);
  api.destroy();
  assert.equal(api.getState(), undefined);
  assert.equal(KDB.runtime.singleSelect.historyReplayHandlerContribution, null);
  assert.equal(KDB.runtime.singleSelect.filtersFacet, null);
  assert.equal(KDB.state.filters.singleSelect.lifecycle, "disposed");
  assert.equal(api.mount({}), false);
  assert.equal(api.dispatch({ type: "singleSelect/filterDockStateChanged" }), undefined);
  const disposedPs = await api.dispatch({ type: "singleSelect/parameterSetRunFinished", payload: { runId: 4 } });
  assert.deepEqual(disposedPs, {
    ok: false, runId: 4, released: false, alreadyReleased: false,
    diagnostics: [{ code: "WRITEBACK_RESTORE_CANCELLED", message: "singleSelect controller is disposed" }]
  });
  const disposedClear = await api.dispatch({ type: "singleSelect/applyOwnerSelection", payload: {} });
  assert.deepEqual(disposedClear, {
    ok: false, degraded: false, applied: [], skipped: [],
    diagnostics: [{ code: "WRITEBACK_RESTORE_CANCELLED", message: "singleSelect controller is disposed" }]
  });
  assert.equal(api.dispatch({ type: "singleSelect/resyncTabMutationHost", payload: {} }), undefined);
  api.destroy();
});

test("dockHandoff: validation failures, special deferral, unresolved instance", async () => {
  const facet = fakeFacet([GESCHLECHT.values[0]], { items: [GESCHLECHT] });
  const { KDB, rt } = await bootReconciled(facet);
  const root = KDB.state.filters.singleSelect;
  const bad = await A.processFilterDockHandoff(KDB, rt, { filterLabel: "x", filterType: "bogus" }, "singleSelect/filterDockStateChanged", {});
  assert.deepEqual(bad, {
    ok: false, code: "SINGLE_SELECT_INSTANCE_NOT_FOUND", filterInstanceId: null,
    message: "filterDock handoff mapping returned an unsupported filter type"
  });
  assert.equal(root.lastDiagnostics[root.lastDiagnostics.length - 1].code, "SINGLE_SELECT_INSTANCE_NOT_FOUND");
  const deferred = await A.processFilterDockHandoff(KDB, rt, {
    filterLabel: "Dienstgrad", filterType: "specialSingleSelect", scopeType: "global", capabilities: { condition: "Personengruppe" }
  }, "singleSelect/filterDockStateChanged", {});
  assert.deepEqual(deferred, { ok: true, deferred: true });
  const unresolved = await A.processFilterDockHandoff(KDB, rt, {
    filterLabel: "Unknown", filterType: "singleSelect", scopeType: "global", interactionType: "open"
  }, "singleSelect/filterDockStateChanged", {});
  assert.deepEqual(unresolved, {
    ok: false, code: "SINGLE_SELECT_INSTANCE_NOT_FOUND", message: "no live filter instance matched interaction hints"
  });
  const noTab = await A.processFilterDockHandoff(KDB, rt, {
    filterLabel: "Geschlecht", filterType: "singleSelect", scopeType: "pageContext", interactionType: "open"
  }, "singleSelect/filterDockStateChanged", {});
  assert.deepEqual(noTab, {
    ok: false, code: "SINGLE_SELECT_SCOPE_TARGET_UNVERIFIED", message: "missing tabId hint for page-context filter"
  });
  const special = await A.processFilterDockHandoff(KDB, rt, {
    filterLabel: "Geschlecht", filterType: "specialSingleSelect", scopeType: "global", interactionType: "open"
  }, "singleSelect/filterDockStateChanged", {});
  assert.deepEqual(special, {
    ok: false, code: "SINGLE_SELECT_INSTANCE_NOT_FOUND", message: "special interaction is missing owner authorization or semantic id"
  });
});

test("dockHandoff + commit: clear then confirm writes Alle, records history and owner state", async () => {
  const facet = fakeFacet([GESCHLECHT.values[0]], { items: [GESCHLECHT] });
  const { KDB, rt } = await bootReconciled(facet);
  const root = KDB.state.filters.singleSelect;
  const id = "g|s=global|i=g1";
  const handoff = (interactionType, extra) => Object.assign({
    filterLabel: "Geschlecht", filterType: "singleSelect", scopeType: "global", interactionType,
    capabilities: { hasAlleOption: true }, popup: { isVisible: false }
  }, extra || {});
  const clearResult = await A.processFilterDockHandoff(KDB, rt, handoff("clear"), "singleSelect/filterDockStateChanged", {});
  assert.deepEqual(clearResult, { ok: true });
  assert.deepEqual(root.instancesById[id].pendingSelection, { displayValue: "Alle" });
  assert.equal(root.lastInteraction.filterInstanceId, id);
  assert.equal(root.lastInteraction.interactionType, "clear");
  assert.equal(root.instancesById[id].appliedInteractionSeq, 1);
  assert.equal(facet.writes.length, 0);
  const closed = [];
  const confirmResult = await A.processFilterDockHandoff(
    KDB, rt, handoff("confirm"), "singleSelect/filterDockStateChanged", { closePopup: () => closed.push(true) }
  );
  assert.deepEqual(confirmResult, { ok: true });
  assert.deepEqual(facet.writes, [[]]);
  const record = root.instancesById[id];
  assert.deepEqual(record.currentSelection, { displayValue: "Alle", useValue: "", displaySource: "policy" });
  assert.deepEqual(record.backupSelection, { displayValue: "Alle", useValue: "", displaySource: "policy" });
  assert.equal(record.isCommitInProgress, false);
  assert.equal(root.errorCode, null);
  assert.deepEqual(rt.inFlight, {});
  assert.deepEqual(closed, [true]);
  assert.equal(KDB.pushed.length, 1);
  const step = KDB.pushed[0];
  assert.equal(step.key, "filter_singleSelect");
  assert.deepEqual(step.old, {
    filterInstanceId: id, scopeType: "global", scopeId: "global", itemId: "g1", semanticInstanceKey: "geschlecht",
    filterLabel: "Geschlecht", displayValue: "Frau", useValue: "2", displaySource: "cognos"
  });
  assert.equal(step.new.displayValue, "Alle");
  assert.equal(step.new.displaySource, "policy");
  assert.equal(step.new.useValue, "");
  assert.equal(logged.filter((e) => e[0] === "error" && String(e[1]).indexOf("commit failed") >= 0).length, 0);
});

test("commit: write failure restores the previous selection and flags the owner state", async () => {
  const facet = fakeFacet([GESCHLECHT.values[0]], { items: [GESCHLECHT] });
  const { KDB, rt } = await bootReconciled(facet);
  const root = KDB.state.filters.singleSelect;
  const id = "g|s=global|i=g1";
  facet.writeFilter = async function (req) {
    facet.writes.push(req.values.slice());
    return { ok: facet.writes.length > 1 };
  };
  const state = root.instancesById[id];
  state.pendingSelection = { displayValue: "Alle" };
  const outcome = await A.processFilterDockHandoff(KDB, rt, {
    filterLabel: "Geschlecht", filterType: "singleSelect", scopeType: "global", interactionType: "confirm", capabilities: { hasAlleOption: true }
  }, "singleSelect/filterDockStateChanged", {});
  assert.deepEqual(outcome, { ok: true });
  assert.equal(root.errorCode, "SINGLE_SELECT_HOST_WRITE_FAILED");
  assert.equal(root.errorMessage, "filter host writer unavailable");
  assert.deepEqual(state.currentSelection, { displayValue: "Frau", useValue: "2", displaySource: "cognos" });
  assert.deepEqual(state.pendingSelection, { displayValue: "Frau" });
  assert.equal(state.isCommitInProgress, false);
  assert.equal(KDB.pushed.length, 0);
  assert.deepEqual(facet.writes, [[], [{ d: "Frau", u: "2" }]]);
});

test("applyOwnerSelection (delegated sicht): validation, write, notify, idempotent operation id", async () => {
  const facet = fakeFacet([SICHT.values[0]], { items: [GESCHLECHT, SICHT] });
  const sichtCalls = [];
  const { KDB, api } = await bootReconciled(facet);
  KDB.api.sicht = { dispatch: async (action) => { sichtCalls.push(action); return { ok: true }; } };
  const id = "g|s=global|i=s1";
  const invalid = await api.dispatch({ type: "singleSelect/applyOwnerSelection", payload: { filterInstanceId: id } });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.diagnostics[0].code, "SINGLE_SELECT_OWNER_SELECTION_INVALID");
  const payload = {
    filterInstanceId: id, operationId: "op1", notifyOwner: "sicht", skipHistory: true,
    selection: { displayValue: "Jahr", useValue: "3" }
  };
  const first = await api.dispatch({ type: "singleSelect/applyOwnerSelection", payload: payload });
  assert.deepEqual(first, { ok: true, degraded: false, applied: [{ filterInstanceId: id, ok: true, degraded: false }], diagnostics: [] });
  assert.deepEqual(facet.writes, [[{ d: "Jahr", u: "3" }]]);
  assert.equal(sichtCalls.length, 1);
  assert.equal(sichtCalls[0].type, "sicht/singleSelectCommitted");
  assert.equal(sichtCalls[0].payload.selection.displayValue, "Jahr");
  assert.equal(sichtCalls[0].payload.source, "parameterRestore");
  const replay = await api.dispatch({ type: "singleSelect/applyOwnerSelection", payload: payload });
  assert.equal(replay.ok, true);
  assert.equal(facet.writes.length, 1);
  const reused = await api.dispatch({ type: "singleSelect/applyOwnerSelection", payload: Object.assign({}, payload, { filterInstanceId: "g|s=global|i=g1" }) });
  assert.equal(reused.diagnostics[0].message, "operationId was reused for another filter instance");
  const missing = await api.dispatch({ type: "singleSelect/applyOwnerSelection", payload: Object.assign({}, payload, { operationId: "op2", filterInstanceId: "g|s=global|i=g1" }) });
  assert.equal(missing.diagnostics[0].code, "SINGLE_SELECT_INSTANCE_NOT_FOUND");
  KDB.api.sicht = { dispatch: async () => ({ ok: false }) };
  const rejected = await api.dispatch({ type: "singleSelect/applyOwnerSelection", payload: Object.assign({}, payload, { operationId: "op3", selection: { displayValue: "Quartal", useValue: "4" } }) });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.diagnostics[0].code, "SINGLE_SELECT_OWNER_SELECTION_INVALID");
  assert.equal(rejected.degraded, false);
  assert.deepEqual(facet.stored, [{ d: "Jahr", u: "3" }]);
  for (let index = 0; index < 105; index += 1) {
    KDB.api.sicht = { dispatch: async () => ({ ok: true }) };
    await api.dispatch({ type: "singleSelect/applyOwnerSelection", payload: Object.assign({}, payload, { operationId: "w" + index }) });
  }
  assert.equal(Object.keys(KDB.runtime.singleSelect.delegatedOperationIds).length, 100);
});

test("applySpecialSelectionPolicy: validation, apply, clear, mismatch", async () => {
  const special = { itemId: "p1", itemName: "Personengruppe", scopeId: "global", values: [{ d: "Alle", u: "" }] };
  const facet = fakeFacet([], { items: [special] });
  const { KDB, api } = await bootReconciled(facet, {
    properties: {
      kennzahlenTablesPropObj: { personal: {} },
      filterPropObj: { personal: { filterInstances: {
        i1: { scopeType: "global", itemName: "Personengruppe", itemId: "p1", filterLabel: "Personengruppe", instanceKey: "pg", condition: "personengruppe" }
      } } }
    }
  });
  const id = "g|s=global|i=p1";
  assert.equal(KDB.state.filters.singleSelect.instancesById[id].filterType, "specialSingleSelect");
  const base = { semanticSpecialFilterId: "Personengruppe", source: "specialSingleSelect", skipHistory: true, filterInstanceIds: [id, id] };
  const bad = await api.dispatch({ type: "singleSelect/applySpecialSelectionPolicy", payload: { semanticSpecialFilterId: "x" } });
  assert.deepEqual(bad, {
    ok: false, degraded: false, applied: [],
    diagnostics: [{ code: "SPECIAL_SINGLE_SELECT_POLICY_APPLY_FAILED", message: "semanticSpecialFilterId and a supported operation are required" }]
  });
  const applied = await api.dispatch({
    type: "singleSelect/applySpecialSelectionPolicy",
    payload: Object.assign({ operation: "applyDefault", selection: { displayValue: "Alle Gruppen", useValue: "7" } }, base)
  });
  assert.deepEqual(applied, { ok: true, degraded: false, applied: [{ filterInstanceId: id, ok: true, degraded: false }], diagnostics: [] });
  assert.deepEqual(facet.stored, [{ d: "Alle Gruppen", u: "7" }]);
  const record = KDB.state.filters.singleSelect.instancesById[id];
  assert.deepEqual(record.currentSelection, { displayValue: "Alle Gruppen", useValue: "7", displaySource: "cognos" });
  const cleared = await api.dispatch({ type: "singleSelect/applySpecialSelectionPolicy", payload: Object.assign({ operation: "clearHidden" }, base) });
  assert.equal(cleared.ok, true);
  assert.deepEqual(facet.stored, []);
  assert.deepEqual(record.currentSelection, { displayValue: "Alle", useValue: "", displaySource: "policy" });
  const missing = await api.dispatch({
    type: "singleSelect/applySpecialSelectionPolicy",
    payload: Object.assign({ operation: "clearHidden" }, base, { filterInstanceIds: ["nope"] })
  });
  assert.deepEqual(missing.applied, [{ filterInstanceId: "nope", ok: false, degraded: false, errorCode: "SPECIAL_SINGLE_SELECT_INSTANCE_MISSING" }]);
  assert.equal(missing.degraded, true);
  facet.writeFilter = async function (req) {
    facet.writes.push(req.values.slice());
    if (facet.writes.length % 2 === 1) { facet.stored = [{ d: "Anders", u: "9" }]; } else { facet.stored = req.values.slice(); }
    return { ok: true };
  };
  const mismatch = await api.dispatch({
    type: "singleSelect/applySpecialSelectionPolicy",
    payload: Object.assign({ operation: "applyDefault", selection: { displayValue: "Alle Gruppen", useValue: "7" } }, base)
  });
  assert.deepEqual(mismatch.applied, [{ filterInstanceId: id, ok: false, degraded: false, errorCode: "SINGLE_SELECT_COMMIT_VERIFICATION_MISMATCH" }]);
  assert.deepEqual(facet.stored, []);
  facet.writeFilter = async () => ({ ok: false });
  const failedWrite = await api.dispatch({
    type: "singleSelect/applySpecialSelectionPolicy",
    payload: Object.assign({ operation: "clearHidden" }, base)
  });
  assert.equal(failedWrite.applied[0].errorCode, "SPECIAL_SINGLE_SELECT_POLICY_APPLY_FAILED");
});

test("applySpecialSelectionPolicy: unverifiable rollback maps to COMMIT_VERIFICATION_MISMATCH and logs", async () => {
  const special = { itemId: "p1", itemName: "Personengruppe", scopeId: "global", values: [{ d: "Alle", u: "" }] };
  const facet = fakeFacet([], { items: [special] });
  const { KDB, api } = await bootReconciled(facet, {
    properties: {
      kennzahlenTablesPropObj: { personal: {} },
      filterPropObj: { personal: { filterInstances: {
        i1: { scopeType: "global", itemName: "Personengruppe", itemId: "p1", filterLabel: "Personengruppe", instanceKey: "pg", condition: "personengruppe" }
      } } }
    }
  });
  const id = "g|s=global|i=p1";
  const payload = {
    semanticSpecialFilterId: "Personengruppe", source: "specialSingleSelect", skipHistory: true, filterInstanceIds: [id],
    operation: "applyDefault", selection: { displayValue: "Alle Gruppen", useValue: "7" }
  };
  const expected = [{ filterInstanceId: id, ok: false, degraded: false, errorCode: "SINGLE_SELECT_COMMIT_VERIFICATION_MISMATCH" }];
  const rollbackModes = {
    "rollback write throws": async () => { throw new Error("rollback boom"); },
    "rollback write returns false": async () => ({ ok: false }),
    "rollback write succeeds but host still differs": async () => {
      facet.stored = [{ d: "Anders", u: "9" }];
      return { ok: true };
    }
  };
  for (const [label, rollback] of Object.entries(rollbackModes)) {
    facet.stored = [];
    facet.writes.length = 0;
    logged.length = 0;
    facet.writeFilter = async function (req) {
      facet.writes.push(req.values.slice());
      if (facet.writes.length === 1) {
        facet.stored = [{ d: "Anders", u: "9" }];
        return { ok: true };
      }
      return rollback(req);
    };
    const result = await api.dispatch({ type: "singleSelect/applySpecialSelectionPolicy", payload });
    assert.deepEqual(result.applied, expected, label);
    assert.equal(result.ok, false, label);
    assert.equal(facet.writes.length, 2, label);
    assert.ok(
      logged.some((entry) => entry[0] === "error" && /rollback could not be verified/.test(String(entry[1]))),
      label + ": rollback failure is logged"
    );
    assert.equal(KDB.state.filters.singleSelect.instancesById[id].currentSelection.useValue, "", label);
  }
});

test("history: contribution handler, step building, push rules and replay", async () => {
  const facet = fakeFacet([GESCHLECHT.values[0]], { items: [GESCHLECHT] });
  const { KDB, rt } = await bootReconciled(facet);
  const root = KDB.state.filters.singleSelect;
  const id = "g|s=global|i=g1";
  const handler = rt.historyReplayHandlerContribution;
  assert.equal(handler.apply(KDB, {}, { key: "other" }, {}), false);
  assert.equal(handler.apply(KDB, {}, undefined, {}), false);
  const side = (display, use, source) => ({
    filterInstanceId: id, scopeType: "global", scopeId: "global", itemId: "g1", semanticInstanceKey: "geschlecht",
    filterLabel: "Geschlecht", displayValue: display, useValue: use, displaySource: source
  });
  const step = { key: "filter_singleSelect", old: side("Mann", "1", "cognos"), new: side("Frau", "2", "cognos") };
  assert.equal(await handler.apply(KDB, { filterInstanceId: "bad" }, step, { direction: "undo" }), false);
  assert.equal(root.errorCode, "HISTORY_STEP_INVALID");
  assert.equal(root.lastDiagnostics[root.lastDiagnostics.length - 1].message, "history step failed identity/shape validation");
  const mismatched = { key: "filter_singleSelect", old: side("Mann", "1", "cognos"), new: Object.assign(side("Frau", "2", "cognos"), { filterInstanceId: "g|s=global|i=zz" }) };
  assert.equal(await handler.apply(KDB, mismatched.old, mismatched, { direction: "undo" }), false);
  assert.equal(root.lastDiagnostics[root.lastDiagnostics.length - 1].message, "old/new step values reference different instances");
  assert.equal(await handler.apply(KDB, step.old, step, { direction: "undo" }), true);
  assert.deepEqual(facet.stored, [{ d: "Mann", u: "1" }]);
  assert.deepEqual(root.instancesById[id].currentSelection, { displayValue: "Mann", useValue: "1", displaySource: "cognos" });
  assert.equal(root.errorCode, null);
  facet.writeFilter = async () => ({ ok: false });
  assert.equal(await handler.apply(KDB, step.new, step, { direction: "redo" }), false);
  assert.equal(root.errorCode, "SINGLE_SELECT_HISTORY_REPLAY_FAILED");
  assert.equal(root.lastDiagnostics.some((d) => d.message === "replay apply failed"), true);
  const alleStep = { key: "filter_singleSelect", old: side("Alle", "", "policy"), new: side("Frau", "2", "cognos") };
  facet.writeFilter = async (req) => { facet.writes.push(req.values.slice()); facet.stored = req.values.slice(); return { ok: true }; };
  assert.equal(await handler.apply(KDB, alleStep.old, alleStep, { direction: "undo" }), true);
  assert.deepEqual(facet.stored, []);
  KDB.api.specialSingleSelect = {
    getState: () => ({ byFilterId: { f1: { filterLabel: "Geschlecht", isVisible: true } } }),
    dispatch: async () => ({ ok: false })
  };
  assert.equal(await handler.apply(KDB, step.new, step, { direction: "redo" }), false);
  assert.equal(root.errorCode, "SINGLE_SELECT_HISTORY_OWNER_NOTIFY_FAILED");
  assert.deepEqual(facet.stored, []);
  assert.deepEqual(root.instancesById[id].currentSelection, { displayValue: "Alle", useValue: "", displaySource: "policy" });

  const built = A.buildCommittedStep(KDB, { filterInstanceId: id }, { displayValue: "Frau", useValue: "2" }, { displayValue: "Mann", useValue: "1", displaySource: "table" });
  assert.equal(built.key, "filter_singleSelect");
  assert.equal(built.old.displaySource, "cognos");
  assert.equal(built.new.displaySource, "table");
  assert.equal(A.buildCommittedStep(KDB, { filterInstanceId: "nope" }, {}, {}), null);
  const push = A.pushGenericHistory;
  KDB.pushed.length = 0;
  push(KDB, { filterInstanceId: id, filterType: "sicht" }, {}, {});
  push(KDB, { filterInstanceId: id, skipHistory: true }, {}, {});
  push(KDB, null, {}, {});
  push(KDB, { filterInstanceId: "nope" }, {}, {});
  assert.equal(KDB.pushed.length, 0);
  push(KDB, { filterInstanceId: id }, { displayValue: "Frau", useValue: "2" }, { displayValue: "Mann", useValue: "1" });
  assert.equal(KDB.pushed.length, 1);
});

function fakeNode(opts) {
  const o = opts || {};
  const classes = new Set(o.classes || []);
  const attrs = Object.assign({}, o.attrs || {});
  return {
    textContent: o.text || "",
    classes,
    attrs,
    classList: {
      add(c) { classes.add(c); },
      remove(c) { classes.delete(c); },
      contains(c) { return classes.has(c); },
      toggle(c, on) {
        const want = on === undefined ? !classes.has(c) : !!on;
        if (want) { classes.add(c); } else { classes.delete(c); }
        return want;
      }
    },
    getAttribute(key) { return key in attrs ? attrs[key] : null; },
    setAttribute(key, value) { attrs[key] = String(value); },
    querySelector: o.querySelector || (() => null),
    querySelectorAll: o.querySelectorAll || (() => []),
    closest: o.closest || (() => null)
  };
}

class Catcher extends EventTarget {}

function popupFixture() {
  const options = ["Frau", "Mann"].map((label) => {
    const labelNode = fakeNode({ attrs: { "aria-label": label }, text: label });
    return fakeNode({ querySelector: (sel) => (sel === ".ba-common-truncatedText__text" ? labelNode : null) });
  });
  const popupMount = fakeNode({ querySelectorAll: (sel) => (sel === ".ba-common-listItem-wrapper" ? options : []) });
  const filterEl = fakeNode({ querySelector: (sel) => (sel === ".wa-filterDock-filterItemMount" ? popupMount : null) });
  return { options, popupMount, filterEl };
}

const POPUP_READY = "singleSelect/filterDockPopupReady";
const GESCHLECHT_HANDOFF = {
  filterLabel: "Geschlecht", filterType: "singleSelect", scopeType: "global", interactionType: "open",
  popup: { isVisible: true }, capabilities: { hasAlleOption: false }
};

test("popup sync: marks the pending option and keeps one out-click revert listener", async () => {
  const facet = fakeFacet([GESCHLECHT.values[0]], { items: [GESCHLECHT] });
  const { KDB, rt } = await bootReconciled(facet);
  const root = KDB.state.filters.singleSelect;
  const id = "g|s=global|i=g1";
  const fx = popupFixture();
  fakeDocument.catcher = new Catcher();
  const sync = () => A.processFilterDockHandoff(KDB, rt, GESCHLECHT_HANDOFF, POPUP_READY, { resolveFilterEl: () => fx.filterEl });
  assert.deepEqual(await sync(), { ok: true });
  assert.equal(fx.options[0].classes.has("is-selected"), true);
  assert.equal(fx.options[1].classes.has("is-selected"), false);
  assert.equal(fx.options[0].attrs["aria-selected"], "true");
  assert.equal(rt.domRefs.popupMount, fx.popupMount);
  assert.equal(rt.domRefs.filterKey, "global__Geschlecht");
  assert.equal(getEventListeners(fakeDocument.catcher, "click").length, 1);
  root.instancesById[id].pendingSelection = { displayValue: "Mann" };
  assert.deepEqual(await sync(), { ok: true });
  assert.equal(fx.options[1].classes.has("is-selected"), true);
  assert.equal(fx.options[0].classes.has("is-selected"), false);
  assert.equal(getEventListeners(fakeDocument.catcher, "click").length, 1);
  fakeDocument.catcher.dispatchEvent(new Event("click"));
  assert.deepEqual(root.instancesById[id].pendingSelection, { displayValue: "Frau" });
  assert.equal(getEventListeners(fakeDocument.catcher, "click").length, 0);
  root.instancesById[id].isCommitInProgress = true;
  await sync();
  assert.equal(fx.popupMount.classes.has("KDB_singleSelectCommitInProgress"), true);
  assert.equal(fx.filterEl.classes.has("KDB_singleSelectCommitInProgress"), true);
});

test("popup sync: out-click reverts the live record after the instance was replaced", async () => {
  const facet = fakeFacet([GESCHLECHT.values[0]], { items: [GESCHLECHT] });
  const { KDB, rt } = await bootReconciled(facet);
  const root = KDB.state.filters.singleSelect;
  const id = "g|s=global|i=g1";
  const fx = popupFixture();
  fakeDocument.catcher = new Catcher();
  const sync = () => A.processFilterDockHandoff(KDB, rt, GESCHLECHT_HANDOFF, POPUP_READY, { resolveFilterEl: () => fx.filterEl });
  await sync();
  const key = "outClick_global__Geschlecht";
  assert.equal(typeof rt.abortControllers[key].abort, "function");
  assert.equal(key in rt.listeners, false);
  const first = rt.abortControllers[key];
  await sync();
  assert.notEqual(rt.abortControllers[key], first);
  assert.equal(first.signal.aborted, true);
  assert.equal(getEventListeners(fakeDocument.catcher, "click").length, 1);
  const replaced = Object.assign({}, root.instancesById[id], { pendingSelection: { displayValue: "Mann" } });
  root.instancesById[id] = replaced;
  fakeDocument.catcher.dispatchEvent(new Event("click"));
  assert.deepEqual(replaced.pendingSelection, { displayValue: "Frau" });
  assert.equal(key in rt.abortControllers, false);
  await sync();
  assert.equal(getEventListeners(fakeDocument.catcher, "click").length, 1);
  KDB.api.singleSelect.destroy();
  assert.equal(getEventListeners(fakeDocument.catcher, "click").length, 0);
});

test("committed display chip painting", async () => {
  const facet = fakeFacet([GESCHLECHT.values[0]], { items: [GESCHLECHT] });
  const { KDB, api } = await bootReconciled(facet);
  const root = KDB.state.filters.singleSelect;
  const record = root.instancesById["g|s=global|i=g1"];
  record.currentSelection = { displayValue: "Frau", useValue: "2", displaySource: "table" };
  const chip = fakeNode({ text: "alt" });
  const wrapper = fakeNode({ querySelector: (sel) => (sel === ".wa-filterDock-filterItem-bottom .wa-filterDock-filterItemText" ? chip : null) });
  const host = (label) => fakeNode({ attrs: { "data-id": label }, closest: (sel) => (sel === ".filterItemWrapper" ? wrapper : null) });
  const hosts = [host("Anderes"), host("Geschlecht")];
  const bucket = fakeNode({
    querySelectorAll: (sel) => (sel === "[data-id]" ? hosts : []),
    querySelector(sel) {
      const m = /^\[data-id="(.*)"\]$/.exec(sel);
      if (!m) { return null; }
      return hosts.find((h) => h.attrs["data-id"] === m[1]) || null;
    }
  });
  fakeDocument.dockRoot = fakeNode({ querySelector: (sel) => (sel === "#filterDock__global" ? bucket : null) });
  api.dispatch({ type: "singleSelect/filterDockCommittedDisplayObserved" });
  assert.equal(chip.textContent, "Frau");
  assert.equal(chip.attrs.title, "Frau");
  assert.equal(chip.attrs["aria-label"], "Frau");
  record.currentSelection = { displayValue: "Mann", useValue: "1", displaySource: "table" };
  api.dispatch({ type: "singleSelect/filterDockCommittedDisplayObserved" });
  assert.equal(chip.textContent, "Mann");
  assert.equal(chip.attrs["aria-label"], "Frau");
  record.filterLabel = 'Quote "x" \\ end';
  record.currentSelection = { displayValue: "Frage", useValue: "9", displaySource: "table" };
  hosts.push(host(record.filterLabel));
  const before = logged.length;
  api.dispatch({ type: "singleSelect/filterDockCommittedDisplayObserved" });
  assert.equal(logged.length, before);
  assert.equal(chip.textContent, "Frage");
  fakeDocument.dockRoot = null;
});
