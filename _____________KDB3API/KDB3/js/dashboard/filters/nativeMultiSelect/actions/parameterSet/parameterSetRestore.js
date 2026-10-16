define([
  "../../config/actions.js",
  "../../config/parameterSetCodes.js",
  "../../effects/lookupNativeMultiSelectRefByName.js",
  "./parameterSetHostApply.js",
  "./parameterSetRestoreGlobal.js"
], function (_actions, _codes, _lookupNativeMultiSelectRefByName, _hostApply, _restoreGlobal) {
  "use strict";

  function readTargetScopeId(_target) {
    return String((_target && _target.scopeId) || "").trim();
  }

  function cloneVals(_vals) {
    return (_vals || []).map(function (v) {
      return { d: String(v.d), u: String(v.u) };
    });
  }

  function groupByTab(_filters) {
    var groups = {};
    var idx;
    for (idx = 0; idx < _filters.length; idx += 1) {
      var tabKey = String(_filters[idx].tab);
      if (!groups[tabKey]) { groups[tabKey] = []; }
      groups[tabKey].push(_filters[idx]);
    }
    return groups;
  }

  function buildAppliedItem(_KDB, _nm, _scopeId, _vals, _filtersFacet) {
    var pageRef = _lookupNativeMultiSelectRefByName(_KDB, _nm, _scopeId, _filtersFacet);
    if (!pageRef) {
      return { itemId: "", itemName: _nm, sourceId: "", values: cloneVals(_vals) };
    }
    return {
      itemId: String(pageRef.itemId || ""),
      itemName: _nm,
      sourceId: String(pageRef.sourceId || ""),
      values: cloneVals(_vals)
    };
  }

  async function restorePageEntries(_ctx, _payload, _pageEntries, _appliedScopes, _skipped, _diagnostics) {
    var degraded = false;
    var groups = groupByTab(_pageEntries);
    var tabKeys = Object.keys(groups);
    var tabIdx;
    for (tabIdx = 0; tabIdx < tabKeys.length; tabIdx += 1) {
      var tab = parseInt(tabKeys[tabIdx], 10);
      var target = _payload.tabIdxToScopeId && _payload.tabIdxToScopeId[String(tab)];
      var scopeId = readTargetScopeId(target);
      if (!scopeId) {
        _diagnostics.push({ code: _codes.TARGET_MISSING, tab: tab, message: "tab target has no resolvable scopeId" });
        return { ok: false, degraded: degraded, appliedScopes: _appliedScopes, skipped: _skipped, diagnostics: _diagnostics };
      }
      var appliedItems = [];
      var entries = groups[tabKeys[tabIdx]];
      var entryIdx;
      for (entryIdx = 0; entryIdx < entries.length; entryIdx += 1) {
        var entry = entries[entryIdx];
        var nm = String(entry.nm || "").trim();
        var vals = Array.isArray(entry.vals) ? entry.vals : [];
        var outcome = await _hostApply.applyByName(_ctx._KDB, nm, scopeId, vals, _diagnostics, _ctx.filtersFacet);
        if (outcome === "failed") {
          return { ok: false, degraded: degraded, appliedScopes: _appliedScopes, skipped: _skipped, diagnostics: _diagnostics };
        }
        if (outcome === "skipped") {
          degraded = true;
          _skipped.push({ nm: nm, tab: tab, scopeId: scopeId });
          continue;
        }
        appliedItems.push(buildAppliedItem(_ctx._KDB, nm, scopeId, vals, _ctx.filtersFacet));
        if (_ctx.isStale(_payload.runId)) {
          return { ok: false, diagnostics: [{ code: _codes.CANCELLED, message: "stale parameterSet runId was superseded during restore" }] };
        }
      }
      _ctx.dispatchInternal({
        type: _actions.TAB_MUTATION_SCOPE_WRITE,
        payload: { scopeId: scopeId, items: appliedItems, clear: false }
      });
      _appliedScopes.push(scopeId);
    }
    return { ok: true, degraded: degraded, appliedScopes: _appliedScopes, skipped: _skipped, diagnostics: _diagnostics };
  }

  async function runRestore(_ctx, _payload) {
    var payload = _payload || {};
    var filters = Array.isArray(payload.filters) ? payload.filters : [];
    var globalEntries = filters.filter(function (e) { return e && e.tab === undefined; });
    var pageEntries = filters.filter(function (e) { return e && e.tab !== undefined; });
    var appliedScopes = [];
    var skipped = [];
    var diagnostics = [];
    var degraded = false;
    try {
      var globalResult = await _restoreGlobal.runGlobalRestore(
        _ctx, payload, globalEntries, appliedScopes, skipped, diagnostics
      );
      if (!globalResult.ok) { return globalResult; }
      degraded = degraded || globalResult.degraded;
      if (pageEntries.length === 0) {
        return { ok: true, degraded: degraded, appliedScopes: appliedScopes, skipped: skipped, diagnostics: diagnostics };
      }
      var pageResult = await restorePageEntries(_ctx, payload, pageEntries, appliedScopes, skipped, diagnostics);
      if (!pageResult.ok) { return pageResult; }
      return {
        ok: true,
        degraded: degraded || pageResult.degraded,
        appliedScopes: pageResult.appliedScopes,
        skipped: pageResult.skipped,
        diagnostics: pageResult.diagnostics
      };
    } catch (error) {
      return { ok: false, diagnostics: [{ code: _codes.RESTORE_FAILED, message: String(error && error.message ? error.message : error) }] };
    }
  }

  function parameterSetRestore(_ctx, _payload) {
    var guard = _ctx.guardRun(_payload);
    if (guard) { return Promise.resolve(guard); }
    return runRestore(_ctx, _payload);
  }

  return parameterSetRestore;
});
