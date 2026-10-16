define([
  "../state/buildMutationResult.js",
  "../state/buildTabRestoreDeletedPlan.js",
  "./guardTabMutation.js",
  "./runTabMutationSaga.js",
  "./runTabMutationOwnerPhases.js"
], function (_buildResult, _buildRestoreDeletedPlan, _guard, _runSaga, _ownerPhases) {
  "use strict";

  function handleTabMutationRestoreDeleted(_ctx, _action) {
    var acquired = _guard.acquire(_ctx);
    if (!acquired.ok) { return Promise.resolve(_buildResult(null, { plan: _ownerPhases.failed(acquired.diagnostics) })); }
    var promise = _runSaga(_ctx, _action, acquired.runId, { buildPlan: buildRestoreDeletedPlan });
    _guard.register(_ctx, promise);
    return promise.finally(function () { _guard.release(_ctx, promise); });
  }

  function buildRestoreDeletedPlan(state, payload) {
    return _buildRestoreDeletedPlan(state, {
      operation: "restoreDeleted",
      insertTabIdx: payload.insertTabIdx,
      tabId: payload.tabId,
      name: payload.name,
      hideSlot: payload.hideSlot,
      filters: payload.filters,
      source: payload.source
    });
  }

  return handleTabMutationRestoreDeleted;
});
