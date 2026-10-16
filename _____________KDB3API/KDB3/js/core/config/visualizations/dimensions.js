define([], function () {
  "use strict";

  return {
    dimensions: {
      Altersgruppe: {
        itemId: "[Personal_KDB_TM1].[Altersgruppe].[Altersgruppe].[Altersgruppe]",
        topNItemId: "[Personal_KDB_TM1].[Altersgruppe].[Altersgruppe].[Altersgruppe].[ID]",
        exclude: {
          itemId:
            "[Personal_KDB_TM1].[Altersgruppe].[Altersgruppe].[Altersgruppe].[ID]",
          values: ["Gesamt", "ALLE", "^"]
        }
      },
      Berufsfamilie: {
        itemId:
          "[Personal_KDB_TM1].[Berufsfamilie].[Berufsfamilie].[Berufsfamilie].[Tooltip]",
        topNItemId: "[Personal_KDB_TM1].[Berufsfamilie].[Berufsfamilie].[Berufsfamilie].[ID]",
        exclude: {
          itemId: "[Personal_KDB_TM1].[Berufsfamilie].[Berufsfamilie].[Berufsfamilie].[ID]",
          values: ["Gesamt", "ALLE", "^"]
        }
      },
      Dienstverhältnis: {
        itemId:
          "[Personal_KDB_TM1].[Dienstverhaeltnis].[Dienstverhaeltnis].[Dienstverhältnis].[Tooltip]",
        topNItemId:
          "[Personal_KDB_TM1].[Dienstverhaeltnis].[Dienstverhaeltnis].[Dienstverhältnis].[ID]",
        exclude: {
          itemId:
            "[Personal_KDB_TM1].[Dienstverhaeltnis].[Dienstverhaeltnis].[Dienstverhältnis].[ID]",
          values: ["Gesamt", "ALLE", "^"],
        },
      },
      Geschlecht: {
        itemId:
          "[Personal_KDB_TM1].[Geschlecht].[Geschlecht].[Geschlecht].[Tooltip]",
        topNItemId: "[Personal_KDB_TM1].[Geschlecht].[Geschlecht].[Geschlecht].[ID]",
        exclude: {
          itemId: "[Personal_KDB_TM1].[Geschlecht].[Geschlecht].[Geschlecht].[ID]",
          values: ["Gesamt", "ALLE", "^"]
        }
      }
    }
  };
});
