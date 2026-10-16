define([
  "../config.js",
  "../../../../core/config/mapping/bwOldToNewMap.js",
  "../../../../core/utils/kit/data.js",
  "./scopeTargets.js",
  "./hierarchyIndex.js"
], function (_config, _bwMap, _kitData, _scopeTargets, _hierarchyIndex) {
  "use strict";

  var CODES = _config.PARAMETER_SET_CODES;

  function pushResolvedPair(_entry, _index, _useValue, _valid, _diagnostics) {
    var resolved = _hierarchyIndex.resolveRestorePair(_index, _useValue);
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
        code: CODES.RESTORE_DISPLAY_DEGRADED,
        scope: _entry.scope,
        value: _useValue,
        message: "hierarchy display missing or ambiguous; transport-only d=u used"
      });
    }
    return true;
  }

  function normalizeScope(_entry, _filterKey, _index, _rowCount, _opts, _fallbackValue, _diagnostics) {
    var valid = [];
    var missing = [];
    var idx;
    var value;
    var mapped;
    var fallback;
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
          code: CODES.LABEL_MAPPED,
          scope: _entry.scope,
          message: "mapped legacy BW label " + value + " to " + mapped
        });
        continue;
      }
      if (_opts.mapOldToNew === true && _filterKey === "Dienststelle_BW" && !/^\d+$/.test(value)) {
        _diagnostics.push({
          code: CODES.LABEL_UNMAPPED,
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
        code: CODES.RESTORE_FAILED,
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
  }

  function collectScopes(_ctx, _payload, _diagnostics) {
    var scopes = [];
    var byTab = (_payload.dienststelle && _payload.dienststelle.byTab) || {};
    if (Array.isArray(_payload.dienststelle && _payload.dienststelle.glob)) {
      scopes.push({ scope: "global", values: _payload.dienststelle.glob });
    }
    Object.keys(byTab).forEach(function (tabIdx) {
      var resolved = _scopeTargets.resolveScopeId(_ctx._KDB, _payload.tabIdxToScopeId, tabIdx);
      if (!resolved.ok) {
        _diagnostics.push({
          code: CODES.TARGET_MISSING,
          scope: "tab:" + tabIdx,
          message: "tab target has no resolvable scopeId"
        });
        return;
      }
      scopes.push({ scope: resolved.scopeId, values: _kitData.toArray(byTab[tabIdx]) });
    });
    return scopes;
  }

  function buildRestoreScopePlan(_ctx, _payload, _index, _rowCount, _fallbackValue, _diagnostics) {
    var opts = _payload.options || {};
    var plan = collectScopes(_ctx, _payload, _diagnostics).map(function (scopeEntry) {
      return normalizeScope(scopeEntry, _payload.dienststelle.key, _index, _rowCount, opts, _fallbackValue, _diagnostics);
    });
    var globalItem = null;
    plan.forEach(function (item) {
      if (item.scope === "global") { globalItem = item; }
    });
    if (globalItem && globalItem.valid && globalItem.valid.length > 0) {
      plan.forEach(function (item) {
        if (item.scope !== "global") { item.fallback = null; }
      });
    }
    return plan;
  }

  return {
    buildRestoreScopePlan: buildRestoreScopePlan
  };
});
