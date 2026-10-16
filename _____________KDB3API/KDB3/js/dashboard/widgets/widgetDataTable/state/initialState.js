define([], function () {
  function createInitialWidgetDataTableState() {
    return {
      lifecycle: "idle",
      byId: {},
      errorCode: null,
      errorMessage: null
    };
  }
  return createInitialWidgetDataTableState;
});
