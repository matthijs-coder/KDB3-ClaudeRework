define(["./buildHeaderHistoryStep", "./readHeaderHistorySnapshot"], function (_buildStep, _readSnapshot) {
  "use strict";

  function isChromeHistoryTarget(target) {
    return target === "header.status" || target === "header.subtitleStatus";
  }
  function isTextHistoryTarget(target) {
    return target === "header.titleText" || target === "header.subtitleText";
  }
  function isTrackedHistoryTarget(target) {
    return isChromeHistoryTarget(target) || isTextHistoryTarget(target);
  }
  function resolveHistoryTargetFromAction(action) {
    if (!action || typeof action.type !== "string") return null;
    var t = action.type;
    if (t === "header/commitTitle") return "header.titleText";
    if (t === "header/commitSubtitle") return "header.subtitleText";
    if (t === "header/toggle" || t === "header/show" || t === "header/hide") return "header.status";
    if (t === "header/toggleSubtitle") return "header.subtitleStatus";
    return null;
  }
  function areSnapshotsEqual(a, b) {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch (_error) {
      return false;
    }
  }
  function warnHistoryServiceMissingOnce(_KDB) {
    var rt = _KDB.runtime && _KDB.runtime.header;
    if (!rt) return;
    if (rt.historyServiceMissingWarned === true) return;
    rt.historyServiceMissingWarned = true;
    console.warn("[header] _KDB.services.history is not available; header history commits are skipped.");
  }

  function pushHeaderHistoryStep(_KDB, _action, _prevState, _nextState, _commitOptions) {
    var options = _commitOptions || {};
    if (options.skipHistory === true || options.isHistoryReplay === true) return;
    var target = resolveHistoryTargetFromAction(_action);
    if (!target || !isTrackedHistoryTarget(target)) return;
    var oldSnapshot = _readSnapshot(_prevState, target);
    var newSnapshot = _readSnapshot(_nextState, target);
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

  return pushHeaderHistoryStep;
});
