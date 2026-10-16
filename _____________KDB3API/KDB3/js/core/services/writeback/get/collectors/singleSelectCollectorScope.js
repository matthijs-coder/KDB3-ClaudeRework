define([
  "../../schema/errorCodes.js",
  "../../../../../dashboard/tabs/state/selectors.js",
], function (_errorCodes, _tabsSelectors) {
  "use strict";

  function resolvePageContextTabIdx(_KDB, _instance, _liveTabTargets, _diagnostics, _identityDetails) {
    try {
      if (!_liveTabTargets || typeof _liveTabTargets !== "object") {
        _diagnostics.push(_errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_SINGLESELECT_SCOPE_TARGET_MISSING,
          "get",
          "page-context instance skipped because live scope targets are unavailable",
          _identityDetails
        ));
        return { ok: false };
      }

      const match = _tabsSelectors.readTabScopeMatch(_KDB, _instance.scopeId, _liveTabTargets);
      if (!match || match.status === "missing") {
        _diagnostics.push(_errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_SINGLESELECT_SCOPE_TARGET_MISSING,
          "get",
          "page-context scope cannot be mapped to one dashboard tab target",
          Object.assign({}, _identityDetails, { scopeId: _instance.scopeId })
        ));
        return { ok: false };
      }
      if (match.status === "ambiguous") {
        _diagnostics.push(_errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_SINGLESELECT_SCOPE_TARGET_AMBIGUOUS,
          "get",
          "page-context scope maps to multiple dashboard tab targets",
          Object.assign({}, _identityDetails, { scopeId: _instance.scopeId, candidates: match.candidates || [] })
        ));
        return { ok: false };
      }
      if (match.evidence !== "liveScope") {
        _diagnostics.push(_errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_SINGLESELECT_SCOPE_TARGET_MISSING,
          "get",
          "alias-only tab scope evidence is unsafe for page-context writeback collection",
          Object.assign({}, _identityDetails, { scopeId: _instance.scopeId, evidence: match.evidence || null })
        ));
        return { ok: false };
      }

      const tabIdx = match.tab && match.tab.tabIdx != null ? Number(match.tab.tabIdx) : NaN;
      if (!isFinite(tabIdx) || tabIdx < 0 || Math.floor(tabIdx) !== tabIdx) {
        _diagnostics.push(_errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_SINGLESELECT_SCOPE_TARGET_MISSING,
          "get",
          "liveScope match did not expose a valid numeric tabIdx",
          Object.assign({}, _identityDetails, { scopeId: _instance.scopeId, tabIdx: match.tab ? match.tab.tabIdx : null })
        ));
        return { ok: false };
      }
      const liveTarget = _liveTabTargets[String(tabIdx)];
      if (!liveTarget || liveTarget.visible !== true) {
        return { ok: false };
      }
      return { ok: true, tab: tabIdx };
    } catch (error) {
      console.error("[resolvePageContextTabIdx] failed", {
        scopeId: _instance && _instance.scopeId
      }, error);
      throw error;
    }
  }

  return resolvePageContextTabIdx;
});
