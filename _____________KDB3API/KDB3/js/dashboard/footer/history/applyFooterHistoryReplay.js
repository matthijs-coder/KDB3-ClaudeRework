define(["../state/selectors"], function (_selectors) {
  "use strict";

  var REPLAY_OPTIONS = { skipHistory: true, isHistoryReplay: true, forceApply: true };

  function buildReplayAction(_value) {
    if (_value === "active") {
      return { type: "footer/show", payload: { source: "api" }, options: REPLAY_OPTIONS };
    }
    if (_value === "removed") {
      return { type: "footer/hide", payload: { source: "api" }, options: REPLAY_OPTIONS };
    }
    return null;
  }

  function applyFooterHistoryReplay(_KDB, _payload) {
    var payload = _payload || {};
    var target = typeof payload.target === "string" ? payload.target.trim() : "";
    var value = payload.value;
    var step = payload.step || null;
    if (target !== "footer.status" || typeof value !== "string") {
      return false;
    }
    if (value === "idle") {
      return false;
    }
    if (step && step.old && step.new && step.old.target !== step.new.target) {
      return false;
    }
    if (step && step.old && step.old.target && step.old.target !== target) {
      return false;
    }
    if (step && step.new && step.new.target && step.new.target !== target) {
      return false;
    }
    if (value === "active" && _selectors.readHeaderStatus(_KDB) !== "active") {
      console.warn("[footer.historyReplay] cannot activate footer while header is not active");
      return false;
    }
    var replayAction = buildReplayAction(value);
    if (!replayAction) {
      return false;
    }
    var api = _KDB.api && _KDB.api.footer;
    if (!api || typeof api.dispatch !== "function") {
      return false;
    }
    return api.dispatch(replayAction) === true;
  }

  return applyFooterHistoryReplay;
});
