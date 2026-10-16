define([
  "./resolveHistoryHandler.js",
], function (_resolveHistoryHandler) {
  "use strict";

  function __controller(_KDB, _direction, _step, _deps) {
    return applyResolvedStep(_KDB, _direction, _step, _deps);
  }

  async function applyResolvedStep(_KDB, _direction, _step, _deps) {
    const step = _step || {};
    const handler = _resolveHistoryHandler(step.key, _deps);
    if (!handler || typeof handler.apply !== "function") {
      console.warn("[historyService.applyHistoryStep] handler missing", step.key);
      return false;
    }
    try {
      const targetValue = _direction === "undo" ? step.old : step.new;
      const result = await handler.apply(_KDB, targetValue, step, { direction: _direction });
      return result === true;
    } catch (error) {
      console.error("[historyService.applyHistoryStep] replay failed", error);
      return false;
    }
  }

  return __controller;
});
