define([], function () {
  function initialState() {
    return {
      lifecycle: "idle",
      domReady: false,
      helperTabPageId: null,
      helperTabIds: [],
      padsByKey: {},
      tabs: [],
      errorCode: null,
      errorMessage: null
    };
  }

  return initialState;
});
