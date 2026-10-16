define([
  "../../config.js",
  "../../restore/clear.js",
  "../../restore/restore.js",
  "../../restore/resync.js",
  "../../restore/runs.js"
], function (_config, _clear, _restore, _resync, _runs) {
  "use strict";

  function routeParameterSetIdentityAction(_KDB, _runtime, _action) {
    var action = _action || {};
    if (action.type === _config.actions.PARAMETER_SET_CLEAR_REQUESTED) {
      return _clear.handleParameterSetClear(_KDB, _runtime, action.payload);
    }
    if (action.type === _config.actions.PARAMETER_SET_RESTORE_REQUESTED) {
      return _restore.handleParameterSetRestore(_KDB, _runtime, action.payload);
    }
    if (action.type === _config.actions.PARAMETER_SET_RESYNC_REQUESTED) {
      return _resync.handleParameterSetResync(_KDB, _runtime, action.payload);
    }
    if (action.type === _config.actions.PARAMETER_SET_RUN_FINISHED) {
      return _runs.handleParameterSetRunFinished(_KDB, _runtime, action.payload);
    }
    return null;
  }

  return routeParameterSetIdentityAction;
});
