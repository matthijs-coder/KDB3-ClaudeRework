define([
  "./parameterSet/routeParameterSetIdentityAction.js",
  "./reconcileFilterInstances.js",
  "./applyOwnerSelection.js",
  "./applySpecialSelectionPolicy.js"
], function (
  _routeParameterSetIdentityAction,
  _reconcileFilterInstances,
  _applyOwnerSelection,
  _applySpecialSelectionPolicy
) {
  "use strict";

  function routeIdentityAction(_KDB, _runtime, _action) {
    try {
      var action = _action || {};
      var routed = _routeParameterSetIdentityAction(_KDB, _runtime, action);
      if (routed) {
        return routed;
      }
      if (action.type === "singleSelect/reconcileFilterInstances") {
        return _reconcileFilterInstances(_KDB, _runtime, action.payload);
      }
      if (action.type === "singleSelect/applyOwnerSelection") {
        return _applyOwnerSelection(_KDB, _runtime, action.payload);
      }
      if (action.type === "singleSelect/applySpecialSelectionPolicy") {
        return _applySpecialSelectionPolicy(_KDB, _runtime, action.payload);
      }
      return null;
    } catch (error) {
      console.error("[singleSelect.routeIdentityAction] failed", {
        actionType: _action && _action.type
      }, error);
      throw error;
    }
  }

  return routeIdentityAction;
});
