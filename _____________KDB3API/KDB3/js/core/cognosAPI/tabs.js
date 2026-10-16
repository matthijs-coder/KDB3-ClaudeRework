define([], function () {
  "use strict";

  function tabContainer(_tabId) {
    return __getDashboardAPI().getCanvas().getContent(_tabId).getContainer();
  }

  function createTabsApi() {
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
        return tabContainer(_tabId).getPropertyValue("title");
      },

      setTabName: function (_tabId, _newName) {
        tabContainer(_tabId).setPropertyValue("title", _newName);
        return tabContainer(_tabId).getPropertyValue("title");
      }
    };
  }

  return createTabsApi;
});
