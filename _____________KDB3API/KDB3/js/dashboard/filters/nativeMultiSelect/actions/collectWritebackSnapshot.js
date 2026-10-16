define([
  "../effects/listUnownedNativeMultiSelectItems.js",
  "../config/parameterSetCodes.js"
], function (_listUnownedNativeMultiSelectItems, _codes) {
  "use strict";

  function materializeVals(_values) {
    var result = [];
    var idx;
    for (idx = 0; idx < (_values || []).length; idx += 1) {
      var pair = _values[idx] || {};
      var d = String(pair.d == null ? "" : pair.d).trim();
      var u = String(pair.u == null ? "" : pair.u).trim();
      if (d !== "" && u !== "") { result.push({ d: d, u: u }); }
    }
    return result;
  }

  function collectGlobalEntries(_KDB, _filtersFacet, _entries, _diagnostics, _seen) {
    var items = _listUnownedNativeMultiSelectItems(_KDB, "global", _filtersFacet);
    var itemIdx;
    for (itemIdx = 0; itemIdx < items.length; itemIdx += 1) {
      var item = items[itemIdx];
      var nm = String(item.itemName || "").trim();
      if (!nm) { continue; }
      var vals = materializeVals(item.values);
      if (vals.length === 0) { continue; }
      var identity = "global|" + nm;
      if (_seen[identity]) {
        _diagnostics.push({ code: _codes.SKIPPED, nm: nm, message: "duplicate pcfs identity omitted" });
        continue;
      }
      _seen[identity] = true;
      _entries.push({ nm: nm, vals: vals });
    }
  }

  function collectPageEntries(_KDB, _filtersFacet, _tabIdxToScopeId, _entries, _diagnostics, _seen) {
    var keys = Object.keys(_tabIdxToScopeId);
    var keyIdx;
    for (keyIdx = 0; keyIdx < keys.length; keyIdx += 1) {
      var tab = parseInt(keys[keyIdx], 10);
      if (typeof tab !== "number" || !isFinite(tab) || tab < 0 || Math.floor(tab) !== tab) { continue; }
      var target = _tabIdxToScopeId[keys[keyIdx]] || {};
      if (target.visible !== true) { continue; }
      if (!String(target.scopeId || "").trim()) {
        _diagnostics.push({ code: _codes.SKIPPED, tab: tab });
        continue;
      }
      var items = _listUnownedNativeMultiSelectItems(_KDB, target.scopeId, _filtersFacet);
      var itemIdx;
      for (itemIdx = 0; itemIdx < items.length; itemIdx += 1) {
        var item = items[itemIdx];
        var nm = String(item.itemName || "").trim();
        if (!nm) { continue; }
        var vals = materializeVals(item.values);
        if (vals.length === 0) { continue; }
        var identity = String(tab) + "|" + nm;
        if (_seen[identity]) {
          _diagnostics.push({ code: _codes.SKIPPED, nm: nm, tab: tab, message: "duplicate pcfs identity omitted" });
          continue;
        }
        _seen[identity] = true;
        _entries.push({ nm: nm, tab: tab, vals: vals });
      }
    }
  }

  function collectWritebackSnapshot(_ctx, _payload) {
    var payload = _payload || {};
    var tabIdxToScopeId = payload.tabIdxToScopeId;
    var entries = [];
    var diagnostics = [];
    var seen = {};
    try {
      collectGlobalEntries(_ctx._KDB, _ctx.filtersFacet, entries, diagnostics, seen);
      if (tabIdxToScopeId && typeof tabIdxToScopeId === "object" && !Array.isArray(tabIdxToScopeId)) {
        collectPageEntries(_ctx._KDB, _ctx.filtersFacet, tabIdxToScopeId, entries, diagnostics, seen);
      } else {
        diagnostics.push({ code: _codes.SKIPPED, message: "live tab targets unavailable for page pcfs collect" });
      }
      return { ok: true, entries: entries, diagnostics: diagnostics };
    } catch (error) {
      // Fail-visible (remediation B3): een crash tijdens de snapshot is geen
      // design-skip; ok: false laat de writeback-GET de save afbreken.
      return {
        ok: false,
        entries: entries,
        diagnostics: diagnostics.concat([{ code: _codes.SKIPPED, message: "snapshot crashed: " + String(error && error.message ? error.message : error) }])
      };
    }
  }

  return collectWritebackSnapshot;
});
