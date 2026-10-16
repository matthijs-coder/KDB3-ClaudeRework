define([
  "../../restore/clear.js",
  "../../restore/restore.js",
  "../../restore/resync.js",
  "../../restore/runs.js"
], function (_clear, _restore, _resync, _runs) {
  "use strict";

  function routeParameterSetIdentityAction(_KDB, _runtime, _action) {
    var action = _action || {};
    if (action.type === "singleSelect/parameterSetClearRequested") {
      return _clear.handleParameterSetClear(_KDB, _runtime, action.payload);
    }
    if (action.type === "singleSelect/parameterSetRestoreRequested") {
      return _restore.handleParameterSetRestore(_KDB, _runtime, action.payload);
    }
    if (action.type === "singleSelect/parameterSetResyncRequested") {
      return _resync.handleParameterSetResync(_KDB, _runtime, action.payload);
    }
    if (action.type === "singleSelect/parameterSetRunFinished") {
      return _runs.handleParameterSetRunFinished(_KDB, _runtime, action.payload);
    }
    return null;
  }

  return routeParameterSetIdentityAction;
});
