define(["./buildFooterHistoryStep", "./readFooterHistorySnapshot"], function (_buildStep, _readSnapshot) {
  "use strict";

  var TRACKED_TARGET = "footer.status";

  function areSnapshotsEqual(a, b) {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch (_error) {
      return false;
    }
  }
  function warnHistoryServiceMissingOnce(_KDB) {
    var rt = _KDB.runtime && _KDB.runtime.footer;
    if (!rt) return;
    if (rt.historyServiceMissingWarned === true) return;
    rt.historyServiceMissingWarned = true;
    console.warn("[footer] _KDB.services.history is not available; chrome history commits are skipped.");
  }

  function pushFooterHistoryStep(_KDB, _action, _prevState, _nextState, _commitOptions) {
    var options = _commitOptions || {};
    var payload = (_action && _action.payload) || {};
    if (options.skipHistory === true || options.isHistoryReplay === true) return;
    if (payload.source === "bootstrap") return;
    var oldSnapshot = _readSnapshot(_prevState, TRACKED_TARGET);
    var newSnapshot = _readSnapshot(_nextState, TRACKED_TARGET);
    if (!oldSnapshot || !newSnapshot || areSnapshotsEqual(oldSnapshot, newSnapshot)) return;
    var history = _KDB.services && _KDB.services.history;
    if (!history || typeof history.pushCommittedStep !== "function") {
      warnHistoryServiceMissingOnce(_KDB);
      return;
    }
    var step = _buildStep(oldSnapshot, newSnapshot);
    if (!step) return;
    history.pushCommittedStep(step);
  }

  return pushFooterHistoryStep;
});
