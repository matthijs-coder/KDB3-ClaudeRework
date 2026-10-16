define([
  "../buildFilterItemKeys.js",
  "../refreshFilterIndex.js",
  "../buildFilterOutcome.js"
], function (_buildFilterItemKeys, _refreshFilterIndex, _buildFilterOutcome) {
  "use strict";

  // Full inventory of one scope, flattened to descriptors. Reads the host on
  // every call, like the owner inventories it replaces; the index is refreshed
  // as a side effect of the same pass.

  function projectDescriptor(_descriptor, _includeValues) {
    var projected = {
      itemId: _descriptor.itemId,
      itemName: _descriptor.itemName,
      sourceId: _descriptor.sourceId,
      scopeType: _descriptor.scopeType,
      scopeId: _descriptor.scopeId,
      rawScopeId: _descriptor.rawScopeId
    };
    if (_includeValues === true) {
      // Copy: the caller must not be able to mutate the indexed snapshot.
      projected.values = (_descriptor.values || []).slice();
    }
    return projected;
  }

  // allPageContextScopes is an explicit opt-in, never a consequence of a missing
  // scopeId: an accidentally empty scope must keep matching nothing, exactly as
  // it did before. dienststelle needs the whole partition for its hierarchy
  // lookup, which matches on an itemId suffix across every scope at once.
  function selectDescriptors(_descriptors, _scope, _input) {
    var selected = [];
    var wantsWholePartition = _input.allPageContextScopes === true;
    var index;
    for (index = 0; index < _descriptors.length; index += 1) {
      if (wantsWholePartition || _descriptors[index].scopeId === _scope.scopeId) {
        selected.push(projectDescriptor(_descriptors[index], _input.includeValues));
      }
    }
    return selected;
  }

  function __controller(_ctx, _input) {
    var input = _input || {};
    var scope;
    var refresh;
    var data;
    if (_ctx.isDisposed()) {
      return _buildFilterOutcome.buildDisposed();
    }
    try {
      scope = input.allPageContextScopes === true
        ? { scopeType: "pageContext", scopeId: "" }
        : _buildFilterItemKeys.buildScopeContext(input.scopeId);
      refresh = _refreshFilterIndex(_ctx, scope.scopeType);
      if (!refresh.ok) {
        return _buildFilterOutcome.buildFailed(refresh.errorCode, refresh.diagnostics);
      }
      data = selectDescriptors(refresh.descriptors, scope, input);
      if (refresh.diagnostics.length > 0) {
        return _buildFilterOutcome.buildDegraded(data, refresh.diagnostics);
      }
      return _buildFilterOutcome.buildOk(data);
    } catch (error) {
      console.error("[cognosHost.filters.listFilterItems] failed", { scopeId: input.scopeId }, error);
      return _buildFilterOutcome.buildFailed("FILTERS_READ_FAILED", [
        _buildFilterOutcome.buildDiagnostic("FILTERS_READ_FAILED", error && error.message)
      ]);
    }
  }

  return __controller;
});
