define([
  "../config.js",
  "../../../../core/utils/normalizeCognosScopeId.js"
], function (_config, _normalizeScopeId) {
  "use strict";

  function fallbackKey(_descriptor) {
    return [_descriptor.scopeType, _descriptor.normalizedScopeId, _descriptor.itemName || _descriptor.filterLabel].join("|");
  }

  function indexExistingFallbacks(_existing) {
    var byKey = {};
    Object.keys(_existing || {}).forEach(function (_id) {
      var record = _existing[_id];
      if (!record || _id.indexOf("|l=") === -1) { return; }
      var key = [record.scopeType, _normalizeScopeId(record.scopeId), record.itemName || record.filterLabel].join("|");
      byKey[key] = byKey[key] || [];
      byKey[key].push(record);
    });
    return byKey;
  }

  function markCollisions(_candidates, _indexes, _blocked, _diagnostics, _message) {
    _indexes.forEach(function (_index) {
      _blocked[_index] = true;
      var descriptor = _candidates[_index].descriptor;
      _diagnostics.push({
        code: _config.errorCodes.IDENTITY_COLLISION,
        filterInstanceId: descriptor.filterInstanceId,
        scopeId: descriptor.scopeId,
        itemId: descriptor.itemId,
        message: _message
      });
    });
  }

  function detectCollisions(_candidates, _indexed, _existingFallbacks, _rawFallbackCounts, _diagnostics) {
    var blocked = {};
    Object.keys(_indexed.byId).forEach(function (_id) {
      if (_indexed.byId[_id].length > 1) {
        markCollisions(_candidates, _indexed.byId[_id], blocked, _diagnostics, "multiple host items map to one filterInstanceId");
      }
    });
    Object.keys(_indexed.byFallbackKey).forEach(function (_key) {
      var indexes = _indexed.byFallbackKey[_key];
      var rawCount = Number((_rawFallbackCounts && _rawFallbackCounts[_key]) || 0);
      var hasFallbackCandidate = indexes.some(function (_index) {
        return _candidates[_index].descriptor.identityQuality === "labelFallback";
      });
      if ((hasFallbackCandidate && rawCount > 1) ||
        ((_existingFallbacks[_key] || []).length > 0 && indexes.length > 1)) {
        markCollisions(_candidates, indexes, blocked, _diagnostics, "label fallback is not unique within the live scope");
      }
      if ((_existingFallbacks[_key] || []).length > 1 && indexes.length > 0) {
        markCollisions(_candidates, indexes, blocked, _diagnostics, "existing mounted fallback identities collide for this scope + label key");
      }
    });
    return blocked;
  }

  function resolveMountedId(_candidate, _existing, _fallbacks, _diagnostics) {
    var descriptor = _candidate.descriptor;
    if (_existing[descriptor.filterInstanceId]) {
      return { id: descriptor.filterInstanceId, collision: false };
    }
    var matches = (_fallbacks[fallbackKey(descriptor)] || []).filter(function (_record) {
      return !_record.itemId || String(_record.itemId) === String(descriptor.itemId);
    });
    if (descriptor.itemId && matches.length === 1) {
      if (!matches[0].itemId) {
        _diagnostics.push({
          code: _config.errorCodes.IDENTITY_ENRICHED,
          filterInstanceId: matches[0].filterInstanceId,
          scopeId: descriptor.scopeId,
          itemId: descriptor.itemId,
          message: "mounted label fallback identity enriched with host itemId"
        });
      }
      descriptor.identityQuality = "itemId";
      return { id: matches[0].filterInstanceId, collision: false };
    }
    if (descriptor.itemId && matches.length > 1) {
      _diagnostics.push({
        code: _config.errorCodes.IDENTITY_COLLISION,
        filterInstanceId: descriptor.filterInstanceId,
        scopeId: descriptor.scopeId,
        itemId: descriptor.itemId,
        message: "itemId enrichment matched multiple mounted fallback records"
      });
      return { id: null, collision: true };
    }
    return { id: descriptor.filterInstanceId, collision: false };
  }

  function ensureMountedResolutionShape(_mounted, _descriptor, _diagnostics) {
    if (_mounted && typeof _mounted === "object" && typeof _mounted.id === "string") {
      return _mounted;
    }
    _diagnostics.push({
      code: _config.errorCodes.RECONCILE_FAILED,
      filterInstanceId: _descriptor && _descriptor.filterInstanceId || null,
      scopeId: _descriptor && _descriptor.scopeId || null,
      itemId: _descriptor && _descriptor.itemId || null,
      message: "resolveMountedId returned an invalid shape; candidate skipped"
    });
    return { id: null, collision: true };
  }

  return {
    detectCollisions: detectCollisions,
    ensureMountedResolutionShape: ensureMountedResolutionShape,
    indexExistingFallbacks: indexExistingFallbacks,
    resolveMountedId: resolveMountedId
  };
});
