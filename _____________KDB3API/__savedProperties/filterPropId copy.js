const filterPropId = JSON.stringify({
  filterPropId: {
    Personal_KDB: {
      packageName: "Personal_KDB",
      globalFilters: {
        Sicht: {
          packageName: "Personal_Berechtigung_Dienststelle_KDB",
          isHierarchy: "false",
          isSingleSelect: "true",
          hasAlleOption: "false",
          cascade: "upstream",
          downstreamOptions: {
            BW: "Dienststelle_BW",
            DEZPV: "Dienststelle_DEZPV",
          },
          itemId:
            "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle].[Dienststelle].[Sicht]",
          useValues: {
            BW: "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle].[Dienststelle]->:[TMR].[Dienststelle].[Dienststelle].[BW_#]",
            DEZPV:
              "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle].[Dienststelle]->:[TMR].[Dienststelle].[Dienststelle].[DEZPV_#]",
          },
          relevantSicht: {
            personengruppe: ["BW"],
            alle: ["BW", "DEZPV"],
            dienststellenleitung: ["BW"],
          },
        },
        Jahr: {
          packageName: "Personal_KDB",
          isHierarchy: "false",
          isSingleSelect: "false",
          cascade: "false",
          itemId: "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]",
        },
        Dienststelle_BW: {
          packageName: "Personal_Berechtigung_Dienststelle_KDB",
          isHierarchy: "true",
          isSingleSelect: "false",
          singleLevelSelect: "false",
          singleStelleSelect: "false",
          cascade: "downstream",
          itemId:
            "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_BW]",
          defaultValue: true,
          useValuePrefix:
            "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_BW].[${dataItemLabel}]->:[TMR].[Dienststelle].[Dienststelle_BW]",
          separateIdForHierarchyTableColumn: [false, false, false],
        },
        Dienststelle_DEZPV: {
          packageName: "Personal_Berechtigung_Dienststelle_KDB",
          isHierarchy: "true",
          isSingleSelect: "false",
          singleLevelSelect: "false",
          singleStelleSelect: "false",
          cascade: "downstream",
          itemId:
            "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_DEZPV]",
          defaultValue: true,
          useValuePrefix:
            "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_DEZPV].[${dataItemLabel}]->:[TMR].[Dienststelle].[Dienststelle_DEZPV]",
          separateIdForHierarchyTableColumn: [
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
          ],
        },
        Berufsfamilie: {
          packageName: "Personal_KDB",
          isHierarchy: "false",
          isSingleSelect: "true",
          hasAlleOption: "true",
          cascade: "false",
          itemId:
            "[Personal_KDB_TM1].[Berufsfamilie].[Berufsfamilie].[Berufsfamilie]",
        },
        Dienstverhaeltnis: {
          packageName: "Personal_KDB",
          isHierarchy: "false",
          isSingleSelect: "true",
          hasAlleOption: "true",
          cascade: "false",
          itemId:
            "[Personal_KDB_TM1].[Dienstverhaeltnis].[Dienstverhaeltnis].[Dienstverhaeltnis]",
        },
        Geschlecht: {
          packageName: "Personal_KDB",
          isHierarchy: "false",
          isSingleSelect: "true",
          hasAlleOption: "true",
          cascade: "false",
          itemId: "[Personal_KDB_TM1].[Geschlecht].[Geschlecht].[Geschlecht]",
        },
        Altersgruppe: {
          packageName: "Personal_KDB",
          isHierarchy: "false",
          isSingleSelect: "true",
          hasAlleOption: "true",
          cascade: "false",
          itemId:
            "[Personal_KDB_TM1].[Altersgruppe].[Altersgruppe].[Altersgruppe]",
        },
        Personengruppe: {
          packageName: "Personal_KDB",
          isHierarchy: "false",
          isSingleSelect: "true",
          hasAlleOption: "true",
          cascade: "false",
          condition: "Personengruppe",
          itemId:
            "[Personal_KDB_TM1].[Personengruppe].[Personengruppe].[Personengruppe]",
          displayValue: "Lehrlinge",
          useValue:
            "[Personal_KDB_TM1].[Personengruppe].[Personengruppe].[Personengruppe]->:[TMR].[Personengruppe].[Personengruppe].[02]",
        },
        Dienststellenleitung: {
          packageName: "Personal_KDB",
          isHierarchy: "false",
          isSingleSelect: "true",
          hasAlleOption: "true",
          cascade: "false",
          condition: "dienststellenleitung",
          itemId:
            "[Personal_KDB_TM1].[dstleitung].[Dienststellenleitung].[Dienststellenleitung]",
          displayValue: "DST_LTNG",
          useValue:
            "[Personal_KDB_TM1].[dstleitung].[Dienststellenleitung].[Dienststellenleitung]->:[TMR].[dstleitung].[Dienststellenleitung].[DST_LTNG]",
        },
      },
      pageContextFilters: {
        Jahr: {
          packageName: "Personal_KDB",
          isHierarchy: "false",
          isSingleSelect: "false",
          cascade: "false",
          itemId: "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]",
        },
        Dienststelle_BW: {
          packageName: "Personal_Berechtigung_Dienststelle_KDB",
          isHierarchy: "true",
          isSingleSelect: "false",
          singleLevelSelect: "false",
          singleStelleSelect: "false",
          cascade: "downstream",
          itemId:
            "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_BW]",
          defaultValue: true,
          useValuePrefix:
            "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_BW].[${dataItemLabel}]->:[TMR].[Dienststelle].[Dienststelle_BW]",
        },
        Dienststelle_DEZPV: {
          packageName: "Personal_Berechtigung_Dienststelle_KDB",
          isHierarchy: "true",
          isSingleSelect: "false",
          singleLevelSelect: "false",
          singleStelleSelect: "false",
          cascade: "downstream",
          itemId:
            "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_DEZPV]",
          defaultValue: true,
          useValuePrefix:
            "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_DEZPV].[${dataItemLabel}]->:[TMR].[Dienststelle].[Dienststelle_DEZPV]",
        },
        Berufsfamilie: {
          packageName: "Personal_KDB",
          isHierarchy: "false",
          isSingleSelect: "true",
          hasAlleOption: "true",
          cascade: "false",
          itemId:
            "[Personal_KDB_TM1].[Berufsfamilie].[Berufsfamilie].[Berufsfamilie]",
        },
        Dienstverhaeltnis: {
          packageName: "Personal_KDB",
          isHierarchy: "false",
          isSingleSelect: "true",
          hasAlleOption: "true",
          cascade: "false",
          itemId:
            "[Personal_KDB_TM1].[Dienstverhaeltnis].[Dienstverhaeltnis].[Dienstverhaeltnis]",
        },
        Geschlecht: {
          packageName: "Personal_KDB",
          isHierarchy: "false",
          isSingleSelect: "true",
          hasAlleOption: "true",
          cascade: "false",
          itemId: "[Personal_KDB_TM1].[Geschlecht].[Geschlecht].[Geschlecht]",
        },
        Altersgruppe: {
          packageName: "Personal_KDB",
          isHierarchy: "false",
          isSingleSelect: "true",
          hasAlleOption: "true",
          cascade: "false",
          itemId:
            "[Personal_KDB_TM1].[Altersgruppe].[Altersgruppe].[Altersgruppe]",
        },
        Personengruppe: {
          packageName: "Personal_KDB",
          isHierarchy: "false",
          isSingleSelect: "true",
          hasAlleOption: "true",
          cascade: "false",
          condition: "Personengruppe",
          itemId:
            "[Personal_KDB_TM1].[Personengruppe].[Personengruppe].[Personengruppe]",
        },
        Dienststellenleitung: {
          packageName: "Personal_KDB",
          isHierarchy: "false",
          isSingleSelect: "true",
          hasAlleOption: "true",
          cascade: "false",
          condition: "dienststellenleitung",
          itemId:
            "[Personal_KDB_TM1].[dstleitung].[Dienststellenleitung].[Dienststellenleitung]",
        },
      },
    },
  },
});
