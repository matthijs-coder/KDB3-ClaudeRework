define([
  "../config.js",
  "../state.js",
  "../inventory.js",
  "../hostFilterIo.js",
  "./guard.js",
  "../../_core/tabMutation.js",
  "../../_core/tabMutationScopes.js",
  "../../../../core/utils/filters/tabMutationRun/listAffectedPlanSlots.js"
], function (_config, _state, _inventory, _hostFilterIo, _guard, _tabMutation, _scopes, _listAffectedPlanSlots) {
  "use strict";

  var actions = _config.actions;
  var codes = _config.tabMutationCodes;

  // ---------- prepare ----------

  function buildSnapshot(_KDB, _filtersFacet, _scopeIds, _runId, _operationId) {
    var snapshot = { runId: _runId, operationId: _operationId, byScope: {} };
    var scopeIdx;
    for (scopeIdx = 0; scopeIdx < _scopeIds.length; scopeIdx += 1) {
      var scopeId = _scopeIds[scopeIdx];
      snapshot.byScope[scopeId] = _inventory.listUnownedItems(_KDB, scopeId, _filtersFacet);
    }
    return snapshot;
  }

  function capture(_ctx, _payload) {
    if (!_payload.plan) {
      return { ok: false, diagnostics: [{ code: codes.PREPARE_FAILED, message: "tab mutation plan is missing" }] };
    }
    var resolved = _scopes.resolveAffectedScopes(
      _guard.resolveScopeIdForSlot, _ctx._KDB, _payload.tabIdxToScopeId || {}, _listAffectedPlanSlots(_payload.plan)
    );
    if (!resolved.ok) { return { ok: false, diagnostics: resolved.diagnostics }; }
    return {
      ok: true,
      snapshot: buildSnapshot(_ctx._KDB, _ctx.filtersFacet, resolved.scopeIds, _payload.runId, _payload.operationId),
      scopeIds: resolved.scopeIds
    };
  }

  // Delete and duplicate hand the source tab's items to the tabs saga as the history slice.
  function historySlice(_ctx, _payload, _snapshot, _slot) {
    var resolved = _guard.resolveScopeIdForSlot(_ctx._KDB, _payload.tabIdxToScopeId || {}, _slot);
    if (resolved && resolved.ok === true && !resolved.skip && resolved.scopeId && _snapshot.byScope) {
      return _snapshot.byScope[resolved.scopeId] || [];
    }
    return [];
  }

  var prepareTabMutation = _tabMutation.createPrepare(_guard.tabMutationBase, { capture: capture, historySlice: historySlice });

  // ---------- restore ----------

  async function restoreHostItem(_KDB, _itemId, _scopeId, _values, _filtersFacet) {
    var filterRef = _inventory.lookupRef(_KDB, _itemId, _scopeId, _filtersFacet);
    var written;
    if (!_filtersFacet || !filterRef) { return false; }
    written = await _hostFilterIo.writeRef(_filtersFacet, filterRef, Array.isArray(_values) ? _values : []);
    return written.ok;
  }

  async function run(_ctx, _payload, _snapshot) {
    var restored = [];
    var unrecoverable = [];
    var diagnostics = [];
    var scopeId = null;
    var scopeIds = Object.keys(_snapshot.byScope || {});
    try {
      var sIdx;
      for (sIdx = 0; sIdx < scopeIds.length; sIdx += 1) {
        scopeId = scopeIds[sIdx];
        var items = (_snapshot.byScope[scopeId] || []).map(_state.cloneItem);
        _ctx.dispatchInternal({
          type: actions.TAB_MUTATION_SCOPE_WRITE,
          payload: { scopeId: scopeId, items: items, clear: false }
        });
        var i;
        for (i = 0; i < items.length; i += 1) {
          var hostOk = await restoreHostItem(_ctx._KDB, items[i].itemId, scopeId, items[i].values, _ctx.filtersFacet);
          if (!hostOk) {
            _scopes.pushUnique(unrecoverable, scopeId);
            diagnostics.push({ code: codes.ROLLBACK_INCOMPLETE, itemId: items[i].itemId, scopeId: scopeId, message: "NativeMultiSelect host scope restore failed" });
          } else {
            _scopes.pushUnique(restored, scopeId);
          }
        }
      }
      return _tabMutation.restoreResult(unrecoverable.length === 0, _payload.operationId, restored, unrecoverable, diagnostics);
    } catch (error) {
      console.error("[nativeMultiSelect.restoreTabMutationSnapshot] failed", { operationId: _payload.operationId }, error);
      scopeIds.slice(Math.max(scopeIds.indexOf(scopeId), 0)).forEach(function (_id) { _scopes.pushUnique(unrecoverable, _id); });
      diagnostics.push({ code: codes.ROLLBACK_INCOMPLETE, scopeId: scopeId, message: _tabMutation.errorMessage(error) });
      return _tabMutation.restoreResult(false, _payload.operationId, restored, unrecoverable, diagnostics);
    }
  }

  var restoreTabMutationSnapshot = _tabMutation.createRestore(_guard.tabMutationBase, { release: "always", run: run });

  return {
    prepareTabMutation: prepareTabMutation,
    restoreTabMutationSnapshot: restoreTabMutationSnapshot
  };
});
