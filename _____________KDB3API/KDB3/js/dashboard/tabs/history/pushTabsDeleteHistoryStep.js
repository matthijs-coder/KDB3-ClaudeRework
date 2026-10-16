define(["./buildTabsDeleteCommittedStep.js"], function (_buildCommittedStep) {
  "use strict";

  function isPresentSlice(_value) {
    return _value !== undefined && _value !== null;
  }

  function cloneJson(_value) {
    return JSON.parse(JSON.stringify(_value));
  }

  function readHideSlot(_plan) {
    var hide = _plan.hideSlot || {};
    return { tabIdx: hide.tabIdx, index: hide.index, tabId: hide.tabId };
  }

  function pushTabsDeleteHistoryStep(_KDB, _plan, _payload, _result, _runContext) {
    try {
      var plan = _plan || {};
      var payload = _payload || {};
      var result = _result || {};
      var runContext = _runContext || {};
      var slices = runContext.deleteHistorySlices || {};
      var history;
      var pushed;
      var restore = _KDB && _KDB.runtime && _KDB.runtime.history && _KDB.runtime.history.writebackRestore;
      var deletedTabIdx = plan.deletedSlot && plan.deletedSlot.tabIdx;
      if (plan.operation !== "delete") {
        return;
      }
      if (payload.isHistoryReplay === true) {
        return;
      }
      if (typeof deletedTabIdx !== "number" || !isFinite(deletedTabIdx)) {
        console.warn("[tabs.pushTabsDeleteHistoryStep] skipped: invalid deletedSlot.tabIdx", {
          deletedTabIdx: deletedTabIdx,
          outcome: result.outcome
        });
        return;
      }
      if (!isPresentSlice(slices.singleSelect) || !isPresentSlice(slices.dienststelle) || !isPresentSlice(slices.nativeMultiSelect)) {
        console.warn("[tabs.pushTabsDeleteHistoryStep] skipped: missing filter historySlice", {
          hasSingleSelect: isPresentSlice(slices.singleSelect),
          hasDienststelle: isPresentSlice(slices.dienststelle),
          hasNativeMultiSelect: isPresentSlice(slices.nativeMultiSelect),
          outcome: result.outcome
        });
        return;
      }
      if (!isPresentSlice(runContext.deleteRollbackByTabId)) {
        console.warn("[tabs.pushTabsDeleteHistoryStep] skipped: missing deleteRollbackByTabId", {
          outcome: result.outcome
        });
        return;
      }
      history = _KDB.services && _KDB.services.history;
      if (!history || typeof history.pushCommittedStep !== "function") {
        console.warn("[tabs.pushTabsDeleteHistoryStep] skipped: history service missing");
        return;
      }
      pushed = history.pushCommittedStep(_buildCommittedStep(
        {
          insertTabIdx: deletedTabIdx,
          tabId: plan.deletedSlot.tabId,
          name: plan.deletedName,
          hideSlot: readHideSlot(plan),
          serializedByTabId: cloneJson(runContext.deleteRollbackByTabId),
          filters: {
            singleSelect: cloneJson(slices.singleSelect),
            dienststelle: cloneJson(slices.dienststelle),
            nativeMultiSelect: cloneJson(slices.nativeMultiSelect)
          }
        },
        { tabIndex: deletedTabIdx, tabId: plan.deletedSlot.tabId },
        Date.now()
      ));
      if (pushed !== true) {
        console.warn("[tabs.pushTabsDeleteHistoryStep] pushCommittedStep returned false", {
          deletedTabIdx: deletedTabIdx,
          outcome: result.outcome,
          writebackRestoreActive: !!(restore && restore.active === true)
        });
      }
    } catch (err) {
      console.error("[tabs.pushTabsDeleteHistoryStep] failed", err);
    }
  }

  return pushTabsDeleteHistoryStep;
});
