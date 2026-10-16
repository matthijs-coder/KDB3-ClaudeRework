define(["./buildCommittedStep.js"], function (_buildCommittedStep) {
  "use strict";

  function cloneJson(_value) {
    return JSON.parse(JSON.stringify(_value));
  }

  function pushTabsMoveHistoryStep(_KDB, _plan, _payload, _result, _runContext) {
    try {
      var plan = _plan || {};
      var payload = _payload || {};
      var result = _result || {};
      var runContext = _runContext || {};
      var s = plan.sourceSlot && plan.sourceSlot.tabIdx;
      var d = plan.targetTabIdx;
      var history;
      var pushed;
      var step;
      var restore = _KDB && _KDB.runtime && _KDB.runtime.history && _KDB.runtime.history.writebackRestore;
      if (plan.operation !== "move") {
        return;
      }
      if (payload.isHistoryReplay === true) {
        return;
      }
      if (typeof s !== "number" || !isFinite(s) || typeof d !== "number" || !isFinite(d) || s === d) {
        console.warn("[tabs.pushTabsMoveHistoryStep] skipped: invalid s/d", { s: s, d: d, outcome: result.outcome });
        return;
      }
      if (runContext.moveRollbackByTabId == null) {
        console.warn("[tabs.pushTabsMoveHistoryStep] skipped: missing moveRollbackByTabId", { outcome: result.outcome });
        return;
      }
      history = _KDB.services && _KDB.services.history;
      if (!history || typeof history.pushCommittedStep !== "function") {
        console.warn("[tabs.pushTabsMoveHistoryStep] skipped: history service missing");
        return;
      }
      step = _buildCommittedStep(s, d, Date.now());
      step.old.serializedByTabId = cloneJson(runContext.moveRollbackByTabId);
      pushed = history.pushCommittedStep(step);
      if (pushed !== true) {
        console.warn("[tabs.pushTabsMoveHistoryStep] pushCommittedStep returned false", {
          s: s,
          d: d,
          outcome: result.outcome,
          writebackRestoreActive: !!(restore && restore.active === true)
        });
        return;
      }
    } catch (err) {
      console.error("[tabs.pushTabsMoveHistoryStep] failed", err);
    }
  }

  return pushTabsMoveHistoryStep;
});
