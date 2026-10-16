define([], function () {
  "use strict";

  return {
    missingIdTitle: "Speicherstand nicht gefunden",
    missingIdMessage: "Der in der URL angegebene Dashboard-Speicherstand (Parameterset-ID „{id}“) wurde in der Auswahlliste nicht gefunden. Er wurde möglicherweise gelöscht. Das Dashboard wird ohne Parameterset gestartet.",
    hostListUnreadyTitle: "Speicherstand konnte nicht geladen werden",
    hostListUnreadyMessage: "Der in der URL angegebene Dashboard-Speicherstand (Parameterset-ID „{id}“) konnte vorübergehend nicht geladen werden. Das Dashboard wird ohne diesen Speicherstand gestartet. Achtung: Das Speichern von Dashboardständen ist derzeit möglicherweise ebenfalls nicht möglich.",
    dienststelleRestoreFallbackMessage: "Eine oder mehrere gespeicherte Dienststellen-Auswahlen sind nicht verfügbar. Möglicherweise verfügen Sie nicht über die erforderlichen Berechtigungen oder alte Filteroptionen können nicht auf neue Options-IDs abgebildet werden. Für die betroffenen Bereiche wurde die Standardauswahl gesetzt.",
    dienststelleRestoreMissingMessage: "Eine oder mehrere gespeicherte Dienststellen-Auswahlen sind nicht verfügbar. Möglicherweise verfügen Sie nicht über die erforderlichen Berechtigungen oder alte Filteroptionen können nicht auf neue Options-IDs abgebildet werden. Für die betroffenen Bereiche wurde die Standardauswahl gesetzt.",
    specialSingleSelectRestoreClearedMessage: "Eine oder mehrere gespeicherte Personengruppe-Auswahlen sind nicht verfügbar. Möglicherweise verfügen Sie nicht über die erforderlichen Berechtigungen. Die Auswahl wurde zurückgesetzt.",
    specialSingleSelectRestoreClearedDienststellenleitungMessage: "Eine oder mehrere gespeicherte Dienststellenleitung-Auswahlen sind nicht verfügbar. Möglicherweise verfügen Sie nicht über die erforderlichen Berechtigungen. Die Auswahl wurde zurückgesetzt.",
    specialSingleSelectRestoreDefaultPersonengruppeMessage: "Eine Option für den Personengruppe-Filter steht nicht zur Verfügung. Möglicherweise verfügen Sie nicht über die erforderlichen Berechtigungen. Für den Filter wurde die Standardauswahl gesetzt.",
    specialSingleSelectRestoreDefaultDienststellenleitungMessage: "Eine Option für den Dienststellenleitung-Filter steht nicht zur Verfügung. Möglicherweise verfügen Sie nicht über die erforderlichen Berechtigungen. Für den Filter wurde die Standardauswahl gesetzt.",
    discardUnsavedTitle: "Nicht gespeicherte Änderungen",
    discardUnsavedMessage: "Hinweis: Beim Öffnen eines Dashboards aus dem Dropdown werden nicht gespeicherte Änderungen verworfen.\n\nMöchten Sie fortfahren?",
    discardUnsavedConfirm: "OK",
    discardUnsavedCancel: "Abbrechen"
  };
});
