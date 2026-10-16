define([], function () {
  "use strict";

  // Bounded extra ensure dispatches while leftover shells keep the tab unrouted.
  // Cap 2 extra (3 total including the first). Hard failure is not retried.
  const TYPE = "widgetBase/ensureTabWidgetsRouted";
  const EXTRA_ENSURE_CAP = 2;

  async function reensureTabWidgetsRouted(_api, _run, _tabId) {
    try {
      let result = await dispatchEnsure(_api, _run, _tabId);
      let extraEnsures = 0;
      while (shouldReensure(result) && extraEnsures < EXTRA_ENSURE_CAP) {
        extraEnsures += 1;
        result = await dispatchEnsure(_api, _run, _tabId);
      }
      return result;
    } catch (error) {
      if (error && error.writebackSetCancelled === true) {
        throw error;
      }
      console.error("[writebackSet.reensureTabWidgetsRouted] failed", { tabId: _tabId }, error);
      throw error;
    }
  }

  async function dispatchEnsure(_api, _run, _tabId) {
    try {
      const result = await _api.dispatch({
        type: TYPE,
        payload: { tabId: _tabId, reason: "writebackSet", runId: _run.runId },
      });
      _run.assertStillCurrent();
      return result;
    } catch (error) {
      if (error && error.writebackSetCancelled === true) {
        throw error;
      }
      console.error("[writebackSet.reensureTabWidgetsRouted] dispatch failed", { tabId: _tabId }, error);
      throw error;
    }
  }

  function shouldReensure(result) {
    const parsed = Number(result && result.missingShells);
    return !!(result && result.ok === true
      && (Number.isFinite(parsed) ? parsed : 0) > 0
      && result.alreadyRouted !== true);
  }

  return reensureTabWidgetsRouted;
});
