define([
  "../config/actions.js",
  "./parameterSetShared.js",
  "./handleParameterSetClear.js",
  "./handleParameterSetRestore.js",
  "./handleParameterSetDownstreamVisibility.js"
], function (
  _actions,
  _shared,
  _handleParameterSetClear,
  _handleParameterSetRestore,
  _handleParameterSetDownstreamVisibility
) {
  "use strict";

  function routeParameterSetAction(_ctx, _action) {
    var action = _action || {};
    var deps = { runtime: _ctx.runtime, dispatchInternal: _ctx.dispatchInternal };
    if (action.type === _actions.PARAMETER_SET_CLEAR_REQUESTED) {
      return _handleParameterSetClear(_ctx._KDB, deps, action);
    }
    if (action.type === _actions.PARAMETER_SET_RESTORE_REQUESTED) {
      return _handleParameterSetRestore(_ctx._KDB, deps, action);
    }
    return _handleParameterSetDownstreamVisibility(_ctx._KDB, deps, action);
  }

  routeParameterSetAction.isParameterSetAction = function (type) {
    return type === _actions.PARAMETER_SET_CLEAR_REQUESTED ||
      type === _actions.PARAMETER_SET_RESTORE_REQUESTED ||
      type === _actions.PARAMETER_SET_DOWNSTREAM_VISIBILITY_REQUESTED;
  };

  // Disposed controllers must still hand writebackSet a structured awaitable
  // cancel ack; a bare undefined would read as "dispatch target not implemented".
  routeParameterSetAction.disposedResult = function () {
    return Promise.resolve(_shared.ack(false, [
      _shared.diagnostic("WRITEBACK_RESTORE_CANCELLED", "sicht controller is disposed")
    ]));
  };

  return routeParameterSetAction;
});
