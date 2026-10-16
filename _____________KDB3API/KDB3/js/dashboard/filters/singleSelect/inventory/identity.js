define([
  "../config.js",
  "../state/instance.js",
  "../../../../core/utils/normalizeCognosScopeId.js"
], function (_config, _instance, _normalizeScopeId) {
  "use strict";

  var codes = _config.errorCodes;

  function fallbackKey(_descriptor) {
    return [_descriptor.scopeType, _descriptor.normalizedScopeId, _descriptor.itemName || _descriptor.filterLabel].join("|");
  }

  function indexCandidates(_candidates) {
    var byId = {};
    var byFallbackKey = {};
    _candidates.forEach(function (_candidate, _index) {
      var descriptor = _candidate.descriptor;
      var key = fallbackKey(descriptor);
      byId[descriptor.filterInstanceId] = byId[descriptor.filterInstanceId] || [];
      byId[descriptor.filterInstanceId].push(_index);
      byFallbackKey[key] = byFallbackKey[key] || [];
      byFallbackKey[key].push(_index);
    });
    return { byId: byId, byFallbackKey: byFallbackKey };
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
        code: codes.IDENTITY_COLLISION,
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
          code: codes.IDENTITY_ENRICHED,
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
        code: codes.IDENTITY_COLLISION,
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
      code: codes.RECONCILE_FAILED,
      filterInstanceId: _descriptor && _descriptor.filterInstanceId || null,
      scopeId: _descriptor && _descriptor.scopeId || null,
      itemId: _descriptor && _descriptor.itemId || null,
      message: "resolveMountedId returned an invalid shape; candidate skipped"
    });
    return { id: null, collision: true };
  }

  function blockUnprovenLabelFallback(_descriptor, _diagnostics) {
    if (_descriptor.identityQuality !== "labelFallback") { return false; }
    _diagnostics.push({
      code: codes.HOST_VALUE_READ_FAILED,
      filterInstanceId: _descriptor.filterInstanceId,
      scopeId: _descriptor.scopeId,
      message: "label-fallback identity adoption blocked: a host item could not be read this pass, so uniqueness is unproven"
    });
    return true;
  }

  function quarantineMountedFallbacks(_fallbacks, _next, _updated, _diagnostics) {
    var quarantine = { ids: {}, fallbackKeys: {} };
    Object.keys(_fallbacks || {}).forEach(function (_key) {
      (_fallbacks[_key] || []).forEach(function (_record) {
        var id = _record.filterInstanceId;
        _record.status = "active";
        _record.hostStatus = "missing";
        _next[id] = _record;
        _updated.push(id);
        quarantine.ids[id] = true;
        quarantine.fallbackKeys[_key] = true;
        _diagnostics.push({
          code: codes.HOST_VALUE_READ_FAILED,
          filterInstanceId: id,
          scopeId: _record.scopeId,
          message: "mounted label-fallback identity quarantined: inventory is incomplete and uniqueness is unproven"
        });
      });
    });
    return quarantine;
  }

  function isQuarantinedCandidate(_descriptor, _quarantine) {
    return _quarantine.ids[_descriptor.filterInstanceId] === true ||
      _quarantine.fallbackKeys[fallbackKey(_descriptor)] === true;
  }

  function resolveCandidateInstance(_candidate, _existing, _fallbacks, _diagnostics, _uniquenessUnproven, _quarantine) {
    var descriptor = _candidate.descriptor;
    if (_uniquenessUnproven) {
      if (isQuarantinedCandidate(descriptor, _quarantine)) { return null; }
      if (blockUnprovenLabelFallback(descriptor, _diagnostics)) { return null; }
    }
    var mounted = ensureMountedResolutionShape(
      resolveMountedId(_candidate, _existing, _fallbacks, _diagnostics),
      descriptor,
      _diagnostics
    );
    if (mounted.collision === true || !mounted.id) { return null; }
    var resolvedDescriptor = Object.assign({}, descriptor, { filterInstanceId: mounted.id });
    if (resolvedDescriptor.identityQuality === "labelFallback") {
      _diagnostics.push({
        code: codes.IDENTITY_LABEL_FALLBACK,
        filterInstanceId: mounted.id,
        scopeId: resolvedDescriptor.scopeId,
        message: "unique label fallback identity accepted"
      });
    }
    return { id: mounted.id, descriptor: resolvedDescriptor };
  }

  function collectRemovedInstances(_existing, _next) {
    var removed = [];
    Object.keys(_existing || {}).forEach(function (_id) {
      if (_next[_id]) { return; }
      removed.push(_id);
      _next[_id] = Object.assign({}, _existing[_id], { status: "removed", hostStatus: "missing" });
    });
    return removed;
  }

  function reconcileFilterInstanceState(_existing, _candidates, _diagnostics, _rawFallbackCounts, _uniquenessUnproven) {
    var indexed = indexCandidates(_candidates);
    var fallbacks = indexExistingFallbacks(_existing);
    var blocked = detectCollisions(_candidates, indexed, fallbacks, _rawFallbackCounts, _diagnostics);
    var next = {};
    var discovered = [];
    var updated = [];
    var quarantine = _uniquenessUnproven === true
      ? quarantineMountedFallbacks(fallbacks, next, updated, _diagnostics)
      : { ids: {}, fallbackKeys: {} };
    _candidates.forEach(function (_candidate, _index) {
      if (blocked[_index]) { return; }
      var resolved = resolveCandidateInstance(
        _candidate,
        _existing,
        fallbacks,
        _diagnostics,
        _uniquenessUnproven === true,
        quarantine
      );
      if (!resolved) { return; }
      next[resolved.id] = _instance.createFilterInstanceState(resolved.descriptor, _existing[resolved.id]);
      if (_existing[resolved.id]) { updated.push(resolved.id); } else { discovered.push(resolved.id); }
    });
    var removed = collectRemovedInstances(_existing, next);
    return { instancesById: next, discovered: discovered, updated: updated, removed: removed };
  }

  return {
    reconcileFilterInstanceState: reconcileFilterInstanceState
  };
});
