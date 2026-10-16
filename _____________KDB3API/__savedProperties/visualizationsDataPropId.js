const visualizationsDataPropId = JSON.stringify({
  visualizationsDataPropId: {
  Personal_KDB: {
    datasourceName: "Personal_KDB",
    sorting: {
      "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]": [
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
        "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]->:[TMR].[Monat_flach].[Monat_flach].[JAN]",
      ],
    //  Monat: ["Gesamt", "JAN,FEB,MRZ,APR,MAI,JUN,JUL,AUG,SEP,OKT,NOV,DEZ"],
      "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]": [
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
        "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]->:[TMR].[Jahr_flach].[Jahr_flach].[2017]",
      ],
    },
    dimensions: {
      Altersgruppe: {
        itemId: "[Personal_KDB_TM1].[Altersgruppe].[Altersgruppe].[Altersgruppe]",
        topNItemId: "[Personal_KDB_TM1].[Altersgruppe].[Altersgruppe].[Altersgruppe].[ID]",
        exclude: {
          itemId:
            "[Personal_KDB_TM1].[Altersgruppe].[Altersgruppe].[Altersgruppe].[ID]",
          values: ["Gesamt", "ALLE", "^"],
        },
      },
      Berufsfamilie: {
        itemId:
          "[Personal_KDB_TM1].[Berufsfamilie].[Berufsfamilie].[Berufsfamilie].[Tooltip]",
        topNItemId: "[Personal_KDB_TM1].[Berufsfamilie].[Berufsfamilie].[Berufsfamilie].[ID]",
        exclude: { 
          itemId: "[Personal_KDB_TM1].[Berufsfamilie].[Berufsfamilie].[Berufsfamilie].[ID]", 
          values: ["Gesamt", "ALLE", "^"] },
      },
      Dienstverhältnis: {
        itemId:
          "[Personal_KDB_TM1].[Dienstverhaeltnis].[Dienstverhaeltnis].[Dienstverhaeltnis].[Tooltip]",
        topNItemId: "[Personal_KDB_TM1].[Dienstverhaeltnis].[Dienstverhaeltnis].[Dienstverhaeltnis].[ID]",
        exclude: {
          itemId: "[Personal_KDB_TM1].[Dienstverhaeltnis].[Dienstverhaeltnis].[Dienstverhaeltnis].[ID]",
          values: ["Gesamt", "ALLE", "^"],
        },
      },
      Geschlecht: {
        itemId:
          "[Personal_KDB_TM1].[Geschlecht].[Geschlecht].[Geschlecht].[Tooltip]",
        topNItemId: "[Personal_KDB_TM1].[Geschlecht].[Geschlecht].[Geschlecht].[ID]",
        exclude: { 
          itemId: "[Personal_KDB_TM1].[Geschlecht].[Geschlecht].[Geschlecht].[ID]", 
          values: ["Gesamt", "ALLE", "^"] },
      },
      Lehrlinge: {
        itemId:
          "[Personal_KDB_TM1].[Personengruppe].[Personengruppe].[Personengruppe].[Tooltip]",
        topNItemId: "[Personal_KDB_TM1].[Personengruppe].[Personengruppe].[Personengruppe].[ID]",
        exclude: { 
          itemId: "[Personal_KDB_TM1].[Personengruppe].[Personengruppe].[Personengruppe].[ID]", 
          values: ["Gesamt", "ALLE", "^"] },
      },
    },
  },
  Kennzahlen_TEST: {
    datasourceName: "Personal_KDB",
    sorting: {
      Monat: ["JAN,FEB,MRZ,APR,MAI,JUN,JUL,AUG,SEP,OKT,NOV,DEZ"],
      "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]": [
        "2020",
        "2021",
        "2022",
        "2023",
        "2024",
        "2025",
        "2026",
        "2027",
        "2028",
        "2029",
        "2030",
      ],
    },
    dimensions: {
      Altersgruppe: {
        itemId:
          "[Personal_KDB_TM1].[Altersgruppe].[Altersgruppe].[Altersgruppe]",
        topNItemId: "[Personal_KDB_TM1].[Altersgruppe].[Altersgruppe].[Altersgruppe].[ID]",
        exclude: {
          itemId: "[Personal_KDB_TM1].[Altersgruppe].[Altersgruppe].[Altersgruppe].[ID]",
          values: ["Gesamt", "ALLE", "^"],
        },
      },
      Berufsfamilie: {
        itemId:
          "[Personal_KDB_TM1].[Berufsfamilie].[Berufsfamilie].[Berufsfamilie].[Tooltip]",
        topNItemId: "[Personal_KDB_TM1].[Berufsfamilie].[Berufsfamilie].[Berufsfamilie].[ID]",
        exclude: { 
          itemId: "[Personal_KDB_TM1].[Berufsfamilie].[Berufsfamilie].[Berufsfamilie].[ID]", 
          values: ["Gesamt", "ALLE", "^"] },
      },
      Dienstverhältnis: {
        itemId:
          "[Personal_KDB_TM1].[Dienstverhaeltnis].[Dienstverhaeltnis].[Dienstverhaeltnis].[Tooltip]",
        topNItemId: "[Personal_KDB_TM1].[Dienstverhaeltnis].[Dienstverhaeltnis].[Dienstverhaeltnis].[ID]",
        exclude: {
          itemId: "[Personal_KDB_TM1].[Dienstverhaeltnis].[Dienstverhaeltnis].[Dienstverhaeltnis].[ID]",
          values: ["Gesamt", "ALLE", "^"],
        },
      },
      Geschlecht: {
        itemId:
          "[Personal_KDB_TM1].[Geschlecht].[Geschlecht].[Geschlecht].[Tooltip]",
        topNItemId: "[Personal_KDB_TM1].[Geschlecht].[Geschlecht].[Geschlecht].[ID]",
        exclude: { 
          itemId: "[Personal_KDB_TM1].[Geschlecht].[Geschlecht].[Geschlecht].[ID]", 
          values: ["Gesamt", "ALLE", "^"] },
      },
      Lehrlinge: {
        itemId:
          "[Personal_KDB_TM1].[Personengruppe].[Personengruppe].[Personengruppe].[Personengruppe - Tooltip]",
        topNItemId: "[Personal_KDB_TM1].[Personengruppe].[Personengruppe].[Personengruppe].[ID]",
        exclude: { 
          itemId: "[Personal_KDB_TM1].[Personengruppe].[Personengruppe].[Personengruppe].[ID]", 
          values: ["Gesamt", "ALLE", "^"] },
      },
    },
  },
  },
});
