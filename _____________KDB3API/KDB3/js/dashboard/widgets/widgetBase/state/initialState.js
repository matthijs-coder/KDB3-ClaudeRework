define([], function () {
  function createInitialWidgetBaseState() {
    return {
      lifecycle: "idle",
      byId: {},
      errorCode: null,
      errorMessage: null
    };
  }
  return createInitialWidgetBaseState;
});
