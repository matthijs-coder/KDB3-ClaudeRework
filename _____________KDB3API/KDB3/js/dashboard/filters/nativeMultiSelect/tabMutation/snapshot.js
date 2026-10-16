define([
  "../config.js",
  "../state.js",
  "../inventory.js",
  "../hostFilterIo.js",
  "./guard.js",
  "../../../../core/utils/filters/tabMutationRun/tabMutationSnapshots.js",
  "../../../../core/utils/filters/tabMutationRun/listAffectedPlanSlots.js"
], function (_config, _state, _inventory, _hostFilterIo, _guard, _snapshots, _listAffectedPlanSlots) {
  "use strict";

  var actions = _config.actions;
  var codes = _config.tabMutationCodes;

  function errorMessage(_error) {
    return String(_error && _error.message ? _error.message : _error);
  }

  // ---------- prepare ----------

  function withFailure(_operationId, _diagnostics) {
    return { ok: false, operationId: _operationId || null, snapshotScopes: [], diagnostics: _diagnostics || [] };
  }

  function resolveAffectedScopes(_KDB, _tabTargets, _plan) {
    var scopeIds = [];
    var diagnostics = [];
    var slots = _listAffectedPlanSlots(_plan);
    var idx;
    for (idx = 0; idx < slots.length; idx += 1) {
      var resolved = _guard.resolveScopeIdForSlot(_KDB, _tabTargets, slots[idx]);
      if (!resolved.ok) { diagnostics = diagnostics.concat(resolved.diagnostics || []); continue; }
      if (resolved.skip) { continue; }
      _guard.pushUnique(scopeIds, resolved.scopeId);
    }
    return diagnostics.length > 0 ? { ok: false, scopeIds: [], diagnostics: diagnostics } : { ok: true, scopeIds: scopeIds, diagnostics: [] };
  }

  function buildSnapshot(_KDB, _filtersFacet, _scopeIds, _runId, _operationId) {
    var snapshot = { runId: _runId, operationId: _operationId, byScope: {} };
    var scopeIdx;
    for (scopeIdx = 0; scopeIdx < _scopeIds.length; scopeIdx += 1) {
      var scopeId = _scopeIds[scopeIdx];
      snapshot.byScope[scopeId] = _inventory.listUnownedItems(_KDB, scopeId, _filtersFacet);
    }
    return snapshot;
  }

  // Delete and duplicate hand the source tab's items to the tabs saga as the history slice.
  function attachHistorySlice(_KDB, _tabTargets, _plan, _snapshot, _result) {
    var slot;
    var resolved;
    var slice = [];
    if (!_plan || (_plan.operation !== "delete" && _plan.operation !== "duplicate")) { return _result; }
    slot = _plan.operation === "delete"
      ? (_plan.deletedSlot || {})
      : (_plan.sourceSlot || (_plan.clonePair && _plan.clonePair.from) || {});
    resolved = _guard.resolveScopeIdForSlot(_KDB, _tabTargets, slot);
    if (resolved && resolved.ok === true && !resolved.skip && resolved.scopeId && _snapshot.byScope) {
      slice = _snapshot.byScope[resolved.scopeId] || [];
    }
    _result.historySlice = slice;
    return _result;
  }

  async function prepareTabMutation(_ctx, _payload) {
    var payload = _payload || {};
    try {
      var guard = _guard.guardRun(_ctx.runtime, payload);
      if (guard) { return withFailure(payload.operationId, guard.diagnostics); }
      if (!payload.plan) {
        return withFailure(payload.operationId, [{ code: codes.PREPARE_FAILED, message: "tab mutation plan is missing" }]);
      }
      var tabTargets = payload.tabIdxToScopeId || {};
      var resolved = resolveAffectedScopes(_ctx._KDB, tabTargets, payload.plan);
      if (!resolved.ok) { return withFailure(payload.operationId, resolved.diagnostics); }
      var snapshot = buildSnapshot(_ctx._KDB, _ctx.filtersFacet, resolved.scopeIds, payload.runId, payload.operationId);
      _snapshots.writeSnapshot(_ctx.runtime, payload.operationId, snapshot);
      return attachHistorySlice(_ctx._KDB, tabTargets, payload.plan, snapshot, {
        ok: true, operationId: payload.operationId, snapshotScopes: resolved.scopeIds, diagnostics: []
      });
    } catch (error) {
      console.error("[nativeMultiSelect.prepareTabMutation] failed", error);
      return withFailure(payload.operationId, [{ code: codes.PREPARE_FAILED, message: errorMessage(error) }]);
    }
  }

  // ---------- restore ----------

  function buildResult(_ok, _operationId, _restored, _unrecoverable, _diagnostics, _errorCode) {
    var result = {
      ok: _ok,
      operationId: _operationId || null,
      restored: _restored || [],
      unrecoverable: _unrecoverable || [],
      diagnostics: _diagnostics || []
    };
    if (_errorCode) { result.errorCode = _errorCode; }
    return result;
  }

  async function restoreHostItem(_KDB, _itemId, _scopeId, _values, _filtersFacet) {
    var filterRef = _inventory.lookupRef(_KDB, _itemId, _scopeId, _filtersFacet);
    var written;
    if (!_filtersFacet || !filterRef) { return false; }
    written = await _hostFilterIo.writeRef(_filtersFacet, filterRef, Array.isArray(_values) ? _values : []);
    return written.ok;
  }

  async function restoreTabMutationSnapshot(_ctx, _payload) {
    var payload = _payload || {};
    var guard = _guard.guardRun(_ctx.runtime, payload);
    if (guard) {
      return buildResult(false, payload.operationId, [], [], guard.diagnostics, guard.errorCode || codes.CANCELLED);
    }
    var snapshot = _snapshots.readSnapshot(_ctx.runtime, payload.operationId);
    if (!snapshot) { return buildResult(true, payload.operationId, [], [], []); }
    var restored = [];
    var unrecoverable = [];
    var diagnostics = [];
    var scopeIds = Object.keys(snapshot.byScope || {});
    var sIdx;
    for (sIdx = 0; sIdx < scopeIds.length; sIdx += 1) {
      var scopeId = scopeIds[sIdx];
      var items = (snapshot.byScope[scopeId] || []).map(_state.cloneItem);
      _ctx.dispatchInternal({
        type: actions.TAB_MUTATION_SCOPE_WRITE,
        payload: { scopeId: scopeId, items: items, clear: false }
      });
      var i;
      for (i = 0; i < items.length; i += 1) {
        var hostOk = await restoreHostItem(_ctx._KDB, items[i].itemId, scopeId, items[i].values, _ctx.filtersFacet);
        if (!hostOk) {
          _guard.pushUnique(unrecoverable, scopeId);
          diagnostics.push({ code: codes.ROLLBACK_INCOMPLETE, itemId: items[i].itemId, scopeId: scopeId, message: "NativeMultiSelect host scope restore failed" });
        } else {
          _guard.pushUnique(restored, scopeId);
        }
      }
    }
    _snapshots.deleteSnapshot(_ctx.runtime, payload.operationId);
    return buildResult(unrecoverable.length === 0, payload.operationId, restored, unrecoverable, diagnostics);
  }

  return {
    prepareTabMutation: prepareTabMutation,
    restoreTabMutationSnapshot: restoreTabMutationSnapshot
  };
});
