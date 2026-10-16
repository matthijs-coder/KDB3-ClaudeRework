define([
  "./guardTabMutation.js",
  "./buildTabMutationTransfers.js",
  "../../effects/resolveFilterRef.js",
  "../../effects/readFiltersFacet.js",
  "../../effects/hostFilterWrite.js",
  "../../config.js"
], function (_support, _buildTransfers, _resolveFilterRef, _readFiltersFacet, _hostWrite, _config) {
  "use strict";

  function failure(_operationId, _diagnostics) {
    return {
      ok: false,
      operationId: _operationId || null,
      snapshotScopes: [],
      diagnostics: _diagnostics
    };
  }

  async function __controller(_KDB, _runtime, _payload) {
    var payload = _payload || {};
    try {
      var guard = _support.guardRun(_runtime, payload);
      if (guard) { return guard; }
      var root = _KDB.state.filters.singleSelect;
      var instances = root.instancesById || {};
      var planWork = _buildTransfers(payload.plan);
      if (!payload.plan || ["delete", "move", "duplicate", "restoreDeleted"].indexOf(payload.plan.operation) === -1) {
        return failure(payload.operationId, [{
          code: _config.errorCodes.TAB_MUTATION_PREPARE_FAILED,
          message: "unsupported or missing tab mutation plan"
        }]);
      }
      if (planWork.affectedSlots.length === 0) {
        return failure(payload.operationId, [{
          code: _config.errorCodes.TAB_MUTATION_PREPARE_FAILED,
          message: "tab mutation plan contains no semantic transfer or clear work"
        }]);
      }
      var scopeIds = [];
      var diagnostics = [];
      planWork.affectedSlots.forEach(function (_slot) {
        var resolved = _support.resolveScope(instances, payload.tabIdxToScopeId || {}, _slot);
        if (resolved.status !== "ok") {
          diagnostics.push({
            code: _config.errorCodes.SCOPE_TARGET_UNVERIFIED,
            message: "tab mutation scope target is not verified",
            tabId: _slot.tabId
          });
        } else if (scopeIds.indexOf(resolved.scopeId) === -1) {
          scopeIds.push(resolved.scopeId);
        }
      });
      if (diagnostics.length > 0) { return failure(payload.operationId, diagnostics); }
      var filtersFacet = _readFiltersFacet(_KDB, _runtime);
      var snapshot = {
        operationId: payload.operationId,
        runId: payload.runId,
        plan: payload.plan,
        byId: {}
      };
      for (var s = 0; s < scopeIds.length; s += 1) {
        var records = _support.instancesInScope(instances, scopeIds[s]);
        for (var i = 0; i < records.length; i += 1) {
          var filterRef = _resolveFilterRef.resolveFilterRef(
            _KDB, _runtime, { filterInstanceId: records[i].filterInstanceId }
          );
          if (!filterRef || !_hostWrite.isWriteReady(filtersFacet)) {
            diagnostics.push({
              code: _config.errorCodes.TAB_MUTATION_PREPARE_FAILED,
              filterInstanceId: records[i].filterInstanceId,
              message: "runtime host filter reference missing during snapshot"
            });
            continue;
          }
          snapshot.byId[records[i].filterInstanceId] = _support.cloneSnapshotRecord(
            records[i],
            _hostWrite.readValues(filtersFacet, filterRef)
          );
        }
      }
      if (diagnostics.length > 0) { return failure(payload.operationId, diagnostics); }
      _runtime.tabMutationSnapshots = _runtime.tabMutationSnapshots || {};
      _runtime.tabMutationSnapshots[payload.operationId] = snapshot;
      return attachDeleteHistorySlice(payload.plan, instances, payload.tabIdxToScopeId || {}, snapshot, {
        ok: true,
        operationId: payload.operationId,
        snapshotScopes: scopeIds,
        diagnostics: []
      });
    } catch (error) {
      console.error("[singleSelect.prepareTabMutation] failed", {
        operationId: payload.operationId
      }, error);
      return failure(payload.operationId, [{
        code: _config.errorCodes.TAB_MUTATION_PREPARE_FAILED,
        message: String(error && error.message ? error.message : error)
      }]);
    }
  }

  function attachDeleteHistorySlice(_plan, _instances, _tabTargets, _snapshot, _result) {
    var slot;
    var resolved;
    var historySlice;
    if (!_plan || (_plan.operation !== "delete" && _plan.operation !== "duplicate")) { return _result; }
    slot = _plan.operation === "delete"
      ? (_plan.deletedSlot || {})
      : (_plan.sourceSlot || (_plan.clonePair && _plan.clonePair.from) || {});
    historySlice = {};
    resolved = _support.resolveScope(_instances, _tabTargets, slot);
    if (resolved.status === "ok") {
      _support.instancesInScope(_instances, resolved.scopeId).forEach(function (_record) {
        if (_snapshot.byId && _snapshot.byId[_record.filterInstanceId]) {
          historySlice[_record.filterInstanceId] = _snapshot.byId[_record.filterInstanceId];
        }
      });
    }
    _result.historySlice = historySlice;
    return _result;
  }

  return __controller;
});
