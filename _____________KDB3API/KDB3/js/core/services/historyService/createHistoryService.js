define([
  "./state/createHistoryReducer.js",
  "./state/normalizeHistoryStep.js",
  "./state/areSerializableEqual.js",
  "./state/cloneSerializable.js",
  "./effects/emitHistoryChanged.js",
  "./replay/applyHistoryStep.js",
], function (_createHistoryReducer, _normalizeHistoryStep, _areSerializableEqual, _cloneSerializable, _emitHistoryChanged, _applyHistoryStep) {
  "use strict";

  function bindReplayHandlers(_KDB, context, replayHandlers) {
    if (context.isDisposed) { return false; }
    const source = replayHandlers && typeof replayHandlers === "object" ? replayHandlers : {};
    context.replayDeps.replayHandlers = Object.assign({}, source);
    return true;
  }
  function installBindReplayAdapter(_KDB, context) {
    const historyRuntime = _KDB.runtime.history;
    historyRuntime.adapters = historyRuntime.adapters || {};
    historyRuntime.adapters.bindReplayHandlers = function (_replayHandlers) { return bindReplayHandlers(_KDB, context, _replayHandlers); };
  }
  function createHistoryService(_deps) {
    const deps = _deps || {};
    const injected = deps.replayHandlers || (deps.options && deps.options.replayHandlers);
    const initialHandlers = injected && typeof injected === "object" ? Object.assign({}, injected) : {};
    const context = { _KDB: deps._KDB, replayDeps: { replayHandlers: initialHandlers }, isDisposed: false };
    installBindReplayAdapter(context._KDB, context);
    dispatchInternal(context._KDB, { type: "history/initialize" });
    _emitHistoryChanged(context._KDB, readHistoryState(context._KDB));
    function pushCommittedStep(_step) {
      if (context.isDisposed) { warnDisposed("pushCommittedStep"); return false; }
      try {
        // Writeback restore guard (historyService-writebackRestore-contractdelta.md §3):
        // internal restore steps must not become undo/redo entries, even when an
        // owner forgets to honor skipHistory.
        if (readWritebackRestoreFlag(context._KDB).active) { return false; }
        const step = _normalizeHistoryStep(_step);
        if (!step || _areSerializableEqual(step.old, step.new)) { return false; }
        dispatchInternal(context._KDB, { type: "history/commitStep", payload: { step: step, lastChangedAt: Date.now() } });
        _emitHistoryChanged(context._KDB, readHistoryState(context._KDB));
        return true;
      } catch (error) { recordError(context._KDB, "pushCommittedStep", error); return false; }
    }
    function beginWritebackRestore(_options) {
      if (context.isDisposed) { warnDisposed("beginWritebackRestore"); return false; }
      try {
        const options = _options || {};
        if (typeof options.runId !== "number") {
          console.warn("[historyService.beginWritebackRestore] rejected: numeric runId is required");
          return false;
        }
        const flag = readWritebackRestoreFlag(context._KDB);
        if (flag.active) {
          // Exactly one begin/finish per restore runId (delta §6).
          console.warn("[historyService.beginWritebackRestore] rejected: restore already active", { activeRunId: flag.runId, requestedRunId: options.runId });
          return false;
        }
        writeWritebackRestoreFlag(context._KDB, { active: true, runId: options.runId, source: options.source || null, status: options.status || null });
        // B5: undo/redo zijn tijdens de restore geblokkeerd; de emit laat de
        // history-knoppen meteen op disabled syncen (finish emit bestond al).
        _emitHistoryChanged(context._KDB, readHistoryState(context._KDB));
        return true;
      } catch (error) { recordError(context._KDB, "beginWritebackRestore", error); return false; }
    }
    function finishWritebackRestore(_options) {
      if (context.isDisposed) { warnDisposed("finishWritebackRestore"); return false; }
      try {
        const options = _options || {};
        const flag = readWritebackRestoreFlag(context._KDB);
        if (!flag.active || flag.runId !== options.runId) {
          // Stale finish requests are ignored (delta §5).
          console.warn("[historyService.finishWritebackRestore] ignored: runId does not match active restore", { activeRunId: flag.active ? flag.runId : null, requestedRunId: options.runId });
          return false;
        }
        // Restored state becomes the new zero point for every outcome: after a
        // (partial) restore, undo into pre-restore steps would replay onto an
        // indeterminate dashboard, which the delta forbids.
        dispatchInternal(context._KDB, { type: "history/writebackBaselineApplied", payload: { lastChangedAt: Date.now() } });
        writeWritebackRestoreFlag(context._KDB, { active: false, runId: null, source: null, status: null, lastFinish: { runId: options.runId, outcome: options.outcome || null, baseline: options.baseline || null, finishedAt: Date.now() } });
        _emitHistoryChanged(context._KDB, readHistoryState(context._KDB));
        return true;
      } catch (error) { recordError(context._KDB, "finishWritebackRestore", error); return false; }
    }
    function undo() {
      if (context.isDisposed) { return rejectDisposed(); }
      try {
        if (!canUndo()) { return Promise.resolve(false); }
        const state = readHistoryState(context._KDB);
        return runReplay(context, "undo", state.stack[state.pointer]);
      } catch (error) { recordError(context._KDB, "undo", error); return Promise.reject(error); }
    }
    function redo() {
      if (context.isDisposed) { return rejectDisposed(); }
      try {
        if (!canRedo()) { return Promise.resolve(false); }
        const state = readHistoryState(context._KDB);
        return runReplay(context, "redo", state.stack[state.pointer + 1]);
      } catch (error) { recordError(context._KDB, "redo", error); return Promise.reject(error); }
    }
    function canUndo() {
      if (context.isDisposed) { return false; }
      try {
        // B5: geweigerd tijdens een lopende replay (replay-lock) en tijdens een
        // writeback-restore (finish leegt de stack; replay op een half hersteld
        // dashboard is verboden). undo()/redo() lopen via deze checks.
        if (isHistoryLocked(context._KDB)) { return false; }
        return canUndoState(readHistoryState(context._KDB));
      } catch (error) { recordError(context._KDB, "canUndo", error); return false; }
    }
    function canRedo() {
      if (context.isDisposed) { return false; }
      try {
        if (isHistoryLocked(context._KDB)) { return false; }
        return canRedoState(readHistoryState(context._KDB));
      } catch (error) { recordError(context._KDB, "canRedo", error); return false; }
    }
    function getSnapshot() {
      if (context.isDisposed) { return undefined; }
      try {
        return createSnapshot(readHistoryState(context._KDB));
      } catch (error) { recordError(context._KDB, "getSnapshot", error); return undefined; }
    }
    function destroy() {
      if (context.isDisposed) { return; }
      try {
        context.isDisposed = true;
        dispatchInternal(context._KDB, { type: "history/destroy" });
        clearRuntime(context._KDB);
      } catch (error) { logPublicMethodError("destroy", error); }
    }
    return { pushCommittedStep: pushCommittedStep, undo: undo, redo: redo, canUndo: canUndo, canRedo: canRedo, getSnapshot: getSnapshot, beginWritebackRestore: beginWritebackRestore, finishWritebackRestore: finishWritebackRestore, destroy: destroy };
  }
  function readWritebackRestoreFlag(_KDB) {
    const runtime = _KDB && _KDB.runtime ? _KDB.runtime.history : null;
    const flag = runtime && runtime.writebackRestore;
    return flag && typeof flag === "object" ? flag : { active: false, runId: null };
  }
  function writeWritebackRestoreFlag(_KDB, flag) {
    _KDB.runtime.history = _KDB.runtime.history || {};
    _KDB.runtime.history.writebackRestore = flag;
  }
  // Replay-lock (remediation B5): één replay tegelijk, onder _KDB.runtime.history.replay.
  function ensureReplayFlag(_KDB) {
    _KDB.runtime.history = _KDB.runtime.history || {};
    const runtime = _KDB.runtime.history;
    if (!runtime.replay || typeof runtime.replay !== "object") {
      runtime.replay = { active: false, direction: null };
    }
    return runtime.replay;
  }
  function isHistoryLocked(_KDB) {
    return ensureReplayFlag(_KDB).active === true || readWritebackRestoreFlag(_KDB).active === true;
  }
  async function runReplay(context, direction, step) {
    // B5: lock zetten vóór het async apply-venster; een dubbelklik op undo/redo
    // wordt dan via canUndo/canRedo geweigerd en de pointer schuift precies één
    // keer. De emit bij de start disablet de knoppen; de emit aan het einde
    // synct ze weer (ook na een gefaalde replay).
    const replayFlag = ensureReplayFlag(context._KDB);
    replayFlag.active = true;
    replayFlag.direction = direction;
    _emitHistoryChanged(context._KDB, readHistoryState(context._KDB));
    let didApply = false;
    let didFail = false;
    try {
      didApply = await _applyHistoryStep(context._KDB, direction, step, context.replayDeps);
    } catch (error) {
      didFail = true;
      recordError(context._KDB, direction, error);
    } finally {
      replayFlag.active = false;
      replayFlag.direction = null;
    }
    if (context.isDisposed) { return false; }
    if (!didFail && didApply) {
      dispatchInternal(context._KDB, { type: direction === "undo" ? "history/undoSucceeded" : "history/redoSucceeded", payload: { lastChangedAt: Date.now() } });
    }
    if (didApply !== true) {
      // Ook didApply === false melden (reviewbevinding 4): applyHistoryStep
      // vangt handler-fouten zelf en returnt dan false — zonder deze melding
      // ziet de user "niets gebeurt" zonder uitleg.
      notifyReplayFailed(context._KDB, direction);
    }
    _emitHistoryChanged(context._KDB, readHistoryState(context._KDB));
    return !didFail && didApply;
  }
  // B2-kanaal (remediation): een gefaalde of geweigerde undo/redo-replay was
  // voorheen alleen in de console zichtbaar.
  function notifyReplayFailed(_KDB, direction) {
    const messageService = _KDB && _KDB.services && _KDB.services.message;
    if (!messageService || typeof messageService.notify !== "function") { return; }
    try {
      messageService.notify({
        severity: "error",
        message: direction === "undo"
          ? "Rückgängig machen ist fehlgeschlagen; die Änderung wurde nicht zurückgenommen."
          : "Wiederholen ist fehlgeschlagen; die Änderung wurde nicht erneut angewendet."
      });
    } catch (messageError) {
      console.warn("[historyService.runReplay] failure message failed", messageError);
    }
  }
  function dispatchInternal(_KDB, _action) {
    _KDB.state.history = _createHistoryReducer(_KDB.state.history, _action);
  }
  function readHistoryState(_KDB) {
    return _KDB && _KDB.state ? _KDB.state.history : undefined;
  }
  function createSnapshot(state) {
    if (!state) { return undefined; }
    return _cloneSerializable({ stack: state.stack, pointer: state.pointer, limit: state.limit });
  }
  function canUndoState(state) {
    return !!state && state.pointer >= 0;
  }
  function canRedoState(state) {
    return !!state && state.pointer < state.stack.length - 1;
  }
  function clearRuntime(_KDB) {
    const runtime = _KDB.runtime.history || {};
    clearBucket(runtime.abortControllers, "abort");
    clearBucket(runtime.subscriptions, "call");
    clearBucket(runtime.listeners, "call");
    clearTimers(runtime.timers);
    _KDB.runtime.history = { subscriptions: {}, listeners: {}, abortControllers: {}, timers: {}, pendingPromises: {}, adapters: {} };
  }
  function clearBucket(bucket, mode) {
    const keys = Object.keys(bucket || {});
    for (let index = 0; index < keys.length; index += 1) {
      const item = bucket[keys[index]];
      if (mode === "abort" && item && typeof item.abort === "function") { item.abort(); }
      if (mode === "call" && typeof item === "function") { item(); }
    }
  }
  function clearTimers(bucket) {
    const keys = Object.keys(bucket || {});
    for (let index = 0; index < keys.length; index += 1) {
      clearTimeout(bucket[keys[index]]);
      clearInterval(bucket[keys[index]]);
    }
  }
  function warnDisposed(methodName) {
    console.warn("[historyService." + methodName + "] called after destroy");
  }
  function rejectDisposed() {
    return Promise.reject(new Error("historyService disposed"));
  }
  function logPublicMethodError(methodName, error) {
    console.error("[historyService." + methodName + "] public method failed", error);
  }
  function recordError(_KDB, methodName, error) {
    logPublicMethodError(methodName, error);
    dispatchInternal(_KDB, { type: "history/error", payload: { errorCode: "historyServicePublicMethodFailed", errorMessage: error && error.message } });
  }
  return createHistoryService;
});
