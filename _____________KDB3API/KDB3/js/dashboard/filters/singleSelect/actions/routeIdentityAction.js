define([
  "./parameterSet/routeParameterSetIdentityAction.js",
  "../inventory/reconcile.js",
  "../commit/ownerSelection.js",
  "../commit/specialPolicy.js"
], function (
  _routeParameterSetIdentityAction,
  _reconcileInventory,
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
        return _reconcileInventory.reconcileFilterInstances(_KDB, _runtime, action.payload);
      }
      if (action.type === "singleSelect/applyOwnerSelection") {
        return _applyOwnerSelection.applyOwnerSelection(_KDB, _runtime, action.payload);
      }
      if (action.type === "singleSelect/applySpecialSelectionPolicy") {
        return _applySpecialSelectionPolicy.applySpecialSelectionPolicy(_KDB, _runtime, action.payload);
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
