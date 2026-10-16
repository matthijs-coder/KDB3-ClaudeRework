define([
  "./config/filterErrorCodes.js",
  "./resolveFiltersHostApi.js"
], function (_filterErrorCodes, _resolveFiltersHostApi) {
  "use strict";

  // One inventory pass over the host list that belongs to the requested scope
  // type. Which list is read is driven by the caller's scope, exactly as the
  // owner lookups do today.

  function readGlobalItems(_filtersApi) {
    if (typeof _filtersApi.getAllGlobalFilterItems !== "function") {
      return { ok: false, errorCode: _filterErrorCodes.HOST_CAPABILITY_MISSING };
    }
    return { ok: true, items: _filtersApi.getAllGlobalFilterItems() || [] };
  }

  // Same predicate as cognosAPI/filters/listPageContextFilterItems.js, applied
  // to the raw fallback list so the page partition can never absorb a global
  // item.
  function isPageContextScope(_filterItem) {
    return _filterItem.getScope() !== "global";
  }

  // Page context: getAllPageContextFilterItems is the pre-filtered list
  // (scope !== "global"); getPageContextItemsArr is the raw list dienststelle
  // uses and filters itself. Filtering the fallback keeps both paths identical.
  function readPageContextItems(_filtersApi) {
    if (typeof _filtersApi.getAllPageContextFilterItems === "function") {
      return { ok: true, items: _filtersApi.getAllPageContextFilterItems() || [] };
    }
    if (typeof _filtersApi.getPageContextItemsArr === "function") {
      return { ok: true, items: (_filtersApi.getPageContextItemsArr(true) || []).filter(isPageContextScope) };
    }
    return { ok: false, errorCode: _filterErrorCodes.HOST_CAPABILITY_MISSING };
  }

  function __controller(_KDB, _scopeType) {
    var filtersApi = _resolveFiltersHostApi(_KDB);
    if (!filtersApi) {
      return { ok: false, errorCode: _filterErrorCodes.HOST_UNAVAILABLE };
    }
    try {
      if (_scopeType === "global") {
        return withApi(filtersApi, readGlobalItems(filtersApi));
      }
      return withApi(filtersApi, readPageContextItems(filtersApi));
    } catch (error) {
      console.error("[cognosHost.filters.readHostFilterItems] inventory failed", { scopeType: _scopeType }, error);
      return { ok: false, errorCode: _filterErrorCodes.INVENTORY_FAILED, filtersApi: filtersApi };
    }
  }

  function withApi(_filtersApi, _result) {
    _result.filtersApi = _filtersApi;
    return _result;
  }

  return __controller;
});
