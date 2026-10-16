define([
  "../events/eventNames",
  "../history/applyControlSettingsHistoryReplay",
  "./handleParameterSetRestore",
  "./applySettingsAction",
  "../effects/tryFrameworkSyncView",
], function (
  _eventNames,
  _applyHistoryReplay,
  _handleParameterSetRestore,
  _applySettingsAction,
  _tryFrameworkSyncView
) {
  "use strict";
  function dispatchKdbControlAction(_instance, _action) {
    if (!_action || typeof _action.type !== "string") {
      return;
    }
    if (_action.type === _eventNames.ACTION_PARAMETER_SET_RESTORE) {
      return _handleParameterSetRestore(_instance._KDB, {
        applySettingsAction: _applySettingsAction.bind(null, _instance),
        syncView: _tryFrameworkSyncView.bind(null, _instance._KDB),
      }, _action);
    }
    if (_action.type === _eventNames.ACTION_REPLAY_SETTINGS) {
      _applyHistoryReplay(_instance._KDB, _applySettingsAction.bind(null, _instance), _action.payload || {});
      return;
    }
    _applySettingsAction(_instance, _action);
  }
  return dispatchKdbControlAction;
});
