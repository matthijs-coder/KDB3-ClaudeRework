define([], function () {
  "use strict";

  // Named catalog of widget-local addFilter write bodies.
  // Not page-context writeFilter, Sicht, or Alle hide.

  return {
    hideDataContainsB: {
      itemId: "HideData",
      body: {
        exclude: false,
        values: [],
        type: "display",
        conditionsInfo: {
          excludedValues: [],
          conditions: {
            operator: "containsignorecase",
            itemId: "HideData",
            ignoreCase: true,
            values: ["b"],
            valueType: "display"
          }
        },
        action: "keepexclude"
      }
    }
  };
});
