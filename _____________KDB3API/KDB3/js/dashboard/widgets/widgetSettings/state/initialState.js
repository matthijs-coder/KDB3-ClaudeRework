define([], function () {
  function createInitialWidgetSettingsState() {
    return {
      lifecycle: "idle",
      byWidget: {},
      ui: { openForWidgetId: null },
      errorCode: null,
      errorMessage: null
    };
  }
  return createInitialWidgetSettingsState;
});
