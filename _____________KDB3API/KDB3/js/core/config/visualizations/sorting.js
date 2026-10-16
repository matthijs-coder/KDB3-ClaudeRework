define([], function () {
  "use strict";

  var COLUMN_MONAT = "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]";
  var COLUMN_JAHR = "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]";

  var MONTH_DESC = [
    "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]->:[TMR].[Monat_flach].[Monat_flach].[Gesamt]",
    "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]->:[TMR].[Monat_flach].[Monat_flach].[DEZ]",
    "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]->:[TMR].[Monat_flach].[Monat_flach].[NOV]",
    "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]->:[TMR].[Monat_flach].[Monat_flach].[OKT]",
    "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]->:[TMR].[Monat_flach].[Monat_flach].[SEP]",
    "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]->:[TMR].[Monat_flach].[Monat_flach].[AUG]",
    "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]->:[TMR].[Monat_flach].[Monat_flach].[JUL]",
    "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]->:[TMR].[Monat_flach].[Monat_flach].[JUN]",
    "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]->:[TMR].[Monat_flach].[Monat_flach].[MAI]",
    "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]->:[TMR].[Monat_flach].[Monat_flach].[APR]",
    "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]->:[TMR].[Monat_flach].[Monat_flach].[MRZ]",
    "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]->:[TMR].[Monat_flach].[Monat_flach].[FEB]",
    "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]->:[TMR].[Monat_flach].[Monat_flach].[JAN]"
  ];

  var MONTH_ASC = MONTH_DESC.slice().reverse();

  var YEAR_DESC = [
    "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]->:[TMR].[Jahr_flach].[Jahr_flach].[2030]",
    "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]->:[TMR].[Jahr_flach].[Jahr_flach].[2029]",
    "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]->:[TMR].[Jahr_flach].[Jahr_flach].[2028]",
    "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]->:[TMR].[Jahr_flach].[Jahr_flach].[2027]",
    "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]->:[TMR].[Jahr_flach].[Jahr_flach].[2026]",
    "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]->:[TMR].[Jahr_flach].[Jahr_flach].[2025]",
    "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]->:[TMR].[Jahr_flach].[Jahr_flach].[2024]",
    "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]->:[TMR].[Jahr_flach].[Jahr_flach].[2023]",
    "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]->:[TMR].[Jahr_flach].[Jahr_flach].[2022]",
    "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]->:[TMR].[Jahr_flach].[Jahr_flach].[2021]",
    "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]->:[TMR].[Jahr_flach].[Jahr_flach].[2020]",
    "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]->:[TMR].[Jahr_flach].[Jahr_flach].[2019]",
    "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]->:[TMR].[Jahr_flach].[Jahr_flach].[2018]",
    "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]->:[TMR].[Jahr_flach].[Jahr_flach].[2017]"
  ];

  var YEAR_ASC = YEAR_DESC.slice().reverse();

  var LINE_PROGNOSE_SORTING = {};
  LINE_PROGNOSE_SORTING[COLUMN_MONAT] = MONTH_ASC;
  LINE_PROGNOSE_SORTING[COLUMN_JAHR] = YEAR_ASC;

  var LIST_SORTING = {};
  LIST_SORTING[COLUMN_JAHR] = { order: YEAR_ASC, priority: 1 };
  LIST_SORTING[COLUMN_MONAT] = { order: MONTH_ASC, priority: 2 };

  return {
    profileByBucket: {
      "Line": "line",
      "List": "list",
      "com.ibm.vis.custom.prognoseyearlinechart": "prognose"
    },
    sorting: LINE_PROGNOSE_SORTING,
    sortingByProfile: {
      line: LINE_PROGNOSE_SORTING,
      prognose: LINE_PROGNOSE_SORTING,
      list: LIST_SORTING
    }
  };
});
