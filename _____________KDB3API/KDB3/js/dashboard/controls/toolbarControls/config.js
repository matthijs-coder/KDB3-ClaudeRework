define([], function () {
  "use strict";

  var TOOLBAR_WAIT_TIMEOUT_MS = 30000;
  var TOOLBAR_WAIT_TRACK_KEY = "toolbar.actionBarLeadingSelector";
  var UNAVAILABLE_CLASS = "is-unavailable";

  // Left to right inside the action bar leading area.
  var BUTTON_ORDER = ["share", "wienKi", "pdf", "history"];

  var BUTTONS = {
    share: { apiName: "shareControls", classPrefix: "kdb-share-controls", dataPrefix: "data-kdb-share" },
    wienKi: { apiName: "wienKiControls", classPrefix: "kdb-wien-ki-controls", dataPrefix: "data-kdb-wien-ki" },
    pdf: { apiName: "pdfExportControls", classPrefix: "kdb-pdf-export-controls", dataPrefix: "data-kdb-pdf-export" },
    history: { apiName: "historyControls", classPrefix: "kdb-history-controls", dataPrefix: "data-kdb-history" }
  };

  var ICON_ASSETS = {
    pdf: {
      blackIconHref: "./v1/ext/KDB3/images/pdf-black.png",
      whiteIconHref: "./v1/ext/KDB3/images/pdf-white.png"
    },
    share: { iconHref: "./v1/ext/KDB3/images/share.png" }
  };

  var LABELS = {
    share: {
      buttonTitle: "Teilen",
      buttonAccessibleName: "Dashboard teilen",
      dialogTitleWithSet: "Link zum Dashboard (Parameterset: \"{label}\")",
      dialogTitleWithoutSet: "Link zum Dashboard (kein Parameterset: leeres Dashboard)",
      emptyParameterLabel: "leeres Dashboard",
      boardIdMissingTitle: "Teilen nicht möglich",
      boardIdMissingMessage: "Die Dashboard-Kennung konnte nicht ermittelt werden. Bitte das Dashboard schließen und erneut öffnen.",
      biBaseMissingTitle: "Teilen nicht möglich",
      biBaseMissingMessage: "Die Dashboard-Adresse konnte nicht ermittelt werden. Bitte das Dashboard schließen und erneut öffnen.",
      readOnlyToggleLabel: "Nur Lesen",
      readOnlyToggleTitle: "Ohne KDB-Steuerung und Widget-Einstellungen"
    },
    wienKi: {
      buttonTitle: "Wien-KI",
      buttonAccessibleName: "Wien-KI öffnen",
      dialogTitle: "Wien-KI",
      dialogMessage: "Der Wien-KI-Assistent kann Fragen beantworten, wie Sie etwas im Konfigurierbaren Personaldashboard (KDB) tun. " +
        "Damit die Assistenz den Zusammenhang Ihrer Frage kennt, kopieren Sie zuerst den folgenden Prompt. " +
        "Klicken Sie anschließend auf „Wien-KI öffnen“, fügen Sie den Prompt im Chat ein und starten Sie die Unterhaltung.",
      starterPrompt: "Ich habe eine Frage zum Konfigurierbaren Personaldashboard (KDB) aus der Wissensdatenbank.",
      openChatLabel: "Wien-KI öffnen"
    },
    pdf: {
      accessibleName: "Dashboard als PDF exportieren",
      buttonLabel: "PDF",
      progressLabelPrefix: "PDF ",
      busyLabel: "PDF...",
      fatalTitle: "Dashboard PDF Export",
      fatalMessage: "Dashboard PDF Export fehlgeschlagen."
    },
    history: {
      undoLabel: "Undo",
      redoLabel: "Redo",
      undoGlyph: "\u21B6",
      redoGlyph: "\u21B7"
    }
  };

  var WIEN_KI_POPUP = {
    windowName: "kdbWienKiAssist",
    widthPx: 420,
    topOffsetPx: 0,
    bottomInsetPx: 0,
    rightInsetPx: 0,
    frameOvershootPx: 16,
    chromeFeatures: "popup=yes,toolbar=no,menubar=no,location=no,status=no,scrollbars=yes,resizable=yes"
  };

  var SHARE_LINK = {
    hashKeys: { perspective: "dashboard", action: "view", mode: "dashboard" },
    readOnlyTokenKey: "readOnly",
    readOnlyTokenValue: "1",
    readOnlyClass: "kdb-share-read-only"
  };

  var ICON_INVERT_CLASS = "kdb-share-controls__icon--invert";

  var HISTORY_BUTTON_DISABLED_CLASS = "kdb-history-controls__button--disabled";

  function buildRootSelector(id) {
    return "[" + BUTTONS[id].dataPrefix + '-controls="true"]';
  }

  function buildPartSelector(id, part) {
    return "[" + BUTTONS[id].dataPrefix + "-" + part + '="true"]';
  }

  return {
    TOOLBAR_WAIT_TIMEOUT_MS: TOOLBAR_WAIT_TIMEOUT_MS,
    TOOLBAR_WAIT_TRACK_KEY: TOOLBAR_WAIT_TRACK_KEY,
    UNAVAILABLE_CLASS: UNAVAILABLE_CLASS,
    BUTTON_ORDER: BUTTON_ORDER,
    BUTTONS: BUTTONS,
    ICON_ASSETS: ICON_ASSETS,
    LABELS: LABELS,
    WIEN_KI_POPUP: WIEN_KI_POPUP,
    SHARE_LINK: SHARE_LINK,
    ICON_INVERT_CLASS: ICON_INVERT_CLASS,
    HISTORY_BUTTON_DISABLED_CLASS: HISTORY_BUTTON_DISABLED_CLASS,
    buildRootSelector: buildRootSelector,
    buildPartSelector: buildPartSelector
  };
});
