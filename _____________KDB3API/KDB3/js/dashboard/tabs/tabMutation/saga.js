// START HERE for tab delete/move/duplicate (tabMutation).
define([
  "../config/actionTypes.js",
  "../config/mutationCodes.js",
  "../config.js",
  "../view.js",
  "../history.js",
  "./owners.js",
  "./loadingFrame.js",
  "../../../core/utils/kit/data.js"
], function (_actionTypes, _codes, _config, _view, _history, _owners, _loadingFrame, _data) {
  "use strict";

  // The tab mutation saga: plan, make every affected slot ready, prepare and apply the filter and widget owners,
  // commit the tabs state, mirror it into Cognos, resync the host, then record history. Any failure before the
  // commit rolls the owners back and returns the user to the originally active tab.

  const OWNERS = _config.mutationOwners;
  const OPERATIONS_WITH_DEGRADED_ENTRIES = ["duplicate", "delete", "restoreDeleted", "move"];

  async function runTabMutationSaga(_ctx, _action, _runId, _options) {
    const phases = {};
    const payload = _action && _action.payload || {};
    const state = _ctx.getRawState() || {};
    const planResult = _options.buildPlan(state, payload);
    if (!planResult.ok) {
      phases.plan = _owners.failed(planResult.diagnostics);
      return buildMutationResult(null, phases);
    }
    phases.plan = _owners.ok();
    const plan = planResult.plan;
    const loadingStarted = _loadingFrame.startMutationFrame(_ctx, plan);
    try {
      const runContext = {
        runId: _runId,
        operationId: plan.operationId,
        tabIdxByTabId: _owners.mapTabIdxByTabId(state),
        originalActive: _owners.captureOriginalActive(state),
        widgetRebuild: payload.widgetRebuild,
        serializedByTabId: payload.serializedByTabId
      };
      return await runPhases(_ctx, plan, payload, phases, runContext, _options);
    } finally {
      // After every outcome, and only after rollbackOwners and the history step have read the snapshots.
      _owners.clearSnapshots(_ctx, plan.operationId);
      if (loadingStarted) { _loadingFrame.finishMutationFrame(_ctx); }
    }
  }

  async function runPhases(_ctx, plan, payload, phases, runContext, _options) {
    const abort = function () { return abortOnOriginalTab(_ctx, runContext, plan.operationId, phases); };
    const rollbackAndAbort = async function (owners) {
      phases.rollback = await _owners.rollbackOwners(_ctx, owners, runContext);
      return abort();
    };

    phases.slotReadiness = await _owners.ensureSlots(_ctx, plan, runContext);
    if (phases.slotReadiness.status !== "ok") { return abort(); }
    const scopeResolve = await _owners.resolveScopeTargets(_ctx, runContext);
    phases.scopeResolve = scopeResolve.phase;
    if (scopeResolve.phase.status !== "ok") { return abort(); }
    runContext.tabTargets = scopeResolve.tabTargets;

    const prepare = await _owners.dispatchOwners(_ctx, OWNERS.PREPARE_OWNERS, "prepareTabMutation", plan, runContext);
    phases.prepare = prepare.phase;
    if (prepare.phase.status !== "ok") { return rollbackAndAbort(prepare.preparedOwners); }
    captureRollbackSlices(plan, payload, prepare, runContext);

    const filterApply = await _owners.dispatchOwners(_ctx, OWNERS.FILTER_APPLY_OWNERS, "applyTabMutation", plan, runContext);
    phases.filterApply = filterApply.phase;
    if (filterApply.phase.status !== "ok") { return rollbackAndAbort(OWNERS.ROLLBACK_OWNERS); }

    const widgetApply = await _owners.dispatchOwner(_ctx._KDB, "widgetBase", "widgetBase/applyTabMutation", plan, runContext);
    phases.widgetApply = readWidgetApplyPhase(plan, widgetApply);
    if (phases.widgetApply.status === "failed") { return rollbackAndAbort(OWNERS.ROLLBACK_OWNERS); }

    const didCommit = _ctx.dispatch({ type: _actionTypes.TAB_MUTATION_APPLY, payload: { plan: plan } });
    const reducerError = _ctx._KDB.runtime && _ctx._KDB.runtime.tabs && _ctx._KDB.runtime.tabs.lastTabMutationError;
    phases.commit = didCommit === true && !reducerError
      ? _owners.ok()
      : _owners.failed([{ code: reducerError || _codes.POSTCONDITION_FAILED, message: "tabs/tabMutationApply commit failed." }]);
    if (phases.commit.status !== "ok") {
      phases.rollback = await _owners.rollbackOwners(_ctx, OWNERS.ROLLBACK_OWNERS, runContext);
      return buildMutationResult(plan.operationId, phases);
    }

    const cognos = await applyToCognos(_ctx, plan);
    phases.cognosSync = { status: cognos.status === "degraded" ? "degraded" : "ok", diagnostics: cognos.diagnostics || [] };
    phases.hostResync = await _owners.resyncOwners(_ctx, OWNERS.RESYNC_OWNERS, "resyncTabMutationHost", plan, runContext);
    _options.releaseRun();
    _owners.emitFinalTabsChanged(_ctx, plan);
    phases.finalize = _owners.ok();
    const result = buildMutationResult(plan.operationId, phases);
    _history.pushTabMutationHistoryStep(_ctx._KDB, plan, payload, result, runContext);
    return result;
  }

  function captureRollbackSlices(plan, payload, prepare, runContext) {
    const byOwner = prepare.byOwner || {};
    if (plan.operation === "delete" && payload.widgetRebuild !== true && payload.isHistoryReplay !== true) {
      runContext.deleteRollbackByTabId = byOwner.widgetBase.rollbackByTabId;
    }
    if (plan.operation === "move" && payload.isHistoryReplay !== true && _data.isPlainObject(payload.serializedByTabId) !== true) {
      runContext.moveRollbackByTabId = byOwner.widgetBase.rollbackByTabId;
    }
    if (plan.operation === "delete" && payload.isHistoryReplay !== true) {
      runContext.deleteHistorySlices = {
        singleSelect: byOwner.singleSelect && byOwner.singleSelect.historySlice,
        dienststelle: byOwner.dienststelle && byOwner.dienststelle.historySlice,
        nativeMultiSelect: byOwner.nativeMultiSelect && byOwner.nativeMultiSelect.historySlice
      };
    }
  }

  function readWidgetApplyPhase(plan, widgetApply) {
    const isOk = !!widgetApply && widgetApply.ok === true;
    if (isOk && OPERATIONS_WITH_DEGRADED_ENTRIES.indexOf(plan.operation) >= 0
      && Array.isArray(widgetApply.degradedEntries) && widgetApply.degradedEntries.length > 0) {
      return { status: "degraded", diagnostics: widgetApply.diagnostics || [] };
    }
    return isOk ? _owners.ok() : _owners.failed(widgetApply && widgetApply.diagnostics);
  }

  async function abortOnOriginalTab(_ctx, _runContext, _operationId, _phases) {
    await _owners.restoreOriginalActiveTab(_ctx, _runContext);
    return buildMutationResult(_operationId, _phases);
  }

  // Post-commit mirror into Cognos. State is already committed, so a failing rename or traverse only degrades
  // the result. No name comparison: state names already equal the plan targets, so comparing would skip every
  // rename; byIndexAfter only lists slots the plan renames and setTabName is idempotent.
  async function applyToCognos(_ctx, _plan) {
    const diagnostics = [];
    const byIndex = (_ctx.getRawState() || {}).byIndex || {};
    const names = _plan && _plan.names && _plan.names.byIndexAfter || {};
    const indexKeys = Object.keys(names);
    for (let position = 0; position < indexKeys.length; position += 1) {
      const indexKey = indexKeys[position];
      const tab = byIndex[indexKey];
      if (!tab) { continue; }
      try {
        await _ctx.adapter.setTabName({ pageId: tab.pageId || tab.tabId }, names[indexKey]);
      } catch (err) {
        diagnostics.push({ code: "TABS_RENAME_FAILED", index: Number(indexKey), message: String(err && err.message ? err.message : err) });
      }
    }
    try {
      _view.syncDomFromState(_ctx._KDB, _ctx.getRawState());
      _view.syncKdbControlView(_ctx._KDB);
      await _ctx.dispatch({
        type: _actionTypes.TRAVERSE,
        payload: {
          source: "tabsMutation",
          scope: "singleTab",
          tabIndex: _plan.landing.index,
          includeHiddenDashboardTabs: true,
          restoreActiveTab: false,
          waitFor: "canvas"
        }
      });
    } catch (err) {
      diagnostics.push({ code: "TABS_RENAME_FAILED", message: String(err && err.message ? err.message : err) });
    }
    return { status: diagnostics.length > 0 ? "degraded" : "ok", diagnostics: diagnostics };
  }

  function buildMutationResult(_operationId, _phases) {
    const phases = _phases || {};
    const outcome = resolveOutcome(phases);
    return {
      ok: outcome === "applied",
      outcome: outcome,
      operationId: _operationId || null,
      phases: phases,
      diagnostics: flattenDiagnostics(phases)
    };
  }

  // "aborted" requires a clean rollback; residual damage after a pre-commit failure is an honest "degraded"
  // outcome (D-CRUD-7a).
  function resolveOutcome(phases) {
    let hasDegraded = false;
    let hasCommitFailure = false;
    let hasPreCommitFailure = false;
    let hasRollbackResidual = false;
    Object.keys(phases).forEach(function (key) {
      const status = phases[key] && phases[key].status;
      if (status === "degraded") { hasDegraded = true; }
      if (key === "rollback" && (status === "degraded" || status === "failed")) { hasRollbackResidual = true; }
      if (status !== "failed") { return; }
      if (key === "commit" || key === "postcondition") { hasCommitFailure = true; } else { hasPreCommitFailure = true; }
    });
    if (hasCommitFailure) { return "failed"; }
    if (hasRollbackResidual) { return "degraded"; }
    if (hasPreCommitFailure) { return "aborted"; }
    return hasDegraded ? "degraded" : "applied";
  }

  function flattenDiagnostics(phases) {
    const diagnostics = [];
    Object.keys(phases).forEach(function (key) {
      const entries = phases[key] && Array.isArray(phases[key].diagnostics) ? phases[key].diagnostics : [];
      entries.forEach(function (entry) { diagnostics.push(Object.assign({ phase: key }, entry || {})); });
    });
    return diagnostics;
  }

  return { runTabMutationSaga: runTabMutationSaga, buildMutationResult: buildMutationResult };
});
