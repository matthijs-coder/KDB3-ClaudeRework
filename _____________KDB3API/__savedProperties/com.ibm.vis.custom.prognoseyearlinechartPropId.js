const comIbmVisCustomPrognoseyearlinechartPropId = JSON.stringify({
  "com.ibm.vis.custom.prognoseyearlinechartPropId": {
  Personal_KDB: {
    values: "[Personal_KDB_TM1].[KDB Kennzahlen]",
    categories: "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]",
    series: [
      "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]",
      "[Personal_KDB_TM1].[Stichtag].[Stichtag].[Stichtag]",
    ],
    color: "",
    repeatHorizontal: "",
    repeatVertical: "",
    dimensionSelectionAffects: "series",
    sequencesSelectionAffects: "",
    widgetFilter: {
      "[Personal_KDB_TM1].[Stichtag].[Stichtag].[Stichtag]": {
        // include: ['[Personal_KDB_TM1].[Stichtag].[Stichtag].[Stichtag]->:[TMR].[Stichtag].[Stichtag].[PKZ]','[Personal_KDB_TM1].[Stichtag].[Stichtag].[Stichtag]->:[TMR].[Stichtag].[Stichtag].[PKZ inkl. Prognose]']
        include:["PKZ", "PKZ inkl. Prognose"],
      },
      AggregationstypId: { include: ["Stichtag"] },
      "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]": {
        exclude: ["ALLE", "Gesamt"],
      },
      "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]": {
        exclude: ["ALLE", "Gesamt"],
      },
    },
  },
  Kennzahlen_TEST: {
    values: "noTable",
    categories: "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]",
    series: ["[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]"],
    color: "",
    repeatHorizontal: "",
    repeatVertical: "",
    dimensionSelectionAffects: "series",
    sequencesSelectionAffects: "",
    widgetFilter: {
      AggregationstypId: { include: ["Stichtag"] },
      "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]": {
        exclude: ["Gesamt"],
      },
      "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]": {
        exclude: ["Gesamt"],
      },
    },
  },
  },
});
