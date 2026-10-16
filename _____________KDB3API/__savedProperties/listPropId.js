const listPropId = JSON.stringify({
  listPropId: {
  Personal_KDB: {
    values: "",
    categories: "",
    series: "",
    color: "",
    repeatHorizontal: "",
    repeatVertical: "",
    grid_cols: [
      "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]",
      "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]",
      "[Personal_KDB_TM1].[KDB Kennzahlen].[replaceKennzahlName]",
    ],
    dimensionSelectionAffects: "grid_cols",
    sequencesSelectionAffects: "",
    widgetFilter: {
      "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]": {
        exclude: ["ALLE", "Gesamt"],
      },
    },
  },
  Kennzahlen_TEST: {
    values: "noTable",
    categories: ["[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]"],
    series: "",
    color: "",
    repeatHorizontal: "",
    repeatVertical: "",
    dimensionSelectionAffects: "color",
    sequencesSelectionAffects: "",
    widgetFilter: {
      "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]": {
        exclude: ["Gesamt"],
      },
    },
  },
  },
});
