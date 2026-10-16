define([
  "./state.js",
  "./tabMutationScopes.js",
  "./restore/scopeTargets.js",
  "./effects/hostScope/filterRef.js",
  "./effects/hostScope/apply.js",
  "./effects/hostScope/clear.js",
  "../_core/tabMutation.js",
  "../_core/tabMutationScopes.js",
  "../../../core/utils/filters/tabMutationRun/listAffectedPlanSlots.js"
], function (_state, _scopes, _scopeTargets, _filterRef, _applyScope, _clearScope, _tabMutation, _kitScopes, _listAffectedPlanSlots) {
  "use strict";

  var ACTIONS = _state.ACTIONS;
  var CODES = _tabMutation.CODES;
  var base = _scopes.tabMutationBase;
  var slotOfMove = _kitScopes.slotOfMove;
  var disposedTabMutationResult = _tabMutation.createDisposedResult("dienststelle controller is disposed");

  function isTabMutationAction(_type) {
    return _type === ACTIONS.PREPARE_TAB_MUTATION ||
      _type === ACTIONS.APPLY_TAB_MUTATION ||
      _type === ACTIONS.RESTORE_TAB_MUTATION_SNAPSHOT ||
      _type === ACTIONS.RESYNC_TAB_MUTATION_HOST;
  }

  function disposedResult(_payload) {
    return disposedTabMutationResult({ payload: _payload });
  }

  function supersededResult(_ctx, _payload, _appliedScopes, _clearedScopes) {
    return _tabMutation.supersededResult(base, _ctx, _payload, _appliedScopes, _clearedScopes, "dienststelle apply superseded");
  }

  function successResult(_payload, _appliedScopes, _clearedScopes) {
    return _tabMutation.applySuccess(_payload.operationId, _appliedScopes, _clearedScopes, []);
  }

  function missingSnapshotResult(_payload) {
    return _tabMutation.applyFailure(_payload.operationId, [], [], [{
      code: CODES.APPLY_FAILED,
      message: "dienststelle prepare snapshot missing"
    }]);
  }

  async function applyDeleteMutation(_ctx, payload) {
    var tabTargets = payload.tabIdxToScopeId || {};
    var resolvedDeleted = _scopes.resolveScopeIdForSlot(_ctx._KDB, tabTargets, payload.plan.deletedSlot);
    var appliedScopes = [];
    var clearedScopes = [];
    var diagnostics = [];
    var moves;
    var idx;
    var fromResolved;
    var toResolved;
    if (!resolvedDeleted.ok) { return _tabMutation.applyFailure(payload.operationId, [], [], resolvedDeleted.diagnostics); }
    await _scopes.clearScopeForAllFilters(_ctx, resolvedDeleted.scopeId, payload, clearedScopes, diagnostics);
    if (base.guard.isStale(_ctx.runtime, payload)) { return supersededResult(_ctx, payload, appliedScopes, clearedScopes); }
    moves = (payload.plan.slotMoves || []).slice().sort(function (a, b) {
      return Number(a.fromTabIdx || 0) - Number(b.fromTabIdx || 0);
    });
    for (idx = 0; idx < moves.length; idx += 1) {
      if (base.guard.isStale(_ctx.runtime, payload)) { return supersededResult(_ctx, payload, appliedScopes, clearedScopes); }
      fromResolved = _scopes.resolveScopeIdForSlot(_ctx._KDB, tabTargets, slotOfMove(moves[idx], "from"));
      toResolved = _scopes.resolveScopeIdForSlot(_ctx._KDB, tabTargets, slotOfMove(moves[idx], "to"));
      if (!fromResolved.ok || !toResolved.ok) {
        diagnostics = diagnostics.concat(fromResolved.diagnostics || [], toResolved.diagnostics || []);
        continue;
      }
      await _scopes.moveScopeForAllFilters(_ctx, fromResolved.scopeId, toResolved.scopeId, payload, appliedScopes, clearedScopes, diagnostics);
    }
    if (diagnostics.length > 0) { return _tabMutation.applyFailure(payload.operationId, appliedScopes, clearedScopes, diagnostics); }
    return successResult(payload, appliedScopes, clearedScopes);
  }

  // Writes the source scope's snapshot entry into the target scope of one slot move.
  // Returns false (after recording diagnostics) when the move cannot be applied.
  async function shiftScopeFromSnapshot(_ctx, payload, snapshot, move, appliedScopes, diagnostics) {
    var tabTargets = payload.tabIdxToScopeId || {};
    var fromResolved = _scopes.resolveScopeIdForSlot(_ctx._KDB, tabTargets, slotOfMove(move, "from"));
    var toResolved = _scopes.resolveScopeIdForSlot(_ctx._KDB, tabTargets, slotOfMove(move, "to"));
    var sourceByFilter;
    if (!fromResolved.ok || !toResolved.ok) {
      Array.prototype.push.apply(diagnostics, (fromResolved.diagnostics || []).concat(toResolved.diagnostics || []));
      return false;
    }
    sourceByFilter = snapshot.byScope[fromResolved.scopeId];
    if (!sourceByFilter) {
      diagnostics.push({ code: CODES.APPLY_FAILED, scopeId: fromResolved.scopeId, message: "snapshot scope entry missing" });
      return false;
    }
    await _scopes.writeScopeFromSnapshot(_ctx, toResolved.scopeId, sourceByFilter, payload, appliedScopes, diagnostics);
    return true;
  }

  async function applyMoveMutation(_ctx, payload) {
    var snapshot = _tabMutation.readRunSnapshot(_ctx.runtime, payload);
    var tabTargets = payload.tabIdxToScopeId || {};
    var appliedScopes = [];
    var clearedScopes = [];
    var diagnostics = [];
    var moves = payload.plan.slotMoves || [];
    var fromScopeIds;
    var idx;
    if (!snapshot) { return missingSnapshotResult(payload); }
    fromScopeIds = _kitScopes.collectFromScopeIds(_scopes.resolveScopeIdForSlot, _ctx._KDB, tabTargets, moves, diagnostics);
    if (diagnostics.length > 0) { return _tabMutation.applyFailure(payload.operationId, appliedScopes, clearedScopes, diagnostics); }
    for (idx = 0; idx < fromScopeIds.length; idx += 1) {
      await _scopes.clearScopeForAllFilters(_ctx, fromScopeIds[idx], payload, clearedScopes, diagnostics);
      if (base.guard.isStale(_ctx.runtime, payload)) { return supersededResult(_ctx, payload, appliedScopes, clearedScopes); }
    }
    for (idx = 0; idx < moves.length; idx += 1) {
      if (base.guard.isStale(_ctx.runtime, payload)) { return supersededResult(_ctx, payload, appliedScopes, clearedScopes); }
      await shiftScopeFromSnapshot(_ctx, payload, snapshot, moves[idx], appliedScopes, diagnostics);
    }
    if (diagnostics.length > 0) { return _tabMutation.applyFailure(payload.operationId, appliedScopes, clearedScopes, diagnostics); }
    return successResult(payload, appliedScopes, clearedScopes);
  }

  // Shared by duplicate and restoreDeleted: shifts every slot move first. Returns a failure
  // result, or null when all moves were applied.
  async function shiftAllMoves(_ctx, payload, snapshot, appliedScopes, diagnostics) {
    var moves = payload.plan.slotMoves || [];
    var idx;
    for (idx = 0; idx < moves.length; idx += 1) {
      if (base.guard.isStale(_ctx.runtime, payload)) { return supersededResult(_ctx, payload, appliedScopes, []); }
      if (await shiftScopeFromSnapshot(_ctx, payload, snapshot, moves[idx], appliedScopes, diagnostics) === false) {
        return _tabMutation.applyFailure(payload.operationId, appliedScopes, [], diagnostics);
      }
    }
    if (base.guard.isStale(_ctx.runtime, payload)) { return supersededResult(_ctx, payload, appliedScopes, []); }
    return null;
  }

  async function applyDuplicateMutation(_ctx, payload) {
    var snapshot = _tabMutation.readRunSnapshot(_ctx.runtime, payload);
    var tabTargets = payload.tabIdxToScopeId || {};
    var appliedScopes = [];
    var diagnostics = [];
    var clonePair = payload.plan.clonePair || {};
    var shifted;
    var fromResolved;
    var toResolved;
    var cloneSource;
    if (!snapshot) { return missingSnapshotResult(payload); }
    shifted = await shiftAllMoves(_ctx, payload, snapshot, appliedScopes, diagnostics);
    if (shifted) { return shifted; }
    fromResolved = _scopes.resolveScopeIdForSlot(_ctx._KDB, tabTargets, clonePair.from || payload.plan.sourceSlot);
    toResolved = _scopes.resolveScopeIdForSlot(_ctx._KDB, tabTargets, clonePair.to || payload.plan.insertSlot);
    if (!fromResolved.ok || !toResolved.ok) {
      diagnostics = diagnostics.concat(fromResolved.diagnostics || [], toResolved.diagnostics || []);
      return _tabMutation.applyFailure(payload.operationId, appliedScopes, [], diagnostics);
    }
    cloneSource = snapshot.byScope[fromResolved.scopeId];
    if (!cloneSource) {
      diagnostics.push({
        code: CODES.APPLY_FAILED,
        scopeId: fromResolved.scopeId,
        message: "snapshot scope entry missing for clone source"
      });
      return _tabMutation.applyFailure(payload.operationId, appliedScopes, [], diagnostics);
    }
    await _scopes.writeScopeFromSnapshot(_ctx, toResolved.scopeId, cloneSource, payload, appliedScopes, diagnostics);
    if (diagnostics.length > 0) { return _tabMutation.applyFailure(payload.operationId, appliedScopes, [], diagnostics); }
    return successResult(payload, appliedScopes, []);
  }

  async function applyRestoreDeletedMutation(_ctx, payload) {
    try {
      return await runRestoreDeletedMutation(_ctx, payload);
    } catch (error) {
      console.error("[dienststelle.applyTabMutationRestoreDeleted] failed", error);
      return _tabMutation.applyFailure(payload.operationId, [], [], [{
        code: CODES.APPLY_FAILED,
        message: _tabMutation.errorMessage(error)
      }]);
    }
  }

  async function runRestoreDeletedMutation(_ctx, payload) {
    var snapshot = _tabMutation.readRunSnapshot(_ctx.runtime, payload);
    var appliedScopes = [];
    var diagnostics = [];
    var restoreFilters = payload.plan.restore && payload.plan.restore.filters && payload.plan.restore.filters.dienststelle || {};
    var shifted;
    var toResolved;
    if (!snapshot) { return missingSnapshotResult(payload); }
    shifted = await shiftAllMoves(_ctx, payload, snapshot, appliedScopes, diagnostics);
    if (shifted) { return shifted; }
    toResolved = _scopes.resolveScopeIdForSlot(_ctx._KDB, payload.tabIdxToScopeId || {}, payload.plan.insertSlot);
    if (!toResolved.ok) {
      diagnostics = diagnostics.concat(toResolved.diagnostics || []);
      return _tabMutation.applyFailure(payload.operationId, appliedScopes, [], diagnostics);
    }
    await _scopes.writeScopeFromSnapshot(_ctx, toResolved.scopeId, restoreFilters, payload, appliedScopes, diagnostics);
    if (diagnostics.length > 0) { return _tabMutation.applyFailure(payload.operationId, appliedScopes, [], diagnostics); }
    return successResult(payload, appliedScopes, []);
  }

  // Only restoreDeleted converts a thrown error into a result; the other operations let it reach the caller.
  var applyTabMutation = _tabMutation.createApply(base, {
    unsupportedMessage: "dienststelle apply supports delete, move, duplicate, and restoreDeleted",
    operations: {
      delete: applyDeleteMutation,
      move: applyMoveMutation,
      duplicate: applyDuplicateMutation,
      restoreDeleted: applyRestoreDeletedMutation
    }
  });

  async function restoreHostScope(_KDB, _filterKey, _scopeId, _snapshotEntry) {
    var currentValues = _snapshotEntry && _snapshotEntry.currentValues || [];
    var filtersFacet = _filterRef.readFiltersFacet(_KDB);
    var cleared;
    var filterRef;
    var outcome;
    if (currentValues.length === 0) {
      cleared = await _clearScope.clearFilterScope(_KDB, _filterKey, _scopeId, filtersFacet);
      return !!(cleared && cleared.ok === true);
    }
    filterRef = _scopeTargets.lookupScopeFilterRef(_KDB, _filterKey, _scopeId);
    if (!filtersFacet || !filterRef) { return false; }
    outcome = await filtersFacet.writeFilter({ ref: filterRef, values: _applyScope.toCognosValues(currentValues) });
    return !!(outcome && outcome.ok === true);
  }

  async function runRestore(_ctx, payload, snapshot) {
    var restored = [];
    var unrecoverable = [];
    var diagnostics = [];
    var scopeIds = Object.keys(snapshot.byScope || {});
    var byFilter;
    var filterKeys;
    var sIdx;
    var fIdx;
    var scopeId;
    var filterKey;
    for (sIdx = 0; sIdx < scopeIds.length; sIdx += 1) {
      scopeId = scopeIds[sIdx];
      byFilter = snapshot.byScope[scopeId] || {};
      filterKeys = Object.keys(byFilter);
      for (fIdx = 0; fIdx < filterKeys.length; fIdx += 1) {
        filterKey = filterKeys[fIdx];
        _scopes.dispatchScopeWrite(_ctx, filterKey, scopeId, byFilter[filterKey], false);
        if (await restoreHostScope(_ctx._KDB, filterKey, scopeId, byFilter[filterKey])) {
          _scopes.pushUnique(restored, scopeId);
        } else {
          _scopes.pushUnique(unrecoverable, scopeId);
          diagnostics.push({
            code: CODES.ROLLBACK_INCOMPLETE,
            filterKey: filterKey,
            scopeId: scopeId,
            message: "dienststelle host scope restore failed"
          });
        }
      }
    }
    return _tabMutation.restoreResult(unrecoverable.length === 0, payload.operationId, restored, unrecoverable, diagnostics);
  }

  // A stale-guard rejection has no side effects: the snapshot stays available as the operation's only recovery path.
  // The snapshot is released after a finished walk only: a thrown error leaves it to the saga's own release.
  var restoreTabMutationSnapshot = _tabMutation.createRestore(base, { release: "afterRun", run: runRestore });

  async function runResync(_ctx, payload, diagnostics) {
    var tabTargets = payload.tabIdxToScopeId || {};
    var affectedSlots = _listAffectedPlanSlots(payload.plan, { dedupeByTabIdx: true, includeSourceSlot: false });
    var resolved;
    var idx;
    for (idx = 0; idx < affectedSlots.length; idx += 1) {
      resolved = _scopes.resolveScopeIdForSlot(_ctx._KDB, tabTargets, affectedSlots[idx]);
      if (!resolved.ok) {
        diagnostics.push.apply(diagnostics, resolved.diagnostics || []);
        continue;
      }
      await _scopes.resyncHostScope(_ctx._KDB, resolved.scopeId, diagnostics);
    }
  }

  var resyncTabMutationHost = _tabMutation.createResync(base, { run: runResync });

  function routeTabMutationAction(_ctx, _action) {
    var action = _action || {};
    var payload = action.payload || {};
    if (action.type === ACTIONS.PREPARE_TAB_MUTATION) {
      return _scopes.prepareTabMutation(_ctx, payload);
    }
    if (action.type === ACTIONS.APPLY_TAB_MUTATION) {
      return applyTabMutation(_ctx, payload);
    }
    if (action.type === ACTIONS.RESYNC_TAB_MUTATION_HOST) {
      return resyncTabMutationHost(_ctx, payload);
    }
    return restoreTabMutationSnapshot(_ctx, payload);
  }

  return {
    isTabMutationAction: isTabMutationAction,
    disposedResult: disposedResult,
    routeTabMutationAction: routeTabMutationAction
  };
});
