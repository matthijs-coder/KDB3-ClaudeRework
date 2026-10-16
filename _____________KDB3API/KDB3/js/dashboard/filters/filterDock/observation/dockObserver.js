define([
  "../state.js",
  "../config.js",
  "./mutationSummary.js",
  "./evaluateDock.js",
  "../../../../core/utils/kit/runtime.js"
], function (_state, _config, _mutationSummary, _evaluateDock, _runtime) {
  "use strict";

  function scheduleDockEvaluation(ctx, records) {
    var runtime = ctx.runtime;
    var summary = _mutationSummary.summarizeMutations(records);
    var scheduledAt;
    if (summary.addedCount || summary.removedCount || summary.attributeCount) {
      ctx.dispatch({
        type: _state.ACTIONS.MUTATIONS_OBSERVED,
        payload: {
          observedChildren: summary,
          mutationDelta: summary.addedCount + summary.removedCount + (summary.attributeCount || 0)
        }
      });
    }
    if (runtime.timers.dockEvaluation != null) {
      _mutationSummary.mergePendingSummary(runtime.pendingEvaluationMerge, summary);
      return;
    }
    scheduledAt = Date.now();
    runtime.pendingEvaluationMerge = _mutationSummary.createPendingSummary(summary, scheduledAt);
    _runtime.scheduleFrame(runtime.timers, "dockEvaluation", function () {
      runDockEvaluation(ctx);
    });
    ctx.dispatch({ type: _state.ACTIONS.EVALUATION_SCHEDULED, payload: { scheduledAt: scheduledAt } });
  }

  // Frame boundary.
  function runDockEvaluation(ctx) {
    var summary = ctx.runtime.pendingEvaluationMerge;
    ctx.runtime.pendingEvaluationMerge = null;
    if (ctx.isDisposed()) {
      return;
    }
    try {
      _evaluateDock.evaluateDockState(ctx, summary);
    } catch (error) {
      console.error("[filterDock.runDockEvaluation] evaluation failed", error);
    }
    ctx.dispatch({ type: _state.ACTIONS.EVALUATION_FINISHED, payload: { finishedAt: Date.now() } });
  }

  // MutationObserver boundary.
  function onDockMutations(ctx, records) {
    if (ctx.isDisposed()) {
      return;
    }
    try {
      scheduleDockEvaluation(ctx, records);
    } catch (error) {
      console.error("[filterDock.onDockMutations] failed", error);
    }
  }

  function bindDockObserver(ctx, dockRoot) {
    var runtime = ctx.runtime;
    var observer;
    if (runtime.observers.dock) {
      return;
    }
    observer = new MutationObserver(function (records) {
      onDockMutations(ctx, records);
    });
    observer.observe(dockRoot, _config.DOCK_OBSERVER_OPTIONS);
    runtime.observers.dock = observer;
    runtime.domRefs.dockRoot = dockRoot;
  }

  function unbindDockObserver(runtime) {
    if (runtime.observers.dock) {
      runtime.observers.dock.disconnect();
      delete runtime.observers.dock;
    }
  }

  return {
    bindDockObserver: bindDockObserver,
    unbindDockObserver: unbindDockObserver,
    scheduleDockEvaluation: scheduleDockEvaluation,
    runDockEvaluation: runDockEvaluation
  };
});
