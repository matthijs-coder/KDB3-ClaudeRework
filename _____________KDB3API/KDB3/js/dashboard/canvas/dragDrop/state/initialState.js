define([], function () {
  "use strict";

  function initialState() {
    return {
      lifecycle: "idle",
      isDragging: false,
      session: null,
      lastValidation: null,
      mountedAt: 0,
      errorCode: null,
      errorMessage: null
    };
  }

  return initialState;
});
