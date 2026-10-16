define([
  "../../schema/errorCodes.js",
  "./buildScopeIdToTabIdx.js",
], function (_errorCodes, _buildScopeIdToTabIdx) {
  "use strict";

  function collectDienststelleFilter(_KDB, _diagnostics, _liveTabTargets) {
    try {
      const state = readOwnerState(_KDB);
      if (!state) {
        return null;
      }
      const activeFilterKey = typeof state.activeFilterKey === "string"
        ? state.activeFilterKey.trim()
        : "";
      if (activeFilterKey === "") {
        return null;
      }

      const filterState = state.byFilter && state.byFilter[activeFilterKey]
        ? state.byFilter[activeFilterKey]
        : null;
      const globalValues = extractUseValues(
        filterState &&
        filterState.currentSelectionByScope &&
        filterState.currentSelectionByScope.global
          ? filterState.currentSelectionByScope.global.currentValues
          : null
      );
      const byTabResult = collectByTab(filterState, _liveTabTargets);
      if (byTabResult.skippedScopes > 0) {
        _diagnostics.push(_errorCodes.makeDiagnostic(
          _errorCodes.codes.WRITEBACK_SKIPPED_BY_DESIGN,
          "get",
          "dienststelle page-context selections skipped for non-mappable scopeIds",
          { skippedScopes: byTabResult.skippedScopes, skippedScopeIds: byTabResult.skippedScopeIds }
        ));
      }

      if (globalValues.length === 0 && Object.keys(byTabResult.byTab).length === 0) {
        return null;
      }
      const dstl = { key: activeFilterKey };
      if (globalValues.length > 0) dstl.glob = globalValues;
      if (Object.keys(byTabResult.byTab).length > 0) dstl.byTab = byTabResult.byTab;
      return dstl;
    } catch (error) {
      // Fail-visible (remediation B3, reviewbevinding 3): een echte crash in de
      // dienststelle-collector breekt de save af i.p.v. stil te ontbreken.
      _diagnostics.push(_errorCodes.makeDiagnostic(
        _errorCodes.codes.WRITEBACK_COLLECTOR_FAILED,
        "get",
        "dienststelle collector failed",
        { collector: "dienststelle", error: error && error.message ? error.message : String(error) }
      ));
      return null;
    }
  }

  function readOwnerState(_KDB) {
    const api = _KDB && _KDB.api ? _KDB.api.dienststelle : null;
    return api && typeof api.getState === "function" ? api.getState() : null;
  }

  function extractUseValues(currentValues) {
    const seen = {};
    const out = [];
    if (!Array.isArray(currentValues)) {
      return out;
    }
    for (let index = 0; index < currentValues.length; index += 1) {
      const entry = currentValues[index];
      const useValue = entry && entry.useValue != null ? String(entry.useValue).trim() : "";
      if (useValue !== "" && !seen[useValue]) {
        seen[useValue] = true;
        out.push(useValue);
      }
    }
    return out;
  }

  function collectByTab(filterState, _liveTabTargets) {
    const result = { byTab: {}, skippedScopes: 0, skippedScopeIds: [] };
    const pageContext = filterState &&
      filterState.currentSelectionByScope &&
      filterState.currentSelectionByScope.pageContext
        ? filterState.currentSelectionByScope.pageContext
        : null;
    if (!pageContext) return result;
    const scopeMap = _buildScopeIdToTabIdx(_liveTabTargets);
    const scopeIds = Object.keys(pageContext);
    for (let index = 0; index < scopeIds.length; index += 1) {
      const scopeId = scopeIds[index];
      const scope = pageContext[scopeId];
      const values = extractUseValues(scope && scope.currentValues);
      if (values.length === 0) continue;
      const normalizedScopeId = _buildScopeIdToTabIdx.normalizeScopeId(scopeId);
      const collision = scopeMap.collisionByScopeId[normalizedScopeId];
      const tabIdx = collision ? null : scopeMap.byScopeId[normalizedScopeId];
      if (tabIdx == null) {
        result.skippedScopes += 1;
        result.skippedScopeIds.push(normalizedScopeId || String(scopeId));
        continue;
      }
      const liveTarget = _liveTabTargets && _liveTabTargets[String(tabIdx)];
      if (!liveTarget || liveTarget.visible !== true) continue;
      result.byTab[String(tabIdx)] = mergeUseValues(result.byTab[String(tabIdx)], values);
    }
    return result;
  }

  function mergeUseValues(existingValues, nextValues) {
    const existing = Array.isArray(existingValues) ? existingValues.slice() : [];
    const seen = {};
    for (let index = 0; index < existing.length; index += 1) {
      seen[existing[index]] = true;
    }
    for (let index = 0; index < nextValues.length; index += 1) {
      const value = nextValues[index];
      if (!seen[value]) {
        seen[value] = true;
        existing.push(value);
      }
    }
    return existing;
  }

  return collectDienststelleFilter;
});
