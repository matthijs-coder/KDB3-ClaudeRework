define([], function () {
  "use strict";

  return {
    BW: {
      activeSichtValue: "BW",
      activeFilterKey: "Dienststelle_BW",
      visibleFilterLabel: "Dienststelle",
      defaultTableKey: "dienststelle_bw_default",
      hierarchyTableKey: "dienststelle_bw_hierarchy",
      shouldSanitizeOptionDisplay: false
    },
    DEZPV: {
      activeSichtValue: "DEZPV",
      activeFilterKey: "Dienststelle_DEZPV",
      visibleFilterLabel: "Dienststelle",
      defaultTableKey: "dienststelle_dezpv_default",
      hierarchyTableKey: "dienststelle_dezpv_hierarchy",
      shouldSanitizeOptionDisplay: true
    }
  };
});
