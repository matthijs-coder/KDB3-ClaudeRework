define([], function () {
  "use strict";

  function readNormalizedString(_value) {
    if (_value == null) {
      return "";
    }
    return String(_value).trim();
  }

  function matchesScopeAndLabel(_entry, _scopeType, _filterLabel) {
    return (
      readNormalizedString(_entry && _entry.scopeType) === _scopeType &&
      readNormalizedString(_entry && _entry.filterLabel) === _filterLabel
    );
  }

  function readConfiguredFilterInstances(_KDB, _source) {
    var filterPropObj = _KDB && _KDB.properties ? _KDB.properties.filterPropObj : null;
    var sourceCfg = filterPropObj && _source ? filterPropObj[_source] : null;
    return sourceCfg && sourceCfg.filterInstances ? sourceCfg.filterInstances : null;
  }

  function resolveDefinitionEntry(_KDB, _scopeType, _filterLabel, _itemIdHint, _source) {
    var definitions = readConfiguredFilterInstances(_KDB, _source);
    var keys;
    var idx;
    var entry;
    var matches = [];
    var itemIdMatches = [];

    if (!definitions || typeof definitions !== "object") {
      return null;
    }
    keys = Object.keys(definitions);
    for (idx = 0; idx < keys.length; idx += 1) {
      entry = definitions[keys[idx]];
      if (matchesScopeAndLabel(entry, _scopeType, _filterLabel)) {
        matches.push(entry);
      }
    }
    if (matches.length === 1) {
      return matches[0];
    }
    if (!_itemIdHint) {
      return null;
    }
    for (idx = 0; idx < matches.length; idx += 1) {
      if (readNormalizedString(matches[idx].itemId) === _itemIdHint) {
        itemIdMatches.push(matches[idx]);
      }
    }
    return itemIdMatches.length === 1 ? itemIdMatches[0] : null;
  }

  function __controller(_KDB, _scopeType, _filterLabel, _filterConfig, _source) {
    var normalizedFilterLabel;
    var itemNameHint;
    var itemIdHint;
    var definitionEntry;
    try {
      normalizedFilterLabel = readNormalizedString(_filterLabel);
      itemNameHint = readNormalizedString(_filterConfig && _filterConfig.itemName) || normalizedFilterLabel;
      itemIdHint = readNormalizedString(_filterConfig && _filterConfig.itemId);
      definitionEntry = resolveDefinitionEntry(
        _KDB,
        _scopeType,
        normalizedFilterLabel,
        itemIdHint,
        _source
      );
      if (definitionEntry) {
        itemNameHint = readNormalizedString(definitionEntry.itemName) || itemNameHint;
        itemIdHint = readNormalizedString(definitionEntry.itemId) || itemIdHint;
      }
      return {
        itemNameHint: itemNameHint || normalizedFilterLabel || null,
        itemIdHint: itemIdHint || null,
        semanticInstanceKeyHint:
          definitionEntry && readNormalizedString(definitionEntry.instanceKey)
            ? readNormalizedString(definitionEntry.instanceKey)
            : null
      };
    } catch (error) {
      console.error("[filterDock.readFilterInstanceHints] failed", error);
      return {
        itemNameHint: readNormalizedString(_filterLabel) || null,
        itemIdHint: null,
        semanticInstanceKeyHint: null
      };
    }
  }

  return __controller;
});
