define([], function () {
  "use strict";

  var BOOTSTRAP_LABELS = {
    renderFailedTitle: "Dashboard",
    renderFailedBody: "Das KDB-Dashboard konnte nicht geladen werden. Bitte das Dashboard schließen und erneut öffnen. Details: "
  };

  function mergeBootstrapLabels(_KDB) {
    _KDB.config.labels = _KDB.config.labels || {};
    _KDB.config.labels.de = _KDB.config.labels.de || {};
    var existing = _KDB.config.labels.de.bootstrap;
    _KDB.config.labels.de.bootstrap = Object.assign({}, BOOTSTRAP_LABELS, existing && typeof existing === "object" ? existing : {});
  }

  // Falls back to the defaults when the failure happens before the labels were merged.
  function readBootstrapLabels(_KDB) {
    var labels = _KDB && _KDB.config && _KDB.config.labels && _KDB.config.labels.de ? _KDB.config.labels.de.bootstrap : null;
    return Object.assign({}, BOOTSTRAP_LABELS, labels && typeof labels === "object" ? labels : {});
  }

  return {
    mergeBootstrapLabels: mergeBootstrapLabels,
    readBootstrapLabels: readBootstrapLabels
  };
});
