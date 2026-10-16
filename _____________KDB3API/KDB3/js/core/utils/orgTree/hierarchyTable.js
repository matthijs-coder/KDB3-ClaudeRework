define([], function () {
  "use strict";

  var HIERARCHY_TABLE_KEYS = {
    BW: "dienststelle_bw_hierarchy",
    DEZPV: "dienststelle_dezpv_hierarchy"
  };

  function normalizeSicht(_sicht) {
    return String(_sicht || "").toUpperCase().trim();
  }

  // Every sicht except DEZPV reads the BW table.
  function hierarchyTableKey(_sicht) {
    return normalizeSicht(_sicht) === "DEZPV" ? HIERARCHY_TABLE_KEYS.DEZPV : HIERARCHY_TABLE_KEYS.BW;
  }

  return {
    HIERARCHY_TABLE_KEYS: HIERARCHY_TABLE_KEYS,
    normalizeSicht: normalizeSicht,
    hierarchyTableKey: hierarchyTableKey
  };
});
