define([
  "../config/actionTypes.js",
  "./guardParameterSetRun.js",
  "../slots.js",
  "../effects/applyParameterSetTabsToCognos.js",
  "./readResolvedFilterScopeTargets.js",
], function (_actionTypes, _guard, _slots, _applyToCognos, _readResolvedFilterScopeTargets) {
  "use strict";

  // tabs/parameterSetResetRequested per
  // contracts/tabs-parameterSetRestore-contractdelta.md §3/§4.1 (newDashboard
  // branch). Ignores saved v3 tabs: resets dashboard slots to owner defaults —
  // baseline names captured at first syncFromDom (fallback "Tab N"), only the
  // first dashboard slot visible. Returns the same tabTargets shape as restore.
  async function parameterSetReset(_ctx, _payload) {
    const payload = _payload || {};
    const guardResult = _guard.guardParameterSetRun(_ctx._KDB, payload, { requireHydratedTabs: true });
    if (guardResult) { return Object.assign({ tabTargets: null }, guardResult); }

    // Delta §4 rule 2 / T2-5a: settle in-flight startup/traverse work first so
    // reset cannot commit defaults while startup clicks are still running.
    await _guard.waitForInflightTraversals(_ctx._KDB);
    if (_guard.isStale(_ctx._KDB, payload.runId)) { return Object.assign({ tabTargets: null }, _guard.cancelledResult()); }

    const runtime = _ctx._KDB.runtime && _ctx._KDB.runtime.tabs;
    const baselineNamesByIndex = runtime && runtime.baselineNamesByIndex || {};
    const slots = _slots.listDashboardSlots(_ctx.getRawState());
    const entries = slots.map(function (tab, tabIdx) {
      return {
        physicalIndex: tab.index,
        tabIdx: tabIdx,
        name: baselineNamesByIndex[String(tab.index)] || "Tab " + (tab.index + 1),
        visible: tabIdx === 0
      };
    });

    _ctx.dispatch({ type: _actionTypes.PARAMETER_SET_APPLY, payload: { entries: entries, source: payload.source || "writebackSet" } });
    const diagnostics = _applyToCognos(_ctx, entries);

    const resolved = _readResolvedFilterScopeTargets(_ctx, { source: payload.source || "writebackSet" });
    if (resolved.ok !== true) {
      return {
        ok: false,
        tabTargets: null,
        diagnostics: diagnostics.concat(resolved.diagnostics)
      };
    }
    return {
      ok: true,
      tabTargets: resolved.tabTargets,
      diagnostics: diagnostics.concat(resolved.diagnostics)
    };
  }

  return parameterSetReset;
});
