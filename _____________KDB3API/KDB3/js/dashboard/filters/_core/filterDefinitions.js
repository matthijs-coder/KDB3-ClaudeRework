/*
 * Filter owner kit: reading the configured filter definitions (_KDB.properties.filterPropObj).
 *
 * normalizeText(v)            "" for null/undefined, else String(v).trim()
 * normalizeLower(v)           normalizeText lowercased
 * isTrueish(v)                true, "true" or "trueish" (case-insensitive)
 * hasOwnFlag(definition, key) own, non-null, non-empty flag
 * createDefinitionIndex(_KDB, options) -> index
 *     Groups every `filterInstances` entry of the selected source configs by scope type and item name.
 *     options.source                    source key of filterPropObj; falsy: see allSourcesWhenNoSource
 *     options.allSourcesWhenNoSource    true: read every source when no source is given (singleSelect);
 *                                       false: read none (nativeMultiSelect)
 *     options.dedupeFields              fields that make two definitions equivalent (see the two constants)
 * readDefinition(_KDB, scopeType, itemName, itemId, index, options) -> { status: "ok" | "ambiguous" | "missing", definition }
 *     Instance definitions first (filtered by itemId when both sides have one), then the legacy
 *     globalFilters / pageContextFilters entry. index is optional; without it one is built from options.
 * SINGLE_SELECT_DEFINITION_OPTIONS / NATIVE_DEFINITION_OPTIONS
 *     The two policies in use. They differ in the source fallback and in the dedupe signature (native adds isNative).
 */
define([], function () {
  "use strict";

  var COMMON_DEDUPE_FIELDS = [
    "scopeType", "filterLabel", "itemName", "itemId", "instanceKey", "condition", "isSingleSelect", "isHierarchy"
  ];

  var SINGLE_SELECT_DEFINITION_OPTIONS = Object.freeze({
    allSourcesWhenNoSource: true,
    dedupeFields: Object.freeze(COMMON_DEDUPE_FIELDS.concat(["cascade"]))
  });

  var NATIVE_DEFINITION_OPTIONS = Object.freeze({
    allSourcesWhenNoSource: false,
    dedupeFields: Object.freeze(COMMON_DEDUPE_FIELDS.concat(["isNative", "cascade"]))
  });

  function normalizeText(_value) {
    return _value == null ? "" : String(_value).trim();
  }

  function normalizeLower(_value) {
    return _value == null ? "" : String(_value).trim().toLowerCase();
  }

  function isTrueish(_value) {
    return _value === true || normalizeLower(_value) === "true" || normalizeLower(_value) === "trueish";
  }

  function hasOwnFlag(_definition, _key) {
    return _definition != null && Object.prototype.hasOwnProperty.call(_definition, _key) &&
      _definition[_key] != null && normalizeLower(_definition[_key]) !== "";
  }

  function readLegacyDefinition(_sourceConfig, _scopeType, _itemName) {
    var definitions = _scopeType === "global"
      ? _sourceConfig && _sourceConfig.globalFilters
      : _sourceConfig && _sourceConfig.pageContextFilters;
    return definitions && definitions[_itemName] ? definitions[_itemName] : null;
  }

  function dedupeEquivalent(_entries, _fields) {
    var bySignature = {};
    _entries.forEach(function (_entry) {
      var signature = {};
      _fields.forEach(function (_field) { signature[_field] = _entry[_field] || null; });
      var key = JSON.stringify(signature);
      if (!bySignature[key]) { bySignature[key] = _entry; }
    });
    return Object.keys(bySignature).map(function (_key) { return bySignature[_key]; });
  }

  function readSourceConfigs(_KDB, _options) {
    var root = _KDB && _KDB.properties ? _KDB.properties.filterPropObj : null;
    var sourceKeys;
    if (_options.source) {
      sourceKeys = [_options.source];
    } else {
      sourceKeys = _options.allSourcesWhenNoSource ? Object.keys(root || {}) : [];
    }
    return sourceKeys.map(function (_sourceKey) { return root ? root[_sourceKey] : null; });
  }

  // Reconcile reads one definition per host item; the index scans the entries once per scan instead of per item.
  function createDefinitionIndex(_KDB, _options) {
    var options = Object.assign({}, SINGLE_SELECT_DEFINITION_OPTIONS, _options || {});
    var sourceConfigs = readSourceConfigs(_KDB, options);
    var byScopeAndName = Object.create(null);
    sourceConfigs.forEach(function (_sourceConfig) {
      var definitions = _sourceConfig && _sourceConfig.filterInstances;
      Object.keys(definitions || {}).forEach(function (_key) {
        var entry = definitions[_key];
        if (!entry) { return; }
        var scopeType = normalizeText(entry.scopeType);
        var itemName = normalizeText(entry.itemName || entry.filterLabel);
        var byName = byScopeAndName[scopeType] || (byScopeAndName[scopeType] = Object.create(null));
        (byName[itemName] || (byName[itemName] = [])).push(entry);
      });
    });
    return { sourceConfigs: sourceConfigs, byScopeAndName: byScopeAndName, dedupeFields: options.dedupeFields };
  }

  function matchesItemId(_entry, _itemId) {
    return !(_entry.itemId && _itemId && normalizeText(_entry.itemId) !== _itemId);
  }

  function readDefinition(_KDB, _scopeType, _itemName, _itemId, _index, _options) {
    var index = _index || createDefinitionIndex(_KDB, _options);
    var itemName = normalizeText(_itemName);
    var itemId = normalizeText(_itemId);
    var byName = index.byScopeAndName[_scopeType];
    var matches = ((byName && byName[itemName]) || []).filter(function (_entry) {
      return matchesItemId(_entry, itemId);
    });
    var legacyMatches = [];
    index.sourceConfigs.forEach(function (_sourceConfig) {
      var legacy = readLegacyDefinition(_sourceConfig, _scopeType, itemName);
      if (legacy && legacyMatches.indexOf(legacy) === -1) { legacyMatches.push(legacy); }
    });
    matches = dedupeEquivalent(matches, index.dedupeFields);
    legacyMatches = dedupeEquivalent(legacyMatches, index.dedupeFields);
    if (matches.length === 1) { return { status: "ok", definition: matches[0] }; }
    if (matches.length > 1) { return { status: "ambiguous", definition: null }; }
    if (legacyMatches.length === 1) { return { status: "ok", definition: legacyMatches[0] }; }
    return legacyMatches.length > 1
      ? { status: "ambiguous", definition: null }
      : { status: "missing", definition: null };
  }

  return {
    SINGLE_SELECT_DEFINITION_OPTIONS: SINGLE_SELECT_DEFINITION_OPTIONS,
    NATIVE_DEFINITION_OPTIONS: NATIVE_DEFINITION_OPTIONS,
    normalizeText: normalizeText,
    normalizeLower: normalizeLower,
    isTrueish: isTrueish,
    hasOwnFlag: hasOwnFlag,
    createDefinitionIndex: createDefinitionIndex,
    readDefinition: readDefinition
  };
});
