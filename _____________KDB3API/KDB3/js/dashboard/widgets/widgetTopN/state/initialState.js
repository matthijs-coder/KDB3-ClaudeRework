define([], function () {
  "use strict";

  function createInitialWidgetTopNState() {
    return {
      lifecycle: "idle",
      byOwner: {},
      errorCode: null,
      errorMessage: null
    };
  }
  return createInitialWidgetTopNState;
});
