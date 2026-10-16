define([
  "./isHistoryTrackedSettingsTarget",
  "./buildControlSettingsHistoryStep",
  "./readSettingsTargetSnapshot",
  "./resolveHistoryTargetFromAction",
], function (_isTracked, _buildStep, _readSnapshot, _resolveTarget) {
  "use strict";

  function areSnapshotsEqual(_a, _b) {
    try {
      return JSON.stringify(_a) === JSON.stringify(_b);
    } catch (_error) {
      return false;
    }
  }

  function warnHistoryServiceMissingOnce(_KDB) {
    var rt = _KDB.runtime && _KDB.runtime.kdbControl;
    if (!rt) return;
    if (rt.historyServiceMissingWarned === true) return;
    rt.historyServiceMissingWarned = true;
    console.warn(
      "[kdbControl] _KDB.services.history is not available; settings history commits are skipped."
    );
  }

  function pushSettingsHistoryStep(_KDB, _action, _prevState, _nextState, _commitOptions) {
    var options = _commitOptions || {};
    if (options.skipHistory === true || options.isHistoryReplay === true) {
      return;
    }
    var target = _resolveTarget(_action);
    if (!target || !_isTracked(target)) {
      return;
    }
    var oldSnapshot = _readSnapshot(_prevState, target);
    var newSnapshot = _readSnapshot(_nextState, target);
    if (!oldSnapshot || !newSnapshot || areSnapshotsEqual(oldSnapshot, newSnapshot)) {
      return;
    }
    var history = _KDB.services && _KDB.services.history;
    if (!history || typeof history.pushCommittedStep !== "function") {
      warnHistoryServiceMissingOnce(_KDB);
      return;
    }
    var step = _buildStep(target, oldSnapshot, newSnapshot);
    if (!step) {
      return;
    }
    history.pushCommittedStep(step);
  }

  return pushSettingsHistoryStep;
});
