define([], function () {
  "use strict";

  function __controller(_KDB) {
    try {
      return {
        getCanvasFeature: function () {
          return __getDashboardAPI().getFeature("Canvas");
        },

        getCanvas: function () {
          return __getDashboardAPI().getCanvas();
        },

        findCanvasContent: function () {
          return __getDashboardAPI().getCanvas().findContent();
        },

        getCanvasPropertiesList: function () {
          return __getDashboardAPI().getCanvas().getPropertyNameList();
        },

        getCanvasPropertyValue: function (_propertyName) {
          return __getDashboardAPI().getCanvas().getPropertyValue(_propertyName);
        },

        setCanvasPropertyValue: function (_propertyName, _propertyValue) {
          __getDashboardAPI().getCanvas().setPropertyValue(_propertyName, _propertyValue);
          return __getDashboardAPI().getCanvas().getPropertyValue(_propertyName);
        },

        getCanvasWhenReady: function () {
          return __getDashboardAPI().getCanvasWhenReady();
        },
      };
    } catch (error) {
      console.error("[KDB][__controller] failed", error);
      throw error;
    }
  }

  return __controller;
});
