define([
  "../../config/actions.js",
  "../../config/parameterSetCodes.js",
  "./parameterSetClear.js",
  "./parameterSetRestore.js"
], function (_actions, _codes, _parameterSetClear, _parameterSetRestore) {
  "use strict";

  function routeParameterSetAction(_ctx, _action) {
    var action = _action || {};
    var payload = action.payload || {};
    if (action.type === _actions.PARAMETER_SET_CLEAR_REQUESTED) {
      return _parameterSetClear(_ctx, payload);
    }
    return _parameterSetRestore(_ctx, payload);
  }

  routeParameterSetAction.isParameterSetAction = function (type) {
    return type === _actions.PARAMETER_SET_CLEAR_REQUESTED ||
      type === _actions.PARAMETER_SET_RESTORE_REQUESTED;
  };

  routeParameterSetAction.disposedResult = function () {
    return Promise.resolve({
      ok: false,
      diagnostics: [{ code: _codes.CANCELLED, message: "NativeMultiSelect controller is disposed" }]
    });
  };

  return routeParameterSetAction;
});
