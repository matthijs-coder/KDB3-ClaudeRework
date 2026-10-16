define([], function () {
  "use strict";

  function initialState() {
    return {
      lifecycle: "idle",
      inventory: {
        generation: 0,
        freshness: "stale",
        reconcileInFlight: false,
        reconciledAt: null,
        errorCode: null
      },
      instancesById: {},
      meta: { isProgrammaticClick: false },
      lastInteraction: null,
      lastConfirmedAt: null,
      lastDiagnostics: [],
      errorCode: null,
      errorMessage: null
    };
  }

  return initialState;
});
