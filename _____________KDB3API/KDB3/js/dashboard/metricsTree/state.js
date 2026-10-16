define([], function () {
  "use strict";

  const ACTIONS = {
    LOAD_STARTED: "metricsTree/loadStarted",
    LOAD_SUCCEEDED: "metricsTree/loadSucceeded",
    LOAD_FAILED: "metricsTree/loadFailed",
    RENDERED: "metricsTree/rendered",
    DESTROY: "metricsTree/destroy"
  };

  function createInitialMetricsTreeState() {
    return {
      lifecycle: "idle",
      bySource: {},
      sourceOrder: [],
      hasRenderableData: false,
      lastBuildAt: 0,
      lastRenderedAt: 0,
      readyResolvedAt: 0,
      errorCode: null,
      errorMessage: null
    };
  }

  function reduceMetricsTreeState(_state, _action) {
    const state = _state || createInitialMetricsTreeState();
    const action = _action || {};
    const payload = action.payload || {};

    if (action.type === ACTIONS.LOAD_STARTED) {
      return Object.assign({}, state, {
        lifecycle: "loading",
        hasRenderableData: false,
        errorCode: null,
        errorMessage: null
      });
    }

    if (action.type === ACTIONS.LOAD_SUCCEEDED) {
      return Object.assign({}, state, {
        lifecycle: payload.hasRenderableData ? "ready" : "idle",
        bySource: payload.bySource || {},
        sourceOrder: Array.isArray(payload.sourceOrder) ? payload.sourceOrder.slice() : [],
        hasRenderableData: payload.hasRenderableData === true,
        lastBuildAt: payload.lastBuildAt || 0,
        errorCode: null,
        errorMessage: null
      });
    }

    if (action.type === ACTIONS.LOAD_FAILED) {
      return Object.assign({}, state, {
        lifecycle: "error",
        hasRenderableData: false,
        errorCode: payload.errorCode || "METRICS_TREE_LOAD_FAILED",
        errorMessage: payload.errorMessage || "Metrics tree load failed."
      });
    }

    if (action.type === ACTIONS.RENDERED) {
      return Object.assign({}, state, {
        lifecycle: state.hasRenderableData ? "ready" : state.lifecycle,
        lastRenderedAt: payload.lastRenderedAt || 0,
        readyResolvedAt: payload.readyResolvedAt || 0
      });
    }

    if (action.type === ACTIONS.DESTROY) {
      return Object.assign({}, state, {
        lifecycle: "disposed",
        bySource: {},
        sourceOrder: []
      });
    }

    return state;
  }

  return {
    ACTIONS: ACTIONS,
    createInitialMetricsTreeState: createInitialMetricsTreeState,
    reduceMetricsTreeState: reduceMetricsTreeState
  };
});
