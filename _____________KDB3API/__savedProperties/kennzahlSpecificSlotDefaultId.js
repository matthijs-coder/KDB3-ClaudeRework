const kennzahlSpecificSlotDefaultId =
  //////////////////////////////////////////// use JSON.stringify()
  ///////////////////////////////////////////

  JSON.stringify({
    kennzahlSpecificSlotDefaultId: {
    P_A_MOA_01: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Anzahl im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Anzahl im Zeitraum"],
          },
        },
      },      
    },
    P_A_MOA_02: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_A_MOA_03: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      List: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      allOther: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_A_MOA_04: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      List: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      allOther: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_A_MOA_05: {
      formatType: "percent",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_A_MOA_06: {
      formatType: "percent",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Quote im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Quote im Zeitraum"],
          },
        },
      },
    },
    P_A_MOA_07: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_A_HO_01: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Anzahl im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Anzahl im Zeitraum"],
          },
        },
      },
    },
    P_A_HO_02: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_A_HO_04: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      List: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      allOther: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_A_HO_06: {
      formatType: "percent",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Quote im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Quote im Zeitraum"],
          },
        },
      },
    },
    P_ABS_K_KS_01: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Anzahl im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Anzahl im Zeitraum"],
          },
        },
      },
    },
    P_ABS_K_KS_02: {
      formatType: "percent",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Quote im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Quote im Zeitraum"],
          },
        },
      },
    },
    P_ABS_K_KS_03: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_ABS_K_KS_05: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_ABS_K_KS_06: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_ABS_K_KS_07: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Durchschnitt im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Durchschnitt im Zeitraum"],
          },
        },
      },
    },
    P_ABS_K_KS_08: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_ABS_K_KS_09: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_ABS_K_KS_10: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_ABS_K_KS_11: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_ABS_K_KF_01: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_ABS_K_KF_02: {
      formatType: "number",
      Line: {
        filter: {
          Jahr: {
            exclude: ["2025"],
          },
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          Jahr: {
            exclude: ["2025"],
          },
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_ABS_K_KF_03: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_ABS_K_KF_04: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Durchschnitt im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Durchschnitt im Zeitraum"],
          },
        },
      },
    },
    P_ABS_K_KF_05: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_ABS_K_KF_06: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_ABS_K_KF_07: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_ABS_K_KF_08: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Durchschnitt im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Durchschnitt im Zeitraum"],
          },
        },
      },
    },
    P_ABS_K_KF_10: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_ABS_K_KF_11: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_ABS_K_DEL_01: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Anzahl im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Anzahl im Zeitraum"],
          },
        },
      },
    },
    P_ABS_S_F_01: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_ABS_S_SU_01: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "3",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "3",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_ABS_S_SU_02: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "3",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "3",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_ABS_S_SU_03: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "3",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "3",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_ABS_S_SU_04: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "3",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "3",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_ABS_S_SU_05: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "3",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "3",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_ABS_S_BVB_01: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_ABS_S_KU_01: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_ABS_S_KU_02: {
      formatType: "percent",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_BIL_01: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_BIL_02: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_BIL_03: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_BIL_04: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_BIL_05: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Anzahl im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Anzahl im Zeitraum"],
          },
        },
      },
    },
    P_BIL_06: {
      formatType: "percent",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Quote im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Quote im Zeitraum"],
          },
        },
      },
    },
    P_BEZ_ML_01: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_BEZ_ML_02: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_BEZ_ML_03: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_BEZ_JT_01: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Anzahl im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Anzahl im Zeitraum"],
          },
        },
      },
    },
    P_FL_01: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_FL_02: {
      formatType: "percent",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Quote im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Quote im Zeitraum"],
          },
        },
      },
    },
    P_FL_03: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_FL_04: {
      formatType: "percent",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Quote im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Quote im Zeitraum"],
          },
        },
      },
    },
    P_FL_05: {
      formatType: "percent",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Quote im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Quote im Zeitraum"],
          },
        },
      },
    },
    P_FL_06: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_FL_07: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Anzahl im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Anzahl im Zeitraum"],
          },
        },
      },
    },
    P_FL_08: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_FL_09: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_FL_10: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_FL_11: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_FL_12: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_FL_13: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_FL_14: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_FL_15: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_FL_16: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_FL_17: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_PS_K_01: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_PS_K_02: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_PS_K_03: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_PS_K_04: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_PS_K_05: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_PS_K_06: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_PS_K_07: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_PS_K_08: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_PS_K_09: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_PS_K_10: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_PS_K_11: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_PS_V_01: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_PS_V_02: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_PS_V_04: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_PS_V_05: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_PS_V_06: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_PS_Q_01: {
      formatType: "percent",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_PS_Q_02: {
      formatType: "percent",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_PS_Q_03: {
      formatType: "percent",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_PS_Q_04: {
      formatType: "percent",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_PS_Q_05: {
      formatType: "percent",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_PS_Q_06: {
      formatType: "percent",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_PS_Q_07: {
      formatType: "percent",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_A_Z_01: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },

    P_A_Z_02: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_A_Z_03: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_A_Z_04: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_A_Z_05: {
      formatType: "percent",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_A_Z_06: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Anzahl im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Anzahl im Zeitraum"],
          },
        },
      },
    },
    P_A_Z_07: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_A_Z_08: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
          Monat: {
            exclude: ["Gesamt"],
          },
        },
      },
      allOther: {
        decimals: "2",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe im Zeitraum"],
          },
        },
      },
    },
    P_S_02: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_S_03: {
      formatType: "percent",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_S_11: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_S_12: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Durchschnitt im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Durchschnitt im Zeitraum"],
          },
        },
      },
    },
    P_S_18: {
      formatType: "percent",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_S_19: {
      formatType: "percent",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_S_20: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_S_21: {
      formatType: "percent",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Quote im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Quote im Zeitraum"],
          },
        },
      },
    },
    P_S_22: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Anzahl im Zeitraum"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Anzahl im Zeitraum"],
          },
        },
      },
    },
    P_S_23: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Summe"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        decimals: "0",
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Summe"],
          },
        },
      },
    },
    P_S_24: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_S_25: {
      formatType: "percent",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_L_Q_01: {
      formatType: "percent",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    P_A_T_01: {
      formatType: "number",
      Line: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      List: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag", "Monatsdurchschnitt"],
          },
        },
      },
      "com.ibm.vis.custom.prognoseyearlinechart": {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Stichtag"],
          },
        },
      },
      allOther: {
        filter: {
          "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]": {
            include: ["Monatsdurchschnitt"],
          },
        },
      },
    },
    },
  });
////////////////////////////////////////////
///////////////////////////////////////////
