define([], function () {
  "use strict";

  function getPropertySubscriptionDefinitions() {
    return [
      {
        propertyId: "KDBHideWidgetsToggle",
        eventName: "change:property:KDBHideWidgetsToggle",
        runtimeKey: "hideWidgetsToggle"
      }
    ];
  }

  return getPropertySubscriptionDefinitions;
});
