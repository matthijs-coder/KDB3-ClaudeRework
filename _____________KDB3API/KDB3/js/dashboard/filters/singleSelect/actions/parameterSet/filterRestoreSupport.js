define([
  "../../state/selectors.js",
  "../../../../../core/utils/normalizeCognosScopeId.js",
  "../../../../tabs/state/selectors.js",
  "../../effects/readFiltersFacet.js"
], function (_selectors, _normalizeCognosScopeId, _tabsSelectors, _readFiltersFacet) {
  "use strict";

  function readFiltersFacet(_KDB, _runtime) {
    return _readFiltersFacet(_KDB, _runtime);
  }

  function isKnownUnsupportedKey(_key) {
    var key = String(_key == null ? "" : _key).trim().toLowerCase();
    return key === "sicht" || key === "dienststelle" || key === "dienststelle_bw" || key === "dienststelle_dezpv";
  }

  function resolveScopeIdForTab(_KDB, _tabTargets, _tab, _key) {
    var targets = _tabTargets || {};
    var target = targets[String(_tab)] || null;
    if (!target || !target.scopeId) {
      return { ok: false, code: "WRITEBACK_TABS_TARGET_MISSING", message: "missing tab target for tab " + String(_tab) };
    }
    var scopeId = String(target.scopeId).trim();
    if (scopeId === "") {
      return { ok: false, code: "WRITEBACK_TABS_TARGET_MISSING", message: "missing scopeId for tab " + String(_tab) };
    }
    var match = _tabsSelectors.readTabScopeMatch(_KDB, scopeId, targets);
    if (!match || match.status !== "ok" || match.evidence !== "liveScope") {
      return {
        ok: false,
        code: "WRITEBACK_TABS_TARGET_MISSING",
        message: "page-context tab target lacks verified liveScope evidence for scopeId"
      };
    }
    var matchedTabIdx = match.tab && match.tab.tabIdx != null ? Number(match.tab.tabIdx) : NaN;
    if (!isFinite(matchedTabIdx) || matchedTabIdx !== Number(_tab)) {
      return {
        ok: false,
        code: "WRITEBACK_TABS_TARGET_MISSING",
        message: "liveScope tabIdx mismatch for tab " + String(_tab)
      };
    }
    return { ok: true, scopeId: scopeId, derived: false };
  }

  function findSingleSelectInstance(_KDB, _entry, _scopeType, _scopeId) {
    var candidates = _selectors.readFilterInstances(_KDB, {
      status: "active",
      hostStatus: "present",
      scopeType: _scopeType
    });
    var wantedScope = _normalizeCognosScopeId(_scopeId || "global");
    var wantedKey = _entry && _entry.key != null ? String(_entry.key).trim() : "";
    var wantedInst = _entry && _entry.inst != null ? String(_entry.inst).trim() : "";
    var matches = candidates.filter(function (_record) {
      var filterLabel = _record && _record.filterLabel != null ? String(_record.filterLabel).trim() : "";
      var itemName = _record && _record.itemName != null ? String(_record.itemName).trim() : "";
      if (_record.selectionOwner !== "singleSelect") { return false; }
      if (_normalizeCognosScopeId(_record.scopeId) !== wantedScope) { return false; }
      if (filterLabel !== wantedKey && itemName !== wantedKey) { return false; }
      if (wantedInst) {
        var recordInst = _record && _record.semanticInstanceKey != null ? String(_record.semanticInstanceKey).trim() : "";
        if (recordInst !== wantedInst) { return false; }
      }
      return true;
    });
    if (matches.length === 1) { return { status: "ok", instance: matches[0] }; }
    return { status: matches.length > 1 ? "ambiguous" : "missing", instance: null };
  }

  return {
    readFiltersFacet: readFiltersFacet,
    isKnownUnsupportedKey: isKnownUnsupportedKey,
    findSingleSelectInstance: findSingleSelectInstance,
    normalizeScopeId: _normalizeCognosScopeId,
    resolveScopeIdForTab: resolveScopeIdForTab
  };
});
