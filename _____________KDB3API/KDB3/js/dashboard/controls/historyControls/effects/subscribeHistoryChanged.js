define(["../../../../core/services/historyService/events/eventNames.js"], function (_historyEventNames) {
  "use strict";

  function __controller(_KDB, _options) {
    var runtime;
    var events;

    runtime = _KDB.runtime.historyControls;
    if (runtime.subscriptions.historyChanged) {
      return true;
    }

    events = _KDB.events;
    if (!events || typeof events.subscribe !== "function") {
      return false;
    }

    runtime.subscriptions.historyChanged = events.subscribe(
      _historyEventNames.HISTORY_CHANGED,
      function (_payload) {
        try {
          if (_options && typeof _options.sync === "function") {
            _options.sync(_payload);
          }
        } catch (error) {
          console.error("[historyControls.subscribeHistoryChanged]", error);
        }
      }
    );
    return true;
  }

  return __controller;
});
