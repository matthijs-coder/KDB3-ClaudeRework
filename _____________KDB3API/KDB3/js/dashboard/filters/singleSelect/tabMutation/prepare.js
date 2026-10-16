define([
  "./guard.js",
  "./transfers.js",
  "../hostFilterIo.js",
  "../runtime.js",
  "../config.js",
  "../../_core/tabMutation.js"
], function (_support, _transfers, _hostFilterIo, _singleSelectRuntime, _config, _tabMutation) {
  "use strict";

  var OPERATIONS = ["delete", "move", "duplicate", "restoreDeleted"];

  function planFailure(_message) {
    return { ok: false, diagnostics: [{ code: _config.errorCodes.TAB_MUTATION_PREPARE_FAILED, message: _message }] };
  }

  function resolveScopeIds(_instances, _payload, _slots) {
    var scopeIds = [];
    var diagnostics = [];
    _slots.forEach(function (_slot) {
      var resolved = _support.resolveScope(_instances, _payload.tabIdxToScopeId || {}, _slot);
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
    return { scopeIds: scopeIds, diagnostics: diagnostics };
  }

  function capture(_ctx, _payload) {
    var KDB = _ctx._KDB;
    var instances = KDB.state.filters.singleSelect.instancesById || {};
    var planWork = _transfers.buildTabMutationTransfers(_payload.plan);
    if (!_payload.plan || OPERATIONS.indexOf(_payload.plan.operation) === -1) {
      return planFailure("unsupported or missing tab mutation plan");
    }
    if (planWork.affectedSlots.length === 0) {
      return planFailure("tab mutation plan contains no semantic transfer or clear work");
    }
    var resolved = resolveScopeIds(instances, _payload, planWork.affectedSlots);
    if (resolved.diagnostics.length > 0) { return { ok: false, diagnostics: resolved.diagnostics }; }
    var diagnostics = [];
    var filtersFacet = _singleSelectRuntime.readFiltersFacet(KDB, _ctx.runtime);
    var snapshot = { operationId: _payload.operationId, runId: _payload.runId, plan: _payload.plan, byId: {} };
    for (var s = 0; s < resolved.scopeIds.length; s += 1) {
      var records = _support.instancesInScope(instances, resolved.scopeIds[s]);
      for (var i = 0; i < records.length; i += 1) {
        var filterRef = _hostFilterIo.resolveFilterRef(KDB, _ctx.runtime, { filterInstanceId: records[i].filterInstanceId });
        if (!filterRef || !_hostFilterIo.isWriteReady(filtersFacet)) {
          diagnostics.push({
            code: _config.errorCodes.TAB_MUTATION_PREPARE_FAILED,
            filterInstanceId: records[i].filterInstanceId,
            message: "runtime host filter reference missing during snapshot"
          });
          continue;
        }
        snapshot.byId[records[i].filterInstanceId] = _support.cloneSnapshotRecord(
          records[i],
          _hostFilterIo.readValues(filtersFacet, filterRef)
        );
      }
    }
    if (diagnostics.length > 0) { return { ok: false, diagnostics: diagnostics }; }
    return { ok: true, snapshot: snapshot, scopeIds: resolved.scopeIds };
  }

  function historySlice(_ctx, _payload, _snapshot, _slot) {
    var instances = _ctx._KDB.state.filters.singleSelect.instancesById || {};
    var slice = {};
    var resolved = _support.resolveScope(instances, _payload.tabIdxToScopeId || {}, _slot);
    if (resolved.status === "ok") {
      _support.instancesInScope(instances, resolved.scopeId).forEach(function (_record) {
        if (_snapshot.byId && _snapshot.byId[_record.filterInstanceId]) {
          slice[_record.filterInstanceId] = _snapshot.byId[_record.filterInstanceId];
        }
      });
    }
    return slice;
  }

  var prepare = _tabMutation.createPrepare(_support.tabMutationBase, {
    logOperationId: true,
    rejected: function (_guard) { return _guard; },
    capture: capture,
    historySlice: historySlice
  });

  function prepareTabMutation(_KDB, _runtime, _payload) {
    return prepare({ _KDB: _KDB, runtime: _runtime }, _payload);
  }

  return { prepareTabMutation: prepareTabMutation };
});
