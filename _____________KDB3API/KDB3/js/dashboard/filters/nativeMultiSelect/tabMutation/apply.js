define([
  "../config.js",
  "./guard.js",
  "./hostScopes.js",
  "../../../../core/utils/filters/tabMutationRun/tabMutationSnapshots.js"
], function (_config, _guard, _hostScopes, _snapshots) {
  "use strict";

  var codes = _config.tabMutationCodes;
  var SUPERSEDED_MESSAGE = "NativeMultiSelect apply superseded";

  function applyFailed(_operationId, _message) {
    return _hostScopes.failed(_operationId, [], [], [{ code: codes.APPLY_FAILED, message: _message }]);
  }

  function slotOf(_move, _side) {
    return { tabIdx: _move[_side + "TabIdx"], tabId: _move[_side + "TabId"] };
  }

  // The prepare snapshot of this run, or null when it is missing or belongs to another run.
  function readRunSnapshot(_ctx, _payload) {
    var snapshot = _snapshots.readSnapshot(_ctx.runtime, _payload.operationId);
    return snapshot && snapshot.runId === _payload.runId ? snapshot : null;
  }

  function supersededResult(_st) {
    return _hostScopes.failed(
      _st.payload.operationId,
      _st.appliedScopes,
      _st.clearedScopes,
      _guard.cancelled(SUPERSEDED_MESSAGE, _st.payload, _st.ctx.runtime).diagnostics
    );
  }

  function succeeded(_st) {
    return {
      ok: true,
      operationId: _st.payload.operationId,
      appliedScopes: _st.appliedScopes,
      clearedScopes: _st.clearedScopes,
      diagnostics: []
    };
  }

  function collectFromScopeIds(_st) {
    var scopeIds = [];
    (_st.payload.plan.slotMoves || []).forEach(function (move) {
      var resolved = _guard.resolveScopeIdForSlot(_st.ctx._KDB, _st.tabTargets, slotOf(move, "from"));
      if (!resolved.ok) { _st.diagnostics.push.apply(_st.diagnostics, resolved.diagnostics || []); return; }
      if (resolved.skip) { return; }
      _guard.pushUnique(scopeIds, resolved.scopeId);
    });
    return scopeIds;
  }

  // Copies the snapshot items of a move's source scope into its destination scope.
  // false: a slot could not be resolved (diagnostics were added).
  async function shiftScopeFromSnapshot(_st, _snapshot, _move) {
    var fromResolved = _guard.resolveScopeIdForSlot(_st.ctx._KDB, _st.tabTargets, slotOf(_move, "from"));
    var toResolved = _guard.resolveScopeIdForSlot(_st.ctx._KDB, _st.tabTargets, slotOf(_move, "to"));
    if (!fromResolved.ok || !toResolved.ok) {
      _st.diagnostics.push.apply(_st.diagnostics, (fromResolved.diagnostics || []).concat(toResolved.diagnostics || []));
      return false;
    }
    if (fromResolved.skip || toResolved.skip) { return true; }
    var sourceItems = _snapshot.byScope[fromResolved.scopeId] || [];
    await _hostScopes.writeScopeFromSnapshot(_st.ctx, toResolved.scopeId, sourceItems, _st.payload, _st.appliedScopes, _st.diagnostics);
    return true;
  }

  // Runs the plan's slot moves. A superseded run stops with its cancelled result; an unresolved slot stops the
  // run when abortOnUnresolved is set (duplicate, restoreDeleted) and is skipped otherwise (delete, move).
  async function runSlotMoves(_st, _snapshot, _abortOnUnresolved) {
    var moves = _st.payload.plan.slotMoves || [];
    var i;
    for (i = 0; i < moves.length; i += 1) {
      if (_guard.isStale(_st.ctx.runtime, _st.payload)) { return supersededResult(_st); }
      var shifted = await shiftScopeFromSnapshot(_st, _snapshot, moves[i]);
      if (shifted === false && _abortOnUnresolved) {
        return _hostScopes.failed(_st.payload.operationId, _st.appliedScopes, [], _st.diagnostics);
      }
    }
    return null;
  }

  async function clearMovedFromScopes(_st, _snapshot) {
    var fromScopeIds = collectFromScopeIds(_st);
    var c;
    if (_st.diagnostics.length > 0) { return _hostScopes.failed(_st.payload.operationId, _st.appliedScopes, _st.clearedScopes, _st.diagnostics); }
    for (c = 0; c < fromScopeIds.length; c += 1) {
      await _hostScopes.clearScopeItems(_st.ctx, fromScopeIds[c], _snapshot.byScope[fromScopeIds[c]] || [], _st.payload, _st.clearedScopes, _st.diagnostics);
      if (_guard.isStale(_st.ctx.runtime, _st.payload)) { return supersededResult(_st); }
    }
    return null;
  }

  function finish(_st) {
    if (_st.diagnostics.length > 0) { return _hostScopes.failed(_st.payload.operationId, _st.appliedScopes, _st.clearedScopes, _st.diagnostics); }
    return succeeded(_st);
  }

  async function applyMove(_st, _snapshot) {
    var stop = await clearMovedFromScopes(_st, _snapshot);
    if (stop) { return stop; }
    stop = await runSlotMoves(_st, _snapshot, false);
    return stop || finish(_st);
  }

  async function applyDelete(_st, _snapshot) {
    var resolvedDeleted = _guard.resolveScopeIdForSlot(_st.ctx._KDB, _st.tabTargets, _st.payload.plan.deletedSlot);
    if (!resolvedDeleted.ok) { return _hostScopes.failed(_st.payload.operationId, [], [], resolvedDeleted.diagnostics); }
    if (!resolvedDeleted.skip) {
      await _hostScopes.clearScopeItems(
        _st.ctx, resolvedDeleted.scopeId, _snapshot.byScope[resolvedDeleted.scopeId] || [], _st.payload, _st.clearedScopes, _st.diagnostics
      );
      if (_guard.isStale(_st.ctx.runtime, _st.payload)) { return supersededResult(_st); }
    }
    return applyMove(_st, _snapshot);
  }

  async function applyDuplicate(_st, _snapshot) {
    var plan = _st.payload.plan;
    var stop = await runSlotMoves(_st, _snapshot, true);
    if (stop) { return stop; }
    if (_guard.isStale(_st.ctx.runtime, _st.payload)) { return supersededResult(_st); }
    var clonePair = plan.clonePair || {};
    var fromResolved = _guard.resolveScopeIdForSlot(_st.ctx._KDB, _st.tabTargets, clonePair.from || plan.sourceSlot);
    var toResolved = _guard.resolveScopeIdForSlot(_st.ctx._KDB, _st.tabTargets, clonePair.to || plan.insertSlot);
    if (!fromResolved.ok || !toResolved.ok) {
      _st.diagnostics.push.apply(_st.diagnostics, (fromResolved.diagnostics || []).concat(toResolved.diagnostics || []));
      return _hostScopes.failed(_st.payload.operationId, _st.appliedScopes, [], _st.diagnostics);
    }
    if (!fromResolved.skip && !toResolved.skip) {
      await _hostScopes.writeScopeFromSnapshot(
        _st.ctx, toResolved.scopeId, _snapshot.byScope[fromResolved.scopeId] || [], _st.payload, _st.appliedScopes, _st.diagnostics
      );
    }
    return finish(_st);
  }

  async function applyRestoreDeleted(_st, _snapshot) {
    var plan = _st.payload.plan;
    var restoreItems = plan.restore && plan.restore.filters && plan.restore.filters.nativeMultiSelect || [];
    var stop = await runSlotMoves(_st, _snapshot, true);
    if (stop) { return stop; }
    if (_guard.isStale(_st.ctx.runtime, _st.payload)) { return supersededResult(_st); }
    var toResolved = _guard.resolveScopeIdForSlot(_st.ctx._KDB, _st.tabTargets, plan.insertSlot);
    if (!toResolved.ok) {
      _st.diagnostics.push.apply(_st.diagnostics, toResolved.diagnostics || []);
      return _hostScopes.failed(_st.payload.operationId, _st.appliedScopes, [], _st.diagnostics);
    }
    if (!toResolved.skip) {
      await _hostScopes.writeScopeFromSnapshot(_st.ctx, toResolved.scopeId, restoreItems, _st.payload, _st.appliedScopes, _st.diagnostics);
    }
    return finish(_st);
  }

  var OPERATIONS = {
    delete: applyDelete,
    move: applyMove,
    duplicate: applyDuplicate,
    restoreDeleted: applyRestoreDeleted
  };

  async function applyTabMutation(_ctx, _payload) {
    var payload = _payload || {};
    var operation = payload.plan && payload.plan.operation;
    try {
      var guard = _guard.guardRun(_ctx.runtime, payload);
      if (guard) { return _hostScopes.failed(payload.operationId, [], [], guard.diagnostics); }
      if (!payload.plan || !Object.prototype.hasOwnProperty.call(OPERATIONS, operation)) {
        return applyFailed(payload.operationId, "NativeMultiSelect apply supports delete, move, duplicate, and restoreDeleted");
      }
      var snapshot = readRunSnapshot(_ctx, payload);
      if (!snapshot) { return applyFailed(payload.operationId, "NativeMultiSelect prepare snapshot missing"); }
      return await OPERATIONS[operation]({
        ctx: _ctx,
        payload: payload,
        tabTargets: payload.tabIdxToScopeId || {},
        appliedScopes: [],
        clearedScopes: [],
        diagnostics: []
      }, snapshot);
    } catch (error) {
      console.error("[nativeMultiSelect.applyTabMutation] failed", error);
      return applyFailed(payload.operationId, String(error && error.message ? error.message : error));
    }
  }

  return {
    applyTabMutation: applyTabMutation
  };
});
