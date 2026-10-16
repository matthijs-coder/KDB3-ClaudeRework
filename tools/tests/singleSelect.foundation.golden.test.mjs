// Golden tests for the singleSelect foundation modules (config, runtime, hostFilterIo, state/selection,
// inventory/definitions, commit/tableValues). Run: node --test tools/tests/singleSelect.foundation.golden.test.mjs
// SS_GOLDEN_LAYOUT=old runs the same expectations against the pre-refactor file layout.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAmd } from "../lib/amd-loader.mjs";
import { JS_ROOT } from "../lib/amd-graph.mjs";

const SS = path.join(JS_ROOT, "dashboard/filters/singleSelect");
const LAYOUT = process.env.SS_GOLDEN_LAYOUT === "old" ? "old" : "new";
const logged = [];
const quietConsole = {
  log() {}, info() {}, debug() {},
  warn(...a) { logged.push(["warn", ...a]); },
  error(...a) { logged.push(["error", ...a]); }
};

function load(rel) {
  return loadAmd(path.join(SS, rel), { stubs: { console: quietConsole } });
}

function adapter() {
  if (LAYOUT === "old") {
    const hostWrite = load("effects/hostFilterWrite.js");
    const runtime = load("effects/guardInteractionFreshness.js");
    const defs = load("effects/readFilterDefinition.js");
    return {
      selection: Object.assign({}, load("state/selectionState.js"), load("effects/commitSelectionState.js")),
      verifySelection: load("effects/verifyCommitFilterValue.js"),
      writeVerified: load("effects/writeVerifiedSelection.js"),
      writeValues: hostWrite.writeValues,
      readValues: hostWrite.readValues,
      isWriteReady: hostWrite.isWriteReady,
      rollbackExact: hostWrite.rollbackHostWrite,
      rollbackVerified: load("actions/ownerSelectionSupport.js").rollbackToPreviousValues,
      restorePreviousSelection: load("effects/restorePreviousConfirmedSelection.js"),
      resolveFilterRef: load("effects/resolveFilterRef.js").resolveFilterRef,
      writeInstanceSelection: load("effects/writeAndVerifyInstanceSelection.js"),
      readFilterDefinition: defs,
      createDefinitionIndex: null,
      classifyFilterInstance: load("effects/classifyFilterInstance.js"),
      tableKey: load("config/resolveFilterOptionsTableKey.js"),
      tableRows: load("effects/parseFilterOptionTableRows.js"),
      resolveFilterValueFromTable: load("effects/resolveFilterValueFromTable.js").resolveFilterValueFromTable,
      reconcileFilterInstances: load("actions/reconcileFilterInstances.js"),
      ensureRuntime: load("effects/ensureSingleSelectRuntime.js"),
      resetRuntime: runtime.resetSingleSelectRuntime,
      seq: runtime,
      inFlight: load("effects/singleSelectInFlight.js"),
      readFiltersFacet: load("effects/readFiltersFacet.js"),
      errorCodes: load("config/errorCodes.js"),
      actions: load("config/actions.js"),
      parameterSetCodes: load("config/parameterSetCodes.js"),
      historyReplayCodes: load("history/historyReplayCodes.js")
    };
  }
  const io = load("hostFilterIo.js");
  const rt = load("runtime.js");
  const defs = load("inventory/definitions.js");
  const tv = load("commit/tableValues.js");
  const cfg = load("config.js");
  return {
    selection: load("state/selection.js"),
    verifySelection: io.verifySelection,
    writeVerified: io.writeVerified,
    writeValues: io.writeValues,
    readValues: io.readValues,
    isWriteReady: io.isWriteReady,
    rollbackExact: io.rollbackExact,
    rollbackVerified: io.rollbackVerified,
    restorePreviousSelection: io.restorePreviousSelection,
    resolveFilterRef: io.resolveFilterRef,
    writeInstanceSelection: io.writeInstanceSelection,
    readFilterDefinition: defs.readFilterDefinition,
    createDefinitionIndex: defs.createDefinitionIndex,
    classifyFilterInstance: defs.classifyFilterInstance,
    tableKey: tv.resolveFilterOptionsTableKey,
    tableRows: tv,
    resolveFilterValueFromTable: tv.resolveFilterValueFromTable,
    reconcileFilterInstances: load("inventory/reconcile.js").reconcileFilterInstances,
    ensureRuntime: rt.ensureSingleSelectRuntime,
    resetRuntime: rt.resetSingleSelectRuntime,
    seq: rt,
    inFlight: rt.inFlight,
    readFiltersFacet: rt.readFiltersFacet,
    errorCodes: cfg.errorCodes,
    actions: cfg.actions,
    parameterSetCodes: cfg.parameterSetCodes,
    historyReplayCodes: cfg.historyReplayCodes
  };
}

const A = adapter();
const REF = { itemId: "g1", scopeId: "global" };

function fakeFacet(initial, opts) {
  const o = opts || {};
  const facet = {
    stored: (initial || []).slice(),
    writes: [],
    readFilterValues() {
      if (o.readThrows) { throw new Error("read boom"); }
      return { ok: true, data: facet.stored.slice() };
    },
    async writeFilter(req) {
      facet.writes.push(req.values.slice());
      const index = facet.writes.length - 1;
      if (o.failWriteAt && o.failWriteAt.indexOf(index) >= 0) { return { ok: false }; }
      if (o.throwWriteAt && o.throwWriteAt.indexOf(index) >= 0) { throw new Error("write boom"); }
      if (o.ignoreWriteAt && o.ignoreWriteAt.indexOf(index) >= 0) { return { ok: true }; }
      facet.stored = req.values.slice();
      return { ok: true };
    }
  };
  return facet;
}

test("config exports keep their keys and strings", () => {
  assert.equal(A.actions.APPLY_OWNER_SELECTION, "singleSelect/applyOwnerSelection");
  assert.equal(A.actions.RESYNC_TAB_MUTATION_HOST, "singleSelect/resyncTabMutationHost");
  assert.equal(Object.keys(A.actions).length, 18);
  assert.equal(A.errorCodes.RECONCILE_TIMEOUT, "SINGLE_SELECT_RECONCILE_TIMEOUT");
  assert.equal(A.errorCodes.TAB_MUTATION_ROLLBACK_INCOMPLETE, "TABS_MUTATION_ROLLBACK_INCOMPLETE");
  assert.equal(Object.keys(A.errorCodes).length, 30);
  assert.equal(A.parameterSetCodes.CANCELLED, "WRITEBACK_RESTORE_CANCELLED");
  assert.equal(Object.keys(A.parameterSetCodes).length, 16);
  assert.equal(A.historyReplayCodes.STEP_INVALID, "HISTORY_STEP_INVALID");
  assert.equal(Object.keys(A.historyReplayCodes).length, 7);
});

test("selection model: normalize, create, getters", () => {
  const s = A.selection;
  assert.deepEqual(s.createConfirmedSelection(" Frau ", " 2 "), { displayValue: "Frau", useValue: "2" });
  assert.deepEqual(s.createConfirmedSelection("", "7"), { displayValue: "Alle", useValue: "" });
  assert.deepEqual(s.createConfirmedSelection(null, null), { displayValue: "Alle", useValue: "" });
  assert.deepEqual(s.createPendingSelection(undefined), { displayValue: "Alle" });
  assert.deepEqual(s.normalizeConfirmedSelection("Mann"), { displayValue: "Mann", useValue: "" });
  assert.deepEqual(
    s.normalizeConfirmedSelection({ displayValue: "Mann", useValue: "1", displaySource: "table" }),
    { displayValue: "Mann", useValue: "1", displaySource: "table" }
  );
  assert.deepEqual(
    s.normalizeConfirmedSelection({ displayValue: null, useValue: 5 }),
    { displayValue: null, useValue: "5", displaySource: "unavailable" }
  );
  assert.deepEqual(s.normalizePendingSelection({ displayValue: " x " }), { displayValue: "x" });
  assert.equal(s.getConfirmedDisplayValue(undefined), "Alle");
  assert.equal(s.getConfirmedUseValue({ displayValue: "Alle", useValue: "9" }), "");
  assert.equal(s.getPendingDisplayValue("Frau"), "Frau");
});

test("selection state writers: applyConfirmedState and revertFilterState", () => {
  const s = A.selection;
  const state = { timestamps: {} };
  const root = {};
  s.applyConfirmedState(state, root, { displayValue: "Frau", useValue: "2" });
  assert.deepEqual(state.currentSelection, { displayValue: "Frau", useValue: "2", displaySource: "cognos" });
  assert.deepEqual(state.backupSelection, state.currentSelection);
  assert.notEqual(state.backupSelection, state.currentSelection);
  assert.deepEqual(state.pendingSelection, { displayValue: "Frau" });
  assert.equal(typeof state.lastConfirmedTs, "number");
  assert.equal(state.timestamps.confirmedAt, state.lastConfirmedTs);
  assert.equal(root.lastConfirmedAt, state.lastConfirmedTs);
  const unavailable = {};
  s.applyConfirmedState(unavailable, {}, { displayValue: null, useValue: 3, displaySource: "unavailable" });
  assert.deepEqual(unavailable.currentSelection, { displayValue: null, useValue: "3", displaySource: "unavailable" });
  assert.deepEqual(unavailable.pendingSelection, { displayValue: "Alle" });
  const reverted = {};
  s.revertFilterState(reverted, { displayValue: "Mann", useValue: "1" });
  assert.deepEqual(reverted.currentSelection, { displayValue: "Mann", useValue: "1" });
  assert.deepEqual(reverted.pendingSelection, { displayValue: "Mann" });
});

test("verifySelection (3 args)", () => {
  const facet = fakeFacet([{ d: "Frau", u: "2" }]);
  const v = A.verifySelection;
  assert.deepEqual(v(facet, REF, { displayValue: "Frau", useValue: "2" }),
    { ok: true, observed: { d: "Frau", u: "2" }, values: [{ d: "Frau", u: "2" }] });
  assert.equal(v(facet, REF, { displayValue: "Frau", useValue: "3" }).ok, false);
  assert.equal(v(facet, REF, { displayValue: "Mann", useValue: "2" }).ok, false);
  assert.equal(v(facet, REF, { displayValue: "Alle", useValue: "" }).ok, false);
  const empty = fakeFacet([]);
  assert.deepEqual(v(empty, REF, { displayValue: "Alle", useValue: "" }),
    { ok: true, observed: { d: "", u: "" }, values: [] });
  assert.deepEqual(v(empty, REF, { displayValue: "Frau", useValue: "2" }),
    { ok: false, observed: { d: "", u: "" }, values: [] });
  const two = fakeFacet([{ d: "a", u: "1" }, { d: "b", u: "2" }]);
  assert.equal(v(two, REF, { displayValue: "a", useValue: "1" }).ok, false);
  assert.equal(v(facet, REF, "Frau").ok, false);
  assert.equal(v(null, REF, { displayValue: "Alle", useValue: "" }).ok, true);
});

test("readValues / writeValues / isWriteReady", async () => {
  const facet = fakeFacet([{ d: "a", u: "1" }]);
  assert.deepEqual(A.readValues(facet, REF), [{ d: "a", u: "1" }]);
  assert.deepEqual(A.readValues(null, REF), []);
  assert.deepEqual(A.readValues(facet, null), []);
  assert.deepEqual(A.readValues({ readFilterValues() { return { ok: false }; } }, REF), []);
  assert.equal(A.isWriteReady(facet), true);
  assert.equal(A.isWriteReady({}), false);
  assert.equal(await A.writeValues(facet, REF, [{ d: "b", u: "2" }]), true);
  assert.deepEqual(facet.stored, [{ d: "b", u: "2" }]);
  assert.equal(await A.writeValues(facet, REF, "x"), true);
  assert.deepEqual(facet.stored, []);
  assert.equal(await A.writeValues(null, REF, []), false);
  assert.equal(await A.writeValues(fakeFacet([], { failWriteAt: [0] }), REF, []), false);
});

test("writeVerified matrix", async () => {
  const want = [{ d: "Frau", u: "2" }];
  const ok = await A.writeVerified(fakeFacet([{ d: "Mann", u: "1" }]), REF, want, {});
  assert.deepEqual(ok, { ok: true, errorCode: null, rollbackVerified: null, previous: [{ d: "Mann", u: "1" }], observed: { d: "Frau", u: "2" } });
  const clear = await A.writeVerified(fakeFacet([{ d: "Mann", u: "1" }]), REF, [], {});
  assert.equal(clear.ok, true);
  const noFacet = await A.writeVerified(null, REF, want, {});
  assert.deepEqual(noFacet, { ok: false, errorCode: "SINGLE_SELECT_HOST_WRITE_FAILED", rollbackVerified: null, previous: [], observed: null });
  const writeFail = fakeFacet([{ d: "Mann", u: "1" }], { failWriteAt: [0] });
  assert.deepEqual(await A.writeVerified(writeFail, REF, want, {}),
    { ok: false, errorCode: "SINGLE_SELECT_HOST_WRITE_FAILED", rollbackVerified: null, previous: [{ d: "Mann", u: "1" }], observed: null });
  const mismatch = fakeFacet([{ d: "Mann", u: "1" }], { ignoreWriteAt: [0] });
  const mm = await A.writeVerified(mismatch, REF, want, {});
  assert.deepEqual(mm, {
    ok: false, errorCode: "SINGLE_SELECT_COMMIT_VERIFICATION_MISMATCH", rollbackVerified: null,
    previous: [{ d: "Mann", u: "1" }], observed: { d: "Mann", u: "1" }
  });
  assert.deepEqual(mismatch.writes, [want, [{ d: "Mann", u: "1" }]]);
  const mmVerified = await A.writeVerified(fakeFacet([{ d: "Mann", u: "1" }], { ignoreWriteAt: [0] }), REF, want, { verifyRollback: true });
  assert.equal(mmVerified.errorCode, "SINGLE_SELECT_COMMIT_VERIFICATION_MISMATCH");
  assert.equal(mmVerified.rollbackVerified, true);
  const rbFail = fakeFacet([{ d: "Mann", u: "1" }], { ignoreWriteAt: [0], failWriteAt: [1] });
  assert.equal((await A.writeVerified(rbFail, REF, want, {})).errorCode, "SINGLE_SELECT_HOST_WRITE_FAILED");
  const rbFailV = await A.writeVerified(
    fakeFacet([{ d: "Mann", u: "1" }], { ignoreWriteAt: [0], failWriteAt: [1] }), REF, want, { verifyRollback: true });
  assert.equal(rbFailV.errorCode, "SINGLE_SELECT_HOST_ROLLBACK_UNVERIFIED");
  assert.equal(rbFailV.rollbackVerified, false);
  const rbThrow = fakeFacet([{ d: "Mann", u: "1" }], { ignoreWriteAt: [0], throwWriteAt: [1] });
  const thrown = await A.writeVerified(rbThrow, REF, want, {});
  assert.equal(thrown.errorCode, "SINGLE_SELECT_HOST_WRITE_FAILED");
  assert.equal(thrown.ok, false);
  const rbThrowV = await A.writeVerified(
    fakeFacet([{ d: "Mann", u: "1" }], { ignoreWriteAt: [0], throwWriteAt: [1] }), REF, want, { verifyRollback: true });
  assert.equal(rbThrowV.errorCode, "SINGLE_SELECT_HOST_ROLLBACK_UNVERIFIED");
  const rbSame = await A.writeVerified(
    fakeFacet([{ d: "Mann", u: "1" }], { ignoreWriteAt: [0, 1] }), REF, want, { verifyRollback: true });
  assert.equal(rbSame.errorCode, "SINGLE_SELECT_COMMIT_VERIFICATION_MISMATCH");
  assert.equal(rbSame.rollbackVerified, true);
  const rbm = await A.writeVerified(
    fakeFacet([{ d: "Mann", u: "1" }], { ignoreWriteAt: [1] }), REF, want,
    { verifyRollback: true, expected: { displayValue: "Other", useValue: "9" } });
  assert.equal(rbm.errorCode, "SINGLE_SELECT_HOST_ROLLBACK_UNVERIFIED");
  assert.equal(rbm.rollbackVerified, false);
  const explicit = await A.writeVerified(fakeFacet([]), REF, want, { expected: { displayValue: "Frau", useValue: "2" } });
  assert.equal(explicit.ok, true);
});

test("rollbackExact and rollbackVerified", async () => {
  const prior = [{ d: "Mann", u: "1" }];
  assert.deepEqual(await A.rollbackExact(fakeFacet([{ d: "x", u: "9" }]), REF, prior), { ok: true });
  assert.deepEqual(await A.rollbackExact(fakeFacet([], { failWriteAt: [0] }), REF, prior), { ok: false });
  assert.deepEqual(await A.rollbackExact(fakeFacet([], { ignoreWriteAt: [0] }), REF, prior), { ok: false });
  const thrown = await A.rollbackExact(fakeFacet([], { throwWriteAt: [0] }), REF, prior);
  assert.equal(thrown.ok, false);
  assert.equal(thrown.error.message, "write boom");
  assert.equal(await A.rollbackVerified(fakeFacet([{ d: "x", u: "9" }]), REF, prior), true);
  assert.equal(await A.rollbackVerified(fakeFacet([{ d: "x", u: "9" }]), REF, []), true);
  assert.equal(await A.rollbackVerified(fakeFacet([], { failWriteAt: [0] }), REF, prior), false);
  assert.equal(await A.rollbackVerified(fakeFacet([], { ignoreWriteAt: [0] }), REF, prior), false);
  assert.equal(await A.rollbackVerified(fakeFacet([], { throwWriteAt: [0] }), REF, prior), false);
});

test("restorePreviousSelection", async () => {
  const KDB = (facet) => ({ runtime: { singleSelect: { filtersFacet: facet } } });
  const facet = fakeFacet([{ d: "x", u: "9" }]);
  assert.equal(await A.restorePreviousSelection(KDB(facet), REF, { displayValue: "Mann", useValue: "1" }, null), true);
  assert.deepEqual(facet.stored, [{ d: "Mann", u: "1" }]);
  const alle = fakeFacet([{ d: "x", u: "9" }]);
  assert.equal(await A.restorePreviousSelection(KDB(alle), REF, { displayValue: "Alle", useValue: "" }, null), true);
  assert.deepEqual(alle.stored, []);
  const withValues = fakeFacet([]);
  assert.equal(await A.restorePreviousSelection(KDB(withValues), REF, null, [{ d: "Frau", u: "2" }]), true);
  assert.deepEqual(withValues.stored, [{ d: "Frau", u: "2" }]);
  assert.equal(await A.restorePreviousSelection(KDB(fakeFacet([])), REF, { displayValue: null }, null), false);
  assert.equal(await A.restorePreviousSelection(KDB(fakeFacet([], { failWriteAt: [0] })), REF, "Mann", null), false);
  assert.equal(await A.restorePreviousSelection(KDB(fakeFacet([], { ignoreWriteAt: [0] })), REF, "Mann", null), false);
  assert.equal(await A.restorePreviousSelection(KDB(fakeFacet([], { throwWriteAt: [0] })), REF, "Mann", null), false);
  assert.equal(await A.restorePreviousSelection(KDB(null), REF, "Mann", null), undefined);
  assert.equal(await A.restorePreviousSelection(KDB(fakeFacet([])), null, "Mann", null), undefined);
});

test("resolveFilterRef and writeInstanceSelection", async () => {
  const facet = fakeFacet([{ d: "x", u: "9" }]);
  const KDB = {
    state: { filters: { singleSelect: { instancesById: {
      a: { itemId: " g1 ", itemName: "Geschlecht", scopeId: "global" },
      b: { itemId: "", itemName: "", scopeId: "p1" },
      c: { itemName: "OnlyName" }
    } } } },
    runtime: { singleSelect: { filtersFacet: facet } }
  };
  assert.deepEqual(A.resolveFilterRef(KDB, {}, { filterInstanceId: "a" }), { scopeId: "global", itemId: "g1", itemName: "Geschlecht" });
  assert.deepEqual(A.resolveFilterRef(KDB, { filterInstanceId: "c" }), { scopeId: "", itemName: "OnlyName" });
  assert.equal(A.resolveFilterRef(KDB, { filterInstanceId: "b" }), null);
  assert.equal(A.resolveFilterRef(KDB, { filterInstanceId: "zz" }), null);
  assert.equal(A.resolveFilterRef({}, null), null);
  const rt = KDB.runtime.singleSelect;
  assert.deepEqual(await A.writeInstanceSelection(KDB, rt, "a", [{ d: "Frau", u: "2" }]), { ok: true, errorCode: null });
  assert.deepEqual(facet.stored, [{ d: "Frau", u: "2" }]);
  assert.deepEqual(await A.writeInstanceSelection(KDB, rt, "zz", []), { ok: false, errorCode: "SINGLE_SELECT_HOST_WRITE_FAILED" });
  const bad = { state: KDB.state, runtime: { singleSelect: { filtersFacet: fakeFacet([], { ignoreWriteAt: [0] }) } } };
  assert.deepEqual(await A.writeInstanceSelection(bad, bad.runtime.singleSelect, "a", [{ d: "Frau", u: "2" }]),
    { ok: false, errorCode: "SINGLE_SELECT_COMMIT_VERIFICATION_MISMATCH" });
});

const FILTER_PROPS = {
  KENNZAHLEN: {
    filterInstances: {
      i1: { scopeType: "global", itemName: "Geschlecht", itemId: "g1", instanceKey: "geschlecht", isSingleSelect: true },
      i2: { scopeType: "global", itemName: "Geschlecht", itemId: "g1", instanceKey: "geschlecht", isSingleSelect: true },
      i3: { scopeType: "global", filterLabel: "Jahr", instanceKey: "a" },
      i4: { scopeType: "global", filterLabel: "Jahr", instanceKey: "b" },
      i5: { scopeType: "pageContext", itemName: "Seite", itemId: "p9" },
      i6: { scopeType: "global", itemName: "Alter", itemId: "zzz" }
    },
    globalFilters: { Legacy: { condition: "x" }, Twin: { a: 1 } },
    pageContextFilters: { PageLegacy: { condition: "y" } }
  },
  ANDERE: {
    filterInstances: {
      j1: { scopeType: "global", itemName: "Geschlecht", itemId: "g1", instanceKey: "geschlecht", isSingleSelect: true },
      j2: { scopeType: "global", itemName: "Geschlecht", itemId: "g1", instanceKey: "other" }
    },
    globalFilters: { Twin: { a: 1 }, Legacy: { condition: "x" } }
  }
};

test("readFilterDefinition without index", () => {
  const KDB = { properties: { filterPropObj: FILTER_PROPS } };
  const read = (source, scope, name, id, index) => A.readFilterDefinition(KDB, source, scope, name, id, index);
  const cases = [
    ["KENNZAHLEN", "global", "Geschlecht", "g1"],
    ["KENNZAHLEN", "global", "Geschlecht", ""],
    ["KENNZAHLEN", "global", "Geschlecht", "other"],
    ["KENNZAHLEN", "global", "Jahr", ""],
    ["KENNZAHLEN", "pageContext", "Seite", "p9"],
    ["KENNZAHLEN", "pageContext", "Seite", ""],
    ["KENNZAHLEN", "global", "Alter", ""],
    ["KENNZAHLEN", "global", "Alter", "other"],
    ["KENNZAHLEN", "global", "Legacy", ""],
    ["KENNZAHLEN", "pageContext", "PageLegacy", ""],
    ["KENNZAHLEN", "global", "Nope", ""],
    [null, "global", "Geschlecht", "g1"],
    [null, "global", "Legacy", ""],
    [null, "global", "Twin", ""],
    ["ANDERE", "global", "Geschlecht", "g1"],
    ["MISSING", "global", "Geschlecht", "g1"]
  ];
  const results = cases.map((c) => {
    const r = read(c[0], c[1], c[2], c[3]);
    return [r.status, r.definition ? Object.keys(r.definition).join(",") : null];
  });
  assert.deepEqual(results, [
    ["ok", "scopeType,itemName,itemId,instanceKey,isSingleSelect"],
    ["ok", "scopeType,itemName,itemId,instanceKey,isSingleSelect"],
    ["missing", null],
    ["ambiguous", null],
    ["ok", "scopeType,itemName,itemId"],
    ["ok", "scopeType,itemName,itemId"],
    ["ok", "scopeType,itemName,itemId"],
    ["missing", null],
    ["ok", "condition"],
    ["ok", "condition"],
    ["missing", null],
    ["ambiguous", null],
    ["ok", "condition"],
    ["ok", "a"],
    ["ambiguous", null],
    ["missing", null]
  ]);
  assert.equal(read("KENNZAHLEN", "global", "Geschlecht", "g1").definition, FILTER_PROPS.KENNZAHLEN.filterInstances.i1);
  assert.equal(read("KENNZAHLEN", "global", "Legacy", "").definition, FILTER_PROPS.KENNZAHLEN.globalFilters.Legacy);
  assert.deepEqual(read(null, "global", " Geschlecht ", " g1 ").status, "ambiguous");
  assert.deepEqual(A.readFilterDefinition({}, "X", "global", "Geschlecht", "g1"), { status: "missing", definition: null });
});

test("readFilterDefinition with index equals the unindexed result", { skip: LAYOUT === "old" }, () => {
  const KDB = { properties: { filterPropObj: FILTER_PROPS } };
  const sources = ["KENNZAHLEN", "ANDERE", "MISSING"];
  const names = ["Geschlecht", "Jahr", "Seite", "Alter", "Legacy", "PageLegacy", "Twin", "Nope", " Geschlecht "];
  const ids = ["", "g1", "other", "p9", "zzz"];
  let compared = 0;
  sources.forEach((source) => {
    const index = A.createDefinitionIndex(KDB, source);
    ["global", "pageContext"].forEach((scope) => names.forEach((name) => ids.forEach((id) => {
      assert.deepEqual(
        A.readFilterDefinition(KDB, source, scope, name, id, index),
        A.readFilterDefinition(KDB, source, scope, name, id),
        source + "|" + scope + "|" + name + "|" + id
      );
      compared += 1;
    })));
  });
  assert.equal(compared, 3 * 2 * 9 * 5);
  const noRoot = A.createDefinitionIndex({}, "KENNZAHLEN");
  assert.deepEqual(A.readFilterDefinition({}, "KENNZAHLEN", "global", "x", "", noRoot), { status: "missing", definition: null });
});

test("classifyFilterInstance", () => {
  const c = (def, name, scope) => A.classifyFilterInstance(def === undefined ? undefined : { status: "ok", definition: def }, name, scope);
  assert.deepEqual(c({}, "Dienststelle", "global"), { status: "excluded", filterType: "dienststelle", selectionOwner: "dienststelle" });
  assert.deepEqual(c({}, "sicht", "global"), { status: "supported", filterType: "sicht", selectionOwner: "sicht" });
  assert.deepEqual(c({}, "sicht", "pageContext"), { status: "supported", filterType: "singleSelect", selectionOwner: "singleSelect" });
  assert.deepEqual(A.classifyFilterInstance({ status: "missing", definition: null }, "X", "global"),
    { status: "unknown", filterType: "unknown", selectionOwner: null });
  assert.equal(c({ isHierarchy: "TRUE" }, "X", "global").filterType, "dienststelle");
  assert.equal(c({ cascade: "downstream" }, "X", "global").filterType, "dienststelle");
  assert.equal(c({ condition: "Personengruppe" }, "X", "global").filterType, "specialSingleSelect");
  assert.equal(c({ isSingleSelect: "trueish" }, "X", "global").filterType, "singleSelect");
  assert.equal(c({}, "X", "global").filterType, "singleSelect");
  assert.deepEqual(c({ isSingleSelect: "false" }, "X", "global"), { status: "unknown", filterType: "unknown", selectionOwner: null });
  assert.equal(c({ isHierarchy: "false" }, "X", "global").status, "unknown");
  assert.equal(A.classifyFilterInstance(undefined, "X", "global").status, "unknown");
});

test("option table key and row parsing", () => {
  assert.equal(A.tableKey("Geschlecht"), "geschlecht_filter");
  assert.equal(A.tableKey("Dienstverhältnis"), "dienstverhältnis_filter");
  assert.equal(A.tableKey("Alters Gruppe-Äö"), "altersgruppeaeoe_filter");
  assert.equal(A.tableKey("  "), "");
  assert.equal(A.tableKey(null), "");
  const rows = [
    { Geschlecht: { display: "Frau", use: "2" } },
    { Other: { d: "Mann", u: "1" }, Geschlecht: { d: " Mann ", u: " 1 " } },
    { Geschlecht: { d: "Dup", u: "1" } },
    { x: "bad", y: [], z: { d: "", u: "3" } },
    { Zeile: { d: "Fallback", u: "5" } }
  ];
  assert.deepEqual(A.tableRows.findMatchingRowValue(rows, "mann", "Geschlecht"), { d: "Mann", u: "1" });
  assert.deepEqual(A.tableRows.findMatchingRowValue(rows, "Fallback", "Geschlecht"), { d: "Fallback", u: "5" });
  assert.equal(A.tableRows.findMatchingRowValue(rows, "none", "Geschlecht"), null);
  assert.equal(A.tableRows.findMatchingRowValue([], "x", "G"), null);
  assert.deepEqual(A.tableRows.findMatchingUseValue(rows, "2", "Geschlecht"), { d: "Frau", u: "2" });
  assert.equal(A.tableRows.findMatchingUseValue(rows, "1", "Geschlecht"), null);
  assert.equal(A.tableRows.findMatchingUseValue(rows, "", "Geschlecht"), null);
});

test("resolveFilterValueFromTable", async () => {
  const rows = [{ Geschlecht: { display: "Frau", use: "2" } }];
  const KDB = {
    config: { tables: { geschlecht_filter: { shape: "s", pick: "p" } } },
    services: { tableData: { readRows: () => rows } }
  };
  const resolve = A.resolveFilterValueFromTable;
  assert.deepEqual(await resolve(KDB, "Geschlecht", "Frau", null), {
    ok: true, errorCode: null, tableKey: "geschlecht_filter", selectedValue: { d: "Frau", u: "2" }, rowCount: 1, source: "readRows"
  });
  assert.deepEqual(await resolve(KDB, "Geschlecht", "Alle", null), {
    ok: false, errorCode: "invalidInput", tableKey: "", selectedValue: null, rowCount: 0, source: null
  });
  const provided = { filterConfig: { selectionValuesByDisplay: { Frau: { d: "Frau", u: "2" } } } };
  assert.deepEqual(await resolve({}, "Geschlecht", "Frau", provided), {
    ok: true, errorCode: null, tableKey: "", selectedValue: { d: "Frau", u: "2" }, rowCount: 0, source: "providedSelectionValues"
  });
  assert.equal((await resolve(KDB, "Geschlecht", "Nobody", null)).errorCode, "labelNotFound");
  assert.equal((await resolve({ config: { tables: {} }, services: {} }, "Geschlecht", "Frau", null)).errorCode, "tableConfigMissing");
  assert.equal((await resolve({ config: KDB.config, services: {} }, "Geschlecht", "Frau", null)).errorCode, "tableDataUnavailable");
  const waiting = { config: KDB.config, services: { tableData: { readRows: () => null, waitForRows: async () => rows } } };
  assert.equal((await resolve(waiting, "Geschlecht", "Frau", null)).source, "waitForRows");
  const failing = { config: KDB.config, services: { tableData: { readRows: () => null, waitForRows: async () => { throw new Error("late"); } } } };
  assert.equal((await resolve(failing, "Geschlecht", "Frau", null)).errorCode, "tableNotReady");
});

test("runtime: ensure, facet, inFlight", () => {
  const KDB = {};
  const rt = A.ensureRuntime(KDB);
  assert.equal(rt, KDB.runtime.singleSelect);
  assert.deepEqual(Object.keys(rt).sort(), [
    "abortControllers", "delegatedOperationIds", "domRefs", "inFlight", "inventoryOwnerNotifications",
    "listeners", "observers", "pendingPromises", "subscriptions", "tabMutationSnapshots", "timers"
  ]);
  rt.inFlight.keep = true;
  assert.equal(A.ensureRuntime(KDB), rt);
  assert.equal(rt.inFlight.keep, true);
  assert.equal(A.readFiltersFacet(KDB), null);
  const facet = {};
  rt.filtersFacet = facet;
  assert.equal(A.readFiltersFacet(KDB), facet);
  assert.equal(A.readFiltersFacet(null, { filtersFacet: 7 }), 7);
  assert.equal(A.readFiltersFacet(null, null), null);

  const f = A.inFlight;
  const runtime = { inFlight: {} };
  f.begin(runtime, "x");
  f.begin(runtime, "");
  f.begin(null, "y");
  assert.equal(f.isActive(runtime, "x"), true);
  assert.equal(f.isActive(runtime, "z"), false);
  assert.equal(runtime.inFlight.x.key, "x");
  const instances = { x: { selectionOwner: "singleSelect" }, y: { selectionOwner: "sicht" } };
  f.adopt(runtime, instances);
  assert.equal(instances.x.isCommitInProgress, true);
  assert.equal(instances.y.isCommitInProgress, undefined);
  f.end(runtime, "x");
  assert.equal(f.isActive(runtime, "x"), false);
  const lazy = {};
  f.begin(lazy, "q");
  assert.equal(f.isActive(lazy, "q"), true);
});

test("runtime: interaction sequence", () => {
  const s = A.seq;
  const st = {};
  assert.equal(s.bumpInteractionSequence(st), 1);
  assert.equal(s.bumpInteractionSequence(st), 2);
  assert.equal(s.isStaleInteraction(st, 1), true);
  assert.equal(s.isStaleInteraction(st, 2), false);
  assert.equal(s.isStaleInteraction(st, 0), false);
  assert.equal(s.isStaleInteraction(null, 5), false);
  s.markInteractionApplied(st, 9);
  assert.equal(st.appliedInteractionSeq, 9);
  s.markInteractionApplied(st, 3);
  assert.equal(st.appliedInteractionSeq, 9);
  s.markInteractionApplied(null, 3);
});

test("runtime: resetSingleSelectRuntime releases resources and resets owner fields", () => {
  const calls = [];
  const rt = {
    domRefs: { a: 1 },
    listeners: { off: () => calls.push("listener") },
    subscriptions: { s: 1 },
    abortControllers: { c: { abort: () => calls.push("abort") }, none: null },
    observers: { o: { disconnect: () => calls.push("disconnect") } },
    timers: { t: setTimeout(() => calls.push("timer-fired"), 5) },
    pendingPromises: { p: Promise.resolve() },
    inFlight: { x: {} },
    filtersFacet: {},
    delegatedOperationIds: { d: 1 },
    tabMutationSnapshots: { s: 1 },
    inventoryOwnerNotifications: { n: 1 },
    reconcileRunId: 4,
    parameterSetRunId: 5,
    tabMutationRunId: 6,
    tabMutationOperationId: "op",
    historyReplayHandlerContribution: "keep"
  };
  A.resetRuntime(rt);
  assert.deepEqual(calls.sort(), ["abort", "disconnect", "listener"]);
  ["domRefs", "listeners", "subscriptions", "abortControllers", "observers", "timers", "pendingPromises", "inFlight",
    "delegatedOperationIds", "tabMutationSnapshots", "inventoryOwnerNotifications"].forEach((key) => {
    assert.deepEqual(rt[key], {}, key);
  });
  assert.equal(rt.filtersFacet, null);
  ["reconcileRunId", "parameterSetRunId", "tabMutationRunId", "tabMutationOperationId"].forEach((key) => {
    assert.equal(key in rt, false, key);
  });
  assert.equal(rt.historyReplayHandlerContribution, "keep");
});

test("reconcileFilterInstances: run bookkeeping, generation and result shape", async () => {
  const items = [
    { itemId: "g1", itemName: "Geschlecht", scopeId: "global", values: [{ d: "Frau", u: "2" }] },
    { itemId: "x9", itemName: "Unbekannt", scopeId: "global", values: [] },
    { itemId: "d1", itemName: "Dienststelle", scopeId: "global", values: [] }
  ];
  const facet = {
    listFilterItems(input) {
      return { ok: true, data: input.scopeId === "global" ? items : [] };
    }
  };
  const KDB = {
    properties: {
      kennzahlenTablesPropObj: { personal: {} },
      filterPropObj: { personal: { filterInstances: {
        i1: { scopeType: "global", itemName: "Geschlecht", itemId: "g1", filterLabel: "Geschlecht", instanceKey: "geschlecht", isSingleSelect: true }
      } } }
    },
    state: { filters: { singleSelect: { instancesById: {}, inventory: {} } } }
  };
  const runtime = A.ensureRuntime(KDB);
  runtime.filtersFacet = facet;
  const invalid = await A.reconcileFilterInstances(KDB, runtime, { reason: "nope" });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.diagnostics[0].code, "SINGLE_SELECT_RECONCILE_REASON_INVALID");
  const first = await A.reconcileFilterInstances(KDB, runtime, { reason: "parameterRestore" });
  assert.equal(first.ok, true);
  assert.equal(first.generation, 1);
  assert.equal(first.discovered.length, 1);
  assert.deepEqual(first.diagnostics.map((d) => d.code), ["SINGLE_SELECT_HOST_ITEM_UNKNOWN"]);
  const root = KDB.state.filters.singleSelect;
  assert.equal(Object.keys(root.instancesById).length, 1);
  assert.equal(root.inventory.freshness, "fresh");
  assert.equal(root.inventory.reconcileInFlight, false);
  assert.equal(runtime.reconcileRunId, 1);
  assert.deepEqual(runtime.pendingPromises, {});
  assert.deepEqual(runtime.abortControllers, {});
  const second = await A.reconcileFilterInstances(KDB, runtime, { reason: "historyReplay" });
  assert.equal(second.generation, 2);
  facet.listFilterItems = () => { throw new Error("host down"); };
  const failed = await A.reconcileFilterInstances(KDB, runtime, { reason: "parameterRestore", timeoutMs: 60 });
  assert.equal(failed.ok, false);
  assert.equal(failed.diagnostics[0].code, "SINGLE_SELECT_RECONCILE_TIMEOUT");
  assert.equal(root.inventory.freshness, "stale");
  assert.equal(root.inventory.reconcileInFlight, false);
});
