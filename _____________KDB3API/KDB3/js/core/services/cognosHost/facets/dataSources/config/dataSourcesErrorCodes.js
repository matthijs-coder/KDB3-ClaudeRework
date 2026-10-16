define([], function () {
  "use strict";

  // Error codes carried by a failed dataSources-facet Outcome. Owners map
  // these onto their own dialect; they are never shown to the user directly.
  return {
    HOST_UNAVAILABLE: "DATASOURCES_HOST_UNAVAILABLE",
    HOST_CAPABILITY_MISSING: "DATASOURCES_HOST_CAPABILITY_MISSING",
    READ_FAILED: "DATASOURCES_READ_FAILED"
  };
});
