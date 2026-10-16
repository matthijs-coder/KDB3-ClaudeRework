define([
  "../config/actions.js",
  "./handleFilterDockConfirm.js",
  "./handleNativeMultiSelectHistoryReplay.js"
], function (_actions, _handleFilterDockConfirm, _handleNativeMultiSelectHistoryReplay) {
  "use strict";

  function route(_ctx, _action) {
    var action = _action || {};
    if (action.type === _actions.FILTER_DOCK_STATE_CHANGED) {
      return _handleFilterDockConfirm(_ctx, action.payload || {});
    }
    if (action.type === _actions.HISTORY_REPLAY_REQUESTED) {
      return _handleNativeMultiSelectHistoryReplay(_ctx, action.payload || {});
    }
  }

  route.isUserCommitAction = function (_type) {
    return _type === _actions.FILTER_DOCK_STATE_CHANGED || _type === _actions.HISTORY_REPLAY_REQUESTED;
  };

  return route;
});
