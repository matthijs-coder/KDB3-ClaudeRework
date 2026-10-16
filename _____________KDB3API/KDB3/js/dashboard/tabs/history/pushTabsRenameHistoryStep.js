define(["./buildTabsRenameCommittedStep.js"], function (_buildCommittedStep) {
  "use strict";

  function pushTabsRenameHistoryStep(_KDB, _payload, _previousName, _confirmedName) {
    try {
      var payload = _payload || {};
      var tabIndex = payload.tabIndex;
      var previousName = _previousName;
      var confirmedName = _confirmedName;
      var history;
      var pushed;
      var restore = _KDB && _KDB.runtime && _KDB.runtime.history && _KDB.runtime.history.writebackRestore;
      if (payload.isHistoryReplay === true) {
        return;
      }
      if (typeof tabIndex !== "number" || !isFinite(tabIndex)) {
        console.warn("[tabs.pushTabsRenameHistoryStep] skipped: invalid tabIndex", { tabIndex: tabIndex });
        return;
      }
      if (typeof previousName !== "string" || typeof confirmedName !== "string") {
        console.warn("[tabs.pushTabsRenameHistoryStep] skipped: names must be strings", {
          tabIndex: tabIndex,
          hasPrevious: typeof previousName === "string",
          hasConfirmed: typeof confirmedName === "string"
        });
        return;
      }
      if (previousName === confirmedName) {
        return;
      }
      history = _KDB.services && _KDB.services.history;
      if (!history || typeof history.pushCommittedStep !== "function") {
        console.warn("[tabs.pushTabsRenameHistoryStep] skipped: history service missing");
        return;
      }
      pushed = history.pushCommittedStep(_buildCommittedStep(tabIndex, payload.tabId, previousName, confirmedName, Date.now()));
      if (pushed !== true) {
        console.warn("[tabs.pushTabsRenameHistoryStep] pushCommittedStep returned false", {
          tabIndex: tabIndex,
          writebackRestoreActive: !!(restore && restore.active === true)
        });
      }
    } catch (err) {
      console.error("[tabs.pushTabsRenameHistoryStep] failed", err);
    }
  }

  return pushTabsRenameHistoryStep;
});
