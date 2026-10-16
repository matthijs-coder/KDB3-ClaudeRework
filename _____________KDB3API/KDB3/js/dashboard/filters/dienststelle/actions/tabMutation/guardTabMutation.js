define([
  "../restoreSupport.js",
  "../../../../../core/utils/filters/tabMutationRun/guardTabMutationRun.js",
  "../../../../../core/utils/filters/tabMutationRun/tabMutationSnapshots.js",
  "../../../../../core/utils/filters/tabMutationRun/listAffectedPlanSlots.js"
], function (_restoreSupport, _guardRunUtil, _snapshots, _listAffectedPlanSlots) {
  "use strict";

  var DS_GUARD_OPTS = {
    pinOperationId: false,
    ensureRunIdDefault0: true,
    includeRunIdsInDiagnostic: true,
    missingIdsMessage: "dienststelle tab mutation requires runId and operationId",
    supersededMessage: "dienststelle tab mutation run was superseded"
  };

  function cancelled(_message, _payload, _runtime) {
    return _guardRunUtil.cancelled(_message, _payload, _runtime, DS_GUARD_OPTS);
  }

  function guardRun(_runtime, _payload) {
    return _guardRunUtil.guardRun(_runtime, _payload, DS_GUARD_OPTS);
  }

  function isStale(_runtime, _payload) {
    return _guardRunUtil.isStale(_runtime, _payload, { staleMode: "ds" });
  }

  function resolveScopeIdForSlot(_KDB, _tabTargets, _slot) {
    var tabIdx = _slot && _slot.tabIdx;
    if (typeof tabIdx !== "number") {
      return { ok: false, diagnostics: [{ code: "TABS_MUTATION_PREPARE_FAILED", message: "slot tabIdx is missing for scope resolution", tabId: _slot && _slot.tabId || null }] };
    }
    var resolved = _restoreSupport.resolveScopeId(_KDB, _tabTargets || {}, tabIdx);
    if (!resolved || resolved.ok !== true || !resolved.scopeId) {
      return { ok: false, diagnostics: [{ code: "TABS_MUTATION_PREPARE_FAILED", message: "scopeId could not be resolved for tabIdx " + tabIdx, tabId: _slot && _slot.tabId || null }] };
    }
    return { ok: true, scopeId: String(resolved.scopeId) };
  }

  function writeSnapshot(_runtime, _operationId, _snapshot) {
    _snapshots.writeSnapshot(_runtime, _operationId, _snapshot);
  }

  function readSnapshot(_runtime, _operationId) {
    return _snapshots.readSnapshot(_runtime, _operationId);
  }

  function deleteSnapshot(_runtime, _operationId) {
    _snapshots.deleteSnapshot(_runtime, _operationId);
  }

  return {
    guardRun: guardRun,
    isStale: isStale,
    cancelled: cancelled,
    resolveScopeIdForSlot: resolveScopeIdForSlot,
    writeSnapshot: writeSnapshot,
    readSnapshot: readSnapshot,
    deleteSnapshot: deleteSnapshot,
    listAffectedSlots: _listAffectedPlanSlots
  };
});
