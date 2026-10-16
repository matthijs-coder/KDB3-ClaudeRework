define([
  "../config/actionTypes.js",
  "../config/mutationCodes.js",
  "./buildMutationResult.js",
  "./plans.js",
  "../actions/runTabMutationSaga.js",
  "../actions/runTabMutationOwnerPhases.js"
], function (_actionTypes, _codes, _buildResult, _plans, _runSaga, _ownerPhases) {
  "use strict";

  // Plan request per mutation action; the plan builders read only these fields.
  const PLAN_BUILDERS = {};
  PLAN_BUILDERS[_actionTypes.DELETE] = function (_ctx, state, payload) {
    const runtime = _ctx._KDB.runtime && _ctx._KDB.runtime.tabs;
    return _plans.buildDeletePlan(state, {
      operation: "delete",
      operationSeq: readRunId(_ctx),
      tabId: payload.tabId,
      tabIndex: payload.tabIndex,
      source: payload.source,
      baselineNamesByIndex: runtime && runtime.baselineNamesByIndex || {}
    });
  };
  PLAN_BUILDERS[_actionTypes.DUPLICATE] = function (_ctx, state, payload) {
    return _plans.buildDuplicatePlan(state, {
      operation: "duplicate",
      operationSeq: readRunId(_ctx),
      tabIndex: payload.tabIndex,
      tabId: payload.tabId,
      source: payload.source
    });
  };
  PLAN_BUILDERS[_actionTypes.MOVE] = function (_ctx, state, payload) {
    return _plans.buildMovePlan(state, {
      operation: "move",
      operationSeq: readRunId(_ctx),
      tabIndex: payload.tabIndex,
      tabId: payload.tabId,
      targetPosition: payload.targetPosition,
      source: payload.source
    });
  };
  PLAN_BUILDERS[_actionTypes.RESTORE_DELETED] = function (_ctx, state, payload) {
    return _plans.buildRestoreDeletedPlan(state, {
      operation: "restoreDeleted",
      operationSeq: readRunId(_ctx),
      insertTabIdx: payload.insertTabIdx,
      tabId: payload.tabId,
      name: payload.name,
      hideSlot: payload.hideSlot,
      filters: payload.filters,
      source: payload.source
    });
  };

  // One mutation at a time: runtime.tabs.pendingPromises.tabMutation holds the
  // running saga (read by other modules) and blocks traversal/startup overlap.
  function routeTabMutationAction(_ctx, _action) {
    const action = _action || {};
    const buildPlan = PLAN_BUILDERS[action.type];
    if (!buildPlan) {
      return Promise.resolve({ ok: false, diagnostics: [{ code: _codes.APPLY_FAILED, message: "Unsupported tabs mutation action." }] });
    }
    const acquired = acquireRun(_ctx._KDB);
    if (!acquired.ok) {
      return Promise.resolve(_buildResult(null, { plan: _ownerPhases.failed(acquired.diagnostics) }));
    }
    const promise = _runSaga(_ctx, action, acquired.runId, {
      buildPlan: buildPlan.bind(null, _ctx),
      releaseRun: function () { releaseRun(_ctx, null); }
    });
    readRuntime(_ctx._KDB).pendingPromises.tabMutation = promise;
    return promise.finally(function () { releaseRun(_ctx, promise); });
  }

  function isTabMutationAction(type) {
    return Object.prototype.hasOwnProperty.call(PLAN_BUILDERS, type);
  }

  function disposedResult() {
    return Promise.resolve({ ok: false, diagnostics: [{ code: _codes.CANCELLED, message: "tabs controller is disposed" }] });
  }

  function acquireRun(_KDB) {
    const runtime = readRuntime(_KDB);
    const pending = runtime.pendingPromises;
    if (pending.tabMutation || pending.traverse || pending.startup) {
      const message = "A tabs operation is already in progress.";
      return { ok: false, errorCode: _codes.CONFLICT, diagnostics: [{ code: _codes.CONFLICT, message: message }] };
    }
    runtime.tabMutationRunId = (runtime.tabMutationRunId || 0) + 1;
    return { ok: true, runId: runtime.tabMutationRunId };
  }

  // Idempotent: the saga releases before its final emit, the route again in .finally().
  function releaseRun(_ctx, _promise) {
    const runtime = readRuntime(_ctx._KDB);
    if (!_promise || runtime.pendingPromises.tabMutation === _promise) {
      delete runtime.pendingPromises.tabMutation;
    }
  }

  function readRunId(_ctx) {
    const runtime = _ctx._KDB.runtime && _ctx._KDB.runtime.tabs;
    return runtime && runtime.tabMutationRunId;
  }

  function readRuntime(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.tabs = _KDB.runtime.tabs || {};
    _KDB.runtime.tabs.pendingPromises = _KDB.runtime.tabs.pendingPromises || {};
    return _KDB.runtime.tabs;
  }

  return {
    routeTabMutationAction: routeTabMutationAction,
    isTabMutationAction: isTabMutationAction,
    disposedResult: disposedResult
  };
});
