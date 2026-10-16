define([], function () {
  function createInitialWidgetVisState() {
    return {
      lifecycle: "idle",
      byId: {},
      errorCode: null,
      errorMessage: null
    };
  }
  return createInitialWidgetVisState;
});
