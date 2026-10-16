define([
  "./buildCommittedStep.js",
  "./readDependencySnapshot.js"
], function (_buildCommittedStep, _readDependencySnapshot) {
  "use strict";

  function areSnapshotsEqual(_a, _b) {
    try {
      return JSON.stringify(_a) === JSON.stringify(_b);
    } catch (_error) {
      return false;
    }
  }

  function warnHistoryServiceMissingOnce(_KDB) {
    var rt = _KDB.runtime && _KDB.runtime.dienststelle;
    if (!rt || rt.historyServiceMissingWarned === true) {
      return;
    }
    rt.historyServiceMissingWarned = true;
    console.warn(
      "[dienststelle] _KDB.services.history is not available; history commits are skipped."
    );
  }

  function pushDienststelleHistoryStep(_KDB, _oldSnapshot, _reconcileResult) {
    var newSnapshot;
    var history;
    var step;
    if (!_reconcileResult) {
      return _reconcileResult;
    }
    newSnapshot = _readDependencySnapshot(_KDB);
    if (!_oldSnapshot || !newSnapshot || areSnapshotsEqual(_oldSnapshot, newSnapshot)) {
      if (_oldSnapshot && newSnapshot && areSnapshotsEqual(_oldSnapshot, newSnapshot)) {
        console.info("[dienststelle.history] push skipped: old equals new", {
          activeFilterKey: newSnapshot && newSnapshot.activeFilterKey
        });
      }
      return _reconcileResult;
    }
    step = _buildCommittedStep(_oldSnapshot, newSnapshot, Date.now());
    history = _KDB.services && _KDB.services.history;
    if (!history || typeof history.pushCommittedStep !== "function") {
      warnHistoryServiceMissingOnce(_KDB);
      return _reconcileResult;
    }
    history.pushCommittedStep(step);
    return _reconcileResult;
  }

  return pushDienststelleHistoryStep;
});
