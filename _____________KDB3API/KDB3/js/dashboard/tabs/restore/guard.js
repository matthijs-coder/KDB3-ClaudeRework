define(["../config.js", "../slots.js"], function (_config, _slots) {
  "use strict";

  const _codes = _config.parameterSetCodes;

  // Shared runId/readiness guard for all tabs parameterSet* handlers per
  // contracts/tabs-parameterSetRestore-contractdelta.md §4/§7. Mirrors the
  // header owner pattern: numeric runId, monotonic stale-guard stored in
  // _KDB.runtime.tabs.parameterSetRunId. Returns null when the run may
  // proceed, or a { ok: false, diagnostics } result otherwise.
  function guardParameterSetRun(_KDB, _payload, _options) {
    const payload = _payload || {};
    const options = _options || {};
    if (typeof payload.runId !== "number" || !isFinite(payload.runId)) {
      return cancelled("tabs parameterSet action requires a numeric runId");
    }
    const runtime = ensureRuntime(_KDB);
    if (typeof runtime.parameterSetRunId === "number" && payload.runId < runtime.parameterSetRunId) {
      return cancelled("stale parameterSet runId " + payload.runId + " superseded by " + runtime.parameterSetRunId);
    }
    runtime.parameterSetRunId = payload.runId;

    if (options.requireHydratedTabs === true && !hasHydratedDashboardTab(_KDB)) {
      return { ok: false, diagnostics: [{ code: _codes.NOT_READY, message: "tabs state has no hydrated dashboard tab identity yet" }] };
    }
    return null;
  }

  // Stale re-check after internal awaits (delta §4 rule 1).
  function isStale(_KDB, runId) {
    const runtime = ensureRuntime(_KDB);
    return typeof runtime.parameterSetRunId === "number" && runId < runtime.parameterSetRunId;
  }

  function cancelledResult() {
    return cancelled("tabs parameterSet run was cancelled or superseded");
  }

  // Delta §4 rule 2: settle in-flight startup/traverse promises before a
  // parameterSet-owned traverse, so the coalescing guard in dispatchTraverse
  // cannot reject with TABS_TRAVERSE_CONFLICT for writeback runs.
  async function waitForInflightTraversals(_KDB) {
    const runtime = ensureRuntime(_KDB);
    const pendingPromises = runtime.pendingPromises || {};
    const inflight = [pendingPromises.startup, pendingPromises.traverse].filter(Boolean);
    if (inflight.length === 0) { return; }
    await Promise.all(inflight.map(function (promise) {
      return Promise.resolve(promise).catch(function () { return false; });
    }));
  }

  function hasHydratedDashboardTab(_KDB) {
    const state = _KDB && _KDB.state ? _KDB.state.tabs : null;
    if (!state || !state.byIndex) { return false; }
    const order = Array.isArray(state.order) ? state.order : [];
    return order.some(function (index) {
      const tab = state.byIndex[String(index)];
      return _slots.isDashboardTab(tab) && !!tab.tabId;
    });
  }

  function ensureRuntime(_KDB) {
    _KDB.runtime.tabs = _KDB.runtime.tabs || {};
    return _KDB.runtime.tabs;
  }

  function cancelled(message) {
    return { ok: false, diagnostics: [{ code: _codes.CANCELLED, message: message }] };
  }

  return Object.freeze({
    guardParameterSetRun: guardParameterSetRun,
    isStale: isStale,
    cancelledResult: cancelledResult,
    waitForInflightTraversals: waitForInflightTraversals
  });
});
