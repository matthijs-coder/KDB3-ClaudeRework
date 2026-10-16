define([
  "../config/actions.js",
  "./routeIdentityAction.js",
  "./tabMutation/routeTabMutationAction.js",
  "../effects/processFilterDockHandoff.js",
  "../effects/handleFilterDockCommittedDisplayObserved.js",
  "../state/selectors.js"
], function (_actions, _routeIdentityAction, _tabMutation, _processFilterDockHandoff, _handleCommittedDisplay, _selectors) {
  "use strict";

  function __controller(_KDB, _runtime, _action, _options, _reduce) {
    try {
      var action = _action || {};
      var routed = _routeIdentityAction(_KDB, _runtime, action);
      if (routed) { return routed; }
      if (action.type === _actions.PREPARE_TAB_MUTATION) {
        return _tabMutation.handlePrepare(_KDB, _runtime, action.payload);
      }
      if (action.type === _actions.APPLY_TAB_MUTATION) {
        return _tabMutation.handleApply(_KDB, _runtime, action.payload);
      }
      if (action.type === _actions.RESTORE_TAB_MUTATION_SNAPSHOT) {
        return _tabMutation.handleRestore(_KDB, _runtime, action.payload);
      }
      if (action.type === _actions.RESYNC_TAB_MUTATION_HOST) {
        return _tabMutation.handleResync(_KDB, _runtime, action.payload);
      }
      if (action.type === _actions.FILTER_DOCK_STATE_CHANGED ||
        action.type === _actions.FILTER_DOCK_POPUP_READY) {
        _processFilterDockHandoff.processFilterDockHandoff(
          _KDB, _runtime, action.payload, action.type, _options
        );
      } else if (action.type === _actions.FILTER_DOCK_COMMITTED_DISPLAY_OBSERVED) {
        _handleCommittedDisplay(_KDB);
      } else if (action.type === _actions.ERROR) {
        _reduce(action);
      }
      return _selectors.readSingleSelectState(_KDB);
    } catch (error) {
      console.error("[singleSelect.dispatchSingleSelectAction] failed", {
        actionType: _action && _action.type
      }, error);
      throw error;
    }
  }

  return __controller;
});
