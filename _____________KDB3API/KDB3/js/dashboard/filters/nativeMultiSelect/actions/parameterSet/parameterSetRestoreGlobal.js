define([
  "../../config/actions.js",
  "../../config/parameterSetCodes.js",
  "../../effects/lookupNativeMultiSelectRefByName.js",
  "./parameterSetHostApply.js"
], function (_actions, _codes, _lookupNativeMultiSelectRefByName, _hostApply) {
  "use strict";

  function cloneVals(_vals) {
    return (_vals || []).map(function (v) {
      return { d: String(v.d), u: String(v.u) };
    });
  }

  function buildAppliedItem(_KDB, _nm, _vals, _filtersFacet) {
    var globalRef = _lookupNativeMultiSelectRefByName(_KDB, _nm, "global", _filtersFacet);
    if (!globalRef) {
      return { itemId: "", itemName: _nm, sourceId: "", values: cloneVals(_vals) };
    }
    return {
      itemId: String(globalRef.itemId || ""),
      itemName: _nm,
      sourceId: String(globalRef.sourceId || ""),
      values: cloneVals(_vals)
    };
  }

  async function runGlobalRestore(_ctx, _payload, _globalEntries, _appliedScopes, _skipped, _diagnostics) {
    if (_globalEntries.length === 0) {
      return { ok: true, degraded: false, appliedScopes: _appliedScopes, skipped: _skipped, diagnostics: _diagnostics };
    }
    var scopeId = "global";
    var degraded = false;
    var appliedItems = [];
    var entryIdx;
    for (entryIdx = 0; entryIdx < _globalEntries.length; entryIdx += 1) {
      var entry = _globalEntries[entryIdx];
      var nm = String(entry.nm || "").trim();
      var vals = Array.isArray(entry.vals) ? entry.vals : [];
      var outcome = await _hostApply.applyByName(_ctx._KDB, nm, scopeId, vals, _diagnostics, _ctx.filtersFacet);
      if (outcome === "failed") {
        return { ok: false, degraded: degraded, appliedScopes: _appliedScopes, skipped: _skipped, diagnostics: _diagnostics };
      }
      if (outcome === "skipped") {
        degraded = true;
        _skipped.push({ nm: nm, scopeId: scopeId });
        continue;
      }
      appliedItems.push(buildAppliedItem(_ctx._KDB, nm, vals, _ctx.filtersFacet));
      if (_ctx.isStale(_payload.runId)) {
        return { ok: false, diagnostics: [{ code: _codes.CANCELLED, message: "stale parameterSet runId was superseded during restore" }] };
      }
    }
    _ctx.dispatchInternal({
      type: _actions.TAB_MUTATION_SCOPE_WRITE,
      payload: { scopeId: scopeId, items: appliedItems, clear: false }
    });
    _appliedScopes.push(scopeId);
    return { ok: true, degraded: degraded, appliedScopes: _appliedScopes, skipped: _skipped, diagnostics: _diagnostics };
  }

  return { runGlobalRestore: runGlobalRestore };
});
