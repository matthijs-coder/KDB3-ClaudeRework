define(["./presentHomeChoice.js", "./presentCubesUnavailable.js", "../bootstrap/config.js"], function (_presentHomeChoice, _presentCubesUnavailable, _bootstrapConfig) {
  "use strict";

  var HOME_DIALOG_LABELS = {
    cubesUnavailableTitle: "Daten-Cubes nicht verfügbar",
    cubesUnavailableBody:
      "Die benötigten Daten-Cubes können derzeit nicht geladen werden. " +
      "Möglicherweise läuft die Beladung derzeit noch, Sie verfügen nicht über die erforderlichen Berechtigungen " +
      "oder es ist ein Fehler aufgetreten.",
    closeLabel: "Dashboard schließen",
    minimizeLabel: "Dashboard minimalisieren",
    navInstruction: "Wechseln Sie zur Startseite."
  };

  function mergeHomeDialogLabels(_KDB) {
    _KDB.config = _KDB.config || {};
    _KDB.config.labels = _KDB.config.labels || {};
    _KDB.config.labels.de = _KDB.config.labels.de || {};
    var existing = _KDB.config.labels.de.homeDialog;
    _KDB.config.labels.de.homeDialog = Object.assign(
      {},
      HOME_DIALOG_LABELS,
      existing && typeof existing === "object" ? existing : {}
    );
  }

  // The boot overlay is the only overlay that offers the home dialog when its watchdog fires.
  function registerBootWatchdog(_KDB) {
    var loading = _KDB.services && _KDB.services.loading;
    if (!loading || typeof loading.registerWatchdogHandler !== "function") {
      return null;
    }
    return loading.registerWatchdogHandler(_bootstrapConfig.BOOT_LOADING_MOUNT_KEY, function (payload) {
      return _presentHomeChoice(_KDB, { title: payload.title, message: payload.message, code: payload.code, severity: payload.severity });
    });
  }

  function __orchestrator(_KDB) {
    var cognosHost = _KDB.services && _KDB.services.cognosHost;
    mergeHomeDialogLabels(_KDB);
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.homeDialog = {
      dataSourcesFacet: (cognosHost && cognosHost.dataSources) || null,
      dashboardFacet: (cognosHost && cognosHost.dashboard) || null,
      presentHomeChoice: _presentHomeChoice,
      presentCubesUnavailable: _presentCubesUnavailable,
      unregisterWatchdog: registerBootWatchdog(_KDB)
    };
    return _KDB.runtime.homeDialog;
  }

  return __orchestrator;
});
