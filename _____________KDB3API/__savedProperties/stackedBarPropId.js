const stackedBarPropId = JSON.stringify({
  stackedBarPropId: {
  Personal_KDB: {
    values: "[Personal_KDB_TM1].[KDB Kennzahlen]",
    categories: ["[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]"],
    series: "",
    color: "",
    repeatHorizontal: "",
    repeatVertical: "",
    dimensionSelectionAffects: "color",
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
