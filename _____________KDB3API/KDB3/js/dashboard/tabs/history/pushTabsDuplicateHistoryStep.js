define(["./buildTabsDuplicateCommittedStep.js"], function (_buildCommittedStep) {
  "use strict";

  function cloneJson(_value) {
    return JSON.parse(JSON.stringify(_value));
  }

  function readRollbackByTabId(_KDB, _plan) {
    var runtime = _KDB && _KDB.runtime && _KDB.runtime.widgetBase;
    var snapshots = runtime && runtime.tabMutationSnapshots;
    var snapshot = snapshots && _plan.operationId ? snapshots[_plan.operationId] : null;
    var map = snapshot && snapshot.rollbackByTabId;
    if (!map || typeof map !== "object") {
      return {};
    }
    return cloneJson(map);
  }

  function pushTabsDuplicateHistoryStep(_KDB, _plan, _payload, _result, _runContext) {
    try {
      var plan = _plan || {};
      var payload = _payload || {};
      var result = _result || {};
      var insertSlot = plan.insertSlot || {};
      var sourceSlot = plan.sourceSlot || {};
      var insertTabIdx = insertSlot.tabIdx;
      var history;
      var pushed;
      var restore = _KDB && _KDB.runtime && _KDB.runtime.history && _KDB.runtime.history.writebackRestore;
      void _runContext;
      if (plan.operation !== "duplicate") {
        return;
      }
      if (payload.isHistoryReplay === true) {
        return;
      }
      if (typeof insertTabIdx !== "number" || !isFinite(insertTabIdx)) {
        console.warn("[tabs.pushTabsDuplicateHistoryStep] skipped: invalid insertSlot.tabIdx", {
          insertTabIdx: insertTabIdx,
          outcome: result.outcome
        });
        return;
      }
      history = _KDB.services && _KDB.services.history;
      if (!history || typeof history.pushCommittedStep !== "function") {
        console.warn("[tabs.pushTabsDuplicateHistoryStep] skipped: history service missing");
        return;
      }
      pushed = history.pushCommittedStep(_buildCommittedStep(
        insertTabIdx,
        insertSlot.tabId,
        readRollbackByTabId(_KDB, plan),
        sourceSlot.tabId,
        sourceSlot.tabIdx,
        Date.now()
      ));
      if (pushed !== true) {
        console.warn("[tabs.pushTabsDuplicateHistoryStep] pushCommittedStep returned false", {
          insertTabIdx: insertTabIdx,
          outcome: result.outcome,
          writebackRestoreActive: !!(restore && restore.active === true)
        });
      }
    } catch (err) {
      console.error("[tabs.pushTabsDuplicateHistoryStep] failed", err);
    }
  }

  return pushTabsDuplicateHistoryStep;
});
