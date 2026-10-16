define([
  "../state/buildMutationResult.js",
  "../state/buildTabDuplicatePlan.js",
  "./guardTabMutation.js",
  "./runTabMutationSaga.js",
  "./runTabMutationOwnerPhases.js"
], function (_buildResult, _buildDuplicatePlan, _guard, _runSaga, _ownerPhases) {
  "use strict";

  function handleTabMutationDuplicate(_ctx, _action) {
    var acquired = _guard.acquire(_ctx);
    if (!acquired.ok) { return Promise.resolve(_buildResult(null, { plan: _ownerPhases.failed(acquired.diagnostics) })); }
    var promise = _runSaga(_ctx, _action, acquired.runId, { buildPlan: buildDuplicatePlan });
    _guard.register(_ctx, promise);
    return promise.finally(function () { _guard.release(_ctx, promise); });
  }

  function buildDuplicatePlan(state, payload) {
    return _buildDuplicatePlan(state, {
      operation: "duplicate",
      tabIndex: payload.tabIndex,
      tabId: payload.tabId,
      source: payload.source
    });
  }

  return handleTabMutationDuplicate;
});
