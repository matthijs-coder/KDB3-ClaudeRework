define([], function () {
  "use strict";

  var loadingLabels = {
    dashboard: "Dashboard wird geladen",
    dashboardSave: "Dashboard wird gespeichert",
    dashboardRestore: "Dashboard wird wiederhergestellt",
    chart: "Diagramm wird geladen",
    tab: "Registerkarte wird geladen",
    metrics: "Kennzahlen werden geladen",
    parameterSelect: "Parameterauswahl wird geladen",
    pdfExport: "PDF-Export läuft – das kann einige Minuten dauern",
    pdfTitle: "Titelseite wird erstellt",
    pdfTabPrepare: "Registerkarte {n} von {m} wird vorbereitet",
    pdfTabCapture: "Registerkarte {n} von {m} wird erfasst",
    pdfAttachment: "Anhang wird erstellt",
    pdfSave: "PDF wird gespeichert",
    watchdogTitle: "Dashboard nicht vollständig geladen",
    watchdogBody: "Das Dashboard oder die benötigten Daten konnten nicht innerhalb von 5 Minuten vollständig geladen werden. Möglicherweise ist ein Fehler aufgetreten.",
    tabProgressNamedCounted: "Registerkarte {n} von {m}: {name}",
    tabProgressNamed: "Registerkarte {n}: {name}",
    tabProgressCounted: "Registerkarte {n} von {m}",
    tabProgressNumber: "Registerkarte {n}",
    tabProgressName: "{name}",
    tabMutationCopy: "Registerkarte wird kopiert",
    tabMutationDelete: "Registerkarte wird gelöscht",
    tabMutationMove: "Registerkarte wird verschoben",
    tabMutationRestore: "Gelöschte Registerkarte wird wiederhergestellt"
  };

  return {
    BOOT_MOUNT_KEY: "kdb-root-loading-animation-mount",
    DEFAULT_REMOVE_DELAY_MS: 0,
    ROOT_MOUNT_KEY: "kdb-root-loading",
    WATCHDOG_MS: 300000,
    loadingLabels: loadingLabels
  };
});
