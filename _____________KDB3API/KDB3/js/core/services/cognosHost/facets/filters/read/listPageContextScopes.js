define([
  "../refreshFilterIndex.js",
  "../buildFilterOutcome.js",
  "../config/filterErrorCodes.js"
], function (_refreshFilterIndex, _buildFilterOutcome, _filterErrorCodes) {
  "use strict";

  // Raw host scopes, not normalised ones: dienststelle feeds these straight back
  // into a scoped lookup and compares them literally. The name comparison is
  // exact for the same reason — the lookup that consumes these scopes compares
  // the name exactly, so trimming here would hand out a scope the lookup then
  // fails to resolve.
  function collectRawScopes(_descriptors, _itemName) {
    var scopes = [];
    var seen = {};
    var descriptor;
    var index;
    for (index = 0; index < _descriptors.length; index += 1) {
      descriptor = _descriptors[index];
      if (descriptor.itemName !== _itemName) {
        continue;
      }
      if (!descriptor.rawScopeId || seen[descriptor.rawScopeId] === true) {
        continue;
      }
      seen[descriptor.rawScopeId] = true;
      scopes.push(descriptor.rawScopeId);
    }
    return scopes;
  }

  function __controller(_ctx, _input) {
    var input = _input || {};
    var itemName = input.itemName == null ? "" : String(input.itemName);
    var refresh;
    var data;
    if (_ctx.isDisposed()) {
      return _buildFilterOutcome.buildDisposed();
    }
    if (!itemName) {
      return _buildFilterOutcome.buildFailed(_filterErrorCodes.INVALID_REF, []);
    }
    try {
      refresh = _refreshFilterIndex(_ctx, "pageContext");
      if (!refresh.ok) {
        return _buildFilterOutcome.buildFailed(refresh.errorCode, refresh.diagnostics);
      }
      data = collectRawScopes(refresh.descriptors, itemName);
      if (refresh.diagnostics.length > 0) {
        return _buildFilterOutcome.buildDegraded(data, refresh.diagnostics);
      }
      return _buildFilterOutcome.buildOk(data);
    } catch (error) {
      console.error("[cognosHost.filters.listPageContextScopes] failed", { itemName: itemName }, error);
      return _buildFilterOutcome.buildFailed(_filterErrorCodes.READ_FAILED, [
        _buildFilterOutcome.buildDiagnostic(_filterErrorCodes.READ_FAILED, error && error.message)
      ]);
    }
  }

  return __controller;
});
