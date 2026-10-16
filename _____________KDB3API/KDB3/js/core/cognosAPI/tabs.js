define([], function () {
  "use strict";

  function __controller(_KDB) {
    try {
      return {
        getTabsContainers: function () {
          return __getDashboardAPI().getSpec().layout.items;
        },

        getTabsContent: function () {
          return __getDashboardAPI()
            .getSpec()
            .layout.items.map(function (element) {
              return element.items;
            });
        },

        getTabName: function (_tabId) {
          return __getDashboardAPI()
            .getCanvas()
            .getContent(_tabId)
            .getContainer()
            .getPropertyValue("title");
        },

        setTabName: function (_tabId, _newName) {
          __getDashboardAPI()
            .getCanvas()
            .getContent(_tabId)
            .getContainer()
            .setPropertyValue("title", _newName);
          return __getDashboardAPI()
            .getCanvas()
            .getContent(_tabId)
            .getContainer()
            .getPropertyValue("title");
        },
      };
    } catch (error) {
      console.error("[KDB][__controller] failed", error);
      throw error;
    }
  }

  return __controller;
});
