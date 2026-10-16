define([
  "./applyTabsMoveHistoryReplay.js",
  "./applyTabsDeleteHistoryReplay.js",
  "./applyTabsRenameHistoryReplay.js"
], function (_applyMoveReplay, _applyDeleteReplay, _applyRenameReplay) {
  "use strict";

  function applyTabsHistoryReplay(_KDBArg, _targetValue, _step, _ctx) {
    try {
      var step = _step || {};
      if (step.key === "tabs_move") {
        return _applyMoveReplay.apply(_KDBArg, _targetValue, _step, _ctx);
      }
      if (step.key === "tabs_rename") {
        return _applyRenameReplay.apply(_KDBArg, _targetValue, _step, _ctx);
      }
      if (step.key === "tabs_delete" || step.key === "tabs_duplicate") {
        return _applyDeleteReplay.apply(_KDBArg, _targetValue, _step, _ctx);
      }
      return false;
    } catch (err) {
      console.error("[tabs.createTabsHistoryReplayHandler] failed", err);
      return false;
    }
  }

  function createTabsHistoryReplayHandler(_KDB) {
    void _KDB;
    return {
      apply: applyTabsHistoryReplay
    };
  }

  return createTabsHistoryReplayHandler;
});
