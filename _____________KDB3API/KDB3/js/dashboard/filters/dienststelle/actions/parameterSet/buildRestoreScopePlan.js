define([
  "../../config/parameterSetCodes.js",
  "../../../../../core/config/mapping/bwOldToNewMap.js",
  "../restoreSupport.js",
  "./buildDienststelleHierarchyIndex.js"
], function (_codes, _bwMap, _support, _hierarchyIndex) {
  "use strict";

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function pushResolvedPair(_entry, _index, _useValue, _valid, _diagnostics) {
    var resolved;
    try {
      resolved = _hierarchyIndex.resolveRestorePair(_index, _useValue);
      if (!resolved) {
        return false;
      }
      _valid.push({
        displayValue: resolved.displayValue,
        useValue: resolved.useValue,
        source: resolved.source
      });
      if (resolved.degraded === true) {
        _diagnostics.push({
          code: _codes.RESTORE_DISPLAY_DEGRADED,
          scope: _entry.scope,
          value: _useValue,
          message: "hierarchy display missing or ambiguous; transport-only d=u used"
        });
      }
      return true;
    } catch (error) {
      console.error("[dienststelle.pushResolvedPair] failed", {
        scope: _entry && _entry.scope,
        useValue: _useValue
      }, error);
      throw error;
    }
  }

  function normalizeScope(_entry, _filterKey, _index, _rowCount, _opts, _fallbackValue, _diagnostics) {
    var valid = [];
    var missing = [];
    var idx;
    var value;
    var mapped;
    var fallback;
    try {
      for (idx = 0; idx < _entry.values.length; idx += 1) {
        value = String(_entry.values[idx]);
        if (_hierarchyIndex.hasUseValue(_index, value)) {
          pushResolvedPair(_entry, _index, value, valid, _diagnostics);
          continue;
        }
        mapped = _opts.mapOldToNew === true && _filterKey === "Dienststelle_BW" ? _bwMap[value] : null;
        if (mapped && _hierarchyIndex.hasUseValue(_index, String(mapped))) {
          pushResolvedPair(_entry, _index, String(mapped), valid, _diagnostics);
          _diagnostics.push({
            code: _codes.LABEL_MAPPED,
            scope: _entry.scope,
            message: "mapped legacy BW label " + value + " to " + mapped
          });
          continue;
        }
        if (_opts.mapOldToNew === true && _filterKey === "Dienststelle_BW" && !/^\d+$/.test(value)) {
          _diagnostics.push({
            code: _codes.LABEL_UNMAPPED,
            scope: _entry.scope,
            message: "legacy BW label has no mapping: " + value
          });
        }
        missing.push({ scope: _entry.scope, value: value });
      }
      if (_rowCount === 0) {
        valid = [];
      }
      fallback = _entry.values.length > 0 && valid.length === 0 && _opts.fallbackToDefault === true && _fallbackValue;
      if (valid.length === 0 && !fallback && _entry.values.length > 0) {
        _diagnostics.push({
          code: _codes.RESTORE_FAILED,
          scope: _entry.scope,
          message: "no valid dienststelle values for scope"
        });
      }
      return {
        scope: _entry.scope,
        valid: valid,
        missing: missing,
        fallback: fallback ? _fallbackValue : null
      };
    } catch (error) {
      console.error("[dienststelle.normalizeScope] failed", { scope: _entry && _entry.scope }, error);
      throw error;
    }
  }

  function __controller(_ctx, _payload, _index, _rowCount, _fallbackValue, _diagnostics) {
    var opts = _payload.options || {};
    var scopes = [];
    var byTab;
    var keys;
    var idx;
    var tabIdx;
    var resolved;
    var plan, globalItem;
    try {
      if (Array.isArray(_payload.dienststelle && _payload.dienststelle.glob)) {
        scopes.push({ scope: "global", values: _payload.dienststelle.glob });
      }
      byTab = (_payload.dienststelle && _payload.dienststelle.byTab) || {};
      keys = Object.keys(byTab);
      for (idx = 0; idx < keys.length; idx += 1) {
        tabIdx = keys[idx];
        resolved = _support.resolveScopeId(_ctx._KDB, _payload.tabIdxToScopeId, tabIdx);
        if (!resolved.ok) {
          _diagnostics.push({
            code: _codes.TARGET_MISSING,
            scope: "tab:" + tabIdx,
            message: "tab target has no resolvable scopeId"
          });
          continue;
        }
        scopes.push({ scope: resolved.scopeId, values: asArray(byTab[tabIdx]) });
      }
      plan = [];
      for (idx = 0; idx < scopes.length; idx += 1) {
        plan.push(normalizeScope(
          scopes[idx], _payload.dienststelle.key, _index, _rowCount, opts, _fallbackValue, _diagnostics
        ));
      }
      for (idx = 0; idx < plan.length; idx += 1) {
        if (plan[idx].scope === "global") { globalItem = plan[idx]; }
      }
      if (globalItem && globalItem.valid && globalItem.valid.length > 0) {
        for (idx = 0; idx < plan.length; idx += 1) {
          if (plan[idx].scope !== "global") { plan[idx].fallback = null; }
        }
      }
      return plan;
    } catch (error) {
      console.error("[dienststelle.buildRestoreScopePlan] failed", error);
      throw error;
    }
  }

  return __controller;
});
