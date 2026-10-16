define([], function () {
  function createInitialWidgetTextState() {
    return {
      lifecycle: "idle",
      byId: {},
      errorCode: null,
      errorMessage: null
    };
  }
  return createInitialWidgetTextState;
});
