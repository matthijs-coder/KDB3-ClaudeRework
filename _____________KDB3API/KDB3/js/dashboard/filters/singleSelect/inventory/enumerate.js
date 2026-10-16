define([
  "./definitions.js",
  "../config.js",
  "../runtime.js",
  "../state/instance.js",
  "../../../../core/utils/getKennzahlenSource.js",
  "../../../../core/utils/normalizeCognosScopeId.js",
  "../../../../core/utils/kit/async.js",
  "../../../../core/utils/kit/errors.js"
], function (
  _definitions,
  _config,
  _singleSelectRuntime,
  _instance,
  _getKennzahlenSource,
  _normalizeScopeId,
  _kitAsync,
  _kitErrors
) {
  "use strict";

  var DEFAULT_TIMEOUT_MS = 3000;
  var MAX_TIMEOUT_MS = 10000;
  var RETRY_MS = 50;

  function readPartition(_filtersFacet, _input, _label) {
    var outcome = _filtersFacet.listFilterItems(_input);
    if (!outcome || outcome.ok !== true || !Array.isArray(outcome.data)) {
      throw new Error("cognosAPI.filters inventory methods unavailable (" + _label + ")");
    }
    return {
      items: outcome.data,
      degraded: outcome.outcome === "degraded"
    };
  }

  function listHostDescriptors(_filtersFacet) {
    var globalList;
    var pageList;
    if (!_filtersFacet || typeof _filtersFacet.listFilterItems !== "function") {
      throw new Error("cognosAPI.filters inventory methods unavailable");
    }
    globalList = readPartition(_filtersFacet, { scopeId: "global", includeValues: true }, "global");
    pageList = readPartition(
      _filtersFacet,
      { allPageContextScopes: true, includeValues: true },
      "pageContext"
    );
    return {
      descriptors: globalList.items.concat(pageList.items),
      uniquenessUnproven: globalList.degraded === true || pageList.degraded === true
    };
  }

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
    var identity = _instance.buildFilterInstanceId(raw.scopeType, raw.scopeId, itemId, raw.itemName);
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
      candidate = readCandidateFromDescriptor(_KDB, _descriptor, _source, _definitionIndex);
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

  function enumerateFilterInstances(_KDB) {
    var inventory = listHostDescriptors(_singleSelectRuntime.readFiltersFacet(_KDB));
    var candidates = [];
    var diagnostics = [];
    var rawFallbackCounts = {};
    var uniquenessUnproven = inventory.uniquenessUnproven === true;
    var source = _getKennzahlenSource(_KDB);
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
  }

  function readTimeout(_timeoutMs) {
    var value = Number(_timeoutMs);
    return isFinite(value) && value > 0 ? Math.min(value, MAX_TIMEOUT_MS) : DEFAULT_TIMEOUT_MS;
  }

  async function waitForFilterInventory(_KDB, _enumerate, _timeoutMs, _signal) {
    var outcome = await _kitAsync.pollUntil({
      check: function () { return _enumerate(_KDB); },
      predicate: function () { return true; },
      timeoutMs: readTimeout(_timeoutMs),
      intervalMs: RETRY_MS,
      signal: _signal
    });
    if (outcome.ok) {
      return outcome.value;
    }
    if (outcome.reason === "aborted") {
      throw new Error("reconcile aborted");
    }
    throw _kitErrors.codedError(
      _config.errorCodes.RECONCILE_TIMEOUT,
      "singleSelect filter inventory readiness timed out" +
        (outcome.lastError ? ": " + String(outcome.lastError.message || outcome.lastError) : ""),
      { cause: outcome.lastError }
    );
  }

  return {
    enumerateFilterInstances: enumerateFilterInstances,
    waitForFilterInventory: waitForFilterInventory
  };
});
