define([
  "./state/createKdbControlReducer",
  "./state/initialState",
  "./events/eventNames",
  "./effects/mountKdbControlController",
  "./actions/dispatchKdbControlAction",
  "./runtime/cleanupKdbControlRuntime",
  "./effects/tryFrameworkSyncView",
], function (
  _createKdbControlReducer,
  _initialState,
  _eventNames,
  _mountKdbControlController,
  _dispatchKdbControlAction,
  _cleanupKdbControlRuntime,
  _tryFrameworkSyncView
) {
  "use strict";
  function getState(_instance) {
    return _instance._KDB.state.kdbControl;
  }
  function destroy(_instance) {
    var _KDB = _instance._KDB;
    try {
      _cleanupKdbControlRuntime(_KDB.runtime.kdbControl);
      _KDB.state.kdbControl = _instance.reduce(_KDB.state.kdbControl, { type: _eventNames.ACTION_DESTROY });
      _KDB.runtime.kdbControl = null;
    } catch (err) {
      console.error("[kdbControl.destroy]", err);
      if (!_KDB.state.kdbControl) _KDB.state.kdbControl = _initialState();
      _instance.dispatch({
        type: _eventNames.ACTION_ERROR,
        payload: { errorCode: "destroy", errorMessage: String(err) },
      });
    }
  }
  function createKdbControlController(_KDB) {
    var instance = {
      _KDB: _KDB,
      reduce: _createKdbControlReducer(),
    };
    instance.dispatch = _dispatchKdbControlAction.bind(null, instance);
    instance.getState = getState.bind(null, instance);
    return {
      mount: _mountKdbControlController.bind(null, instance),
      destroy: destroy.bind(null, instance),
      dispatch: instance.dispatch,
      getState: instance.getState,
      syncView: _tryFrameworkSyncView.bind(null, _KDB),
    };
  }
  return createKdbControlController;
});
