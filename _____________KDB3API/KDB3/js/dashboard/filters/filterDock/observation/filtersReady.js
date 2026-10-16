define([
  "../state.js",
  "../config.js",
  "../selectors.js",
  "../ownerRouter.js",
  "../../../../core/utils/kit/runtime.js"
], function (_state, _config, _selectors, _ownerRouter, _runtime) {
  "use strict";

  function clearFiltersReadyWatch(runtime) {
    _runtime.clearTimer(runtime.timers, "filtersReadyStability");
    _runtime.clearTimer(runtime.timers, "filtersReadyMaxWait");
    delete runtime.filtersReadyWatch;
  }

  function isFiltersReady(ctx) {
    return ctx.runtime.filtersReadyDispatched === true || _selectors.readFiltersReadyFlag(ctx._KDB);
  }

  function recordFiltersReadyDiagnostics(ctx, routeResult) {
    routeResult.diagnostics.forEach(function (diagnostic) {
      if (!diagnostic || !diagnostic.code) {
        return;
      }
      console.warn("[filterDock.recordFiltersReadyDiagnostics] observed", diagnostic);
      ctx.dispatch({
        type: _state.ACTIONS.FILTERS_READY_DIAGNOSTIC_OBSERVED,
        payload: { errorCode: diagnostic.code, errorMessage: diagnostic.message || null }
      });
    });
  }

  function dispatchFiltersReady(ctx, dockRoot, selectors, source) {
    var observedAt = Date.now();
    var wrapperCount;
    if (!selectors.filterItemSelector) {
      return;
    }
    wrapperCount = dockRoot.querySelectorAll(selectors.filterItemSelector).length;
    if (wrapperCount < 1) {
      return;
    }
    ctx.runtime.filtersReadyDispatched = true;
    clearFiltersReadyWatch(ctx.runtime);
    ctx.dispatch({
      type: _state.ACTIONS.FILTERS_READY_OBSERVED,
      payload: { filtersReady: true, filtersReadyAt: observedAt, filterWrapperCount: wrapperCount }
    });
    recordFiltersReadyDiagnostics(
      ctx,
      _ownerRouter.dispatchFiltersReadyToOwners(ctx._KDB, {
        reason: "filtersReady",
        source: source,
        observedAt: observedAt,
        filterWrapperCount: wrapperCount
      })
    );
  }

  // Timer boundary.
  function onFiltersReadyTimer(ctx, source, dispatchReady) {
    try {
      if (ctx.isDisposed()) {
        clearFiltersReadyWatch(ctx.runtime);
        return;
      }
      if (!isFiltersReady(ctx)) {
        dispatchReady(source);
      }
    } catch (error) {
      console.error("[filterDock.onFiltersReadyTimer] failed", { source: source }, error);
      clearFiltersReadyWatch(ctx.runtime);
    }
  }

  // The 30 s max-wait timer is armed once per watch; the stability timer restarts whenever the wrapper count grows.
  function watchFiltersReady(ctx, wrapperCount, dispatchReady) {
    var runtime = ctx.runtime;
    var watch;
    if (isFiltersReady(ctx)) {
      return false;
    }
    watch = runtime.filtersReadyWatch || (runtime.filtersReadyWatch = { lastCount: 0, maxWaitArmed: false });
    if (wrapperCount <= watch.lastCount) {
      return true;
    }
    watch.lastCount = wrapperCount;
    if (watch.maxWaitArmed !== true) {
      watch.maxWaitArmed = true;
      _runtime.scheduleTimeout(runtime.timers, "filtersReadyMaxWait", function () {
        onFiltersReadyTimer(ctx, "filterDockFiltersReadyTimeout", dispatchReady);
      }, _config.FILTERS_READY_MAX_WAIT_MS);
    }
    _runtime.scheduleTimeout(runtime.timers, "filtersReadyStability", function () {
      onFiltersReadyTimer(ctx, "filterDockFiltersReady", dispatchReady);
    }, _config.FILTERS_READY_STABILITY_MS);
    return true;
  }

  function detectFiltersReady(ctx, dockRoot) {
    var selectors = _selectors.readDockSelectors(ctx._KDB);
    var wrapperCount;
    if (!dockRoot || !selectors || ctx.isDisposed()) {
      return false;
    }
    if (!selectors.filterItemSelector) {
      return false;
    }
    wrapperCount = dockRoot.querySelectorAll(selectors.filterItemSelector).length;
    if (wrapperCount < 1) {
      return false;
    }
    return watchFiltersReady(ctx, wrapperCount, function (source) {
      dispatchFiltersReady(ctx, dockRoot, selectors, source);
    });
  }

  return {
    detectFiltersReady: detectFiltersReady,
    clearFiltersReadyWatch: clearFiltersReadyWatch
  };
});
