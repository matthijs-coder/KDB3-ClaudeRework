/*
 * Filter owner kit: the tab-mutation contract the filter owners (singleSelect, nativeMultiSelect, dienststelle) answer
 * for the tabs saga (action types <owner>/{prepare,apply}TabMutation, restoreTabMutationSnapshot, resyncTabMutationHost).
 * The kit owns the lifecycle order, the run guard bookkeeping, the snapshot ledger (runtime.<owner>.tabMutationSnapshots,
 * released by the saga too), the result envelopes and the error boundaries; the owner passes what differs as hooks:
 * snapshot capture, the apply operations, the restore walk, the resync walk and the history slice.
 *
 * ctx = { _KDB, runtime, ... } is passed through untouched to every hook; payload is the saga payload
 * { runId, operationId, plan, tabIdxToScopeId }.
 *
 * base = {
 *   name                 owner name for log labels: "[<name>.<phase>] failed"
 *   guard                createRunGuard(...) of this owner
 * }
 * CODES = the four TABS_MUTATION_* error codes the saga and the history know.
 *
 * createRunGuard({ options, staleMode }) -> { guardRun(runtime, payload), isStale(runtime, payload), cancelled(message, payload, runtime) }
 *     options and staleMode are the core util's data: pinOperationId, ensureRunIdDefault0, includeRunIdsInDiagnostic,
 *     missingIdsMessage, supersededMessage, operationMismatchMessage; staleMode "pinned" | "runId".
 *
 * createPrepare(base, hooks) -> async (ctx, payload) -> result
 *     order: run guard -> prune snapshots of older runs -> hooks.capture -> ledger write -> hooks.historySlice.
 *     hooks.rejected(guardResult, payload)    default: prepare failure carrying the guard diagnostics
 *     hooks.prune                             false: keep snapshots of older runs (default true)
 *     hooks.capture(ctx, payload)             { ok:false, diagnostics } | { ok:true, snapshot, scopeIds }
 *     hooks.historySlice(ctx, payload, snapshot, slot)   delete and duplicate only; slot = the source tab's slot
 *     hooks.logOperationId                    true: the failure log also carries { operationId }
 * createApply(base, hooks) -> async (ctx, payload) -> result
 *     run guard, then hooks.run(ctx, payload), or hooks.operations[plan.operation](ctx, payload) with
 *     hooks.unsupportedMessage for a missing or unknown operation. hooks.onError(error, payload) turns a thrown error
 *     into a result; without it the error propagates to the dispatch caller.
 *     hooks.rejected(guardResult, payload)    default: apply failure carrying the guard diagnostics
 * createRestore(base, hooks) -> async (ctx, payload) -> result
 *     run guard -> snapshot lookup (none: clean empty result) -> hooks.run(ctx, payload, snapshot) -> release.
 *     hooks.release: "always" (finally, also when run throws) | "afterRun" (only when run returned)
 *     hooks.rejected(guardResult, payload)    default: restore result with the guard diagnostics and errorCode
 * createResync(base, hooks) -> async (ctx, payload) -> result
 *     run guard -> hooks.run(ctx, payload, diagnostics); run returning false means failure (diagnostics already added).
 *     A thrown error becomes { ok:false, operationId, diagnostics: [APPLY_FAILED] } and is logged once;
 *     hooks.diagnostic(code, message) builds that entry (default { code, message }).
 *
 * Result builders: prepareFailure, applyFailure, applySuccess, restoreResult, supersededResult, readRunSnapshot,
 * createDisposedResult(message) -> (action) -> Promise of the disposed tab-mutation answer.
 */
define([
  "../../../core/utils/filters/tabMutationRun/guardTabMutationRun.js",
  "../../../core/utils/filters/tabMutationRun/tabMutationSnapshots.js"
], function (_guardRunUtil, _snapshots) {
  "use strict";

  var CODES = {
    PREPARE_FAILED: "TABS_MUTATION_PREPARE_FAILED",
    APPLY_FAILED: "TABS_MUTATION_APPLY_FAILED",
    ROLLBACK_INCOMPLETE: "TABS_MUTATION_ROLLBACK_INCOMPLETE",
    CANCELLED: "TABS_MUTATION_CANCELLED"
  };

  function errorMessage(_error) {
    return String(_error && _error.message ? _error.message : _error);
  }

  function createRunGuard(_spec) {
    var options = _spec.options;
    var staleOptions = { staleMode: _spec.staleMode };
    return {
      guardRun: function guardRun(_runtime, _payload) {
        return _guardRunUtil.guardRun(_runtime, _payload, options);
      },
      isStale: function isStale(_runtime, _payload) {
        return _guardRunUtil.isStale(_runtime, _payload, staleOptions);
      },
      cancelled: function cancelled(_message, _payload, _runtime) {
        return _guardRunUtil.cancelled(_message, _payload, _runtime, options);
      }
    };
  }

  function prepareFailure(_operationId, _diagnostics) {
    return { ok: false, operationId: _operationId || null, snapshotScopes: [], diagnostics: _diagnostics || [] };
  }

  function applyFailure(_operationId, _appliedScopes, _clearedScopes, _diagnostics) {
    return {
      ok: false,
      operationId: _operationId || null,
      appliedScopes: _appliedScopes || [],
      clearedScopes: _clearedScopes || [],
      diagnostics: _diagnostics || []
    };
  }

  function applySuccess(_operationId, _appliedScopes, _clearedScopes, _diagnostics) {
    return {
      ok: true,
      operationId: _operationId,
      appliedScopes: _appliedScopes,
      clearedScopes: _clearedScopes,
      diagnostics: _diagnostics || []
    };
  }

  function restoreResult(_ok, _operationId, _restored, _unrecoverable, _diagnostics, _errorCode) {
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

  function supersededResult(_base, _ctx, _payload, _appliedScopes, _clearedScopes, _message) {
    return applyFailure(
      _payload.operationId,
      _appliedScopes,
      _clearedScopes,
      _base.guard.cancelled(_message, _payload, _ctx.runtime).diagnostics
    );
  }

  // The prepare snapshot of this run, or null when it is missing or belongs to another run.
  function readRunSnapshot(_runtime, _payload) {
    var snapshot = _snapshots.readSnapshot(_runtime, _payload.operationId);
    return snapshot && snapshot.runId === _payload.runId ? snapshot : null;
  }

  // guardRun rejects apply and restore of an older run, so snapshots of older runs can never be used again.
  function pruneSupersededSnapshots(_runtime, _runId) {
    var snapshots = _runtime.tabMutationSnapshots || {};
    Object.keys(snapshots).forEach(function (_operationId) {
      var runId = snapshots[_operationId] && snapshots[_operationId].runId;
      if (typeof runId === "number" && runId < _runId) {
        delete snapshots[_operationId];
      }
    });
  }

  // delete reads the deleted tab; duplicate reads the source tab. Other operations hand no slice to the saga.
  function readHistorySourceSlot(_plan) {
    if (!_plan || (_plan.operation !== "delete" && _plan.operation !== "duplicate")) { return null; }
    return _plan.operation === "delete"
      ? (_plan.deletedSlot || {})
      : (_plan.sourceSlot || (_plan.clonePair && _plan.clonePair.from) || {});
  }

  function createPrepare(_base, _hooks) {
    return async function prepareTabMutation(_ctx, _payload) {
      var payload = _payload || {};
      try {
        var guard = _base.guard.guardRun(_ctx.runtime, payload);
        if (guard) {
          return _hooks.rejected ? _hooks.rejected(guard, payload) : prepareFailure(payload.operationId, guard.diagnostics);
        }
        if (_hooks.prune !== false) { pruneSupersededSnapshots(_ctx.runtime, payload.runId); }
        var captured = _hooks.capture(_ctx, payload);
        if (!captured.ok) { return prepareFailure(payload.operationId, captured.diagnostics); }
        _snapshots.writeSnapshot(_ctx.runtime, payload.operationId, captured.snapshot);
        var result = { ok: true, operationId: payload.operationId, snapshotScopes: captured.scopeIds, diagnostics: [] };
        var slot = readHistorySourceSlot(payload.plan);
        if (slot) { result.historySlice = _hooks.historySlice(_ctx, payload, captured.snapshot, slot); }
        return result;
      } catch (error) {
        var label = "[" + _base.name + ".prepareTabMutation] failed";
        if (_hooks.logOperationId === true) {
          console.error(label, { operationId: payload.operationId }, error);
        } else {
          console.error(label, error);
        }
        return prepareFailure(payload.operationId, [{ code: CODES.PREPARE_FAILED, message: errorMessage(error) }]);
      }
    };
  }

  function hasOwn(_table, _key) {
    return Object.prototype.hasOwnProperty.call(_table, _key);
  }

  function createApply(_base, _hooks) {
    function run(_ctx, _payload) {
      if (_hooks.run) { return _hooks.run(_ctx, _payload); }
      var operation = _payload.plan && _payload.plan.operation;
      if (!_payload.plan || !hasOwn(_hooks.operations, operation)) {
        return applyFailure(_payload.operationId, [], [], [{ code: CODES.APPLY_FAILED, message: _hooks.unsupportedMessage }]);
      }
      return _hooks.operations[operation](_ctx, _payload);
    }
    return async function applyTabMutation(_ctx, _payload) {
      var payload = _payload || {};
      var guard = _base.guard.guardRun(_ctx.runtime, payload);
      if (guard) {
        return _hooks.rejected ? _hooks.rejected(guard, payload) : applyFailure(payload.operationId, [], [], guard.diagnostics);
      }
      if (typeof _hooks.onError !== "function") { return run(_ctx, payload); }
      try {
        return await run(_ctx, payload);
      } catch (error) {
        return _hooks.onError(error, payload);
      }
    };
  }

  function createRestore(_base, _hooks) {
    return async function restoreTabMutationSnapshot(_ctx, _payload) {
      var payload = _payload || {};
      var guard = _base.guard.guardRun(_ctx.runtime, payload);
      if (guard) {
        return _hooks.rejected
          ? _hooks.rejected(guard, payload)
          : restoreResult(false, payload.operationId, [], [], guard.diagnostics, guard.errorCode || CODES.CANCELLED);
      }
      var snapshot = _snapshots.readSnapshot(_ctx.runtime, payload.operationId);
      if (!snapshot) { return restoreResult(true, payload.operationId, [], [], []); }
      if (_hooks.release === "afterRun") {
        var result = await _hooks.run(_ctx, payload, snapshot);
        _snapshots.deleteSnapshot(_ctx.runtime, payload.operationId);
        return result;
      }
      try {
        return await _hooks.run(_ctx, payload, snapshot);
      } finally {
        _snapshots.deleteSnapshot(_ctx.runtime, payload.operationId);
      }
    };
  }

  function createResync(_base, _hooks) {
    return async function resyncTabMutationHost(_ctx, _payload) {
      var payload = _payload || {};
      var diagnostics = [];
      try {
        var guard = _base.guard.guardRun(_ctx.runtime, payload);
        if (guard) {
          return _hooks.rejected ? _hooks.rejected(guard, payload) : { ok: false, diagnostics: guard.diagnostics || [] };
        }
        if (await _hooks.run(_ctx, payload, diagnostics) === false) {
          return { ok: false, operationId: payload.operationId, diagnostics: diagnostics };
        }
        return { ok: true, operationId: payload.operationId, diagnostics: diagnostics };
      } catch (error) {
        console.error("[" + _base.name + ".resyncTabMutationHost] failed", { operationId: payload.operationId }, error);
        diagnostics.push(_hooks.diagnostic
          ? _hooks.diagnostic(CODES.APPLY_FAILED, errorMessage(error))
          : { code: CODES.APPLY_FAILED, message: errorMessage(error) });
        return { ok: false, operationId: payload.operationId, diagnostics: diagnostics };
      }
    };
  }

  function createDisposedResult(_message) {
    return function disposedTabMutationResult(_action) {
      var payload = (_action && _action.payload) || {};
      return Promise.resolve({
        ok: false,
        operationId: payload.operationId || null,
        diagnostics: [{ code: CODES.CANCELLED, message: _message }]
      });
    };
  }

  return {
    CODES: CODES,
    errorMessage: errorMessage,
    createRunGuard: createRunGuard,
    createPrepare: createPrepare,
    createApply: createApply,
    createRestore: createRestore,
    createResync: createResync,
    createDisposedResult: createDisposedResult,
    prepareFailure: prepareFailure,
    applyFailure: applyFailure,
    applySuccess: applySuccess,
    restoreResult: restoreResult,
    supersededResult: supersededResult,
    readRunSnapshot: readRunSnapshot
  };
});
