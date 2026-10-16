define(["../config/defaults.js"], function (_defaults) {
  "use strict";

  async function apply(_KDB, _targetValue, _step, _ctx) {
    var step = _step || {};
    var targetValue = _targetValue || {};
    var result;
    void _ctx;
    try {
      if (step.key !== "tabs_delete" && step.key !== "tabs_duplicate") {
        return false;
      }
      if (!_KDB || !_KDB.api || !_KDB.api.tabs || typeof _KDB.api.tabs.dispatch !== "function") {
        return false;
      }
      if (step.key === "tabs_delete") {
        if (typeof targetValue.insertTabIdx === "number") {
          result = await _KDB.api.tabs.dispatch({
            type: "tabs/restoreDeleted",
            payload: {
              insertTabIdx: targetValue.insertTabIdx,
              tabId: targetValue.tabId,
              name: targetValue.name,
              hideSlot: targetValue.hideSlot,
              serializedByTabId: targetValue.serializedByTabId,
              filters: targetValue.filters,
              isHistoryReplay: true,
              source: "historyReplay"
            }
          });
        } else {
          result = await _KDB.api.tabs.dispatch({
            type: "tabs/delete",
            payload: {
              tabIndex: targetValue.tabIndex,
              tabId: targetValue.tabId,
              isHistoryReplay: true,
              source: "historyReplay"
            }
          });
        }
      } else if (targetValue.widgetRebuild === true) {
        result = await _KDB.api.tabs.dispatch({
          type: "tabs/delete",
          payload: {
            tabIndex: targetValue.tabIndex,
            tabId: targetValue.tabId,
            widgetRebuild: true,
            serializedByTabId: targetValue.serializedByTabId,
            isHistoryReplay: true,
            source: "historyReplay"
          }
        });
        if (result && result.outcome === "degraded" && _KDB.services && _KDB.services.message && typeof _KDB.services.message.notify === "function") {
          _KDB.services.message.notify({ severity: "info", message: _defaults.TAB_MUTATION_DEGRADED_TEXT });
        }
      } else if (targetValue.replayDuplicate === true) {
        result = await _KDB.api.tabs.dispatch({
          type: "tabs/duplicate",
          payload: {
            tabId: targetValue.sourceTabId,
            tabIndex: targetValue.sourceTabIndex,
            isHistoryReplay: true,
            source: "historyReplay"
          }
        });
        if (result && result.outcome === "degraded" && _KDB.services && _KDB.services.message && typeof _KDB.services.message.notify === "function") {
          _KDB.services.message.notify({ severity: "info", message: _defaults.TAB_MUTATION_DEGRADED_TEXT });
        }
      } else {
        return false;
      }
      return !!(result && (result.outcome === "applied" || result.outcome === "degraded"));
    } catch (err) {
      if (err && err.name === "AbortError") {
        return false;
      }
      console.error("[tabs.applyTabsDeleteHistoryReplay] failed", err);
      return false;
    }
  }

  return { apply: apply };
});
