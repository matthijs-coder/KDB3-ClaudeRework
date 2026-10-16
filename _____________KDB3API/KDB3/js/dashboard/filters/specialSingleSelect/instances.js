define([
  "../singleSelect/selectors.js",
  "./config.js"
], function (_singleSelectSelectors, _config) {
  "use strict";

  var errorCodes = _config.ERROR_CODES;
  var LIVE_SPECIAL_QUERY = {
    status: "active",
    hostStatus: "present",
    filterType: "specialSingleSelect",
    selectionOwner: "singleSelect"
  };

  function normalizeValue(_value) {
    return _value == null ? "" : String(_value).trim().toLowerCase();
  }

  function readInventoryStatus(_inventory, _inventoryGeneration) {
    var inventory = _inventory || {};
    if (_inventoryGeneration != null && inventory.generation !== _inventoryGeneration) {
      return { ok: false, errorCode: errorCodes.INVENTORY_STALE };
    }
    if (inventory.freshness !== "fresh") {
      return { ok: false, errorCode: errorCodes.INVENTORY_NOT_READY };
    }
    return { ok: true, generation: inventory.generation };
  }

  function readLiveCandidates(_KDB) {
    return _singleSelectSelectors.readLiveInstances(_KDB, LIVE_SPECIAL_QUERY).map(function (_entry) {
      var selection = _entry.currentSelection;
      return Object.assign({}, _entry, {
        displayValue: selection ? selection.displayValue : null,
        useValue: selection ? selection.useValue : null,
        displaySource: selection ? selection.displaySource || null : null
      });
    });
  }

  function readDefinitionMatch(_entry, _definition) {
    var configuredCondition = normalizeValue(_definition && (_definition.filterId || _definition.condition));
    var entryCondition = normalizeValue(_entry && _entry.condition);
    var configuredLabel = normalizeValue(_definition && _definition.filterLabel);
    var configuredItemName = normalizeValue(_definition && _definition.itemName);
    var entryLabel = normalizeValue(_entry && _entry.filterLabel);
    var entryItemName = normalizeValue(_entry && _entry.itemName);
    if (configuredCondition && entryCondition) {
      return { matches: configuredCondition === entryCondition };
    }
    var labelMatches = configuredLabel && entryLabel === configuredLabel;
    var itemMatches = configuredItemName && entryItemName === configuredItemName;
    return { matches: !!(labelMatches || itemMatches) };
  }

  function validateSiblingIdentity(_items) {
    var ids = {};
    var byScope = {};
    var idx;
    for (idx = 0; idx < _items.length; idx += 1) {
      var item = _items[idx];
      if (!item.filterInstanceId || ids[item.filterInstanceId]) {
        return false;
      }
      ids[item.filterInstanceId] = true;
      var scopeKey = [
        normalizeValue(item.scopeType),
        normalizeValue(item.scopeId),
        normalizeValue(item.filterLabel),
        normalizeValue(item.itemName)
      ].join("|");
      byScope[scopeKey] = byScope[scopeKey] || [];
      byScope[scopeKey].push(item);
    }
    var scopeKeys = Object.keys(byScope);
    for (idx = 0; idx < scopeKeys.length; idx += 1) {
      var siblings = byScope[scopeKeys[idx]];
      if (siblings.length < 2) {
        continue;
      }
      var instanceKeys = {};
      var siblingIdx;
      for (siblingIdx = 0; siblingIdx < siblings.length; siblingIdx += 1) {
        var instanceKey = normalizeValue(siblings[siblingIdx].semanticInstanceKey);
        if (!instanceKey || instanceKeys[instanceKey]) {
          return false;
        }
        instanceKeys[instanceKey] = true;
      }
    }
    return true;
  }

  function resolveLiveSpecialInstances(_KDB, _definition, _inventoryGeneration) {
    try {
      var inventoryStatus = readInventoryStatus(_singleSelectSelectors.readInventoryStatus(_KDB), _inventoryGeneration);
      if (!inventoryStatus.ok) {
        return {
          ok: false,
          errorCode: inventoryStatus.errorCode,
          generation: inventoryStatus.generation,
          items: []
        };
      }
      var candidates = readLiveCandidates(_KDB);
      if (!normalizeValue(_definition && _definition.filterLabel) &&
        !normalizeValue(_definition && _definition.itemName)) {
        return {
          ok: false,
          errorCode: errorCodes.CONFIG_MISMATCH,
          generation: inventoryStatus.generation,
          items: []
        };
      }
      var matches = candidates.filter(function (_entry) {
        var definitionMatch = readDefinitionMatch(_entry, _definition);
        return definitionMatch.matches;
      });
      if (matches.length && validateSiblingIdentity(matches)) {
        return { ok: true, generation: inventoryStatus.generation, items: matches };
      }
      return {
        ok: false,
        errorCode: matches.length
          ? errorCodes.INSTANCE_AMBIGUOUS
          : errorCodes.INSTANCE_MISSING,
        generation: inventoryStatus.generation,
        items: []
      };
    } catch (_error) {
      console.error("[specialSingleSelect.resolveLiveSpecialInstances] failed", _error);
      return {
        ok: false,
        errorCode: errorCodes.POLICY_APPLY_FAILED,
        items: []
      };
    }
  }

  return {
    resolveLiveSpecialInstances: resolveLiveSpecialInstances
  };
});
