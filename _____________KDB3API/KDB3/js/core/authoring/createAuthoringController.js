define([
  "./state/initialAuthoringState",
  "./state/createAuthoringReducer",
  "./effects/publishAuthoringFacts",
], function (_initialAuthoringState, _createAuthoringReducer, _publishAuthoringFacts) {
  "use strict";
  var ENTER = "authoring/enter";
  var EXIT = "authoring/exit";
  var SOURCES = { "cognos-ui": 1, api: 1, bootstrap: 1 };
  function validSource(s) {
    return !!SOURCES[s];
  }
  function unsubscribeAuthoringSubscriptions(_KDB) {
    var runtimeAuthoring = _KDB.runtime && _KDB.runtime.authoring;
    var subscriptions = runtimeAuthoring && runtimeAuthoring.subscriptions;
    if (!subscriptions) return;
    Object.keys(subscriptions).forEach(function (key) {
      try {
        if (typeof subscriptions[key] === "function") subscriptions[key]();
      } catch (err) {
        console.error("[authoring] unsubscribe failed", key, err);
      }
    });
    runtimeAuthoring.subscriptions = {};
  }
  function authoringMountBody(_KDB, _initial) {
    if (!_KDB.state.authoring) _KDB.state.authoring = _initial();
    // Her-render op dezelfde instantie: oude host-callback afmelden vóór de
    // runtime-reset, anders accumuleert onUiStateChange per render.
    unsubscribeAuthoringSubscriptions(_KDB);
    _KDB.runtime.authoring = {};
  }
  function authoringDestroyBody(_KDB, _initial) {
    unsubscribeAuthoringSubscriptions(_KDB);
    _KDB.state.authoring = _initial();
    _KDB.runtime.authoring = null;
  }
  function authoringDispatchBody(_KDB, action, reduce, publishFacts) {
    var t = action && action.type;
    var pl = action && action.payload;
    if (t !== ENTER && t !== EXIT) {
      console.error("[authoring.dispatch] unknown type", t);
      return;
    }
    if (!pl || !validSource(pl.source)) {
      console.error("[authoring.dispatch] invalid or missing payload.source", pl);
      return;
    }
    var prev = _KDB.state.authoring;
    var next = reduce(prev, action);
    _KDB.state.authoring = next;
    if (prev.isAuthoring !== next.isAuthoring) {
      publishFacts(_KDB, prev, next, pl.source);
    }
  }
  function createAuthoringController(_KDB) {
    var initial = _initialAuthoringState;
    var reduce = _createAuthoringReducer();
    return {
      mount: function () {
        try {
          authoringMountBody(_KDB, initial);
        } catch (err) {
          console.error("[authoring.mount]", err);
        }
      },
      destroy: function () {
        try {
          authoringDestroyBody(_KDB, initial);
        } catch (err) {
          console.error("[authoring.destroy]", err);
        }
      },
      dispatch: function (action) {
        try {
          authoringDispatchBody(_KDB, action, reduce, _publishAuthoringFacts);
        } catch (err) {
          console.error("[authoring.dispatch]", err);
        }
      },
      getState: function () {
        var s = _KDB.state.authoring;
        return { isAuthoring: !!(s && s.isAuthoring) };
      },
    };
  }
  return createAuthoringController;
});
