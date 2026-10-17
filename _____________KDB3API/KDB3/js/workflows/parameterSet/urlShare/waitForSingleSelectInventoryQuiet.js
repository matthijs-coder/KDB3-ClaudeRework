define(["../../../core/utils/kit/async.js"], function (_async) {
  "use strict";

  var QUIET_TIMEOUT_MS = 68000;
  var QUIET_INTERVAL_MS = 50;

  function readQuiet(_KDB, _signal) {
    var filterDockApi;
    var singleSelectApi;
    var filterDockState;
    var singleSelectState;
    var inventory;
    if (_signal && _signal.aborted) return { aborted: true };
    filterDockApi = _KDB && _KDB.api && _KDB.api.filterDock;
    singleSelectApi = _KDB && _KDB.api && _KDB.api.singleSelect;
    if (!filterDockApi) return null;
    if (!singleSelectApi) return null;
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
  }

  // Resolves { quiet: true }, { quiet: false } on timeout, or { aborted: true }.
  async function waitForSingleSelectInventoryQuiet(_KDB, _signal) {
    var outcome = await _async.pollUntil({
      check: readQuiet.bind(null, _KDB, _signal),
      intervalMs: QUIET_INTERVAL_MS,
      timeoutMs: QUIET_TIMEOUT_MS,
      signal: _signal
    });
    if ((_signal && _signal.aborted) || outcome.reason === "aborted") return { aborted: true };
    return outcome.ok ? outcome.value : { quiet: false };
  }

  return waitForSingleSelectInventoryQuiet;
});
