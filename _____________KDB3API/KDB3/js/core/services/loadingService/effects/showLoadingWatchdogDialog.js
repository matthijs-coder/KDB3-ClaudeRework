define([], function () {
  "use strict";

  function readLoadingLabels(_KDB) {
    return _KDB.config && _KDB.config.labels && _KDB.config.labels.de
      ? _KDB.config.labels.de.loading
      : null;
  }

  function readLoadingLabel(_labels, _key) {
    var value = _labels && _labels[_key];
    return typeof value === "string" && value ? value : "";
  }

  async function __controller(_KDB) {
    try {
      var labels = readLoadingLabels(_KDB);
      var title = readLoadingLabel(labels, "watchdogTitle");
      var body = readLoadingLabel(labels, "watchdogBody");
      var presentHomeChoice = _KDB.runtime && _KDB.runtime.homeDialog
        ? _KDB.runtime.homeDialog.presentHomeChoice
        : null;
      if (!title || !body) {
        console.warn("[loadingService.showLoadingWatchdogDialog] loading watchdog labels are empty");
        return;
      }
      if (typeof presentHomeChoice !== "function") {
        console.warn("[loadingService.showLoadingWatchdogDialog] runtime.homeDialog.presentHomeChoice is missing");
        return;
      }
      await presentHomeChoice(_KDB, {
        title: title,
        message: body,
        code: "LOADING_WATCHDOG",
        severity: "warning"
      });
    } catch (error) {
      console.error("[loadingService.showLoadingWatchdogDialog] failed", error);
    }
  }

  return __controller;
});
