define([], function () {
  "use strict";

  // Error codes carried by a failed/degraded widgets-facet Outcome. Owners map
  // these onto their own dialect; they are never shown to the user directly.
  return {
    HOST_UNAVAILABLE: "WIDGETS_HOST_UNAVAILABLE",
    HOST_CAPABILITY_MISSING: "WIDGETS_HOST_CAPABILITY_MISSING",
    INVALID_ID: "WIDGETS_INVALID_ID",
    ITEM_NOT_FOUND: "WIDGETS_ITEM_NOT_FOUND",
    READ_FAILED: "WIDGETS_READ_FAILED",
    WRITE_FAILED: "WIDGETS_WRITE_FAILED"
  };
});
