define([], function () {
  "use strict";

  function initialState() {
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

  return initialState;
});
