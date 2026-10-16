const linePropId = JSON.stringify({
  linePropId: {
  Personal_KDB: {
    values: "[Personal_KDB_TM1].[KDB Kennzahlen]",
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
        exclude: ["Gesamt", "ALLE" ],
      },
      "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]": {
        exclude: [ "Gesamt", "ALLE"],
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
