define([
  "./state.js",
  "./tabMutationScopes.js",
  "./restore/scopeTargets.js",
  "./effects/hostScope/filterRef.js",
  "./effects/hostScope/apply.js",
  "./effects/hostScope/clear.js"
], function (_state, _scopes, _scopeTargets, _filterRef, _applyScope, _clearScope) {
  "use strict";

  var ACTIONS = _state.ACTIONS;
  var APPLY_OPERATIONS = ["delete", "move", "duplicate", "restoreDeleted"];

  function isTabMutationAction(_type) {
    return _type === ACTIONS.PREPARE_TAB_MUTATION ||
      _type === ACTIONS.APPLY_TAB_MUTATION ||
      _type === ACTIONS.RESTORE_TAB_MUTATION_SNAPSHOT ||
      _type === ACTIONS.RESYNC_TAB_MUTATION_HOST;
  }

  function disposedResult(_payload) {
    var payload = _payload || {};
    return Promise.resolve({
      ok: false,
      operationId: payload.operationId || null,
      diagnostics: [{ code: "TABS_MUTATION_CANCELLED", message: "dienststelle controller is disposed" }]
    });
  }

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

  function slotOfMove(_move, _side) {
    return _side === "from"
      ? { tabIdx: _move.fromTabIdx, tabId: _move.fromTabId }
      : { tabIdx: _move.toTabIdx, tabId: _move.toTabId };
  }

  function supersededResult(_ctx, _payload, _appliedScopes, _clearedScopes) {
    return _scopes.failed(
      _payload.operationId,
      _appliedScopes,
      _clearedScopes,
      _scopes.cancelled("dienststelle apply superseded", _payload, _ctx.runtime).diagnostics
    );
  }

  function successResult(_payload, _appliedScopes, _clearedScopes) {
    return { ok: true, operationId: _payload.operationId, appliedScopes: _appliedScopes, clearedScopes: _clearedScopes, diagnostics: [] };
  }

  function missingSnapshotResult(_payload) {
    return _scopes.failed(_payload.operationId, [], [], [{
      code: "TABS_MUTATION_APPLY_FAILED",
      message: "dienststelle prepare snapshot missing"
    }]);
  }

  async function applyTabMutation(_ctx, _payload) {
    var payload = _payload || {};
    var guard = _scopes.guardRun(_ctx.runtime, payload);
    var operation = payload.plan && payload.plan.operation;
    if (guard) { return _scopes.failed(payload.operationId, [], [], guard.diagnostics); }
    if (APPLY_OPERATIONS.indexOf(operation) === -1) {
      return _scopes.failed(payload.operationId, [], [], [{
        code: "TABS_MUTATION_APPLY_FAILED",
        message: "dienststelle apply supports delete, move, duplicate, and restoreDeleted"
      }]);
    }
    if (operation === "delete") { return applyDeleteMutation(_ctx, payload); }
    if (operation === "duplicate") { return applyDuplicateMutation(_ctx, payload); }
    if (operation === "restoreDeleted") { return applyRestoreDeletedMutation(_ctx, payload); }
    return applyMoveMutation(_ctx, payload);
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
    if (!resolvedDeleted.ok) { return _scopes.failed(payload.operationId, [], [], resolvedDeleted.diagnostics); }
    await _scopes.clearScopeForAllFilters(_ctx, resolvedDeleted.scopeId, payload, clearedScopes, diagnostics);
    if (_scopes.isStale(_ctx.runtime, payload)) { return supersededResult(_ctx, payload, appliedScopes, clearedScopes); }
    moves = (payload.plan.slotMoves || []).slice().sort(function (a, b) {
      return Number(a.fromTabIdx || 0) - Number(b.fromTabIdx || 0);
    });
    for (idx = 0; idx < moves.length; idx += 1) {
      if (_scopes.isStale(_ctx.runtime, payload)) { return supersededResult(_ctx, payload, appliedScopes, clearedScopes); }
      fromResolved = _scopes.resolveScopeIdForSlot(_ctx._KDB, tabTargets, slotOfMove(moves[idx], "from"));
      toResolved = _scopes.resolveScopeIdForSlot(_ctx._KDB, tabTargets, slotOfMove(moves[idx], "to"));
      if (!fromResolved.ok || !toResolved.ok) {
        diagnostics = diagnostics.concat(fromResolved.diagnostics || [], toResolved.diagnostics || []);
        continue;
      }
      await _scopes.moveScopeForAllFilters(_ctx, fromResolved.scopeId, toResolved.scopeId, payload, appliedScopes, clearedScopes, diagnostics);
    }
    if (diagnostics.length > 0) { return _scopes.failed(payload.operationId, appliedScopes, clearedScopes, diagnostics); }
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
      diagnostics.push({ code: "TABS_MUTATION_APPLY_FAILED", scopeId: fromResolved.scopeId, message: "snapshot scope entry missing" });
      return false;
    }
    await _scopes.writeScopeFromSnapshot(_ctx, toResolved.scopeId, sourceByFilter, payload, appliedScopes, diagnostics);
    return true;
  }

  async function applyMoveMutation(_ctx, payload) {
    var snapshot = _scopes.readSnapshot(_ctx.runtime, payload.operationId);
    var tabTargets = payload.tabIdxToScopeId || {};
    var appliedScopes = [];
    var clearedScopes = [];
    var diagnostics = [];
    var moves = payload.plan.slotMoves || [];
    var fromScopeIds;
    var idx;
    if (!snapshot || snapshot.runId !== payload.runId) { return missingSnapshotResult(payload); }
    fromScopeIds = collectFromScopeIds(_ctx, moves, tabTargets, diagnostics);
    if (diagnostics.length > 0) { return _scopes.failed(payload.operationId, appliedScopes, clearedScopes, diagnostics); }
    for (idx = 0; idx < fromScopeIds.length; idx += 1) {
      await _scopes.clearScopeForAllFilters(_ctx, fromScopeIds[idx], payload, clearedScopes, diagnostics);
      if (_scopes.isStale(_ctx.runtime, payload)) { return supersededResult(_ctx, payload, appliedScopes, clearedScopes); }
    }
    for (idx = 0; idx < moves.length; idx += 1) {
      if (_scopes.isStale(_ctx.runtime, payload)) { return supersededResult(_ctx, payload, appliedScopes, clearedScopes); }
      await shiftScopeFromSnapshot(_ctx, payload, snapshot, moves[idx], appliedScopes, diagnostics);
    }
    if (diagnostics.length > 0) { return _scopes.failed(payload.operationId, appliedScopes, clearedScopes, diagnostics); }
    return successResult(payload, appliedScopes, clearedScopes);
  }

  function collectFromScopeIds(_ctx, _moves, _tabTargets, _diagnostics) {
    var scopeIds = [];
    _moves.forEach(function (move) {
      var resolved = _scopes.resolveScopeIdForSlot(_ctx._KDB, _tabTargets, slotOfMove(move, "from"));
      if (!resolved.ok) {
        Array.prototype.push.apply(_diagnostics, resolved.diagnostics || []);
        return;
      }
      _scopes.pushUnique(scopeIds, resolved.scopeId);
    });
    return scopeIds;
  }

  // Shared by duplicate and restoreDeleted: shifts every slot move first. Returns a failure
  // result, or null when all moves were applied.
  async function shiftAllMoves(_ctx, payload, snapshot, appliedScopes, diagnostics) {
    var moves = payload.plan.slotMoves || [];
    var idx;
    for (idx = 0; idx < moves.length; idx += 1) {
      if (_scopes.isStale(_ctx.runtime, payload)) { return supersededResult(_ctx, payload, appliedScopes, []); }
      if (await shiftScopeFromSnapshot(_ctx, payload, snapshot, moves[idx], appliedScopes, diagnostics) === false) {
        return _scopes.failed(payload.operationId, appliedScopes, [], diagnostics);
      }
    }
    if (_scopes.isStale(_ctx.runtime, payload)) { return supersededResult(_ctx, payload, appliedScopes, []); }
    return null;
  }

  async function applyDuplicateMutation(_ctx, payload) {
    var snapshot = _scopes.readSnapshot(_ctx.runtime, payload.operationId);
    var tabTargets = payload.tabIdxToScopeId || {};
    var appliedScopes = [];
    var diagnostics = [];
    var clonePair = payload.plan.clonePair || {};
    var shifted;
    var fromResolved;
    var toResolved;
    var cloneSource;
    if (!snapshot || snapshot.runId !== payload.runId) { return missingSnapshotResult(payload); }
    shifted = await shiftAllMoves(_ctx, payload, snapshot, appliedScopes, diagnostics);
    if (shifted) { return shifted; }
    fromResolved = _scopes.resolveScopeIdForSlot(_ctx._KDB, tabTargets, clonePair.from || payload.plan.sourceSlot);
    toResolved = _scopes.resolveScopeIdForSlot(_ctx._KDB, tabTargets, clonePair.to || payload.plan.insertSlot);
    if (!fromResolved.ok || !toResolved.ok) {
      diagnostics = diagnostics.concat(fromResolved.diagnostics || [], toResolved.diagnostics || []);
      return _scopes.failed(payload.operationId, appliedScopes, [], diagnostics);
    }
    cloneSource = snapshot.byScope[fromResolved.scopeId];
    if (!cloneSource) {
      diagnostics.push({
        code: "TABS_MUTATION_APPLY_FAILED",
        scopeId: fromResolved.scopeId,
        message: "snapshot scope entry missing for clone source"
      });
      return _scopes.failed(payload.operationId, appliedScopes, [], diagnostics);
    }
    await _scopes.writeScopeFromSnapshot(_ctx, toResolved.scopeId, cloneSource, payload, appliedScopes, diagnostics);
    if (diagnostics.length > 0) { return _scopes.failed(payload.operationId, appliedScopes, [], diagnostics); }
    return successResult(payload, appliedScopes, []);
  }

  async function applyRestoreDeletedMutation(_ctx, payload) {
    try {
      return await runRestoreDeletedMutation(_ctx, payload);
    } catch (error) {
      console.error("[dienststelle.applyTabMutationRestoreDeleted] failed", error);
      return _scopes.failed(payload.operationId, [], [], [{
        code: "TABS_MUTATION_APPLY_FAILED",
        message: String(error && error.message ? error.message : error)
      }]);
    }
  }

  async function runRestoreDeletedMutation(_ctx, payload) {
    var snapshot = _scopes.readSnapshot(_ctx.runtime, payload.operationId);
    var appliedScopes = [];
    var diagnostics = [];
    var restoreFilters = payload.plan.restore && payload.plan.restore.filters && payload.plan.restore.filters.dienststelle || {};
    var shifted;
    var toResolved;
    if (!snapshot || snapshot.runId !== payload.runId) { return missingSnapshotResult(payload); }
    shifted = await shiftAllMoves(_ctx, payload, snapshot, appliedScopes, diagnostics);
    if (shifted) { return shifted; }
    toResolved = _scopes.resolveScopeIdForSlot(_ctx._KDB, payload.tabIdxToScopeId || {}, payload.plan.insertSlot);
    if (!toResolved.ok) {
      diagnostics = diagnostics.concat(toResolved.diagnostics || []);
      return _scopes.failed(payload.operationId, appliedScopes, [], diagnostics);
    }
    await _scopes.writeScopeFromSnapshot(_ctx, toResolved.scopeId, restoreFilters, payload, appliedScopes, diagnostics);
    if (diagnostics.length > 0) { return _scopes.failed(payload.operationId, appliedScopes, [], diagnostics); }
    return successResult(payload, appliedScopes, []);
  }

  function buildRestoreResult(_ok, _operationId, _restored, _unrecoverable, _diagnostics, _errorCode) {
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

  async function restoreTabMutationSnapshot(_ctx, _payload) {
    var payload = _payload || {};
    var guard = _scopes.guardRun(_ctx.runtime, payload);
    var snapshot;
    var restored = [];
    var unrecoverable = [];
    var diagnostics = [];
    var scopeIds;
    var byFilter;
    var filterKeys;
    var sIdx;
    var fIdx;
    var scopeId;
    var filterKey;
    if (guard) {
      // A stale-guard rejection has no side effects: the snapshot stays available as the operation's only recovery path.
      return buildRestoreResult(false, payload.operationId, [], [], guard.diagnostics, guard.errorCode || "TABS_MUTATION_CANCELLED");
    }
    snapshot = _scopes.readSnapshot(_ctx.runtime, payload.operationId);
    if (!snapshot) { return buildRestoreResult(true, payload.operationId, [], [], []); }
    scopeIds = Object.keys(snapshot.byScope || {});
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
            code: "TABS_MUTATION_ROLLBACK_INCOMPLETE",
            filterKey: filterKey,
            scopeId: scopeId,
            message: "dienststelle host scope restore failed"
          });
        }
      }
    }
    _scopes.deleteSnapshot(_ctx.runtime, payload.operationId);
    return buildRestoreResult(unrecoverable.length === 0, payload.operationId, restored, unrecoverable, diagnostics);
  }

  function collectAffectedSlots(_plan) {
    var plan = _plan || {};
    var slots = [];
    var seen = {};
    function pushSlot(_slot) {
      var slot = _slot || {};
      if (typeof slot.tabIdx !== "number" || seen[slot.tabIdx]) { return; }
      seen[slot.tabIdx] = true;
      slots.push({ tabIdx: slot.tabIdx, tabId: slot.tabId || null });
    }
    (plan.slotMoves || []).forEach(function (_move) {
      pushSlot(slotOfMove(_move, "from"));
      pushSlot(slotOfMove(_move, "to"));
    });
    if (plan.deletedSlot) { pushSlot(plan.deletedSlot); }
    if (plan.hideSlot) { pushSlot(plan.hideSlot); }
    if (plan.operation === "duplicate" || plan.operation === "restoreDeleted") {
      if (plan.insertSlot) { pushSlot(plan.insertSlot); }
      if (plan.revealSlot) { pushSlot(plan.revealSlot); }
    }
    return slots;
  }

  async function resyncTabMutationHost(_ctx, _payload) {
    var payload = _payload || {};
    var diagnostics = [];
    var guard;
    var tabTargets;
    var affectedSlots;
    var resolved;
    var idx;
    try {
      guard = _scopes.guardRun(_ctx.runtime, payload);
      if (guard) { return { ok: false, diagnostics: guard.diagnostics || [] }; }
      tabTargets = payload.tabIdxToScopeId || {};
      affectedSlots = collectAffectedSlots(payload.plan);
      for (idx = 0; idx < affectedSlots.length; idx += 1) {
        resolved = _scopes.resolveScopeIdForSlot(_ctx._KDB, tabTargets, affectedSlots[idx]);
        if (!resolved.ok) {
          diagnostics = diagnostics.concat(resolved.diagnostics || []);
          continue;
        }
        await _scopes.resyncHostScope(_ctx._KDB, resolved.scopeId, diagnostics);
      }
      return { ok: true, operationId: payload.operationId, diagnostics: diagnostics };
    } catch (error) {
      console.error("[dienststelle.resyncTabMutationHost] failed", { operationId: payload.operationId }, error);
      diagnostics.push({
        code: "TABS_MUTATION_APPLY_FAILED",
        message: String(error && error.message ? error.message : error)
      });
      return { ok: false, operationId: payload.operationId, diagnostics: diagnostics };
    }
  }

  return {
    isTabMutationAction: isTabMutationAction,
    disposedResult: disposedResult,
    routeTabMutationAction: routeTabMutationAction
  };
});
