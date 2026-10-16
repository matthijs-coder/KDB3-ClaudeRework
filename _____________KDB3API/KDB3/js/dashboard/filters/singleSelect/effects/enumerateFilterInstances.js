define([
  "./readSingleSelectCandidate.js",
  "./listSingleSelectHostDescriptors.js",
  "../inventory/definitions.js",
  "../runtime.js",
  "../config.js",
  "../../../../core/utils/getKennzahlenSource.js"
], function (
  _candidateReader,
  _listHostDescriptors,
  _definitions,
  _singleSelectRuntime,
  _config,
  _getKennzahlenSource
) {
  "use strict";

  function buildUnknownDiagnostic(_itemName, _scopeId, _definitionResult) {
    return {
      code: _config.errorCodes.HOST_ITEM_UNKNOWN,
      scopeId: _scopeId,
      message: "Host item \"" + _itemName + "\" is not a configured supported single-select" +
        (_definitionResult.status === "ambiguous" ? " (configuration ambiguous)" : "")
    };
  }

  function persistenceGroupKey(_descriptor) {
    return [_descriptor.scopeType, _descriptor.normalizedScopeId, _descriptor.filterLabel].join("|");
  }

  function blockAmbiguousSiblings(_bucket, _diagnostics) {
    var seen = {};
    _bucket.forEach(function (_candidate) {
      var semanticKey = _candidate.descriptor.semanticInstanceKey
        ? String(_candidate.descriptor.semanticInstanceKey).trim() : "";
      if (!semanticKey) {
        _candidate.blocked = true;
        _diagnostics.push({
          code: _config.errorCodes.SEMANTIC_INSTANCE_KEY_MISSING,
          filterInstanceId: _candidate.descriptor.filterInstanceId,
          scopeId: _candidate.descriptor.scopeId,
          message: "same-scope same-label siblings require unique semantic instanceKey"
        });
        return;
      }
      seen[semanticKey] = seen[semanticKey] || [];
      seen[semanticKey].push(_candidate);
    });
    Object.keys(seen).forEach(function (_semanticKey) {
      if (seen[_semanticKey].length <= 1) { return; }
      seen[_semanticKey].forEach(function (_candidate) {
        _candidate.blocked = true;
        _diagnostics.push({
          code: _config.errorCodes.SEMANTIC_INSTANCE_KEY_DUPLICATE,
          filterInstanceId: _candidate.descriptor.filterInstanceId,
          scopeId: _candidate.descriptor.scopeId,
          message: "duplicate semantic instanceKey \"" + _semanticKey + "\" for same-scope same-label siblings"
        });
      });
    });
  }

  function resolveSemanticInstanceKeys(_candidates, _diagnostics) {
    var byGroup = {};
    _candidates.forEach(function (_candidate) {
      var key = persistenceGroupKey(_candidate.descriptor);
      byGroup[key] = byGroup[key] || [];
      byGroup[key].push(_candidate);
    });
    Object.keys(byGroup).forEach(function (_key) {
      var bucket = byGroup[_key];
      if (bucket.length === 1) {
        var only = bucket[0].descriptor;
        if (!only.semanticInstanceKey) {
          only.semanticInstanceKey = only.filterLabel || only.itemName;
        }
        return;
      }
      blockAmbiguousSiblings(bucket, _diagnostics);
    });
  }

  function readHostItem(_KDB, _descriptor, _source, _definitionIndex, _candidates, _diagnostics, _rawFallbackCounts) {
    var raw;
    var candidate;
    try {
      candidate = _candidateReader.readCandidateFromDescriptor(
        _KDB, _descriptor, _source, _definitionIndex
      );
      raw = candidate.rawDescriptor;
    } catch (rawError) {
      _diagnostics.push({
        code: _config.errorCodes.HOST_VALUE_READ_FAILED,
        message: "host item scope/label could not be read: " +
          String(rawError && rawError.message ? rawError.message : rawError)
      });
      return true;
    }
    _rawFallbackCounts[raw.fallbackKey] = Number(_rawFallbackCounts[raw.fallbackKey] || 0) + 1;
    try {
      if (candidate.classification.status === "excluded") { return false; }
      if (candidate.classification.status !== "supported") {
        _diagnostics.push(buildUnknownDiagnostic(
          candidate.descriptor.itemName,
          candidate.descriptor.scopeId,
          candidate.definitionResult
        ));
        return false;
      }
      _candidates.push(candidate);
    } catch (error) {
      _diagnostics.push({ code: _config.errorCodes.RECONCILE_FAILED, message: String(error && error.message ? error.message : error) });
    }
    return false;
  }

  function __controller(_KDB) {
    var inventory = _listHostDescriptors(_singleSelectRuntime.readFiltersFacet(_KDB));
    var candidates = [];
    var diagnostics = [];
    var rawFallbackCounts = {};
    var uniquenessUnproven = inventory.uniquenessUnproven === true;
    var source = _getKennzahlenSource(_KDB);
    try {
      var definitionIndex = _definitions.createDefinitionIndex(_KDB, source);
      inventory.descriptors.forEach(function (_descriptor) {
        if (readHostItem(_KDB, _descriptor, source, definitionIndex, candidates, diagnostics, rawFallbackCounts)) {
          uniquenessUnproven = true;
        }
      });
      resolveSemanticInstanceKeys(candidates, diagnostics);
      return {
        candidates: candidates.filter(function (_candidate) { return _candidate.blocked !== true; }),
        diagnostics: diagnostics,
        rawFallbackCounts: rawFallbackCounts,
        uniquenessUnproven: uniquenessUnproven
      };
    } catch (error) {
      console.error("[singleSelect.enumerateFilterInstances] failed", error);
      throw error;
    }
  }

  return __controller;
});
