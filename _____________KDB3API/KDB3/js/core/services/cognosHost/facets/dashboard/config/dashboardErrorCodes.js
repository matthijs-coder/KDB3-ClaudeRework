define([], function () {
  "use strict";

  // Error codes carried by a failed dashboard-facet Outcome. Owners map these
  // onto their own dialect; they are never shown to the user directly.
  return {
    HOST_UNAVAILABLE: "DASHBOARD_HOST_UNAVAILABLE",
    HOST_CAPABILITY_MISSING: "DASHBOARD_HOST_CAPABILITY_MISSING",
    READ_FAILED: "DASHBOARD_READ_FAILED",
    NAV_FAILED: "DASHBOARD_NAV_FAILED",
    INVALID_VIEW: "DASHBOARD_INVALID_VIEW"
  };
});
