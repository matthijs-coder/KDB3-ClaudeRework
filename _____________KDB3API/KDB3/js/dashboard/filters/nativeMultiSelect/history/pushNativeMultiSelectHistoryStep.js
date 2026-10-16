define(["./buildCommittedStep.js"], function (_buildCommittedStep) {
  "use strict";

  function pushNativeMultiSelectHistoryStep(_KDB, _oldSnapshot, _newSnapshot) {
    var oldSnap;
    var newSnap;
    var restore;
    var history;
    var step;
    var pushed;
    try {
      oldSnap = _oldSnapshot;
      newSnap = _newSnapshot;
      if (!oldSnap || !newSnap) {
        return false;
      }
      if (String(oldSnap.itemName || "") !== String(newSnap.itemName || "")) {
        return false;
      }
      if (String(oldSnap.scopeKey || "") !== String(newSnap.scopeKey || "")) {
        return false;
      }
      if (JSON.stringify(oldSnap.values) === JSON.stringify(newSnap.values)) {
        return false;
      }
      if (!newSnap.values || newSnap.values.length === 0) {
        return false;
      }
      restore = _KDB && _KDB.runtime && _KDB.runtime.history && _KDB.runtime.history.writebackRestore;
      if (restore && restore.active === true) {
        return false;
      }
      history = _KDB.services && _KDB.services.history;
      if (!history || typeof history.pushCommittedStep !== "function") {
        console.warn("[nativeMultiSelect.pushNativeMultiSelectHistoryStep] skipped: history service missing");
        return false;
      }
      step = _buildCommittedStep(oldSnap, newSnap, Date.now());
      pushed = history.pushCommittedStep(step);
      if (pushed !== true) {
        console.warn("[nativeMultiSelect.pushNativeMultiSelectHistoryStep] pushCommittedStep returned false");
        return false;
      }
      return true;
    } catch (err) {
      console.error("[nativeMultiSelect.pushNativeMultiSelectHistoryStep] failed", err);
      return false;
    }
  }

  return pushNativeMultiSelectHistoryStep;
});
