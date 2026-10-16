define(["../../../../core/utils/normalizeCognosScopeId.js"], function (_normalizeCognosScopeId) {
  "use strict";

  function encodePart(_value) {
    return encodeURIComponent(String(_value == null ? "" : _value));
  }

  function toScopeType(_scopeType, _normalizedScope) {
    return _scopeType === "global" && _normalizedScope === "global" ? "global" : "pageContext";
  }

  function buildFilterInstanceId(_scopeType, _scopeId, _itemId, _fallbackLabel) {
    var normalizedScope = _normalizeCognosScopeId(_scopeId);
    var scopeType = toScopeType(_scopeType, normalizedScope);
    var prefix = scopeType === "global" ? "g" : "p";
    var scopeToken = scopeType === "global" ? "global" : normalizedScope;
    var itemId = String(_itemId == null ? "" : _itemId).trim();
    var fallbackLabel = String(_fallbackLabel == null ? "" : _fallbackLabel).trim();
    if (itemId) {
      return {
        filterInstanceId: prefix + "|s=" + encodePart(scopeToken) + "|i=" + encodePart(itemId),
        identityQuality: "itemId",
        normalizedScopeId: scopeToken
      };
    }
    return {
      filterInstanceId: prefix + "|s=" + encodePart(scopeToken) + "|l=" + encodePart(fallbackLabel),
      identityQuality: "labelFallback",
      normalizedScopeId: scopeToken
    };
  }

  return buildFilterInstanceId;
});
