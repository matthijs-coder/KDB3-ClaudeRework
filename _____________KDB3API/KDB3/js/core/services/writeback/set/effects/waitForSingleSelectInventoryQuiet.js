define([], function () {
  "use strict";

  var QUIET_TIMEOUT_MS = 68000;
  var QUIET_INTERVAL_MS = 50;

  function readQuiet(_KDB, _signal) {
    var filterDockApi;
    var singleSelectApi;
    var filterDockState;
    var singleSelectState;
    var inventory;
    try {
      if (_signal && _signal.aborted) return { aborted: true };
      filterDockApi = _KDB && _KDB.api && _KDB.api.filterDock;
      singleSelectApi = _KDB && _KDB.api && _KDB.api.singleSelect;
      if (!filterDockApi || typeof filterDockApi.getState !== "function") return null;
      if (!singleSelectApi || typeof singleSelectApi.getState !== "function") return null;
      filterDockState = filterDockApi.getState();
      singleSelectState = singleSelectApi.getState();
      if (filterDockState == null || singleSelectState == null) return null;
      inventory = singleSelectState.inventory;
      if (inventory == null) return null;
      if (filterDockState.filtersReady === true &&
        inventory.freshness === "fresh" &&
        inventory.reconcileInFlight === false) {
        return { quiet: true };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async function waitForSingleSelectInventoryQuiet(_KDB, _signal) {
    var waitFor;
    var result;
    try {
      if (_signal && _signal.aborted) return { aborted: true };
      waitFor = _KDB && _KDB.utils && _KDB.utils.waitFor;
      if (typeof waitFor !== "function") {
        console.warn("[writebackSet.waitForSingleSelectInventoryQuiet] waitFor missing");
        return { quiet: false };
      }
      result = await waitFor(readQuiet.bind(null, _KDB, _signal), {
        interval: QUIET_INTERVAL_MS,
        timeoutMs: QUIET_TIMEOUT_MS
      });
      if (_signal && _signal.aborted) return { aborted: true };
      return result;
    } catch (error) {
      if (error && error.code === "WAITFOR_TIMEOUT") return { quiet: false };
      console.error("[writebackSet.waitForSingleSelectInventoryQuiet] failed", error);
      throw error;
    }
  }

  return waitForSingleSelectInventoryQuiet;
});
