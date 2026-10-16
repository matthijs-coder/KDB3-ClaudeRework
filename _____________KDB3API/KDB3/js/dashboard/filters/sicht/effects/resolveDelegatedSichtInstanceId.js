define([
  "../../singleSelect/state/selectors.js"
], function (_singleSelectSelectors) {
  "use strict";

  function matchesIdentity(_record, _identity) {
    if (!_identity) {
      return true;
    }
    if (_identity.scopeType && _record.scopeType !== _identity.scopeType) {
      return false;
    }
    if (_identity.scopeId && String(_record.scopeId) !== String(_identity.scopeId)) {
      return false;
    }
    if (_identity.itemId != null && String(_record.itemId) !== String(_identity.itemId)) {
      return false;
    }
    if (_identity.semanticInstanceKey != null &&
      String(_record.semanticInstanceKey) !== String(_identity.semanticInstanceKey)) {
      return false;
    }
    return true;
  }

  // Startup/restore require one live global Sicht descriptor. History may add
  // an exact/stale identity tuple, which is verified before using that same
  // unique live descriptor; legacy values resolve only under uniqueness.
  function resolveDelegatedSichtInstanceId(_KDB, _identity) {
    try {
      var instances = _singleSelectSelectors.readFilterInstances(_KDB, {
        scopeType: "global",
        status: "active",
        hostStatus: "present"
      });
      var matches = instances.filter(function (_instance) {
        return _instance.filterType === "sicht" && _instance.selectionOwner === "sicht";
      });
      if (matches.length !== 1) {
        return null;
      }
      if (!_identity || !_identity.filterInstanceId) {
        if (_identity && !matchesIdentity(matches[0], _identity)) {
          console.warn("[sicht.resolveDelegatedSichtInstanceId] legacy identity hint mismatch", {
            filterInstanceId: matches[0].filterInstanceId
          });
        }
        return matches[0].filterInstanceId;
      }
      if (!matchesIdentity(matches[0], _identity) ||
        matches[0].filterInstanceId !== _identity.filterInstanceId) {
        return null;
      }
      return matches[0].filterInstanceId;
    } catch (error) {
      console.error("[sicht.resolveDelegatedSichtInstanceId] failed", error);
      return null;
    }
  }

  return resolveDelegatedSichtInstanceId;
});
