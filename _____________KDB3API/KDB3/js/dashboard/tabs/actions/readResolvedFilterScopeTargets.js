define([
  "../config/filterScopeCodes.js",
  "../state/buildTabTargets.js",
  "../effects/listTabScopeIds.js"
], function (_codes, _buildTabTargets, _listTabScopeIds) {
  "use strict";

  function readResolvedFilterScopeTargets(_ctx, _payload) {
    const source = readSource(_payload);
    try {
      const tabTargets = _buildTabTargets(_ctx.getRawState(), _listTabScopeIds(_ctx));
      const diagnostics = readMissingScopeDiagnostics(tabTargets, source);
      return { ok: true, tabTargets: tabTargets, diagnostics: diagnostics };
    } catch (err) {
      console.error("[tabs.readResolvedFilterScopeTargets] live scope target read failed", { source: source }, err);
      return {
        ok: false,
        tabTargets: null,
        diagnostics: [{
          code: _codes.RESOLVE_FAILED,
          message: "Failed to resolve filter scope targets for source " + source + ": " + readErrorMessage(err)
        }]
      };
    }
  }

  function readMissingScopeDiagnostics(tabTargets, source) {
    const diagnostics = [];
    const tabIdxKeys = Object.keys(tabTargets || {}).sort(sortTabIdxKeys);
    tabIdxKeys.forEach(function (tabIdx) {
      const target = tabTargets[tabIdx] || {};
      if (typeof target.scopeId === "string" && target.scopeId !== "") { return; }
      diagnostics.push({
        code: _codes.SCOPE_MISSING,
        tabIdx: Number(tabIdx),
        message: "No live layout scope id resolved for dashboard tabIdx " + tabIdx + " from source " + source
      });
    });
    return diagnostics;
  }

  function readSource(payload) {
    return payload && payload.source != null ? String(payload.source) : "unknown";
  }

  function readErrorMessage(err) {
    return err && err.message ? err.message : String(err || "Unknown filter scope target error.");
  }

  function sortTabIdxKeys(left, right) {
    return Number(left) - Number(right);
  }

  return readResolvedFilterScopeTargets;
});
