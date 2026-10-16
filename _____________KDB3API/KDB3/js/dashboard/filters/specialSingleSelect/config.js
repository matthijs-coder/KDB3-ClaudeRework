define([
  "../../../core/cognosHost/config/filterDockChromeSelectors.js"
], function (_filterDockChrome) {
  "use strict";

  var chrome = _filterDockChrome.filterDock.strings;

  var SPECIAL_FILTER_VARIANTS = [
    {
      filterId: "personengruppe",
      filterLabel: "Personengruppe",
      itemName: "Personengruppe",
      condition: "Personengruppe",
      rightTableKey: "personengruppe",
      optionTableKey: "personengruppe_filter",
      allowedSichtValues: ["BW"],
      sichtValueKind: "display"
    },
    {
      filterId: "dienststellenleitung",
      filterLabel: "Dienststellenleitung",
      itemName: "Dienststellenleitung",
      condition: "Dienststellenleitung",
      rightTableKey: "dienststellenleitung",
      optionTableKey: "dienststellenleitung_filter",
      allowedSichtValues: ["BW"],
      sichtValueKind: "display"
    }
  ];

  var DEFINITIONS_BY_ID = {};
  var DEFINITIONS_BY_LABEL = {};
  SPECIAL_FILTER_VARIANTS.forEach(function (_variant) {
    DEFINITIONS_BY_ID[_variant.filterId] = _variant;
    DEFINITIONS_BY_LABEL[_variant.filterLabel] = _variant;
  });

  var TABLE_KEYS = ["alle"]
    .concat(SPECIAL_FILTER_VARIANTS.map(function (_variant) { return _variant.rightTableKey; }))
    .concat(SPECIAL_FILTER_VARIANTS.map(function (_variant) { return _variant.optionTableKey; }));

  var ERROR_CODES = {
    INSTANCE_MISSING: "SPECIAL_SINGLE_SELECT_INSTANCE_MISSING",
    INVENTORY_NOT_READY: "SPECIAL_SINGLE_SELECT_INVENTORY_NOT_READY",
    INSTANCE_AMBIGUOUS: "SPECIAL_SINGLE_SELECT_INSTANCE_AMBIGUOUS",
    CONFIG_MISMATCH: "SPECIAL_SINGLE_SELECT_CONFIG_MISMATCH",
    POLICY_APPLY_FAILED: "SPECIAL_SINGLE_SELECT_POLICY_APPLY_FAILED",
    PARKED_SELECTION_INVALID: "SPECIAL_SINGLE_SELECT_PARKED_SELECTION_INVALID",
    INVENTORY_STALE: "SPECIAL_SINGLE_SELECT_INVENTORY_STALE",
    INVENTORY_PAYLOAD_INVALID: "SPECIAL_SINGLE_SELECT_INVENTORY_PAYLOAD_INVALID",
    POLICY_SYNC_SKIPPED: "SPECIAL_SINGLE_SELECT_POLICY_SYNC_SKIPPED",
    OWNER_CALLBACK_FAILED: "SPECIAL_SINGLE_SELECT_OWNER_CALLBACK_FAILED",
    SYNC_FAILED: "SPECIAL_SINGLE_SELECT_SYNC_FAILED",
    DISPATCH_FAILED: "SPECIAL_SINGLE_SELECT_DISPATCH_FAILED",
    DISPOSED: "SPECIAL_SINGLE_SELECT_DISPOSED",
    GENERIC: "SPECIAL_SINGLE_SELECT_ERROR"
  };

  var ROOT_SICHT_CLASS_BY_VALUE = {
    BW: "KDB_sssSicht_BW",
    DEZPV: "KDB_sssSicht_DEZPV"
  };

  var SELECTORS = {
    filterDockRootSelector: chrome.rootSelector,
    filterItemWrapperClass: chrome.filterItemWrapperClass,
    filterDataIdAttr: chrome.filterDataIdAttr,
    markerClass: "KDB_specialSingleSelect",
    rightClass: "KDB_SSS_right",
    alleOptionClass: "KDB_SSS_alleOption",
    rootSichtClassByValue: ROOT_SICHT_CLASS_BY_VALUE,
    rootSichtClassValues: Object.keys(ROOT_SICHT_CLASS_BY_VALUE).map(function (_value) {
      return ROOT_SICHT_CLASS_BY_VALUE[_value];
    })
  };

  function normalizeMatchValue(_value) {
    return _value != null ? String(_value).toLowerCase() : "";
  }

  function resolveByDefinitionField(_definitions, _value, _field) {
    var normalizedValue = normalizeMatchValue(_value);
    var filterIds;
    var idx;
    if (!normalizedValue) {
      return null;
    }
    filterIds = Object.keys(_definitions);
    for (idx = 0; idx < filterIds.length; idx += 1) {
      if (
        _definitions[filterIds[idx]] &&
        normalizeMatchValue(_definitions[filterIds[idx]][_field]) === normalizedValue
      ) {
        return filterIds[idx];
      }
    }
    return null;
  }

  function resolveSpecialFilterId(_definitions, _payload) {
    var payload = _payload || {};
    var canonicalId;
    if (!payload || typeof payload !== "object" || !_definitions) {
      return null;
    }
    if (payload.filterId && _definitions[payload.filterId]) {
      return payload.filterId;
    }
    canonicalId = resolveByDefinitionField(_definitions, payload.condition, "condition");
    return canonicalId || resolveByDefinitionField(_definitions, payload.filterLabel, "filterLabel");
  }

  return {
    SPECIAL_FILTER_VARIANTS: SPECIAL_FILTER_VARIANTS,
    DEFINITIONS_BY_ID: DEFINITIONS_BY_ID,
    DEFINITIONS_BY_LABEL: DEFINITIONS_BY_LABEL,
    TABLE_KEYS: TABLE_KEYS,
    ERROR_CODES: ERROR_CODES,
    SELECTORS: SELECTORS,
    resolveSpecialFilterId: resolveSpecialFilterId
  };
});
