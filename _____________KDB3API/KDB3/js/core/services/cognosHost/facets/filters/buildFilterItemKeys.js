define([
  "../../../../utils/normalizeCognosScopeId.js"
], function (_normalizeCognosScopeId) {
  "use strict";

  // Unit separator: never part of a Cognos identifier, so a key can not be
  // forged by an itemId or itemName that happens to contain the delimiter.
  var SEP = "\u001F";
  var GLOBAL_SCOPE = "global";

  // Scope context for one lookup. scopeType mirrors the derivation that
  // isUnownedNativeMultiSelectItem already uses (normalised scope === "global").
  function buildScopeContext(_scopeId) {
    var scopeId = _normalizeCognosScopeId(_scopeId);
    if (scopeId === GLOBAL_SCOPE) {
      return { scopeType: GLOBAL_SCOPE, scopeId: GLOBAL_SCOPE };
    }
    return { scopeType: "pageContext", scopeId: scopeId };
  }

  function buildIdKey(_scope, _itemId) {
    var itemId = _itemId == null ? "" : String(_itemId).trim();
    // An empty itemId yields no primary key, so distinct items can not collide
    // on ("", ...); such an item stays reachable through its name key only.
    if (!itemId) {
      return null;
    }
    return _scope.scopeType + SEP + _scope.scopeId + SEP + "id" + SEP + itemId;
  }

  function buildNameKey(_scope, _itemName) {
    var itemName = _itemName == null ? "" : String(_itemName).trim();
    if (!itemName) {
      return null;
    }
    return _scope.scopeType + SEP + _scope.scopeId + SEP + "name" + SEP + itemName;
  }

  return {
    buildScopeContext: buildScopeContext,
    buildIdKey: buildIdKey,
    buildNameKey: buildNameKey
  };
});
