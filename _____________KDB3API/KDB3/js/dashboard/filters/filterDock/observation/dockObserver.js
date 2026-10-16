define([
  "../config.js",
  "./mutationSummary.js",
  "./evaluateDock.js",
  "../../../../core/utils/kit/runtime.js"
], function (_config, _mutationSummary, _evaluateDock, _runtime) {
  "use strict";

  function readDiagnostics(runtime) {
    return runtime.diagnostics || (runtime.diagnostics = { mutationBatches: 0, evaluations: 0, lastEvaluatedAt: 0 });
  }

  function scheduleDockEvaluation(ctx, records) {
    var runtime = ctx.runtime;
    var summary = _mutationSummary.summarizeMutations(records);
    readDiagnostics(runtime).mutationBatches += 1;
    if (runtime.timers.dockEvaluation != null && runtime.pendingEvaluationMerge) {
      _mutationSummary.mergePendingSummary(runtime.pendingEvaluationMerge, summary);
      return;
    }
    runtime.pendingEvaluationMerge = _mutationSummary.createPendingSummary(summary, Date.now());
    _runtime.scheduleFrame(runtime.timers, "dockEvaluation", function () {
      runDockEvaluation(ctx);
    });
  }

  // Frame boundary.
  function runDockEvaluation(ctx) {
    var diagnostics;
    var summary = ctx.runtime.pendingEvaluationMerge;
    ctx.runtime.pendingEvaluationMerge = null;
    if (ctx.isDisposed()) {
      return;
    }
    diagnostics = readDiagnostics(ctx.runtime);
    try {
      _evaluateDock.evaluateDockState(ctx, summary);
    } catch (error) {
      console.error("[filterDock.runDockEvaluation] evaluation failed", error);
    }
    diagnostics.evaluations += 1;
    diagnostics.lastEvaluatedAt = Date.now();
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
