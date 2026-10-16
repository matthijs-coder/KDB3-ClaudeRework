define([
  "../resolveFilterItemHandle.js",
  "../resolveFiltersHostApi.js",
  "../buildFilterOutcome.js",
  "../config/filterErrorCodes.js"
], function (
  _resolveFilterItemHandle,
  _resolveFiltersHostApi,
  _buildFilterOutcome,
  _filterErrorCodes
) {
  "use strict";

  // Values are read live from the handle, never from the indexed snapshot: a
  // write by another owner must be visible to the next read.
  function __controller(_ctx, _ref) {
    var resolved;
    var filtersApi;
    if (_ctx.isDisposed()) {
      return _buildFilterOutcome.buildDisposed();
    }
    try {
      resolved = _resolveFilterItemHandle(_ctx, _ref);
      if (!resolved.ok) {
        return _buildFilterOutcome.buildFailed(resolved.errorCode, resolved.diagnostics);
      }
      filtersApi = _resolveFiltersHostApi(_ctx._KDB);
      if (!filtersApi || typeof filtersApi.getFilterValues !== "function") {
        return _buildFilterOutcome.buildFailed(_filterErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      return _buildFilterOutcome.buildOk(filtersApi.getFilterValues(resolved.entry.handle) || []);
    } catch (error) {
      console.error("[cognosHost.filters.readFilterValues] failed", error);
      return _buildFilterOutcome.buildFailed(_filterErrorCodes.READ_FAILED, [
        _buildFilterOutcome.buildDiagnostic(_filterErrorCodes.READ_FAILED, error && error.message)
      ]);
    }
  }

  return __controller;
});
