define([
  "./config/defaults.js",
  "./slots.js",
  "./tabMutation/slotStock/ledger.js",
  "../../core/utils/kit/history.js",
  "../../core/utils/kit/data.js"
], function (_defaults, _slots, _ledger, _kitHistory, _data) {
  "use strict";

  // Step keys and old/new shapes are persisted history; keep them stable.
  // The history service clones old/new itself and rejects steps during a writeback restore.

  const MUTATION_STEP_BUILDERS = {
    move: buildMoveStep,
    delete: buildDeleteStep,
    duplicate: buildDuplicateStep
  };

  // Called by the saga after a finished mutation; restoreDeleted records no step.
  function pushTabMutationHistoryStep(_KDB, _plan, _payload, _result, _runContext) {
    const plan = _plan || {};
    const payload = _payload || {};
    const buildStep = MUTATION_STEP_BUILDERS[plan.operation];
    if (!buildStep || payload.isHistoryReplay === true) { return; }
    const outcome = (_result || {}).outcome;
    const step = buildStep(_KDB, plan, _runContext || {}, outcome);
    if (step) { pushStep(_KDB, step, { outcome: outcome }); }
  }

  function buildMoveStep(_KDB, plan, runContext, outcome) {
    const s = plan.sourceSlot && plan.sourceSlot.tabIdx;
    const d = plan.targetTabIdx;
    if (!isFiniteNumber(s) || !isFiniteNumber(d) || s === d) {
      return skip("tabs_move", "invalid s/d", { s: s, d: d, outcome: outcome });
    }
    if (runContext.moveRollbackByTabId == null) {
      return skip("tabs_move", "missing moveRollbackByTabId", { outcome: outcome });
    }
    return {
      key: "tabs_move",
      timestamp: Date.now(),
      old: { tabIndex: d, targetPosition: s, serializedByTabId: runContext.moveRollbackByTabId },
      new: { tabIndex: s, targetPosition: d }
    };
  }

  function buildDeleteStep(_KDB, plan, runContext, outcome) {
    const slices = runContext.deleteHistorySlices || {};
    const deletedTabIdx = plan.deletedSlot && plan.deletedSlot.tabIdx;
    if (!isFiniteNumber(deletedTabIdx)) {
      return skip("tabs_delete", "invalid deletedSlot.tabIdx", { deletedTabIdx: deletedTabIdx, outcome: outcome });
    }
    if (slices.singleSelect == null || slices.dienststelle == null || slices.nativeMultiSelect == null) {
      return skip("tabs_delete", "missing filter historySlice", {
        hasSingleSelect: slices.singleSelect != null,
        hasDienststelle: slices.dienststelle != null,
        hasNativeMultiSelect: slices.nativeMultiSelect != null,
        outcome: outcome
      });
    }
    if (runContext.deleteRollbackByTabId == null) {
      return skip("tabs_delete", "missing deleteRollbackByTabId", { outcome: outcome });
    }
    const hide = plan.hideSlot || {};
    return {
      key: "tabs_delete",
      timestamp: Date.now(),
      old: {
        insertTabIdx: deletedTabIdx,
        tabId: plan.deletedSlot.tabId,
        name: plan.deletedName,
        hideSlot: { tabIdx: hide.tabIdx, index: hide.index, tabId: hide.tabId },
        serializedByTabId: runContext.deleteRollbackByTabId,
        filters: { singleSelect: slices.singleSelect, dienststelle: slices.dienststelle, nativeMultiSelect: slices.nativeMultiSelect }
      },
      new: { tabIndex: deletedTabIdx, tabId: plan.deletedSlot.tabId }
    };
  }

  function buildDuplicateStep(_KDB, plan, runContext, outcome) {
    const insertSlot = plan.insertSlot || {};
    const sourceSlot = plan.sourceSlot || {};
    if (!isFiniteNumber(insertSlot.tabIdx)) {
      return skip("tabs_duplicate", "invalid insertSlot.tabIdx", { insertTabIdx: insertSlot.tabIdx, outcome: outcome });
    }
    return {
      key: "tabs_duplicate",
      timestamp: Date.now(),
      old: { tabIndex: insertSlot.tabIdx, tabId: insertSlot.tabId, widgetRebuild: true, serializedByTabId: _ledger.readRollbackByTabId(_KDB, plan.operationId) },
      new: { replayDuplicate: true, sourceTabId: sourceSlot.tabId, sourceTabIndex: sourceSlot.tabIdx }
    };
  }

  function pushRenameHistoryStep(_KDB, _payload, previousName, confirmedName) {
    const payload = _payload || {};
    const tabIndex = payload.tabIndex;
    if (payload.isHistoryReplay === true) { return; }
    if (!isFiniteNumber(tabIndex)) {
      skip("tabs_rename", "invalid tabIndex", { tabIndex: tabIndex });
      return;
    }
    if (typeof previousName !== "string" || typeof confirmedName !== "string") {
      skip("tabs_rename", "names must be strings", {
        tabIndex: tabIndex,
        hasPrevious: typeof previousName === "string",
        hasConfirmed: typeof confirmedName === "string"
      });
      return;
    }
    if (previousName === confirmedName) { return; }
    pushStep(_KDB, {
      key: "tabs_rename",
      timestamp: Date.now(),
      old: { tabIndex: tabIndex, tabId: payload.tabId, name: previousName },
      new: { tabIndex: tabIndex, tabId: payload.tabId, name: confirmedName }
    }, { tabIndex: tabIndex });
  }

  function pushStep(_KDB, step, details) {
    if (!_kitHistory.pushHistoryStep(_KDB, step)) {
      console.warn("[tabs.history] " + step.key + " step not pushed (history service missing or step rejected)", details);
    }
  }

  function skip(key, reason, details) {
    console.warn("[tabs.history] " + key + " step skipped: " + reason, details);
    return null;
  }

  function isFiniteNumber(value) {
    return typeof value === "number" && isFinite(value);
  }

  // Replay: each handler dispatches the inverse/forward tabs action with isHistoryReplay
  // so the mutation itself records no new step.

  async function replayMove(_KDB, targetValue) {
    const tabIndex = targetValue.tabIndex;
    const targetPosition = targetValue.targetPosition;
    if (!isFiniteNumber(tabIndex) || !isFiniteNumber(targetPosition)) { return false; }
    const payload = { tabIndex: tabIndex, targetPosition: targetPosition, isHistoryReplay: true, source: "historyReplay" };
    if (_data.isPlainObject(targetValue.serializedByTabId)) { payload.serializedByTabId = targetValue.serializedByTabId; }
    return isAppliedOrDegraded(await _KDB.api.tabs.dispatch({ type: "tabs/move", payload: payload }));
  }

  async function replayDelete(_KDB, targetValue) {
    let action;
    if (typeof targetValue.insertTabIdx === "number") {
      action = {
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
      };
    } else {
      action = { type: "tabs/delete", payload: { tabIndex: targetValue.tabIndex, tabId: targetValue.tabId, isHistoryReplay: true, source: "historyReplay" } };
    }
    return isAppliedOrDegraded(await _KDB.api.tabs.dispatch(action));
  }

  async function replayDuplicate(_KDB, targetValue) {
    let action;
    if (targetValue.widgetRebuild === true) {
      action = {
        type: "tabs/delete",
        payload: {
          tabIndex: targetValue.tabIndex,
          tabId: targetValue.tabId,
          widgetRebuild: true,
          serializedByTabId: targetValue.serializedByTabId,
          isHistoryReplay: true,
          source: "historyReplay"
        }
      };
    } else if (targetValue.replayDuplicate === true) {
      action = {
        type: "tabs/duplicate",
        payload: { tabId: targetValue.sourceTabId, tabIndex: targetValue.sourceTabIndex, isHistoryReplay: true, source: "historyReplay" }
      };
    } else {
      return false;
    }
    const result = await _KDB.api.tabs.dispatch(action);
    const message = _KDB.services && _KDB.services.message;
    if (result && result.outcome === "degraded" && message) {
      message.notify({ severity: "info", message: _defaults.TAB_MUTATION_DEGRADED_TEXT });
    }
    return isAppliedOrDegraded(result);
  }

  // Only replays when the live name is the target or the step's opposite side
  // (someone else may have renamed the tab in between).
  async function replayRename(_KDB, targetValue, step) {
    const tabIndex = targetValue.tabIndex;
    const targetName = targetValue.name;
    if (!isFiniteNumber(tabIndex) || typeof targetName !== "string") { return false; }
    const byIndex = _KDB.state && _KDB.state.tabs && _KDB.state.tabs.byIndex || {};
    const tab = byIndex[String(tabIndex)] || null;
    if (!_slots.isRenamableUserTab(tab)) { return false; }
    if (targetValue.tabId && tab.tabId !== targetValue.tabId) { return false; }
    const liveName = typeof tab.name === "string" ? tab.name : "";
    if (liveName !== targetName && !isLiveNameOpposite(step, targetName, liveName)) { return false; }
    const result = await _KDB.api.tabs.dispatch({
      type: "tabs/rename",
      payload: { tabIndex: tabIndex, tabId: targetValue.tabId, name: targetName, isHistoryReplay: true, source: "historyReplay", preserveEditSession: true }
    });
    return result === true || liveName === targetName;
  }

  function isLiveNameOpposite(step, targetName, liveName) {
    const oldName = step && step.old && step.old.name;
    const newName = step && step.new && step.new.name;
    if (targetName === oldName) { return liveName === newName; }
    if (targetName === newName) { return liveName === oldName; }
    return false;
  }

  function isAppliedOrDegraded(result) {
    return !!(result && (result.outcome === "applied" || result.outcome === "degraded"));
  }

  // Boundary for the history service: a replay never rejects, it reports false.
  function withReplayBoundary(replay) {
    return async function (_KDB, _targetValue, _step) {
      try {
        if (!_KDB || !_KDB.api || !_KDB.api.tabs) { return false; }
        return await replay(_KDB, _targetValue || {}, _step || {});
      } catch (err) {
        if (!err || err.name !== "AbortError") {
          console.error("[tabs.historyReplay] " + (_step && _step.key) + " replay failed", err);
        }
        return false;
      }
    };
  }

  // Staged on runtime.tabs.historyReplayHandlerContribution; tabs/index.js registers it for the four tabs_* keys.
  function createTabsHistoryReplayHandler() {
    return _kitHistory.createReplayHandler({
      tabs_move: withReplayBoundary(replayMove),
      tabs_delete: withReplayBoundary(replayDelete),
      tabs_duplicate: withReplayBoundary(replayDuplicate),
      tabs_rename: withReplayBoundary(replayRename)
    });
  }

  return {
    pushTabMutationHistoryStep: pushTabMutationHistoryStep,
    pushRenameHistoryStep: pushRenameHistoryStep,
    createTabsHistoryReplayHandler: createTabsHistoryReplayHandler
  };
});
