define([
  "../config/actions.js",
  "./routeParameterSetAction.js",
  "../effects/handleSichtFilterDockHandoff.js",
  "../effects/handleSingleSelectCommitted.js",
  "../effects/handleSingleSelectDraftEvent.js",
  "./routeSichtSyncAction.js"
], function (
  _actions,
  _routeParameterSetAction,
  _handleSichtFilterDockHandoff,
  _handleSingleSelectCommitted,
  _handleSingleSelectDraftEvent,
  _routeSichtSyncAction
) {
  "use strict";

  function isDraftAction(_type) {
    return _type === _actions.SINGLE_SELECT_DRAFT_CHANGED || _type === _actions.SINGLE_SELECT_DRAFT_REVERTED;
  }

  // Single router for every non-lifecycle Sicht action, keeping
  // createSichtController.js within the six-import limit.
  function routeSichtAction(_ctx, _action) {
    var action = _action || {};
    if (_routeParameterSetAction.isParameterSetAction(action.type)) {
      return _routeParameterSetAction(_ctx, action);
    }
    if (action.type === _actions.FILTER_DOCK_STATE_CHANGED || action.type === _actions.FILTER_DOCK_POPUP_READY) {
      return _handleSichtFilterDockHandoff(
        _ctx._KDB,
        _ctx.dispatchInternal,
        action.payload,
        action.type
      );
    }
    if (action.type === _actions.SINGLE_SELECT_COMMITTED) {
      return _handleSingleSelectCommitted(_ctx._KDB, _ctx.runtime, _ctx.dispatchInternal, action.payload);
    }
    if (isDraftAction(action.type)) {
      return _handleSingleSelectDraftEvent(
        _ctx._KDB,
        _ctx.dispatchInternal,
        action.payload,
        action.type
      );
    }
    if (action.type === _actions.TABLE_DATA_CHANGED ||
      action.type === _actions.SYNC_REQUESTED ||
      action.type === _actions.SINGLE_SELECT_INVENTORY_RECONCILED) {
      return _routeSichtSyncAction(_ctx, action);
    }
    if (action.type === _actions.ERROR) {
      _ctx.dispatchInternal(action);
      return undefined;
    }
    return undefined;
  }

  routeSichtAction.isParameterSetAction = _routeParameterSetAction.isParameterSetAction;
  routeSichtAction.disposedResult = _routeParameterSetAction.disposedResult;
  routeSichtAction.disposedAckResult = function (_action) {
    var payload = _action && _action.payload ? _action.payload : {};
    var rawGeneration = payload.inventoryGeneration != null
      ? payload.inventoryGeneration
      : payload.generation;
    var generation = Number(rawGeneration);
    return {
      ok: false,
      acknowledged: false,
      degraded: true,
      disposed: true,
      inventoryGeneration: isFinite(generation) ? generation : null,
      code: "SICHT_DISPOSED",
      message: "sicht controller is disposed",
      diagnostics: [{
        code: "SICHT_DISPOSED",
        message: "sicht controller is disposed"
      }]
    };
  };

  routeSichtAction.isRoutableAction = function (_type) {
    return _routeParameterSetAction.isParameterSetAction(_type) ||
      _type === _actions.FILTER_DOCK_STATE_CHANGED ||
      _type === _actions.FILTER_DOCK_POPUP_READY ||
      _type === _actions.SINGLE_SELECT_COMMITTED ||
      isDraftAction(_type) ||
      _type === _actions.SINGLE_SELECT_INVENTORY_RECONCILED ||
      _type === _actions.TABLE_DATA_CHANGED ||
      _type === _actions.SYNC_REQUESTED ||
      _type === _actions.ERROR;
  };

  // Ack actions return the handler's structured result to the caller; other
  // routed actions keep the historical readSichtState() return contract.
  routeSichtAction.isAckAction = function (_type) {
    return _routeParameterSetAction.isParameterSetAction(_type) ||
      _type === _actions.SINGLE_SELECT_COMMITTED ||
      _type === _actions.SINGLE_SELECT_INVENTORY_RECONCILED ||
      _type === _actions.SYNC_REQUESTED ||
      isDraftAction(_type);
  };

  return routeSichtAction;
});
