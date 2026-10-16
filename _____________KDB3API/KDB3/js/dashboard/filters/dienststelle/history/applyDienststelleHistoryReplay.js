define(["../config/actions.js"], function (_actions) {
  "use strict";

  async function apply(_KDB, _targetValue, _step, _ctx) {
    var api = _KDB && _KDB.api ? _KDB.api.dienststelle : null;
    var step = _step || {};
    void _ctx;
    if (!api || typeof api.dispatch !== "function") {
      return false;
    }
    if (step.key !== "filter_dienststelle") {
      return false;
    }
    var replayResult = await api.dispatch({
      type: _actions.HISTORY_REPLAY_REQUESTED,
      payload: {
        targetValue: _targetValue,
        step: step,
        ctx: _ctx
      }
    });
    return replayResult === true;
  }

  return { apply: apply };
});
