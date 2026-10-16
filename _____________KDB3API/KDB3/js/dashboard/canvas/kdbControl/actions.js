define([
  "./state/actionTypes.js",
  "./state/initialState.js",
  "./state/reducer.js",
  "./effects.js",
  "./dimensionGate.js",
  "./history.js",
  "./restore.js"
], function (_types, _initialState, _reduceKdbControl, _effects, _dimensionGate, _history, _restore) {
  "use strict";

  function isDimensionSetting(action) {
    var type = action.type;
    var payload = action.payload;
    if (type === _types.ACTION_SETTINGS_SET_DASHBOARD_DIMENSION) return true;
    if (type === _types.ACTION_SETTINGS_SET_VISUALIZATION_DEFAULT || type === _types.ACTION_SETTINGS_SET_COMMENT_DEFAULT) {
      return !!(payload && (payload.field === "width" || payload.field === "height"));
    }
    return false;
  }

  function readCommitOptions(action) {
    var options = action.commitOptions || null;
    if (!(action.payload && action.payload.skipHistory === true)) return options;
    return Object.assign({}, options || {}, { skipHistory: true });
  }

  function shouldSyncFrameworkView(action, commitOptions) {
    if (action.type === _types.ACTION_SETTINGS_TOGGLE_DEVELOPER_MODE || action.type === _types.ACTION_SETTINGS_SET_DEVELOPER_MODE) {
      return true;
    }
    return (commitOptions && commitOptions.isHistoryReplay === true) || isDimensionSetting(action);
  }

  // Dispatch pipeline of the kdbControl API: gate -> reduce -> post-dispatch effects -> history step -> view sync.
  function createActionRunner(_KDB) {
    function applySettingsAction(requestedAction) {
      var gated = _dimensionGate.gateSettingsDimensionAction(_KDB, requestedAction);
      if (!gated.proceed) {
        _effects.syncFrameworkView(_KDB);
        return false;
      }
      var action = gated.action || requestedAction;
      var commitOptions = readCommitOptions(action);
      var prevState = _KDB.state.kdbControl;
      if (!prevState && action.type === _types.ACTION_ERROR) prevState = _initialState();
      var nextState = _reduceKdbControl(prevState, action);
      _KDB.state.kdbControl = nextState;
      _effects.runAfterDispatch(_KDB, action, prevState, nextState, commitOptions);
      _history.pushSettingsHistoryStep(_KDB, action, prevState, nextState, commitOptions);
      if (shouldSyncFrameworkView(action, commitOptions)) _effects.syncFrameworkView(_KDB);
      return true;
    }

    function dispatchAction(action) {
      if (!action || typeof action.type !== "string") return undefined;
      if (action.type === _types.ACTION_PARAMETER_SET_RESTORE) {
        return _restore.restoreParameterSet(_KDB, {
          applySettingsAction: applySettingsAction,
          syncView: function syncView() { _effects.syncFrameworkView(_KDB); }
        }, action);
      }
      if (action.type === _types.ACTION_REPLAY_SETTINGS) {
        _history.applySettingsHistoryReplay(applySettingsAction, action.payload || {});
        return undefined;
      }
      applySettingsAction(action);
      return undefined;
    }

    return { dispatchAction: dispatchAction, applySettingsAction: applySettingsAction };
  }

  return { createActionRunner: createActionRunner };
});
