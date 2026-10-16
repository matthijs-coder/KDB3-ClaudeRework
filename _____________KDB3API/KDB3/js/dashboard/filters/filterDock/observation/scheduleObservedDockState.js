define([
  "./normalizeMutationSignals.js",
  "./mergeObservedDockPayload.js",
  "./runScheduledObservedDockState.js",
  "../config/actions.js"
], function (
  _normalizeMutationSignals,
  _mergeObservedDockPayload,
  _runScheduledObservedDockState,
  _actions
) {
  "use strict";

  function __controller(_KDB, _runtime, _dispatch, _mutationRecords, _options) {
    if (_options && typeof _options.isDisposed === "function" && _options.isDisposed()) {
      return false;
    }
    try {
      var summary = _normalizeMutationSignals(_mutationRecords);
      if (summary.addedCount || summary.removedCount || summary.attributeCount) {
        _dispatch({
          type: _actions.MUTATIONS_OBSERVED,
          payload: {
            observedChildren: summary,
            mutationDelta:
              summary.addedCount + summary.removedCount + (summary.attributeCount || 0)
          }
        });
      }
      if (_runtime.timers && _runtime.timers.observedStateEvaluation != null) {
        _mergeObservedDockPayload.mergePendingEvaluationMerge(_runtime, summary);
        return true;
      }
      var scheduledAt = Date.now();
      _runtime.pendingEvaluationMerge =
        _mergeObservedDockPayload.buildPendingEvaluationMerge(summary, scheduledAt);
      var callback = _runScheduledObservedDockState.scheduleEvaluationCallback.bind(
        null,
        _KDB,
        _runtime,
        _dispatch,
        _options
      );
      if (typeof requestAnimationFrame === "function") {
        _runtime.timers.observedStateEvaluation = requestAnimationFrame(callback);
      } else {
        _runtime.timers.observedStateEvaluation = setTimeout(callback, 0);
      }
      _dispatch({
        type: _actions.EVALUATION_SCHEDULED,
        payload: { scheduledAt: scheduledAt }
      });
      return true;
    } catch (error) {
      console.error("[filterDock.scheduleObservedDockState] failed", error);
      return false;
    }
  }

  __controller.clearEvaluationTimer = _runScheduledObservedDockState.clearEvaluationTimer;

  return __controller;
});
