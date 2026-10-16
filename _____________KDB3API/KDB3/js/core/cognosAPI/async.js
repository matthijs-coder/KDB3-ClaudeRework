define([], function () {
  "use strict";

  function createAsyncApi() {
    return {
      getCanvasWhenReady: async function () {
        return await __getDashboardAPI().getCanvasWhenReady();
      },

      getWidgetWhenReady: async function (_widgetId) {
        return await __getDashboardAPI().getCanvas().getWidgetWhenReady(_widgetId);
      },

      whenRenderStart: async function (_widgetId) {
        return await __getDashboardAPI().getCanvas().getWidget(_widgetId).whenRenderStart();
      },

      whenRenderComplete: async function (_widgetId) {
        return await __getDashboardAPI().getCanvas().getWidget(_widgetId).whenRenderComplete();
      }
    };
  }

  return createAsyncApi;
});
