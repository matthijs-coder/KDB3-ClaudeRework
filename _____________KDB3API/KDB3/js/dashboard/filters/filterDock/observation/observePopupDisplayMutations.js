define([
  "./detachPopupDisplayResync.js",
  "./dispatchPopupDisplayResync.js",
  "./evaluatePopupDisplayResyncSession.js",
  "./schedulePopupDisplayResync.js"
], function (
  _detachPopupDisplayResync,
  _dispatchPopupDisplayResync,
  _evaluateSession,
  _schedulePopupDisplayResync
) {
  "use strict";

  function withResyncSource(_options, _source) {
    return Object.assign({}, _options || {}, { resyncSource: _source });
  }

  function __controller(_KDB, _runtime, _options, _mutationRecords) {
    try {
      if (_options && typeof _options.isDisposed === "function" && _options.isDisposed()) {
        return;
      }
      if (_evaluateSession.shouldSelfDetach(_KDB, _runtime)) {
        _detachPopupDisplayResync(_runtime);
        return;
      }
      if (!_evaluateSession.isRelevantMutation(_mutationRecords)) {
        return;
      }
      if (_evaluateSession.hasRelevantCharacterDataMutation(_mutationRecords)) {
        _dispatchPopupDisplayResync(
          _KDB,
          _runtime,
          withResyncSource(_options, "mountMutationCharacterDataSync")
        );
      }
      _schedulePopupDisplayResync(
        _KDB,
        _runtime,
        withResyncSource(_options, "mountMutation")
      );
    } catch (error) {
      console.error("[filterDock.observePopupDisplayMutations] failed", error);
      _detachPopupDisplayResync(_runtime);
    }
  }

  return __controller;
});
