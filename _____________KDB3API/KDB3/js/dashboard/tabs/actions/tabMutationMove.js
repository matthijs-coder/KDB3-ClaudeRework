define([
  "../state/buildMutationResult.js",
  "../state/buildTabMovePlan.js",
  "./guardTabMutation.js",
  "./runTabMutationSaga.js",
  "./runTabMutationOwnerPhases.js"
], function (_buildResult, _buildMovePlan, _guard, _runSaga, _ownerPhases) {
  "use strict";

  function handleTabMutationMove(_ctx, _action) {
    var acquired = _guard.acquire(_ctx);
    if (!acquired.ok) { return Promise.resolve(_buildResult(null, { plan: _ownerPhases.failed(acquired.diagnostics) })); }
    var promise = _runSaga(_ctx, _action, acquired.runId, { buildPlan: buildMovePlan });
    _guard.register(_ctx, promise);
    return promise.finally(function () { _guard.release(_ctx, promise); });
  }

  function buildMovePlan(state, payload) {
    return _buildMovePlan(state, {
      operation: "move",
      tabIndex: payload.tabIndex,
      tabId: payload.tabId,
      targetPosition: payload.targetPosition,
      source: payload.source
    });
  }

  return handleTabMutationMove;
});
