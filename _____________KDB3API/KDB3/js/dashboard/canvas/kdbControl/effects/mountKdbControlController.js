define([
  "../state/initialState",
  "../events/eventNames",
  "./__orchestratorEffects",
  "../framework/__orchestratorFramework",
  "../settings/__orchestratorSettings",
  "../authoringMode/__orchestratorAuthoringMode",
  "../history/registerKdbControlHistoryReplayHandler",
  "../actions/applySettingsAction",
], function (
  _initialState,
  _eventNames,
  _effects,
  _fw,
  _st,
  _auth,
  _registerHistoryReplay,
  _applySettingsAction
) {
  "use strict";
  function mountKdbControlController(_instance, _options) {
    var _KDB = _instance._KDB;
    try {
      void _options;
      _KDB.runtime.kdbControl = {
        domRefs: {},
        listeners: {},
        abortControllers: {},
        subscriptions: {},
        pendingPromises: {},
      };
      _registerHistoryReplay(_KDB, _applySettingsAction.bind(null, _instance));
      _KDB.state.kdbControl = _instance.reduce(_initialState(), { type: _eventNames.ACTION_INIT });
      var seeded = _KDB.properties && _KDB.properties.KDBHideWidgetsToggle === true;
      _instance.dispatch({
        type: _eventNames.ACTION_SETTINGS_SET_DEVELOPER_MODE,
        payload: { value: seeded, skipHistory: true },
      });
      _fw(_KDB, { dispatch: _instance.dispatch, getState: _instance.getState });
      _st(_KDB, { dispatch: _instance.dispatch, getState: _instance.getState });
      _effects(_KDB);
      _auth(_KDB);
    } catch (err) {
      console.error("[kdbControl.mount]", err);
      if (!_KDB.state.kdbControl) _KDB.state.kdbControl = _initialState();
      _instance.dispatch({
        type: _eventNames.ACTION_ERROR,
        payload: { errorCode: "mount", errorMessage: String(err) },
      });
    }
  }
  return mountKdbControlController;
});
