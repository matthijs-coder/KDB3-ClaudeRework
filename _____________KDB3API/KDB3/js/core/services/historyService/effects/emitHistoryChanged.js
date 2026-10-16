define([
  "../events/eventNames.js",
], function (_eventNames) {
  "use strict";

  function __controller(_KDB, _historyState) {
    const eventBus = _KDB && _KDB.events;
    if (!eventBus || typeof eventBus.emit !== "function") {
      return;
    }
    try {
      eventBus.emit(_eventNames.HISTORY_CHANGED, createPayload(_KDB, _historyState));
    } catch (error) {
      console.error("[historyService.emitHistoryChanged] event emit failed", error);
    }
  }

  // B5: tijdens een lopende replay of writeback-restore zijn undo/redo
  // geblokkeerd. De payload-capabilities moeten dat weerspiegelen, want de
  // view-sync prefereert de payload boven service-calls (resolveCapability).
  function isHistoryLocked(_KDB) {
    const runtime = _KDB && _KDB.runtime ? _KDB.runtime.history : null;
    if (!runtime) { return false; }
    const replayActive = !!(runtime.replay && runtime.replay.active === true);
    const restoreActive = !!(runtime.writebackRestore && runtime.writebackRestore.active === true);
    return replayActive || restoreActive;
  }

  function createPayload(_KDB, _historyState) {
    const state = _historyState || {};
    const stack = Array.isArray(state.stack) ? state.stack : [];
    const pointer = typeof state.pointer === "number" ? state.pointer : -1;
    const limit = typeof state.limit === "number" ? state.limit : 0;
    const locked = isHistoryLocked(_KDB);
    return {
      pointer: pointer,
      stackLength: stack.length,
      limit: limit,
      canUndo: !locked && pointer >= 0,
      canRedo: !locked && pointer < stack.length - 1,
    };
  }

  return __controller;
});
