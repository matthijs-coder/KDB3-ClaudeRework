define([], function () {
  "use strict";

  // The widget owner's per-operation rollback data and its tab-mutation run-id guard, kept in runtime.tabs.slotStock
  // so the saga that releases a snapshot is the one that owns it. Snapshot contents (frames, serialized widget rows)
  // are opaque to tabs: the widget port writes them through the engine and nothing else reads them.

  function ensureLedger(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    const runtime = _KDB.runtime.tabs = _KDB.runtime.tabs || {};
    if (!runtime.slotStock) { runtime.slotStock = { snapshots: {}, runId: 0 }; }
    return runtime.slotStock;
  }

  // Returns null when the run may proceed, else a failed owner result. ownerLabel only words the diagnostics.
  function guardRun(_KDB, _payload, _ownerLabel) {
    const payload = _payload || {};
    const ledger = ensureLedger(_KDB);
    if (typeof payload.runId !== "number" || !isFinite(payload.runId)) {
      return { ok: false, diagnostics: [{ code: "TABS_MUTATION_CANCELLED", message: _ownerLabel + " tab mutation requires numeric runId." }] };
    }
    if (typeof ledger.runId === "number" && payload.runId < ledger.runId) {
      return { ok: false, diagnostics: [{ code: "TABS_MUTATION_CANCELLED", message: "stale " + _ownerLabel + " tab mutation runId." }] };
    }
    ledger.runId = payload.runId;
    return null;
  }

  function isStale(_KDB, _runId) {
    const ledger = ensureLedger(_KDB);
    return typeof ledger.runId === "number" && _runId < ledger.runId;
  }

  function isCurrent(_KDB, _runId) {
    return ensureLedger(_KDB).runId === _runId;
  }

  function writeSnapshot(_KDB, _operationId, _snapshot) {
    const ledger = ensureLedger(_KDB);
    ledger.snapshots[_operationId] = _snapshot;
    return _snapshot;
  }

  function readSnapshot(_KDB, _operationId) {
    return ensureLedger(_KDB).snapshots[_operationId] || null;
  }

  function deleteSnapshot(_KDB, _operationId) {
    delete ensureLedger(_KDB).snapshots[_operationId];
  }

  // The duplicate history step stores the rollback rows the widget prepare captured for the operation.
  function readRollbackByTabId(_KDB, _operationId) {
    const snapshot = _operationId ? readSnapshot(_KDB, _operationId) : null;
    const map = snapshot && snapshot.rollbackByTabId;
    return map && typeof map === "object" ? map : {};
  }

  function reset(_KDB) {
    const runtime = _KDB && _KDB.runtime && _KDB.runtime.tabs;
    if (runtime) { runtime.slotStock = { snapshots: {}, runId: 0 }; }
  }

  return {
    guardRun: guardRun,
    isStale: isStale,
    isCurrent: isCurrent,
    writeSnapshot: writeSnapshot,
    readSnapshot: readSnapshot,
    deleteSnapshot: deleteSnapshot,
    readRollbackByTabId: readRollbackByTabId,
    reset: reset
  };
});
