define([
  "../../../../core/utils/getKennzahlenSource.js"
], function (_getKennzahlenSource) {
  "use strict";

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
    try {
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
    } catch (error) {
      console.error("[nativeMultiSelect.readClaimDefinition] failed", error);
      throw error;
    }
  }

  return readClaimDefinition;
});
