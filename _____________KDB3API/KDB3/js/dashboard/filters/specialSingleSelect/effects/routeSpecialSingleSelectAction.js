define([
  "../config/actions.js",
  "../config/specialFilterDefinitions.js",
  "../config/resolveSpecialFilterId.js",
  "./buildSpecialSingleSelectRouteSupport.js",
  "./routeInventoryReconciled.js",
  "./routeSyncRequested.js"
], function (
  _actions,
  _specialFilterDefinitions,
  _resolveSpecialFilterId,
  _buildSpecialSingleSelectRouteSupport,
  _routeInventoryReconciled,
  _routeSyncRequested
) {
  "use strict";

  function routeSpecialSingleSelectAction(_controller, _dispatchInternal, _scheduleSync, _action) {
    var payload = _action && _action.payload ? _action.payload : {};
    var normalizedPayload;
    if (_action.type === _actions.SICHT_CHANGED) {
      _dispatchInternal(_controller, _action);
      _scheduleSync(_controller, payload || {});
      return undefined;
    }
    if (_action.type === _actions.USER_SELECTION_COMMITTED) {
      normalizedPayload = _resolveSpecialFilterId.normalizeUserSelectionCommittedPayload(
        _specialFilterDefinitions,
        payload
      );
      var reducedPayload = _buildSpecialSingleSelectRouteSupport.reduceCommittedPayload(normalizedPayload);
      if (!reducedPayload) {
        return _buildSpecialSingleSelectRouteSupport.buildOwnerAck(
          false,
          "SPECIAL_SINGLE_SELECT_OWNER_CALLBACK_FAILED",
          "missing canonical user-selection identity payload"
        );
      }
      _dispatchInternal(_controller, {
        type: _actions.USER_SELECTION_COMMITTED,
        payload: normalizedPayload
      });
      return _scheduleSync(_controller, payload || {}).then(function (_syncResult) {
        return _buildSpecialSingleSelectRouteSupport.buildTargetScopedAck(_syncResult, reducedPayload);
      });
    }
    if (_action.type === _actions.SINGLE_SELECT_INVENTORY_RECONCILED) {
      return _routeInventoryReconciled(_controller, _scheduleSync, payload);
    }
    if (_action.type === _actions.TABLE_DATA_CHANGED) {
      _scheduleSync(_controller, payload || {});
      return undefined;
    }
    if (_action.type === _actions.SYNC_REQUESTED) {
      return _routeSyncRequested.routeSyncRequested(_controller, _scheduleSync, payload);
    }
    if (_action.type === _actions.FILTER_DOCK_STATE_CHANGED || _action.type === _actions.FILTER_DOCK_POPUP_READY) {
      if (!_controller.isDisposed) {
        _buildSpecialSingleSelectRouteSupport.handleFilterDockHandoff(_controller, payload, _action.type);
      }
      _scheduleSync(_controller, payload || {});
      return undefined;
    }
    if (_action.type === _actions.ERROR) {
      _dispatchInternal(_controller, _action);
    }
    return undefined;
  }

  return {
    routeSpecialSingleSelectAction: routeSpecialSingleSelectAction
  };
});
