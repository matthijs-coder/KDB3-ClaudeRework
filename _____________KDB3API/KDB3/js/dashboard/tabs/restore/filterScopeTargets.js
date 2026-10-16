define([
  "../config.js",
  "../slots.js",
  "../state/buildTabTargets.js"
], function (_config, _slots, _buildTabTargets) {
  "use strict";

  const _codes = _config.filterScopeCodes;

  // tabs/resolveFilterScopeTargets: live tabIdx -> { tabId, pageId, scopeId?, visible } lookup for filter owners.
  function resolveFilterScopeTargets(_ctx, _payload) {
    const source = readSource(_payload);
    try {
      const slots = _slots.listDashboardSlots(_ctx.getRawState());
      const hydrated = slots.some(function (slot) { return !!slot && typeof slot.index === "number" && !!slot.tabId; });
      if (!hydrated) {
        const readinessDetail = slots.length === 0 ? "no dashboard slots discovered" : "no dashboard slot has a live tabId";
        const message = "Filter scope targets are not ready for source " + source + "; " + readinessDetail;
        return Promise.resolve({ ok: false, tabTargets: null, diagnostics: [{ code: _codes.NOT_READY, message: message }] });
      }
      const result = readResolvedFilterScopeTargets(_ctx, source);
      return Promise.resolve({ ok: true, tabTargets: result.tabTargets, diagnostics: result.diagnostics.slice() });
    } catch (err) {
      console.error("[tabs.resolveFilterScopeTargets] action failed", { source: source }, err);
      const reason = err && err.message ? err.message : String(err || "Unknown filter scope target error.");
      const message = "Failed to resolve filter scope targets for source " + source + ": " + reason;
      return Promise.resolve({ ok: false, tabTargets: null, diagnostics: [{ code: _codes.RESOLVE_FAILED, message: message }] });
    }
  }

  function disposedResult(_payload) {
    const message = "Filter scope targets are unavailable after tabs disposal for source " + readSource(_payload);
    return Promise.resolve({ ok: false, tabTargets: null, diagnostics: [{ code: _codes.NOT_READY, message: message }] });
  }

  // Also used by parameterSet restore/reset for their tabTargets result.
  function readResolvedFilterScopeTargets(_ctx, source) {
    const tabTargets = _buildTabTargets(_ctx.getRawState(), listTabScopeIds(_ctx));
    return { ok: true, tabTargets: tabTargets, diagnostics: readMissingScopeDiagnostics(tabTargets, source) };
  }

  function readMissingScopeDiagnostics(tabTargets, source) {
    return Object.keys(tabTargets || {})
      .sort(function (left, right) { return Number(left) - Number(right); })
      .filter(function (tabIdx) {
        const target = tabTargets[tabIdx] || {};
        return typeof target.scopeId !== "string" || target.scopeId === "";
      })
      .map(function (tabIdx) {
        return {
          code: _codes.SCOPE_MISSING,
          tabIdx: Number(tabIdx),
          message: "No live layout scope id resolved for dashboard tabIdx " + tabIdx + " from source " + source
        };
      });
  }

  // scopeId is the Cognos layout container id of the tab (getTabsContainers()[physicalIndex].id),
  // keyed by tabIdx and never persisted. scopeId is optional in the tabTargets contract,
  // so a failed layout read degrades to an empty map.
  function listTabScopeIds(_ctx) {
    const scopeIdsByTabIdx = {};
    let layoutItems = [];
    try {
      layoutItems = normalizeList(_ctx.adapter.getTabsContainers());
    } catch (err) {
      console.warn("[tabs.listTabScopeIds] layout read failed; scopeId omitted", err);
      return scopeIdsByTabIdx;
    }
    _slots.listDashboardSlots(_ctx.getRawState()).forEach(function (tab, tabIdx) {
      const layoutItem = layoutItems[tab.index];
      const scopeId = layoutItem && layoutItem.id ? String(layoutItem.id) : null;
      if (scopeId) { scopeIdsByTabIdx[String(tabIdx)] = scopeId; }
    });
    return scopeIdsByTabIdx;
  }

  function normalizeList(value) {
    if (!value) { return []; }
    if (Array.isArray(value)) { return value; }
    if (typeof value.length === "number") { return Array.prototype.slice.call(value); }
    return [value];
  }

  function readSource(payload) {
    return payload && payload.source != null ? String(payload.source) : "unknown";
  }

  return {
    resolveFilterScopeTargets: resolveFilterScopeTargets,
    disposedResult: disposedResult,
    readResolvedFilterScopeTargets: readResolvedFilterScopeTargets
  };
});
