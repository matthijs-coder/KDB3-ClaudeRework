define([
  "./state.js",
  "../../../core/utils/getKennzahlenSource.js"
], function (_state, _getKennzahlenSource) {
  "use strict";

  var stripTabpanel = _state.stripTabpanel;

  // Flat ref handed to the facet for reads and writes. scopeId carries the raw host string so a ref can be
  // fed straight back into a scoped lookup; the facet normalises it internally. sourceId is carried because
  // the history-replay path builds a fallback DTO out of the resolved ref.
  function buildRef(_descriptor) {
    if (!_descriptor) {
      return null;
    }
    return {
      itemId: _descriptor.itemId,
      itemName: _descriptor.itemName,
      sourceId: _descriptor.sourceId,
      scopeId: _descriptor.rawScopeId,
      rawScopeId: _descriptor.rawScopeId
    };
  }

  // ---------- filter definitions (claim) ----------

  function normalize(_value) {
    return _value == null ? "" : String(_value).trim();
  }

  function matchesInstance(_entry, _scopeType, _itemName, _itemId) {
    if (!_entry || normalize(_entry.scopeType) !== _scopeType) { return false; }
    if (normalize(_entry.itemName || _entry.filterLabel) !== _itemName) { return false; }
    if (_entry.itemId && _itemId && normalize(_entry.itemId) !== _itemId) { return false; }
    return true;
  }

  function readInstanceDefinitions(_sourceConfig, _scopeType, _itemName, _itemId) {
    var definitions = _sourceConfig && _sourceConfig.filterInstances;
    var matches = [];
    Object.keys(definitions || {}).forEach(function (_key) {
      var entry = definitions[_key];
      if (matchesInstance(entry, _scopeType, _itemName, _itemId)) {
        matches.push(entry);
      }
    });
    return matches;
  }

  function readLegacyDefinition(_sourceConfig, _scopeType, _itemName) {
    var definitions = _scopeType === "global"
      ? _sourceConfig && _sourceConfig.globalFilters
      : _sourceConfig && _sourceConfig.pageContextFilters;
    return definitions && definitions[_itemName] ? definitions[_itemName] : null;
  }

  function dedupeEquivalent(_entries) {
    var bySignature = {};
    _entries.forEach(function (_entry) {
      var signature = JSON.stringify({
        scopeType: _entry.scopeType || null,
        filterLabel: _entry.filterLabel || null,
        itemName: _entry.itemName || null,
        itemId: _entry.itemId || null,
        instanceKey: _entry.instanceKey || null,
        condition: _entry.condition || null,
        isSingleSelect: _entry.isSingleSelect || null,
        isHierarchy: _entry.isHierarchy || null,
        isNative: _entry.isNative || null,
        cascade: _entry.cascade || null
      });
      if (!bySignature[signature]) { bySignature[signature] = _entry; }
    });
    return Object.keys(bySignature).map(function (_key) { return bySignature[_key]; });
  }

  function readClaimDefinition(_KDB, _scopeType, _itemName, _itemId) {
    var root = _KDB && _KDB.properties ? _KDB.properties.filterPropObj : null;
    var itemName = normalize(_itemName);
    var itemId = normalize(_itemId);
    var source = _getKennzahlenSource(_KDB);
    var sourceKeys = source ? [source] : [];
    var matches = [];
    var legacyMatches = [];
    sourceKeys.forEach(function (_sourceKey) {
      var sourceConfig = root ? root[_sourceKey] : null;
      matches = matches.concat(readInstanceDefinitions(sourceConfig, _scopeType, itemName, itemId));
      var legacy = readLegacyDefinition(sourceConfig, _scopeType, itemName);
      if (legacy && legacyMatches.indexOf(legacy) === -1) { legacyMatches.push(legacy); }
    });
    matches = dedupeEquivalent(matches);
    legacyMatches = dedupeEquivalent(legacyMatches);
    if (matches.length === 1) { return { status: "ok", definition: matches[0] }; }
    if (matches.length > 1) { return { status: "ambiguous", definition: null }; }
    if (legacyMatches.length === 1) { return { status: "ok", definition: legacyMatches[0] }; }
    return legacyMatches.length > 1
      ? { status: "ambiguous", definition: null }
      : { status: "missing", definition: null };
  }

  // ---------- ownership policy ----------

  function normalized(_value) {
    return _value == null ? "" : String(_value).trim().toLowerCase();
  }

  function isTrueish(_value) {
    return _value === true || normalized(_value) === "true" || normalized(_value) === "trueish";
  }

  function hasOwnFlag(_definition, _key) {
    return _definition != null && Object.prototype.hasOwnProperty.call(_definition, _key) &&
      _definition[_key] != null && normalized(_definition[_key]) !== "";
  }

  // Ownership policy over a flat descriptor. This is KDB domain logic and stays with the owner: the cognosHost
  // filters facet only translates host items into descriptors, it does not decide which filter belongs to which owner.
  function isUnownedFilterDescriptor(_KDB, _descriptor) {
    try {
      var descriptor = _descriptor || {};
      var itemId = String(descriptor.itemId || "").trim();
      if (!itemId) { return false; }
      var scope = String(descriptor.rawScopeId || "").trim();
      if (!scope) { return false; }
      var scopeType = stripTabpanel(scope) === "global" ? "global" : "pageContext";
      var itemName = String(descriptor.itemName || "");
      if (normalized(itemName).indexOf("dienststelle") === 0) { return false; }
      var definitionResult = readClaimDefinition(_KDB, scopeType, itemName, itemId);
      if (definitionResult.status !== "ok" || !definitionResult.definition) { return true; }
      var definition = definitionResult.definition;
      if (isTrueish(definition.isHierarchy) || normalized(definition.cascade) === "downstream") { return false; }
      if (normalized(definition.condition) === "personengruppe" || normalized(definition.condition) === "dienststellenleitung") { return false; }
      if (isTrueish(definition.isSingleSelect)) { return false; }
      if (isTrueish(definition.isNative)) { return true; }
      if (!hasOwnFlag(definition, "isHierarchy") && !hasOwnFlag(definition, "isSingleSelect")) { return false; }
      return true;
    } catch (error) {
      console.error("[nativeMultiSelect.isUnownedFilterDescriptor] failed", error);
      return false;
    }
  }

  // ---------- inventory reads ----------

  // Projection back to the four-field DTO this module has always emitted. The facet descriptor carries more
  // (scopeType, scopeId, rawScopeId), but this DTO is serialised into tab-mutation snapshots, history slices
  // and writeback payloads, so extra keys would silently change stored payloads.
  function toOwnedItemDto(_descriptor) {
    return {
      itemId: _descriptor.itemId,
      itemName: _descriptor.itemName,
      sourceId: _descriptor.sourceId,
      values: _descriptor.values || []
    };
  }

  // The facet already restricts the inventory to the requested scope; the ownership filter is the only
  // remaining decision. Fails closed on anything but a complete inventory: this DTO is persisted into writeback
  // payloads, tab-mutation snapshots and history slices, so a partial list must never pass for a complete one.
  function listUnownedItems(_KDB, _scopeId, _filtersFacet) {
    var outcome;
    var descriptors;
    var result;
    var index;
    try {
      if (!_filtersFacet) { return []; }
      outcome = _filtersFacet.listFilterItems({ scopeId: _scopeId, includeValues: true });
      if (!outcome || outcome.outcome !== "ok") {
        if (outcome && outcome.diagnostics && outcome.diagnostics.length > 0) {
          console.error("[nativeMultiSelect.listUnownedItems] incomplete inventory", {
            scopeId: _scopeId, outcome: outcome.outcome, diagnostics: outcome.diagnostics
          });
        }
        return [];
      }
      descriptors = outcome.data || [];
      result = [];
      for (index = 0; index < descriptors.length; index += 1) {
        if (!isUnownedFilterDescriptor(_KDB, descriptors[index])) { continue; }
        result.push(toOwnedItemDto(descriptors[index]));
      }
      return result;
    } catch (error) {
      console.error("[nativeMultiSelect.listUnownedItems] failed", error);
      return [];
    }
  }

  // Scope ids ("global" first, then every page scope that holds an unowned item) for a clear without tab targets.
  function listAllUnownedScopes(_KDB, _filtersFacet) {
    var result = ["global"];
    var seen = { global: true };
    var outcome;
    var descriptors;
    var scopeId;
    var idx;
    if (!_filtersFacet) { return result; }
    outcome = _filtersFacet.listFilterItems({ allPageContextScopes: true });
    if (!outcome || outcome.ok !== true) { return result; }
    descriptors = outcome.data || [];
    for (idx = 0; idx < descriptors.length; idx += 1) {
      if (!isUnownedFilterDescriptor(_KDB, descriptors[idx])) { continue; }
      scopeId = stripTabpanel(descriptors[idx].rawScopeId);
      if (!scopeId || seen[scopeId]) { continue; }
      seen[scopeId] = true;
      result.push(scopeId);
    }
    return result;
  }

  // Lookup by item id. nativeMultiSelect compares scopes normalised, which is exactly what the facet's ref
  // resolution does, so findFilterItem is a faithful replacement for a hand-rolled scan.
  function lookupRef(_KDB, _itemId, _scopeId, _filtersFacet) {
    var itemId = String(_itemId || "").trim();
    var outcome;
    try {
      if (!itemId || !_filtersFacet) { return null; }
      outcome = _filtersFacet.findFilterItem({ itemId: itemId, scopeId: _scopeId });
      if (!outcome || outcome.ok !== true || !outcome.data) { return null; }
      return buildRef(outcome.data);
    } catch (error) {
      console.error("[nativeMultiSelect.lookupRef] failed", error);
      return null;
    }
  }

  // Lookup by label. Unlike the id lookup this applies the ownership policy, so it scans descriptors itself
  // instead of using findFilterItem: deciding which filter belongs to nativeMultiSelect is owner logic.
  function lookupRefByName(_KDB, _itemName, _scopeId, _filtersFacet) {
    var nm = String(_itemName || "").trim();
    var targetScope;
    var outcome;
    var descriptors;
    var descriptor;
    var idx;
    try {
      if (!nm || !_filtersFacet) { return null; }
      targetScope = stripTabpanel(_scopeId);
      outcome = _filtersFacet.listFilterItems({ scopeId: _scopeId });
      if (!outcome || outcome.ok !== true) { return null; }
      descriptors = outcome.data || [];
      for (idx = 0; idx < descriptors.length; idx += 1) {
        descriptor = descriptors[idx];
        if (!isUnownedFilterDescriptor(_KDB, descriptor)) { continue; }
        if (String(descriptor.itemName || "").trim() !== nm) { continue; }
        if (targetScope !== "global" && stripTabpanel(descriptor.rawScopeId) !== targetScope) { continue; }
        return buildRef(descriptor);
      }
      return null;
    } catch (error) {
      console.error("[nativeMultiSelect.lookupRefByName] failed", error);
      return null;
    }
  }

  return {
    buildRef: buildRef,
    readClaimDefinition: readClaimDefinition,
    isUnownedFilterDescriptor: isUnownedFilterDescriptor,
    listUnownedItems: listUnownedItems,
    listAllUnownedScopes: listAllUnownedScopes,
    lookupRef: lookupRef,
    lookupRefByName: lookupRefByName
  };
});
