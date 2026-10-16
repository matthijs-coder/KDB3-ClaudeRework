define([], function () {
  "use strict";

  // User-visible German text, registered on _KDB.config.labels.de.history (existing values win).
  var historyLabels = {
    replayFailedUndo: "Rückgängig machen ist fehlgeschlagen; die Änderung wurde nicht zurückgenommen.",
    replayFailedRedo: "Wiederholen ist fehlgeschlagen; die Änderung wurde nicht erneut angewendet."
  };

  return { historyLabels: historyLabels };
});
