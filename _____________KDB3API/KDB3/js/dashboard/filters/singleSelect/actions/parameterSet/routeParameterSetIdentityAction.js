define([
  "./handleParameterSetClear.js",
  "./handleParameterSetRestore.js",
  "./handleParameterSetResync.js",
  "./handleParameterSetRunFinished.js"
], function (
  _handleParameterSetClear,
  _handleParameterSetRestore,
  _handleParameterSetResync,
  _handleParameterSetRunFinished
) {
  "use strict";

  function routeParameterSetIdentityAction(_KDB, _runtime, _action) {
    var action = _action || {};
    if (action.type === "singleSelect/parameterSetClearRequested") {
      return _handleParameterSetClear(_KDB, action.payload, _runtime);
    }
    if (action.type === "singleSelect/parameterSetRestoreRequested") {
      return _handleParameterSetRestore(_KDB, action.payload, _runtime);
    }
    if (action.type === "singleSelect/parameterSetResyncRequested") {
      return _handleParameterSetResync(_KDB, action.payload, _runtime);
    }
    if (action.type === "singleSelect/parameterSetRunFinished") {
      return _handleParameterSetRunFinished(_KDB, action.payload, _runtime);
    }
    return null;
  }

  return routeParameterSetIdentityAction;
});
