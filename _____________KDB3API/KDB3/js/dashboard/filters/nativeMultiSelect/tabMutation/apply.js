define([
  "./guard.js",
  "./hostScopes.js",
  "../../_core/tabMutation.js",
  "../../_core/tabMutationScopes.js"
], function (_guard, _hostScopes, _tabMutation, _scopes) {
  "use strict";

  var SUPERSEDED_MESSAGE = "NativeMultiSelect apply superseded";
  var base = _guard.tabMutationBase;

  function applyFailed(_operationId, _message) {
    return _tabMutation.applyFailure(_operationId, [], [], [{ code: _tabMutation.CODES.APPLY_FAILED, message: _message }]);
  }

  function failed(_st, _appliedScopes, _clearedScopes) {
    return _tabMutation.applyFailure(_st.payload.operationId, _appliedScopes, _clearedScopes, _st.diagnostics);
  }

  function supersededResult(_st) {
    return _tabMutation.supersededResult(base, _st.ctx, _st.payload, _st.appliedScopes, _st.clearedScopes, SUPERSEDED_MESSAGE);
  }

  function resolveSlot(_st, _slot) {
    return _guard.resolveScopeIdForSlot(_st.ctx._KDB, _st.tabTargets, _slot);
  }

  function collectFromScopeIds(_st) {
    return _scopes.collectFromScopeIds(
      _guard.resolveScopeIdForSlot, _st.ctx._KDB, _st.tabTargets, _st.payload.plan.slotMoves || [], _st.diagnostics
    );
  }

  // Copies the snapshot items of a move's source scope into its destination scope.
  // false: a slot could not be resolved (diagnostics were added).
  async function shiftScopeFromSnapshot(_st, _snapshot, _move) {
    var fromResolved = resolveSlot(_st, _scopes.slotOfMove(_move, "from"));
    var toResolved = resolveSlot(_st, _scopes.slotOfMove(_move, "to"));
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
        return failed(_st, _st.appliedScopes, []);
      }
    }
    return null;
  }

  async function clearMovedFromScopes(_st, _snapshot) {
    var fromScopeIds = collectFromScopeIds(_st);
    var c;
    if (_st.diagnostics.length > 0) { return failed(_st, _st.appliedScopes, _st.clearedScopes); }
    for (c = 0; c < fromScopeIds.length; c += 1) {
      await _hostScopes.clearScopeItems(_st.ctx, fromScopeIds[c], _snapshot.byScope[fromScopeIds[c]] || [], _st.payload, _st.clearedScopes, _st.diagnostics);
      if (_guard.isStale(_st.ctx.runtime, _st.payload)) { return supersededResult(_st); }
    }
    return null;
  }

  function finish(_st) {
    if (_st.diagnostics.length > 0) { return failed(_st, _st.appliedScopes, _st.clearedScopes); }
    return _tabMutation.applySuccess(_st.payload.operationId, _st.appliedScopes, _st.clearedScopes, []);
  }

  async function applyMove(_st, _snapshot) {
    var stop = await clearMovedFromScopes(_st, _snapshot);
    if (stop) { return stop; }
    stop = await runSlotMoves(_st, _snapshot, false);
    return stop || finish(_st);
  }

  async function applyDelete(_st, _snapshot) {
    var resolvedDeleted = resolveSlot(_st, _st.payload.plan.deletedSlot);
    if (!resolvedDeleted.ok) { return _tabMutation.applyFailure(_st.payload.operationId, [], [], resolvedDeleted.diagnostics); }
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
    var fromResolved = resolveSlot(_st, clonePair.from || plan.sourceSlot);
    var toResolved = resolveSlot(_st, clonePair.to || plan.insertSlot);
    if (!fromResolved.ok || !toResolved.ok) {
      _st.diagnostics.push.apply(_st.diagnostics, (fromResolved.diagnostics || []).concat(toResolved.diagnostics || []));
      return failed(_st, _st.appliedScopes, []);
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
    var toResolved = resolveSlot(_st, plan.insertSlot);
    if (!toResolved.ok) {
      _st.diagnostics.push.apply(_st.diagnostics, toResolved.diagnostics || []);
      return failed(_st, _st.appliedScopes, []);
    }
    if (!toResolved.skip) {
      await _hostScopes.writeScopeFromSnapshot(_st.ctx, toResolved.scopeId, restoreItems, _st.payload, _st.appliedScopes, _st.diagnostics);
    }
    return finish(_st);
  }

  // Every operation needs the prepare snapshot of this run.
  function withRunSnapshot(_apply) {
    return function (_ctx, _payload) {
      var snapshot = _tabMutation.readRunSnapshot(base, _ctx.runtime, _payload);
      if (!snapshot) { return applyFailed(_payload.operationId, "NativeMultiSelect prepare snapshot missing"); }
      return _apply({
        ctx: _ctx,
        payload: _payload,
        tabTargets: _payload.tabIdxToScopeId || {},
        appliedScopes: [],
        clearedScopes: [],
        diagnostics: []
      }, snapshot);
    };
  }

  var applyTabMutation = _tabMutation.createApply(base, {
    unsupportedMessage: "NativeMultiSelect apply supports delete, move, duplicate, and restoreDeleted",
    operations: {
      delete: withRunSnapshot(applyDelete),
      move: withRunSnapshot(applyMove),
      duplicate: withRunSnapshot(applyDuplicate),
      restoreDeleted: withRunSnapshot(applyRestoreDeleted)
    },
    onError: function (_error, _payload) {
      console.error("[nativeMultiSelect.applyTabMutation] failed", _error);
      return applyFailed(_payload.operationId, _tabMutation.errorMessage(_error));
    }
  });

  return {
    applyTabMutation: applyTabMutation
  };
});
