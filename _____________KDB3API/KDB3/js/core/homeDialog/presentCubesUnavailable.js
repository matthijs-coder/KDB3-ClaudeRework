define(["./presentHomeChoice.js"], function (_presentHomeChoice) {
  "use strict";

  function readHomeDialogLabels(_KDB) {
    return _KDB.config && _KDB.config.labels && _KDB.config.labels.de
      ? _KDB.config.labels.de.homeDialog
      : null;
  }

  function readCubeLabel(_labels, _key) {
    var value = _labels && _labels[_key];
    return typeof value === "string" && value ? value : "";
  }

  function readStampedDataSourcesFacet(_KDB) {
    var runtime = _KDB.runtime && _KDB.runtime.homeDialog;
    return runtime && runtime.dataSourcesFacet ? runtime.dataSourcesFacet : null;
  }

  function warnCubesUnavailableSkip(_outcome) {
    var ok = _outcome ? _outcome.ok : undefined;
    var data = _outcome ? _outcome.data : undefined;
    var reason = _outcome ? _outcome.reason : undefined;
    console.warn("[homeDialog.presentCubesUnavailable] skipped", ok, data, _outcome, reason);
  }

  async function __controller(_KDB) {
    try {
      var dataSourcesFacet = readStampedDataSourcesFacet(_KDB);
      var labels;
      var title;
      var message;
      var outcome;
      if (!dataSourcesFacet || typeof dataSourcesFacet.hasErrorDataSource !== "function") {
        console.warn("[homeDialog.presentCubesUnavailable] dataSourcesFacet.hasErrorDataSource is missing");
        return;
      }
      outcome = await dataSourcesFacet.hasErrorDataSource();
      if (!outcome || outcome.ok !== true || outcome.data !== true) {
        warnCubesUnavailableSkip(outcome);
        return;
      }
      labels = readHomeDialogLabels(_KDB);
      title = readCubeLabel(labels, "cubesUnavailableTitle");
      message = readCubeLabel(labels, "cubesUnavailableBody");
      if (!title || !message) {
        console.warn("[homeDialog.presentCubesUnavailable] homeDialog cube labels are empty");
        return;
      }
      await _presentHomeChoice(_KDB, {
        title: title,
        message: message,
        code: "CUBES_UNAVAILABLE",
        severity: "error"
      });
    } catch (error) {
      console.error("[homeDialog.presentCubesUnavailable] failed", error);
    }
  }

  return __controller;
});
