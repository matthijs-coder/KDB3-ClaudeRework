define([
  "../state/instance.js",
  "../inventory/definitions.js",
  "../../../../core/utils/normalizeCognosScopeId.js"
], function (_buildFilterInstanceId, _definitions, _normalizeScopeId) {
  "use strict";

  function fallbackKey(_scopeType, _normalizedScope, _itemName) {
    return [_scopeType, _normalizedScope, _itemName].join("|");
  }

  // Owner identity still trims the label and derives scopeType from the RAW
  // host scope, matching the pre-migration candidate reader. The facet's
  // itemName is untrimmed and its scopeType follows the inventory partition.
  function readRawFromDescriptor(_descriptor) {
    var scopeId = String(
      _descriptor.rawScopeId != null ? _descriptor.rawScopeId : (_descriptor.scopeId || "")
    );
    var normalizedScope = _normalizeScopeId(scopeId);
    var scopeType = scopeId === "global" && normalizedScope === "global" ? "global" : "pageContext";
    var itemName = String(_descriptor.itemName || "").trim();
    return {
      scopeId: scopeId,
      normalizedScope: normalizedScope,
      scopeType: scopeType,
      itemName: itemName,
      fallbackKey: fallbackKey(scopeType, normalizedScope, itemName)
    };
  }

  function readCandidateFromDescriptor(_KDB, _descriptor, _source, _definitionIndex) {
    var raw = readRawFromDescriptor(_descriptor || {});
    var itemIdValue = _descriptor && _descriptor.itemId;
    var itemId = itemIdValue == null ? "" : String(itemIdValue).trim();
    var definitionResult = _definitions.readFilterDefinition(
      _KDB, _source, raw.scopeType, raw.itemName, itemId, _definitionIndex
    );
    var classification = _definitions.classifyFilterInstance(definitionResult, raw.itemName, raw.scopeType);
    var identity = _buildFilterInstanceId.buildFilterInstanceId(raw.scopeType, raw.scopeId, itemId, raw.itemName);
    return {
      classification: classification,
      definitionResult: definitionResult,
      rawDescriptor: raw,
      descriptor: {
        filterInstanceId: identity.filterInstanceId,
        scopeType: raw.scopeType,
        scopeId: raw.scopeId,
        normalizedScopeId: raw.normalizedScope,
        filterLabel: definitionResult.definition && definitionResult.definition.filterLabel
          ? String(definitionResult.definition.filterLabel) : raw.itemName,
        itemName: raw.itemName,
        itemId: itemId || null,
        semanticInstanceKey: definitionResult.definition && definitionResult.definition.instanceKey
          ? String(definitionResult.definition.instanceKey) : null,
        identityQuality: identity.identityQuality,
        filterType: classification.filterType,
        selectionOwner: classification.selectionOwner,
        hasAlleOption: !!(definitionResult.definition && definitionResult.definition.hasAlleOption === true),
        condition: definitionResult.definition ? definitionResult.definition.condition || null : null,
        values: Array.isArray(_descriptor && _descriptor.values) ? _descriptor.values.slice() : []
      }
    };
  }

  return {
    readCandidateFromDescriptor: readCandidateFromDescriptor,
    fallbackKey: fallbackKey
  };
});
