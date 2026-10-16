define([], function () {
  "use strict";

  function getTogglePropertyDefinitions() {
    return [
      { propertyId: "KDBReadyToggle", runtimeKey: "KDBReadyToggle" },
      { propertyId: "KDBLoadingImageToggle", runtimeKey: "KDBPlayLoadingImageToggle" },
      { propertyId: "KDBLoadingImageTransparentToggle", runtimeKey: "KDBLoadingImageTransparentToggle" },
      { propertyId: "KDBHideWidgetsToggle", runtimeKey: "KDBHideWidgetsToggle" }
    ];
  }

  return getTogglePropertyDefinitions;
});
