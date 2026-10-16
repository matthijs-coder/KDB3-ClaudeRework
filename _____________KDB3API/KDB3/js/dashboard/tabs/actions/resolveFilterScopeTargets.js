define([
  "../config/filterScopeCodes.js",
  "../slots.js",
  "./readResolvedFilterScopeTargets.js",
], function (_codes, _slots, _readResolvedFilterScopeTargets) {
  "use strict";

  function resolveFilterScopeTargets(_ctx, _payload) {
    const payload = _payload || {};
    let source = "unknown";
    try {
      source = payload.source != null ? String(payload.source) : "unknown";
      const slots = _slots.listDashboardSlots(_ctx.getRawState());
      let hydratedSlotCount = 0;
      let tabIdx = 0;
      while (tabIdx < slots.length) {
        const slot = slots[tabIdx];
        if (slot && typeof slot.index === "number" && slot.tabId) {
          hydratedSlotCount += 1;
        }
        tabIdx += 1;
      }
      if (hydratedSlotCount === 0) {
        const readinessDetail = slots.length === 0
          ? "no dashboard slots discovered"
          : "no dashboard slot has a live tabId";
        return Promise.resolve({
          ok: false,
          tabTargets: null,
          diagnostics: [{
            code: _codes.NOT_READY,
            message: "Filter scope targets are not ready for source " + source + "; " + readinessDetail
          }]
        });
      }

      const result = _readResolvedFilterScopeTargets(_ctx, { source: source });
      if (result.ok !== true) {
        return Promise.resolve({
          ok: false,
          tabTargets: null,
          diagnostics: result.diagnostics.slice()
        });
      }
      return Promise.resolve({
        ok: true,
        tabTargets: result.tabTargets,
        diagnostics: result.diagnostics.slice()
      });
    } catch (err) {
      console.error("[tabs.resolveFilterScopeTargets] action failed", { source: source }, err);
      return Promise.resolve({
        ok: false,
        tabTargets: null,
        diagnostics: [{
          code: _codes.RESOLVE_FAILED,
          message: "Failed to resolve filter scope targets for source " + source + ": " +
            (err && err.message ? err.message : String(err || "Unknown filter scope target error."))
        }]
      });
    }
  }

  function disposedFilterScopeTargetsResult(_payload) {
    const payload = _payload || {};
    let source = "unknown";
    try {
      source = payload.source != null ? String(payload.source) : "unknown";
      return Promise.resolve({
        ok: false,
        tabTargets: null,
        diagnostics: [{
          code: _codes.NOT_READY,
          message: "Filter scope targets are unavailable after tabs disposal for source " + source
        }]
      });
    } catch (err) {
      console.error("[tabs.disposedFilterScopeTargetsResult] result conversion failed", { source: source }, err);
      return Promise.resolve({
        ok: false,
        tabTargets: null,
        diagnostics: [{ code: _codes.NOT_READY, message: "Filter scope targets are unavailable after tabs disposal" }]
      });
    }
  }

  resolveFilterScopeTargets.disposedResult = disposedFilterScopeTargetsResult;
  return resolveFilterScopeTargets;
});
