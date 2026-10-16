const piePropId = JSON.stringify({
  piePropId: {
  Personal_KDB: {
    values: "[Personal_KDB_TM1].[KDB Kennzahlen]",
    categories: ["[Personal_KDB_TM1].[Geschlecht].[Geschlecht].[Geschlecht]"],
    series: "",
    color: "",
    repeatHorizontal: ["[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]"],
    repeatVertical: "",
    dimensionSelectionAffects: "categories",
    sequencesSelectionAffects: "",
    widgetFilter: {
      "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]": {
        exclude: ["ALLE", "Gesamt"],
      },
      Geschlecht: { exclude: ["ALLE", "Gesamt"] },
    },
  },
  Kennzahlen_TEST: {
    values: "noTable",
    categories: ["Geschlecht"],
    series: "",
    color: "",
    repeatHorizontal: ["[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]"],
    repeatVertical: "",
    dimensionSelectionAffects: "categories",
    sequencesSelectionAffects: "",
    widgetFilter: {
      "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]": {
        exclude: ["Gesamt"],
      },
      Geschlecht: { exclude: ["ALLE", "Gesamt"] },
    },
  },
  },
});
