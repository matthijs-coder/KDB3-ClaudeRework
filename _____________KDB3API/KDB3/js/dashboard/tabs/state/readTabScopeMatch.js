define(["../slots.js", "../../../core/utils/normalizeCognosScopeId.js"], function (_slots, _normalizeCognosScopeId) {
  "use strict";

  function readTabScopeMatch(_state, _scopeId, _liveTabTargets) {
    const requestedScopeId = _scopeId == null ? "" : String(_scopeId);
    const normalizedScopeId = _normalizeCognosScopeId(requestedScopeId);
    if (!normalizedScopeId) {
      return { status: "missing", evidence: null, scopeId: requestedScopeId, tab: null, candidates: [] };
    }

    const candidatesByTabIdx = indexCandidatesByTabIdx(_state);
    const liveScopeMatches = readLiveScopeMatches(candidatesByTabIdx, _liveTabTargets, normalizedScopeId);
    if (liveScopeMatches.length === 1) {
      return asOk("liveScope", requestedScopeId, liveScopeMatches[0]);
    }
    if (liveScopeMatches.length > 1) {
      return asAmbiguous("liveScope", requestedScopeId, liveScopeMatches);
    }

    const aliasMatches = readAliasMatches(candidatesByTabIdx, normalizedScopeId);
    if (aliasMatches.length === 1) {
      return asOk("alias", requestedScopeId, aliasMatches[0]);
    }
    if (aliasMatches.length > 1) {
      return asAmbiguous("alias", requestedScopeId, aliasMatches);
    }

    return { status: "missing", evidence: null, scopeId: requestedScopeId, tab: null, candidates: [] };
  }

  function indexCandidatesByTabIdx(state) {
    const indexed = {};
    _slots.listDashboardSlots(state || {}).forEach(function (tab, tabIdx) {
      indexed[String(tabIdx)] = cloneCandidate(tab, tabIdx);
    });
    return indexed;
  }

  function readLiveScopeMatches(candidatesByTabIdx, liveTabTargets, normalizedScopeId) {
    const map = liveTabTargets && typeof liveTabTargets === "object" ? liveTabTargets : {};
    const matches = [];
    Object.keys(map).sort(sortNumericKeys).forEach(function (tabIdx) {
      const target = map[tabIdx] || {};
      if (_normalizeCognosScopeId(target.scopeId) !== normalizedScopeId) { return; }
      if (candidatesByTabIdx[tabIdx]) { matches.push(candidatesByTabIdx[tabIdx]); }
    });
    return matches;
  }

  function readAliasMatches(candidatesByTabIdx, normalizedScopeId) {
    const matches = [];
    Object.keys(candidatesByTabIdx).sort(sortNumericKeys).forEach(function (tabIdx) {
      const candidate = candidatesByTabIdx[tabIdx];
      if (_normalizeCognosScopeId(candidate.tabId) === normalizedScopeId || _normalizeCognosScopeId(candidate.pageId) === normalizedScopeId) {
        matches.push(candidate);
      }
    });
    return matches;
  }

  function asOk(evidence, scopeId, tab) {
    return { status: "ok", evidence: evidence, scopeId: scopeId, tab: cloneFlat(tab), candidates: [] };
  }

  function asAmbiguous(evidence, scopeId, candidates) {
    return {
      status: "ambiguous",
      evidence: evidence,
      scopeId: scopeId,
      tab: null,
      candidates: candidates.map(cloneFlat)
    };
  }

  function cloneCandidate(tab, tabIdx) {
    return {
      tabId: tab && tab.tabId ? tab.tabId : null,
      pageId: tab && tab.pageId ? tab.pageId : null,
      index: tab && typeof tab.index === "number" ? tab.index : null,
      tabIdx: tabIdx,
      visible: !!(tab && tab.visible === true),
      name: tab && tab.name ? tab.name : null
    };
  }

  function cloneFlat(tab) {
    return {
      tabId: tab.tabId,
      pageId: tab.pageId,
      index: tab.index,
      tabIdx: tab.tabIdx,
      visible: tab.visible,
      name: tab.name
    };
  }

  function sortNumericKeys(left, right) {
    return Number(left) - Number(right);
  }

  return readTabScopeMatch;
});
