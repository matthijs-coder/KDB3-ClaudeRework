define([
  "../config/restoreConstants.js",
  "../../schema/errorCodes.js",
], function (_constants, _errorCodes) {
  "use strict";

  async function resolveLiveFilterTargets(_KDB, run, requiresPageTargets) {
    const result = await run.dispatchOwnerPhase({
      phaseName: "filterScopeResolve",
      owner: "tabs",
      type: "tabs/resolveFilterScopeTargets",
      payload: { source: "writebackSet" },
      required: requiresPageTargets === true,
      skipHistoryFlag: false,
      failureCode: _errorCodes.codes.WRITEBACK_TABS_TARGET_MISSING,
    });
    const targets = result && result.result && result.result.tabTargets && typeof result.result.tabTargets === "object"
      ? result.result.tabTargets
      : null;
    if (requiresPageTargets && !targets) {
      run.addDiagnostic(
        _errorCodes.codes.WRITEBACK_TABS_TARGET_MISSING,
        "restore",
        "live tab scope targets are required for page-context restore but unavailable"
      );
      throw _constants.ABORT;
    }
    return targets;
  }

  function assertRequiredLiveScopes(run, targets, requiredTabIdx) {
    if (!Array.isArray(requiredTabIdx) || requiredTabIdx.length === 0) return;
    for (let index = 0; index < requiredTabIdx.length; index += 1) {
      const tabIdx = requiredTabIdx[index];
      const target = targets && typeof targets === "object" ? targets[String(tabIdx)] : null;
      const scopeId = target && typeof target.scopeId === "string" ? target.scopeId.trim() : "";
      if (scopeId === "") {
        run.addDiagnostic(
          _errorCodes.codes.WRITEBACK_TABS_TARGET_MISSING,
          "restore",
          "required page-context tab target is missing a live scopeId",
          { tabIdx: tabIdx }
        );
        throw _constants.ABORT;
      }
    }
  }

  function collectPageContextTabIdx(pageEntries, dstl, pcfs) {
    const tabIdxSet = [];
    pageEntries.forEach(function (entry) {
      if (isTabIdx(entry.tab) && tabIdxSet.indexOf(entry.tab) === -1) {
        tabIdxSet.push(entry.tab);
      }
    });
    if (dstl && dstl.byTab && typeof dstl.byTab === "object") {
      Object.keys(dstl.byTab).forEach(function (tabIdxKey) {
        const tabIdx = parseInt(tabIdxKey, 10);
        if (isTabIdx(tabIdx) && tabIdxSet.indexOf(tabIdx) === -1) {
          tabIdxSet.push(tabIdx);
        }
      });
    }
    if (Array.isArray(pcfs)) {
      pcfs.forEach(function (entry) {
        if (isTabIdx(entry.tab) && tabIdxSet.indexOf(entry.tab) === -1) {
          tabIdxSet.push(entry.tab);
        }
      });
    }
    return tabIdxSet;
  }

  function hasTabScopedDienststelle(dstl) {
    return !!(dstl && dstl.byTab && typeof dstl.byTab === "object" && Object.keys(dstl.byTab).length > 0);
  }

  function isTabIdx(value) {
    return typeof value === "number" && isFinite(value) && value >= 0 && Math.floor(value) === value;
  }

  return Object.freeze({
    resolveLiveFilterTargets: resolveLiveFilterTargets,
    assertRequiredLiveScopes: assertRequiredLiveScopes,
    collectPageContextTabIdx: collectPageContextTabIdx,
    hasTabScopedDienststelle: hasTabScopedDienststelle,
  });
});
