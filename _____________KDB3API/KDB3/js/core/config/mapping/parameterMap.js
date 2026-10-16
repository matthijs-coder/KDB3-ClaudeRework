define([], function () {
  "use strict";

  // Package-bound KID / itemId map. Edit this file when the Cognos package changes.
  // Source dump: __savedProperties/parameterMappingId.js (inner object only; not a runtime import).

  return Object.freeze({
    "prefix": "",
    "kennzahlenTable_KID": "Personal_KDB",
    "datasource_name_KID": "Personal_KDB",
    "datasourcePrefix": "Personal_KDB_TM1",
    "alternativeDatasource_name_KID": "Personal_Berechtigung_Dienststelle_KDB",
    "alternativeDatasourcePrefix": "Personal_Berechtigung_Dienststelle_KDB_TM1",
    "Sicht_filter_KID": "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle].[Dienststelle].[Sicht]",
    "SICHT_filter_KID": "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle].[Dienststelle].[Sicht]",
    // Dump residue: old package was BW-only. Today "BW" is the first
    // table member, not the user's Sicht. Runtime Sicht is the active
    // table-gated filter. Do not write session Sicht here. Key-delete
    // is a TRIAGE follow-up (latent cross-package v2 remap token).
    "Sicht_filter_use_KID": "BW",
    "Dienststelle_filter_KID": "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_BW]",
    "Dienststelle_DEZPV_filter_KID": "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_DEZPV]",
    "Dienststelle_BW_filter_KID": "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_BW]",
    "Dienststelle_BW_Dienststelle_BW_filter_use_KID": "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_BW].[Dienststelle_BW]->:[TMR].[Dienststelle].[Dienststelle_BW]",
    "Dienststelle_BW_level001_filter_use_KID": "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_BW].[level001]->:[TMR].[Dienststelle].[Dienststelle_BW]",
    "Dienststelle_BW_level002_filter_use_KID": "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_BW].[level002]->:[TMR].[Dienststelle].[Dienststelle_BW]",
    "Dienststelle_Dienststelle_BW_filter_use_KID": "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_BW].[Dienststelle_BW]->:[TMR].[Dienststelle].[Dienststelle_BW]",
    "Dienststelle_level001_filter_use_KID": "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_BW].[level001]->:[TMR].[Dienststelle].[Dienststelle_BW]",
    "Dienststelle_level002_filter_use_KID": "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_BW].[level002]->:[TMR].[Dienststelle].[Dienststelle_BW]",
    "Jahr_filter_KID": "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]",
    "Berufsfamilie_filter_KID": "[Personal_KDB_TM1].[Berufsfamilie].[Berufsfamilie].[Berufsfamilie]",
    "Dienstverhältnis_filter_KID": "[Personal_KDB_TM1].[Dienstverhaeltnis].[Dienstverhaeltnis].[Dienstverhältnis]",
    "Dienstverhaeltnis_filter_KID": "[Personal_KDB_TM1].[Dienstverhaeltnis].[Dienstverhaeltnis].[Dienstverhältnis]",
    "Geschlecht_filter_KID": "[Personal_KDB_TM1].[Geschlecht].[Geschlecht].[Geschlecht]",
    "Altersgruppe_filter_KID": "[Personal_KDB_TM1].[Altersgruppe].[Altersgruppe].[Altersgruppe]",
    "Personengruppe_filter_KID": "[Personal_KDB_TM1].[Personengruppe].[Personengruppe].[Personengruppe]",
    "Jahr_filter_use_KID": "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]->:[TMR].[Jahr_flach].[Jahr_flach]",
    "Berufsfamilie_filter_use_KID": "[Personal_KDB_TM1].[Berufsfamilie].[Berufsfamilie].[Berufsfamilie]->:[TMR].[Berufsfamilie].[Berufsfamilie]",
    "Dienstverhältnis_filter_use_KID": "[Personal_KDB_TM1].[Dienstverhaeltnis].[Dienstverhaeltnis].[Dienstverhältnis]->:[TMR].[Dienstverhaeltnis].[Dienstverhaeltnis]",
    "Dienstverhaeltnis_filter_use_KID": "[Personal_KDB_TM1].[Dienstverhaeltnis].[Dienstverhaeltnis].[Dienstverhältnis]->:[TMR].[Dienstverhaeltnis].[Dienstverhaeltnis]",
    "Geschlecht_filter_use_KID": "[Personal_KDB_TM1].[Geschlecht].[Geschlecht].[Geschlecht]->:[TMR].[Geschlecht].[Geschlecht]",
    "Altersgruppe_filter_use_KID": "[Personal_KDB_TM1].[Altersgruppe].[Altersgruppe].[Altersgruppe]->:[TMR].[Altersgruppe].[Altersgruppe]",
    "Personengruppe_filter_use_KID": "[Personal_KDB_TM1].[Personengruppe].[Personengruppe].[Personengruppe]->:[TMR].[Personengruppe].[Personengruppe]",
    "widget_datasource_name_KID": "Personal_KDB",
    "widget_datasource_id_KID": "model00000193df80b3c8_00000001",
    "AggregationstypId_widget_localfilter_KID": "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]",
    "AggregationstypName_widget_localfilter_KID": "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]",
    "Jahr_slots_KID": "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]",
    "Jahr_widget_localfilter_KID": "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]",
    "Monat_slots_KID": "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]",
    "Monat_widget_localfilter_KID": "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]",
    "Altersgruppe - Name_slots_KID": "[Personal_KDB_TM1].[Altersgruppe].[Altersgruppe].[Altersgruppe]",
    "Langtext_widget_localfilter_KID": "[Personal_KDB_TM1].[Altersgruppe].[Altersgruppe].[Altersgruppe]",
    "Berufsfamilie_slots_KID": "[Personal_KDB_TM1].[Berufsfamilie].[Berufsfamilie].[Berufsfamilie].[Tooltip]",
    "Berufsfamilie_widget_localfilter_KID": "[Personal_KDB_TM1].[Berufsfamilie].[Berufsfamilie].[Berufsfamilie].[ID]",
    "Dienstverhältnis_slots_KID": "[Personal_KDB_TM1].[Dienstverhaeltnis].[Dienstverhaeltnis].[Dienstverhältnis].[Tooltip]",
    "Dienstverhältnis_widget_localfilter_KID": "[Personal_KDB_TM1].[Dienstverhaeltnis].[Dienstverhaeltnis].[Dienstverhältnis].[ID]",
    "Geschlecht_slots_KID": "[Personal_KDB_TM1].[Geschlecht].[Geschlecht].[Geschlecht].[Tooltip]",
    "Geschlecht_widget_localfilter_KID": "[Personal_KDB_TM1].[Geschlecht].[Geschlecht].[Geschlecht].[ID]",
    "Altersgruppe_slots_KID": "[Personal_KDB_TM1].[Altersgruppe].[Altersgruppe].[Altersgruppe]",
    "Altersgruppe_widget_localfilter_KID": "[Personal_KDB_TM1].[Altersgruppe].[Altersgruppe].[Altersgruppe].[ID]"
  });
});
