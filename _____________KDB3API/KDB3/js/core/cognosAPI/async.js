define([], function () {
  "use strict";

  function __controller(_KDB) {
    try {
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
    } catch (error) {
      console.error("[KDB][async] failed", error);
      throw error;
    }
  }

  return __controller;
});
