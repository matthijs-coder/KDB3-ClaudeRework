define([], function () {
  "use strict";

  function initialState() {
    return {
      lifecycle: "idle",
      byScope: {},
      errorCode: null,
      errorMessage: null
    };
  }

  return initialState;
});
