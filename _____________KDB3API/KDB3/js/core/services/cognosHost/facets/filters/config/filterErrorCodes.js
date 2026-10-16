define([], function () {
  "use strict";

  // Error codes carried by a failed/degraded filters-facet Outcome. Owners map
  // these onto their own dialect; they are never shown to the user directly.
  return {
    HOST_UNAVAILABLE: "FILTERS_HOST_UNAVAILABLE",
    HOST_CAPABILITY_MISSING: "FILTERS_HOST_CAPABILITY_MISSING",
    ITEM_NOT_FOUND: "FILTERS_ITEM_NOT_FOUND",
    INVALID_REF: "FILTERS_INVALID_REF",
    INVENTORY_FAILED: "FILTERS_INVENTORY_FAILED",
    READ_FAILED: "FILTERS_READ_FAILED",
    WRITE_FAILED: "FILTERS_WRITE_FAILED",
    WAIT_NOT_READY: "FILTERS_WAIT_NOT_READY"
  };
});
