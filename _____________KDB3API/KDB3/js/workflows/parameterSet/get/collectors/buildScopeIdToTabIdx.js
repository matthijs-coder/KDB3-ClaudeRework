define([
  "../../../../core/utils/normalizeCognosScopeId.js",
], function (_normalizeScopeId) {
  "use strict";

  // Scope map for GET collectors from canonical live tab targets.
  // Alias tabId/pageId mapping is intentionally not indexed here.
  function buildScopeIdToTabIdx(_liveTabTargets) {
    const tabTargets = _liveTabTargets && typeof _liveTabTargets === "object" ? _liveTabTargets : {};
    const byScopeId = {};
    const collisionByScopeId = {};
    const tabIdxKeys = Object.keys(tabTargets);
    for (let index = 0; index < tabIdxKeys.length; index += 1) {
      const tabIdx = tabIdxKeys[index];
      const target = tabTargets[tabIdx] || {};
      indexScope(byScopeId, collisionByScopeId, _normalizeScopeId(target.scopeId), tabIdx);
    }
    return {
      byScopeId: byScopeId,
      collisionByScopeId: collisionByScopeId,
      tabTargets: tabTargets,
    };
  }

  function indexScope(byScopeId, collisionByScopeId, normalizedKey, tabIdx) {
    if (normalizedKey === "") return;
    const existingTabIdx = byScopeId[normalizedKey];
    if (existingTabIdx === undefined) {
      if (!collisionByScopeId[normalizedKey]) {
        byScopeId[normalizedKey] = tabIdx;
      }
      return;
    }
    if (existingTabIdx === tabIdx) return;
    delete byScopeId[normalizedKey];
    if (!collisionByScopeId[normalizedKey]) {
      collisionByScopeId[normalizedKey] = [existingTabIdx];
    }
    collisionByScopeId[normalizedKey].push(tabIdx);
  }

  buildScopeIdToTabIdx.normalizeScopeId = _normalizeScopeId;
  return buildScopeIdToTabIdx;
});
