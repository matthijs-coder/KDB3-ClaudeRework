// START HERE for tab delete/move/duplicate (tabMutation).
define([
  "../config/actionTypes.js",
  "../config/mutationCodes.js",
  "./guardTabMutation.js",
  "../state/buildMutationResult.js",
  "./runTabMutationOwnerPhases.js",
  "../effects/dispatchOwnerTabMutation.js",
  "../effects/applyTabMutationToCognos.js",
  "../history/pushTabsMoveHistoryStep.js",
  "../history/pushTabsDeleteHistoryStep.js",
  "../history/pushTabsDuplicateHistoryStep.js",
  "../effects/formatTabMutationCaption.js"
], function (_actionTypes, _codes, _guard, _buildResult, _ownerPhases, _dispatchOwner, _applyToCognos, _pushTabsMoveHistoryStep, _pushTabsDeleteHistoryStep, _pushTabsDuplicateHistoryStep, _formatTabMutationCaption) {
  "use strict";

  async function runTabMutationSaga(_ctx, _action, _runId, _options) {
    var phases = {};
    var payload = _action && _action.payload || {};
    var state = _ctx.getRawState() || {};
    var planResult = _options.buildPlan(state, payload);
    if (!planResult.ok) { phases.plan = _ownerPhases.failed(planResult.diagnostics); return _buildResult(null, phases); }
    phases.plan = _ownerPhases.ok();
    var plan = planResult.plan;
    var mutationLoadingStarted = false;
    try {
      mutationLoadingStarted = _formatTabMutationCaption.startMutationFrame(_ctx, plan);
      var runContext = { runId: _runId, operationId: plan.operationId, tabIdxByTabId: _ownerPhases.mapTabIdxByTabId(state), originalActive: _ownerPhases.captureOriginalActive(state) };
      runContext.widgetRebuild = payload.widgetRebuild;
      runContext.serializedByTabId = payload.serializedByTabId;
      var slotReadiness = await _ownerPhases.ensureSlots(_ctx, plan, runContext);
      phases.slotReadiness = slotReadiness;
      if (slotReadiness.status !== "ok") { return _ownerPhases.abortOnOriginalTab(_ctx, runContext, plan.operationId, phases); }
      var scopeResolve = await _ownerPhases.resolveScopeTargets(_ctx, runContext);
      phases.scopeResolve = scopeResolve.phase;
      if (scopeResolve.phase.status !== "ok") { return _ownerPhases.abortOnOriginalTab(_ctx, runContext, plan.operationId, phases); }
      runContext.tabTargets = scopeResolve.tabTargets;
      var prepare = await _ownerPhases.dispatchOwners(_ctx, _ownerPhases.PREPARE_OWNERS, "prepareTabMutation", plan, runContext);
      phases.prepare = prepare.phase;
      if (prepare.phase.status !== "ok") { phases.rollback = await _ownerPhases.rollbackOwners(_ctx, prepare.preparedOwners, runContext); return _ownerPhases.abortOnOriginalTab(_ctx, runContext, plan.operationId, phases); }
      if (plan.operation === "delete" && payload.widgetRebuild !== true && payload.isHistoryReplay !== true) {
        runContext.deleteRollbackByTabId = prepare.byOwner.widgetBase.rollbackByTabId;
      }
      if (plan.operation === "move" && payload.isHistoryReplay !== true && isPlainObject(payload.serializedByTabId) !== true) {
        runContext.moveRollbackByTabId = prepare.byOwner.widgetBase.rollbackByTabId;
      }
      captureDeleteHistorySlices(plan, payload, prepare, runContext);
      var filterApply = await _ownerPhases.dispatchOwners(_ctx, _ownerPhases.FILTER_APPLY_OWNERS, "applyTabMutation", plan, runContext);
      phases.filterApply = filterApply.phase;
      if (filterApply.phase.status !== "ok") { phases.rollback = await _ownerPhases.rollbackOwners(_ctx, _ownerPhases.ROLLBACK_OWNERS, runContext); return _ownerPhases.abortOnOriginalTab(_ctx, runContext, plan.operationId, phases); }
      var widgetApply = await _dispatchOwner(_ctx._KDB, "widgetBase", "widgetBase/applyTabMutation", plan, runContext);
      if ((plan.operation === "duplicate" || plan.operation === "delete" || plan.operation === "restoreDeleted" || plan.operation === "move") && widgetApply && widgetApply.ok === true && Array.isArray(widgetApply.degradedEntries) && widgetApply.degradedEntries.length > 0) {
        phases.widgetApply = { status: "degraded", diagnostics: widgetApply.diagnostics || [] };
      } else {
        phases.widgetApply = widgetApply && widgetApply.ok === true ? _ownerPhases.ok() : _ownerPhases.failed(widgetApply && widgetApply.diagnostics);
      }
      if (phases.widgetApply.status === "failed") { phases.rollback = await _ownerPhases.rollbackOwners(_ctx, _ownerPhases.ROLLBACK_OWNERS, runContext); return _ownerPhases.abortOnOriginalTab(_ctx, runContext, plan.operationId, phases); }
      var didCommit = _ctx.dispatch({ type: _actionTypes.TAB_MUTATION_APPLY, payload: { plan: plan } });
      var reducerError = _ctx._KDB.runtime && _ctx._KDB.runtime.tabs && _ctx._KDB.runtime.tabs.lastTabMutationError;
      phases.commit = didCommit === true && !reducerError ? _ownerPhases.ok() : _ownerPhases.failed([{ code: reducerError || _codes.POSTCONDITION_FAILED, message: "tabs/tabMutationApply commit failed." }]);
      if (phases.commit.status !== "ok") { phases.rollback = await _ownerPhases.rollbackOwners(_ctx, _ownerPhases.ROLLBACK_OWNERS, runContext); return _buildResult(plan.operationId, phases); }
      var cognos = await _applyToCognos(_ctx, plan, runContext);
      phases.cognosSync = { status: cognos.status === "degraded" ? "degraded" : "ok", diagnostics: cognos.diagnostics || [] };
      phases.hostResync = await _ownerPhases.resyncOwners(_ctx, _ownerPhases.RESYNC_OWNERS, "resyncTabMutationHost", plan, runContext);
      _guard.release(_ctx, null);
      _ownerPhases.emitFinalTabsChanged(_ctx, plan);
      phases.finalize = _ownerPhases.ok();
      var result = _buildResult(plan.operationId, phases);
      _pushTabsMoveHistoryStep(_ctx._KDB, plan, payload, result, runContext);
      _pushTabsDeleteHistoryStep(_ctx._KDB, plan, payload, result, runContext);
      _pushTabsDuplicateHistoryStep(_ctx._KDB, plan, payload, result, runContext);
      _ownerPhases.clearTabMutationSnapshots(_ctx, plan.operationId);
      return result;
    } finally {
      if (mutationLoadingStarted) { _formatTabMutationCaption.finishMutationFrame(_ctx); }
    }
  }

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
  }

  function captureDeleteHistorySlices(plan, payload, prepare, runContext) {
    try {
      if (plan.operation !== "delete" || payload.isHistoryReplay === true) { return; }
      var byOwner = prepare.byOwner || {};
      runContext.deleteHistorySlices = {
        singleSelect: byOwner.singleSelect && byOwner.singleSelect.historySlice,
        dienststelle: byOwner.dienststelle && byOwner.dienststelle.historySlice,
        nativeMultiSelect: byOwner.nativeMultiSelect && byOwner.nativeMultiSelect.historySlice
      };
    } catch (err) {
      console.error("[tabs.captureDeleteHistorySlices] failed", err);
    }
  }

  return runTabMutationSaga;
});
