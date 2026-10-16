define([
  "./config/actions.js"
], function (_actions) {
  "use strict";

  function dispatchInternal(_controller, _action) {
    var filtersState = _controller._KDB.state && _controller._KDB.state.filters;
    if (filtersState) {
      filtersState.singleSelect = _controller.reducer(filtersState.singleSelect, _action);
    }
  }

  function warnDisposed(_controller, _methodName) {
    if (!_controller.didWarnDisposed) {
      _controller.didWarnDisposed = true;
      console.warn("[singleSelect." + _methodName + "] called after destroy");
    }
  }

  function isParameterSetAction(_type) {
    return _type === _actions.PARAMETER_SET_CLEAR_REQUESTED ||
      _type === _actions.PARAMETER_SET_RESTORE_REQUESTED ||
      _type === _actions.PARAMETER_SET_RESYNC_REQUESTED ||
      _type === _actions.PARAMETER_SET_RUN_FINISHED;
  }

  function isAsyncAction(_type) {
    return isParameterSetAction(_type) ||
      _type === _actions.RECONCILE_FILTER_INSTANCES ||
      _type === _actions.APPLY_OWNER_SELECTION ||
      _type === _actions.APPLY_SPECIAL_SELECTION_POLICY ||
      _type === _actions.PREPARE_TAB_MUTATION ||
      _type === _actions.APPLY_TAB_MUTATION ||
      _type === _actions.RESTORE_TAB_MUTATION_SNAPSHOT;
  }

  function disposedParameterSetResult(_action) {
    var action = _action || {};
    if (action.type === _actions.PARAMETER_SET_RUN_FINISHED) {
      return Promise.resolve({
        ok: false,
        runId: action && action.payload &&
          typeof action.payload.runId === "number" &&
          isFinite(action.payload.runId)
          ? action.payload.runId : null,
        released: false,
        alreadyReleased: false,
        diagnostics: [{
          code: "WRITEBACK_RESTORE_CANCELLED",
          message: "singleSelect controller is disposed"
        }]
      });
    }
    return Promise.resolve({
      ok: false,
      degraded: false,
      applied: [],
      skipped: [],
      diagnostics: [{ code: "WRITEBACK_RESTORE_CANCELLED", message: "singleSelect controller is disposed" }]
    });
  }

  return {
    dispatchInternal: dispatchInternal,
    warnDisposed: warnDisposed,
    isAsyncAction: isAsyncAction,
    disposedParameterSetResult: disposedParameterSetResult
  };
});
