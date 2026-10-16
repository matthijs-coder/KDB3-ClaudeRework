define([
  "../state/buildMutationResult.js",
  "../state/buildTabMutationPlan.js",
  "./guardTabMutation.js",
  "./runTabMutationSaga.js",
  "./runTabMutationOwnerPhases.js"
], function (_buildResult, _buildPlan, _guard, _runSaga, _ownerPhases) {
  "use strict";

  function handleTabMutationDelete(_ctx, _action) {
    var acquired = _guard.acquire(_ctx);
    if (!acquired.ok) { return Promise.resolve(_buildResult(null, { plan: _ownerPhases.failed(acquired.diagnostics) })); }
    var promise = _runSaga(_ctx, _action, acquired.runId, { buildPlan: buildDeletePlan.bind(null, _ctx) });
    _guard.register(_ctx, promise);
    return promise.finally(function () { _guard.release(_ctx, promise); });
  }

  function buildDeletePlan(_ctx, state, payload) {
    return _buildPlan(state, {
      operation: "delete",
      tabId: payload.tabId,
      tabIndex: payload.tabIndex,
      source: payload.source,
      baselineNamesByIndex: readBaseline(_ctx._KDB)
    });
  }

  function readBaseline(_KDB) { return _KDB.runtime && _KDB.runtime.tabs && _KDB.runtime.tabs.baselineNamesByIndex || {}; }

  return handleTabMutationDelete;
});
