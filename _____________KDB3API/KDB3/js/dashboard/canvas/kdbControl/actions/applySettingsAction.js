define([
  "../state/initialState",
  "../effects/settingsPostDispatchSideEffects",
  "../settings/gateSettingsDimensionActions",
  "../events/eventNames",
  "../history/pushSettingsHistoryStep",
  "../effects/tryFrameworkSyncView",
], function (
  _initialState,
  _settingsFx,
  _gateDim,
  _eventNames,
  _maybePushHistory,
  _tryFrameworkSyncView
) {
  "use strict";
  function isSettingsBoundDimensionAction(action) {
    if (!action) return false;
    var t = action.type;
    var p = action.payload;
    if (t === _eventNames.ACTION_SETTINGS_SET_DASHBOARD_DIMENSION) return true;
    if (t === _eventNames.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT) {
      return !!(p && (p.field === "width" || p.field === "height"));
    }
    if (t === _eventNames.ACTION_SETTINGS_SET_COMMENT_DEFAULT) {
      return !!(p && (p.field === "width" || p.field === "height"));
    }
    return false;
  }
  function readCommitOptions(action) {
    var opts = (action && action.commitOptions) || null;
    if (!(action && action.payload && action.payload.skipHistory === true)) return opts;
    return Object.assign({}, opts || {}, { skipHistory: true });
  }
  function shouldSyncFrameworkView(action, commitOptions) {
    var t = action && action.type;
    if (t === _eventNames.ACTION_SETTINGS_TOGGLE_DEVELOPER_MODE) return true;
    if (t === _eventNames.ACTION_SETTINGS_SET_DEVELOPER_MODE) return true;
    if (commitOptions && commitOptions.isHistoryReplay === true) return true;
    return isSettingsBoundDimensionAction(action);
  }
  function applySettingsAction(_instance, _action) {
    var _KDB = _instance._KDB;
    var gated = _gateDim.gateSettingsDimensionAction(_KDB, _action);
    if (!gated.proceed) {
      _tryFrameworkSyncView(_KDB);
      return false;
    }
    var action = gated.action || _action;
    var commitOptions = readCommitOptions(action);
    var cur = _KDB.state.kdbControl;
    if (!cur && (action.type === _eventNames.ACTION_ERROR || action.type === "kdbControl/error")) {
      cur = _initialState();
    }
    var prev = cur;
    var next = _instance.reduce(cur, action);
    _KDB.state.kdbControl = next;
    _settingsFx.runAfterDispatch(_KDB, action, prev, next, commitOptions);
    _maybePushHistory(_KDB, action, prev, next, commitOptions);
    if (shouldSyncFrameworkView(action, commitOptions)) {
      _tryFrameworkSyncView(_KDB);
    }
    return true;
  }
  return applySettingsAction;
});
