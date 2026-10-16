define([], function () {
  "use strict";

  // German UI texts of the control panel. Persisted keys elsewhere keep their spelling.
  var TAB_EDIT_COUNT = 5;

  // Handbook link of the header info icon (`_KDB.config.links.kdbControlHandbookUrl`); empty when not configured.
  function readHandbookUrl(_KDB) {
    var links = _KDB && _KDB.config && _KDB.config.links;
    var url = links && links.kdbControlHandbookUrl;
    return typeof url === "string" && url.trim() ? url.trim() : "";
  }

  return {
    readHandbookUrl: readHandbookUrl,
    header: {
      title: "Dashboard-Steuerung",
      settingsButton: "Allgemeine Dashboard-Einstellungen",
      handbook: "Benutzerhandbuch",
      handbookInactive: "Handbuch (Platzhalter, inaktiv)"
    },
    mainToggles: { metrics: "Kennzahlen", toolbox: "Toolbox" },
    sections: {
      settingsDashboard: "Dashboard",
      settingsCharts: "Diagramme",
      settingsComments: "Kommentare",
      settingsControlPanel: "Steuerungspanel",
      toolboxComments: "Kommentar",
      toolboxTabs: "Tab",
      toolboxHeaderFooter: "Kopfzeile/Fußzeile"
    },
    settings: {
      width: "Breite",
      height: "Höhe",
      minPrefix: "Min. ",
      backgroundColor: "Hintergrundfarbe",
      developerMode: "Entwicklermodus",
      hideSettingsButtons: "Settings-Buttons verstecken",
      hideButtonsCaption: "Buttons verstecken",
      colorCaption: "Farbe:",
      panelBackground: "Hintergrund",
      panelInner: "Innere Räumen",
      panelButtons: "Buttons",
      panelActionButtons: "Aktionsbuttons"
    },
    toolbox: {
      commentHint: "neues Kommentar hinzufügen",
      commentButton: "Kommentar",
      tabHint: "Neuen Tab hinzufügen",
      tabButton: "Tab hinzufügen",
      tabEditHeading: "Tabs umbenennen/löschen/duplizieren/verschieben",
      tabLabel: function (index) { return "Tab " + (index + 1); },
      tabAriaLabel: function (index) { return "Tab " + (index + 1) + " bearbeiten"; },
      tabEditCount: TAB_EDIT_COUNT,
      showCaption: "Anzeigen:",
      header: "Kopfzeile",
      footer: "Fußzeile",
      subtitle: "Untertitel anzeigen",
      editTitle: "Titel bearbeiten",
      editTitleAndSubtitle: "Titel und Untertitel bearbeiten",
      maxTabsReached: "Maximale Anzahl an Registerkarten erreicht."
    },
    colorPlaceholder: "#Farbcode (zB. #FFA500)"
  };
});
