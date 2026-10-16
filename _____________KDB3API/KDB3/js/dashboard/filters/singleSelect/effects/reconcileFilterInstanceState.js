define([
  "../state/instance.js",
  "./resolveMountedFilterIdentity.js",
  "../config.js"
], function (_createState, _collisionSupport, _config) {
  "use strict";

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

  function blockUnprovenLabelFallback(_descriptor, _diagnostics) {
    if (_descriptor.identityQuality !== "labelFallback") { return false; }
    _diagnostics.push({
      code: _config.errorCodes.HOST_VALUE_READ_FAILED,
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
          code: _config.errorCodes.HOST_VALUE_READ_FAILED,
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
    var mounted = _collisionSupport.ensureMountedResolutionShape(
      _collisionSupport.resolveMountedId(_candidate, _existing, _fallbacks, _diagnostics),
      descriptor,
      _diagnostics
    );
    if (mounted.collision === true || !mounted.id) { return null; }
    var resolvedDescriptor = Object.assign({}, descriptor, { filterInstanceId: mounted.id });
    if (resolvedDescriptor.identityQuality === "labelFallback") {
      _diagnostics.push({
        code: _config.errorCodes.IDENTITY_LABEL_FALLBACK,
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

  function __controller(_existing, _candidates, _diagnostics, _rawFallbackCounts, _uniquenessUnproven) {
    try {
      var indexed = indexCandidates(_candidates);
      var fallbacks = _collisionSupport.indexExistingFallbacks(_existing);
      var blocked = _collisionSupport.detectCollisions(
        _candidates,
        indexed,
        fallbacks,
        _rawFallbackCounts,
        _diagnostics
      );
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
        next[resolved.id] = _createState.createFilterInstanceState(resolved.descriptor, _existing[resolved.id]);
        if (_existing[resolved.id]) { updated.push(resolved.id); } else { discovered.push(resolved.id); }
      });
      var removed = collectRemovedInstances(_existing, next);
      return { instancesById: next, discovered: discovered, updated: updated, removed: removed };
    } catch (error) {
      console.error("[singleSelect.reconcileFilterInstanceState] failed", error);
      throw error;
    }
  }

  return __controller;
});
