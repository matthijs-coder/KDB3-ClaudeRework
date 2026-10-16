define([
  "../resolveFilterItemHandle.js",
  "../buildFilterOutcome.js",
  "../config/filterErrorCodes.js"
], function (_resolveFilterItemHandle, _buildFilterOutcome, _filterErrorCodes) {
  "use strict";

  function projectDescriptor(_descriptor) {
    return {
      itemId: _descriptor.itemId,
      itemName: _descriptor.itemName,
      sourceId: _descriptor.sourceId,
      scopeType: _descriptor.scopeType,
      scopeId: _descriptor.scopeId,
      rawScopeId: _descriptor.rawScopeId
    };
  }

  function __controller(_ctx, _ref) {
    var resolved;
    if (_ctx.isDisposed()) {
      return _buildFilterOutcome.buildDisposed();
    }
    try {
      resolved = _resolveFilterItemHandle(_ctx, _ref);
      if (resolved.ok) {
        return _buildFilterOutcome.buildOk(projectDescriptor(resolved.entry.descriptor));
      }
      // "Not found" is the normal answer the existing lookups give (null), not a
      // failure: callers treat it as a skip. Only host problems are failures.
      if (resolved.errorCode === _filterErrorCodes.ITEM_NOT_FOUND) {
        return _buildFilterOutcome.buildOk(null);
      }
      return _buildFilterOutcome.buildFailed(resolved.errorCode, resolved.diagnostics);
    } catch (error) {
      console.error("[cognosHost.filters.findFilterItem] failed", error);
      return _buildFilterOutcome.buildFailed(_filterErrorCodes.READ_FAILED, [
        _buildFilterOutcome.buildDiagnostic(_filterErrorCodes.READ_FAILED, error && error.message)
      ]);
    }
  }

  return __controller;
});
