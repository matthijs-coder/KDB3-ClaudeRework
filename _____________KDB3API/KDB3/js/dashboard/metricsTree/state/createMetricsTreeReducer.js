define([
  "./initialState.js"
], function (_initialState) {
  "use strict";

  function createMetricsTreeReducer() {
    return reduceMetricsTreeAction;
  }

  function reduceMetricsTreeAction(_state, _action) {
    const state = _state || _initialState();
    const action = _action || {};
    const payload = action.payload || {};

    if (action.type === "metricsTree/loadStarted") {
      return assignState(state, {
        lifecycle: "loading",
        hasRenderableData: false,
        errorCode: null,
        errorMessage: null
      });
    }

    if (action.type === "metricsTree/loadSucceeded") {
      return assignState(state, {
        lifecycle: payload.hasRenderableData ? "ready" : "idle",
        bySource: payload.bySource || {},
        sourceOrder: Array.isArray(payload.sourceOrder) ? payload.sourceOrder.slice() : [],
        hasRenderableData: payload.hasRenderableData === true,
        lastBuildAt: payload.lastBuildAt || 0,
        errorCode: null,
        errorMessage: null
      });
    }

    if (action.type === "metricsTree/loadFailed") {
      return assignState(state, {
        lifecycle: "error",
        hasRenderableData: false,
        errorCode: payload.errorCode || "METRICS_TREE_LOAD_FAILED",
        errorMessage: payload.errorMessage || "Metrics tree load failed."
      });
    }

    if (action.type === "metricsTree/rendered") {
      return assignState(state, {
        lifecycle: state.hasRenderableData ? "ready" : state.lifecycle,
        lastRenderedAt: payload.lastRenderedAt || 0,
        readyResolvedAt: payload.readyResolvedAt || 0
      });
    }

    if (action.type === "metricsTree/destroy") {
      return assignState(state, {
        lifecycle: "disposed"
      });
    }

    return state;
  }

  function assignState(state, patch) {
    const next = {};
    Object.keys(state).forEach(function (key) {
      next[key] = state[key];
    });
    Object.keys(patch).forEach(function (key) {
      next[key] = patch[key];
    });
    return next;
  }

  return createMetricsTreeReducer;
});
