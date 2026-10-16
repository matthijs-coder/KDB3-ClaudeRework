define([
  "./evaluateObservedDockState.js",
  "../config/actions.js"
], function (_evaluateObservedDockState, _actions) {
  "use strict";

  function clearEvaluationTimer(_runtime) {
    var handle = _runtime.timers && _runtime.timers.observedStateEvaluation;
    if (handle == null) {
      _runtime.pendingEvaluationMerge = null;
      return;
    }
    if (typeof handle === "number") {
      if (typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(handle);
      } else {
        clearTimeout(handle);
      }
    }
    delete _runtime.timers.observedStateEvaluation;
    _runtime.pendingEvaluationMerge = null;
  }

  function runScheduledEvaluation(_KDB, _runtime, _dispatch, _options) {
    var mutationSummary = _runtime.pendingEvaluationMerge;
    clearEvaluationTimer(_runtime);
    if (_options && typeof _options.isDisposed === "function" && _options.isDisposed()) {
      return;
    }
    try {
      _evaluateObservedDockState(_KDB, _runtime, _dispatch, _options, mutationSummary);
      _dispatch({ type: _actions.EVALUATION_FINISHED, payload: { finishedAt: Date.now() } });
    } catch (error) {
      console.error("[filterDock.runScheduledObservedDockState] evaluation failed", error);
    } finally {
      _runtime.pendingEvaluationMerge = null;
    }
  }

  function scheduleEvaluationCallback(_KDB, _runtime, _dispatch, _options) {
    try {
      runScheduledEvaluation(_KDB, _runtime, _dispatch, _options);
    } catch (error) {
      console.error("[filterDock.scheduleEvaluationCallback] failed", error);
    }
  }

  return {
    clearEvaluationTimer: clearEvaluationTimer,
    runScheduledEvaluation: runScheduledEvaluation,
    scheduleEvaluationCallback: scheduleEvaluationCallback
  };
});
