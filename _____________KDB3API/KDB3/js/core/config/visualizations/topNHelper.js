define([], function () {
  "use strict";

  var DIMENSION_EXCLUDE_DEFAULTS = ["Gesamt", "ALLE", "^"];

  var MONTH_CODE_TO_CAPTION = {
    "01": "JAN",
    "02": "FEB",
    "03": "MRZ",
    "04": "APR",
    "05": "MAI",
    "06": "JUN",
    "07": "JUL",
    "08": "AUG",
    "09": "SEP",
    "10": "OKT",
    "11": "NOV",
    "12": "DEZ"
  };

  return {
    visualizationType: "TopN",
    cognosVisualizationTypeId: "List",
    visPropBucketKey: "List",
    slotId: "grid_cols",
    dimensionSelectionAffects: "disabled",
    dimensionExcludeDefaults: DIMENSION_EXCLUDE_DEFAULTS,
    aggregationFilter: {
      key: "AggregationstypId",
      include: ["Stichtag"]
    },
    jahrFilter: {
      tableName: "newestStichtag"
    },
    monthCodeToCaption: MONTH_CODE_TO_CAPTION,
    resultPick: ["display", "use", "d", "u", "value", "v", "label", "caption"],
    byKennzahlenTable: {
      Personal_KDB: {
        jahrColumnId: "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]",
        monatColumnId: "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]",
        valueColumnId: "[Personal_KDB_TM1].[KDB Kennzahlen].[replaceKennzahlName]"
      }
    },
    resolveTableEntry: function (_kennzahlenTable) {
      var table = _kennzahlenTable || "Personal_KDB";
      return this.byKennzahlenTable[table] || this.byKennzahlenTable.Personal_KDB || null;
    }
  };
});
