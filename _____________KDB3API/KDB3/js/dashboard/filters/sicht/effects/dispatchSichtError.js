define([
  "../config/actions.js"
], function (_actions) {
  "use strict";

  function dispatchSichtError(_dispatchInternal, _code, _message) {
    try {
      _dispatchInternal({
        type: _actions.ERROR,
        payload: {
          errorCode: _code,
          errorMessage: _message
        }
      });
      return true;
    } catch (error) {
      console.error("[sicht.dispatchSichtError] failed", error);
      return false;
    }
  }

  return dispatchSichtError;
});
