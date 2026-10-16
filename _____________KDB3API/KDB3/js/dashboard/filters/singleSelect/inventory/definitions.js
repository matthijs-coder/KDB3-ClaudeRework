define([], function () {
  "use strict";

  function normalize(_value) {
    return _value == null ? "" : String(_value).trim();
  }

  function normalizedLower(_value) {
    return _value == null ? "" : String(_value).trim().toLowerCase();
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
        cascade: _entry.cascade || null
      });
      if (!bySignature[signature]) { bySignature[signature] = _entry; }
    });
    return Object.keys(bySignature).map(function (_key) { return bySignature[_key]; });
  }

  function readSourceConfigs(_KDB, _source) {
    var root = _KDB && _KDB.properties ? _KDB.properties.filterPropObj : null;
    var sourceKeys = _source ? [_source] : Object.keys(root || {});
    return sourceKeys.map(function (_sourceKey) { return root ? root[_sourceKey] : null; });
  }

  // Reconcile reads one definition per host item. The index groups every source's filterInstances
  // by scopeType and item name once, so readFilterDefinition(..., index) does not rescan them.
  function createDefinitionIndex(_KDB, _source) {
    var sourceConfigs = readSourceConfigs(_KDB, _source);
    var byScopeAndName = Object.create(null);
    sourceConfigs.forEach(function (_sourceConfig) {
      var definitions = _sourceConfig && _sourceConfig.filterInstances;
      Object.keys(definitions || {}).forEach(function (_key) {
        var entry = definitions[_key];
        if (!entry) { return; }
        var scopeType = normalize(entry.scopeType);
        var itemName = normalize(entry.itemName || entry.filterLabel);
        var byName = byScopeAndName[scopeType] || (byScopeAndName[scopeType] = Object.create(null));
        (byName[itemName] || (byName[itemName] = [])).push(entry);
      });
    });
    return { sourceConfigs: sourceConfigs, byScopeAndName: byScopeAndName };
  }

  function readIndexedInstanceDefinitions(_index, _scopeType, _itemName, _itemId) {
    var byName = _index.byScopeAndName[_scopeType];
    var entries = (byName && byName[_itemName]) || [];
    return entries.filter(function (_entry) {
      return matchesInstance(_entry, _scopeType, _itemName, _itemId);
    });
  }

  function readFilterDefinition(_KDB, _source, _scopeType, _itemName, _itemId, _index) {
    var itemName = normalize(_itemName);
    var itemId = normalize(_itemId);
    var sourceConfigs = _index ? _index.sourceConfigs : readSourceConfigs(_KDB, _source);
    var matches = _index ? readIndexedInstanceDefinitions(_index, _scopeType, itemName, itemId) : [];
    var legacyMatches = [];
    sourceConfigs.forEach(function (_sourceConfig) {
      if (!_index) {
        matches = matches.concat(readInstanceDefinitions(_sourceConfig, _scopeType, itemName, itemId));
      }
      var legacy = readLegacyDefinition(_sourceConfig, _scopeType, itemName);
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

  function isTrueish(_value) {
    return _value === true || normalizedLower(_value) === "true" || normalizedLower(_value) === "trueish";
  }

  function hasOwnFlag(_definition, _key) {
    return _definition != null && Object.prototype.hasOwnProperty.call(_definition, _key) &&
      _definition[_key] != null && normalizedLower(_definition[_key]) !== "";
  }

  function classifyFilterInstance(_definitionResult, _itemName, _scopeType) {
    var name = normalizedLower(_itemName);
    var result = _definitionResult || {};
    var definition = result.definition || null;
    var condition = normalizedLower(definition && definition.condition);
    if (name === "dienststelle" || name === "dienststelle_bw" || name === "dienststelle_dezpv") {
      return { status: "excluded", filterType: "dienststelle", selectionOwner: "dienststelle" };
    }
    if (_scopeType === "global" && name === "sicht") {
      return { status: "supported", filterType: "sicht", selectionOwner: "sicht" };
    }
    if (result.status !== "ok" || !definition) {
      return { status: "unknown", filterType: "unknown", selectionOwner: null };
    }
    if (isTrueish(definition.isHierarchy) || normalizedLower(definition.cascade) === "downstream") {
      return { status: "excluded", filterType: "dienststelle", selectionOwner: "dienststelle" };
    }
    if (condition === "personengruppe" || condition === "dienststellenleitung") {
      return { status: "supported", filterType: "specialSingleSelect", selectionOwner: "singleSelect" };
    }
    if (isTrueish(definition.isSingleSelect)) {
      return { status: "supported", filterType: "singleSelect", selectionOwner: "singleSelect" };
    }
    var hierarchyFlagPresent = hasOwnFlag(definition, "isHierarchy");
    var singleSelectFlagPresent = hasOwnFlag(definition, "isSingleSelect");
    if (!hierarchyFlagPresent && !singleSelectFlagPresent) {
      return { status: "supported", filterType: "singleSelect", selectionOwner: "singleSelect" };
    }
    return { status: "unknown", filterType: "unknown", selectionOwner: null };
  }

  return {
    createDefinitionIndex: createDefinitionIndex,
    readFilterDefinition: readFilterDefinition,
    classifyFilterInstance: classifyFilterInstance
  };
});
