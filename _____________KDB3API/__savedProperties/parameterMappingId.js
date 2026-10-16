const parameterMappingId = JSON.stringify({
  parameterMappingId: {
  prefix: "",
  kennzahlenTable_KID: "Personal_KDB",
  datasource_name_KID: "Personal_KDB",
  datasourcePrefix:"Personal_KDB_TM1",
  alternativeDatasource_name_KID: "Personal_Berechtigung_Dienststelle_KDB",
  alternativeDatasourcePrefix: "Personal_Berechtigung_Dienststelle_KDB_TM1",

  Sicht_filter_KID:
  '[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle].[Dienststelle].[Sicht]',
  SICHT_filter_KID:    
  '[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle].[Dienststelle].[Sicht]',
  Sicht_filter_use_KID: "BW",
  Dienststelle_filter_KID:
    "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_BW]",
  Dienststelle_DEZPV_filter_KID:
    "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_DEZPV]",
  Dienststelle_BW_filter_KID:
    "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_BW]",
    Dienststelle_BW_Dienststelle_BW_filter_use_KID:
    "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_BW].[Dienststelle_BW]->:[TMR].[Dienststelle].[Dienststelle_BW]",
  Dienststelle_BW_level001_filter_use_KID:
    "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_BW].[level001]->:[TMR].[Dienststelle].[Dienststelle_BW]",
  Dienststelle_BW_level002_filter_use_KID:
    "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_BW].[level002]->:[TMR].[Dienststelle].[Dienststelle_BW]",
  Dienststelle_Dienststelle_BW_filter_use_KID:
    "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_BW].[Dienststelle_BW]->:[TMR].[Dienststelle].[Dienststelle_BW]",
  Dienststelle_level001_filter_use_KID:
    "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_BW].[level001]->:[TMR].[Dienststelle].[Dienststelle_BW]",
  Dienststelle_level002_filter_use_KID:
    "[Personal_Berechtigung_Dienststelle_KDB_TM1].[Dienststelle].[Dienststelle_BW].[level002]->:[TMR].[Dienststelle].[Dienststelle_BW]",  
  

  Jahr_filter_KID: "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]",
  Berufsfamilie_filter_KID:
    "[Personal_KDB_TM1].[Berufsfamilie].[Berufsfamilie].[Berufsfamilie]",
  Dienstverhältnis_filter_KID:
    "[Personal_KDB_TM1].[Dienstverhaeltnis].[Dienstverhaeltnis].[Dienstverhaeltnis]",
  Dienstverhaeltnis_filter_KID:
    "[Personal_KDB_TM1].[Dienstverhaeltnis].[Dienstverhaeltnis].[Dienstverhaeltnis]",  
  Geschlecht_filter_KID:
    "[Personal_KDB_TM1].[Geschlecht].[Geschlecht].[Geschlecht]",
  Altersgruppe_filter_KID:
    "[Personal_KDB_TM1].[Altersgruppe].[Altersgruppe].[Altersgruppe]",
    Personengruppe_filter_KID: "[Personal_KDB_TM1].[Personengruppe].[Personengruppe].[Personengruppe]",

  Jahr_filter_use_KID:
    "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]->:[TMR].[Jahr_flach].[Jahr_flach]",  
  Berufsfamilie_filter_use_KID:
    "[Personal_KDB_TM1].[Berufsfamilie].[Berufsfamilie].[Berufsfamilie]->:[TMR].[Berufsfamilie].[Berufsfamilie]",
  Dienstverhältnis_filter_use_KID:
    "[Personal_KDB_TM1].[Dienstverhaeltnis].[Dienstverhaeltnis].[Dienstverhaeltnis]->:[TMR].[Dienstverhaeltnis].[Dienstverhaeltnis]",
  Dienstverhaeltnis_filter_use_KID:
    "[Personal_KDB_TM1].[Dienstverhaeltnis].[Dienstverhaeltnis].[Dienstverhaeltnis]->:[TMR].[Dienstverhaeltnis].[Dienstverhaeltnis]",
  Geschlecht_filter_use_KID:
    "[Personal_KDB_TM1].[Geschlecht].[Geschlecht].[Geschlecht]->:[TMR].[Geschlecht].[Geschlecht]",
  Altersgruppe_filter_use_KID:
    "[Personal_KDB_TM1].[Altersgruppe].[Altersgruppe].[Altersgruppe]->:[TMR].[Altersgruppe].[Altersgruppe]",
  Personengruppe_filter_use_KID:
    "[Personal_KDB_TM1].[Personengruppe].[Personengruppe].[Personengruppe]->:[TMR].[Personengruppe].[Personengruppe]",

  
  widget_datasource_name_KID: "Personal_KDB",
  widget_datasource_id_KID: "model00000193df80b3c8_00000001",
  
  AggregationstypId_widget_localfilter_KID: "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]",
  AggregationstypName_widget_localfilter_KID: "[Personal_KDB_TM1].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[KDB_Aggregationstyp].[Caption]",
  
  Jahr_slots_KID: "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]", 
  Jahr_widget_localfilter_KID: "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]",
  
  Monat_slots_KID: "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]",  
  Monat_widget_localfilter_KID:
    "[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]",
  
  "Altersgruppe - Name_slots_KID":
    "[Personal_KDB_TM1].[Altersgruppe].[Altersgruppe].[Altersgruppe]",
  Langtext_widget_localfilter_KID:
    "[Personal_KDB_TM1].[Altersgruppe].[Altersgruppe].[Altersgruppe]",    
  
  Berufsfamilie_slots_KID:
    "[Personal_KDB_TM1].[Berufsfamilie].[Berufsfamilie].[Berufsfamilie].[Tooltip]",
  Berufsfamilie_widget_localfilter_KID: "[Personal_KDB_TM1].[Berufsfamilie].[Berufsfamilie].[Berufsfamilie].[ID]",
  

  Dienstverhältnis_slots_KID:
    "[Personal_KDB_TM1].[Dienstverhaeltnis].[Dienstverhaeltnis].[Dienstverhaeltnis].[Tooltip]",
  Dienstverhältnis_widget_localfilter_KID: "[Personal_KDB_TM1].[Dienstverhaeltnis].[Dienstverhaeltnis].[Dienstverhaeltnis].[ID]",  
  
  Geschlecht_slots_KID: "[Personal_KDB_TM1].[Geschlecht].[Geschlecht].[Geschlecht].[Tooltip]",  
  Geschlecht_widget_localfilter_KID: "[Personal_KDB_TM1].[Geschlecht].[Geschlecht].[Geschlecht].[ID]",
  
  Altersgruppe_slots_KID:
    "[Personal_KDB_TM1].[Altersgruppe].[Altersgruppe].[Altersgruppe]", 
  Altersgruppe_widget_localfilter_KID:
    "[Personal_KDB_TM1].[Altersgruppe].[Altersgruppe].[Altersgruppe].[ID]",
   
  
  },
});


