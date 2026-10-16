/*
 * historyService replay: handler resolution, the replay lock, lock-aware `history:changed` emission and the
 * undo/redo runner. `context` is built by index.js: { _KDB, replayHandlers, guard, dispatch, recordError }.
 * Handlers are `{ apply(_KDB, targetValue, step, { direction }) -> boolean | Promise<boolean> }`; undo applies
 * `step.old`, redo applies `step.new`; only a strict `true` counts as success. Handlers receive a copy of the
 * stored step, so they cannot change history by mutating it.
 */
define(["../../utils/kit/data.js", "./events/eventNames.js"], function (_data, _eventNames) {
  "use strict";

  // German user-facing text; moves to config.labels.de in Phase 2.
  const REPLAY_FAILED_MESSAGES = {
    undo: "Rückgängig machen ist fehlgeschlagen; die Änderung wurde nicht zurückgenommen.",
    redo: "Wiederholen ist fehlgeschlagen; die Änderung wurde nicht erneut angewendet.",
  };

  function readHistoryRuntime(_KDB) {
    return _KDB && _KDB.runtime ? _KDB.runtime.history : null;
  }

  function readHistoryState(_KDB) {
    return _KDB && _KDB.state ? _KDB.state.history : undefined;
  }

  function readWritebackRestoreFlag(_KDB) {
    const runtime = readHistoryRuntime(_KDB);
    const flag = runtime && runtime.writebackRestore;
    return flag && typeof flag === "object" ? flag : { active: false, runId: null };
  }

  function ensureReplayFlag(_KDB) {
    _KDB.runtime.history = _KDB.runtime.history || {};
    const runtime = _KDB.runtime.history;
    if (!runtime.replay || typeof runtime.replay !== "object") {
      runtime.replay = { active: false, direction: null };
    }
    return runtime.replay;
  }

  // Undo/redo are blocked while a replay runs and while a writeback restore is active.
  function isHistoryLocked(_KDB) {
    const runtime = readHistoryRuntime(_KDB);
    if (!runtime) {
      return false;
    }
    return !!(runtime.replay && runtime.replay.active === true) || readWritebackRestoreFlag(_KDB).active === true;
  }

  // The payload mirrors the lock: the history controls prefer it over service calls.
  function emitHistoryChanged(_KDB) {
    const eventBus = _KDB && _KDB.events;
    if (!eventBus || typeof eventBus.emit !== "function") {
      return;
    }
    const state = readHistoryState(_KDB) || {};
    const stack = Array.isArray(state.stack) ? state.stack : [];
    const pointer = typeof state.pointer === "number" ? state.pointer : -1;
    const locked = isHistoryLocked(_KDB);
    try {
      eventBus.emit(_eventNames.HISTORY_CHANGED, {
        pointer: pointer,
        stackLength: stack.length,
        limit: typeof state.limit === "number" ? state.limit : 0,
        canUndo: !locked && pointer >= 0,
        canRedo: !locked && pointer < stack.length - 1,
      });
    } catch (error) {
      console.error("[historyService.emitHistoryChanged] event emit failed", error);
    }
  }

  function resolveHistoryHandler(stepKey, replayHandlers) {
    if (!replayHandlers || typeof stepKey !== "string") {
      return null;
    }
    const handler = replayHandlers[stepKey];
    return handler && typeof handler.apply === "function" ? handler : null;
  }

  // Handler failures are logged here and reported as `false`.
  async function applyHistoryStep(_KDB, direction, storedStep, replayHandlers) {
    const step = storedStep || {};
    const handler = resolveHistoryHandler(step.key, replayHandlers);
    if (!handler) {
      console.warn("[historyService.applyHistoryStep] handler missing", step.key);
      return false;
    }
    try {
      const targetValue = direction === "undo" ? step.old : step.new;
      const result = await handler.apply(_KDB, targetValue, step, { direction: direction });
      return result === true;
    } catch (error) {
      console.error("[historyService.applyHistoryStep] replay failed", error);
      return false;
    }
  }

  function notifyReplayFailed(_KDB, direction) {
    const messageService = _KDB && _KDB.services && _KDB.services.message;
    if (!messageService || typeof messageService.notify !== "function") {
      return;
    }
    try {
      messageService.notify({ severity: "error", message: REPLAY_FAILED_MESSAGES[direction] });
    } catch (error) {
      console.warn("[historyService.runReplay] failure message failed", error);
    }
  }

  // The lock is set before the async apply window, so a double click on undo/redo is refused by
  // canUndo/canRedo and the pointer moves exactly once. The start emit disables the buttons, the end emit
  // re-syncs them (also after a failed replay).
  async function runReplay(context, direction, step) {
    const _KDB = context._KDB;
    const replayFlag = ensureReplayFlag(_KDB);
    replayFlag.active = true;
    replayFlag.direction = direction;
    emitHistoryChanged(_KDB);
    let didApply = false;
    try {
      didApply = await applyHistoryStep(_KDB, direction, _data.cloneJson(step), context.replayHandlers());
    } catch (error) {
      context.recordError(direction, error);
    } finally {
      replayFlag.active = false;
      replayFlag.direction = null;
    }
    if (context.guard.isDisposed()) {
      return false;
    }
    if (didApply) {
      context.dispatch({
        type: direction === "undo" ? "history/undoSucceeded" : "history/redoSucceeded",
        payload: { lastChangedAt: Date.now() },
      });
    } else {
      notifyReplayFailed(_KDB, direction);
    }
    emitHistoryChanged(_KDB);
    return didApply;
  }

  return {
    readHistoryState: readHistoryState,
    readWritebackRestoreFlag: readWritebackRestoreFlag,
    isHistoryLocked: isHistoryLocked,
    emitHistoryChanged: emitHistoryChanged,
    runReplay: runReplay,
  };
});
