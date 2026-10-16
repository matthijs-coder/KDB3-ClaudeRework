define([
  "./buildFilterItemKeys.js"
], function (_buildFilterItemKeys) {
  "use strict";

  // Live host item -> flat FilterItemDescriptor. Field-for-field the same reads
  // the owners perform today, so the descriptor carries no more and no less
  // information than the callers already had.

  function readItemId(_filtersApi, _item) {
    if (typeof _filtersApi.getFilterItemId === "function") {
      return String(_filtersApi.getFilterItemId(_item) || "");
    }
    // dienststelle/resolveHierarchyItemId falls back to the raw getter.
    if (_item && typeof _item.getItemId === "function") {
      return String(_item.getItemId() || "");
    }
    return "";
  }

  function readItemName(_filtersApi, _item) {
    if (typeof _filtersApi.getFilterItemLabel === "function") {
      return String(_filtersApi.getFilterItemLabel(_item) || "");
    }
    if (_item && typeof _item.getItemName === "function") {
      return String(_item.getItemName() || "");
    }
    return "";
  }

  function readRawScope(_filtersApi, _item) {
    if (_item && typeof _item.getScope === "function") {
      return String(_item.getScope() || "");
    }
    if (typeof _filtersApi.getFilterScope === "function") {
      return String(_filtersApi.getFilterScope(_item) || "");
    }
    return "";
  }

  function readSourceId(_filtersApi, _item) {
    if (typeof _filtersApi.getFilterSourceId === "function") {
      return String(_filtersApi.getFilterSourceId(_item) || "");
    }
    return "";
  }

  function readValues(_filtersApi, _item) {
    if (typeof _filtersApi.getFilterValues !== "function") {
      return [];
    }
    return _filtersApi.getFilterValues(_item) || [];
  }

  // scopeType comes from the inventory pass, not from the item: it records which
  // host list the item was read from. A page-context item whose scope normalises
  // to "global" therefore stays in the pageContext partition and is unreachable
  // through a global lookup, exactly as it is today.
  function __controller(_filtersApi, _item, _includeValues, _scopeType) {
    var rawScopeId = readRawScope(_filtersApi, _item);
    var scope = _buildFilterItemKeys.buildScopeContext(rawScopeId);
    var descriptor = {
      itemId: readItemId(_filtersApi, _item),
      itemName: readItemName(_filtersApi, _item),
      sourceId: readSourceId(_filtersApi, _item),
      scopeType: _scopeType,
      scopeId: scope.scopeId,
      rawScopeId: rawScopeId
    };
    if (_includeValues === true) {
      descriptor.values = readValues(_filtersApi, _item);
    }
    return descriptor;
  }

  return __controller;
});
