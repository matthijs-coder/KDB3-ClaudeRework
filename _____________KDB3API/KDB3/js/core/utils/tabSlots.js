/*
 * Pure tab rules shared by tabs and the writeback service (writeback must not import tabs files). The tabs state
 * argument is any object with `order`, `byIndex` and optionally `limits` (the raw state or `api.tabs.getState()`).
 *
 *   MAX_USER_TABS                              default count of dashboard tabs (state.limits.maxUserTabs wins)
 *   isDashboardTab(tab, state)                 a tab with a role is a dashboard tab by role; one without counts when it is
 *                                              not the helper and its index is below maxUserTabs
 *   listDashboardSlots(state)                  dashboard-role tabs in state.order; the array position of a tab IS its
 *                                              writeback tabIdx
 *   matchTabScope(state, scopeId, liveTargets) maps a Cognos scope id to one dashboard tab: first by live scope ids
 *                                              (liveTargets { [tabIdx]: { scopeId } }), then by tabId/pageId alias.
 *                                              -> { status: "ok" | "ambiguous" | "missing", evidence: "liveScope" | "alias" | null,
 *                                                   scopeId, tab: { tabId, pageId, index, tabIdx, visible, name } | null,
 *                                                   candidates: [tab] }
 */
define(["./normalizeCognosScopeId.js"], function (_normalizeCognosScopeId) {
  "use strict";

  const MAX_USER_TABS = 5;

  function isDashboardTab(tab, state) {
    if (!tab) { return false; }
    if (tab.role) { return tab.role === "dashboard"; }
    const limits = state && state.limits;
    const maxUserTabs = limits && typeof limits.maxUserTabs === "number" ? limits.maxUserTabs : MAX_USER_TABS;
    return tab.isHelper !== true && tab.index < maxUserTabs;
  }

  function listDashboardSlots(_state) {
    const state = _state || {};
    const order = Array.isArray(state.order) ? state.order : [];
    const byIndex = state.byIndex || {};
    return order
      .map(function (physicalIndex) { return byIndex[String(physicalIndex)]; })
      .filter(function (tab) { return isDashboardTab(tab, state); });
  }

  function matchTabScope(_tabsState, _scopeId, _liveTabTargets) {
    const requestedScopeId = _scopeId == null ? "" : String(_scopeId);
    const normalizedScopeId = _normalizeCognosScopeId(requestedScopeId);
    const missing = { status: "missing", evidence: null, scopeId: requestedScopeId, tab: null, candidates: [] };
    if (!normalizedScopeId) { return missing; }

    const candidates = indexCandidatesByTabIdx(_tabsState);
    const stages = [
      { evidence: "liveScope", matches: readLiveScopeMatches(candidates, _liveTabTargets, normalizedScopeId) },
      { evidence: "alias", matches: readAliasMatches(candidates, normalizedScopeId) }
    ];
    for (let position = 0; position < stages.length; position += 1) {
      const matches = stages[position].matches;
      if (matches.length === 1) {
        return { status: "ok", evidence: stages[position].evidence, scopeId: requestedScopeId, tab: flatCandidate(matches[0]), candidates: [] };
      }
      if (matches.length > 1) {
        return {
          status: "ambiguous",
          evidence: stages[position].evidence,
          scopeId: requestedScopeId,
          tab: null,
          candidates: matches.map(flatCandidate)
        };
      }
    }
    return missing;
  }

  function indexCandidatesByTabIdx(tabsState) {
    const indexed = {};
    listDashboardSlots(tabsState || {}).forEach(function (tab, tabIdx) {
      indexed[String(tabIdx)] = {
        tabId: tab && tab.tabId ? tab.tabId : null,
        pageId: tab && tab.pageId ? tab.pageId : null,
        index: tab && typeof tab.index === "number" ? tab.index : null,
        tabIdx: tabIdx,
        visible: !!(tab && tab.visible === true),
        name: tab && tab.name ? tab.name : null
      };
    });
    return indexed;
  }

  function readLiveScopeMatches(candidates, liveTabTargets, normalizedScopeId) {
    const map = liveTabTargets && typeof liveTabTargets === "object" ? liveTabTargets : {};
    return Object.keys(map).sort(compareNumeric).filter(function (tabIdx) {
      return _normalizeCognosScopeId((map[tabIdx] || {}).scopeId) === normalizedScopeId && !!candidates[tabIdx];
    }).map(function (tabIdx) { return candidates[tabIdx]; });
  }

  function readAliasMatches(candidates, normalizedScopeId) {
    return Object.keys(candidates).sort(compareNumeric).map(function (tabIdx) { return candidates[tabIdx]; }).filter(function (candidate) {
      return _normalizeCognosScopeId(candidate.tabId) === normalizedScopeId || _normalizeCognosScopeId(candidate.pageId) === normalizedScopeId;
    });
  }

  function flatCandidate(tab) {
    return { tabId: tab.tabId, pageId: tab.pageId, index: tab.index, tabIdx: tab.tabIdx, visible: tab.visible, name: tab.name };
  }

  function compareNumeric(left, right) {
    return Number(left) - Number(right);
  }

  return {
    MAX_USER_TABS: MAX_USER_TABS,
    isDashboardTab: isDashboardTab,
    listDashboardSlots: listDashboardSlots,
    matchTabScope: matchTabScope
  };
});
