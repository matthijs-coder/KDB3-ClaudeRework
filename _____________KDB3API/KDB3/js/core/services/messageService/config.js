define([], function () {
  "use strict";

  var messageLabels = {
    acknowledge: "OK",
    cancel: "Nein",
    close: "Schließen",
    confirm: "Ja",
    copied: "In Zwischenablage kopiert.",
    copy: "Kopieren",
    copyFallback: "Bitte Text markieren und Strg+C drücken.",
    copyTextLabel: "Zu kopierender Text",
    title: "Meldung"
  };

  return {
    ANCHORED_DURATION_MS: 5000,
    GLOBAL_DURATION_MS: 15000,
    ROOT_ID: "kdb-message-root",
    STACK_GAP_PX: 8,
    messageLabels: messageLabels
  };
});
