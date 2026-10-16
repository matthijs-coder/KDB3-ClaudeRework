define([
  "../../outcome.js",
  "../../errorCodes.js",
  "./filterIndex.js"
], function (_outcome, _errorCodes, _filterIndex) {
  "use strict";

  // Read ops of the filters facet: listFilterItems, findFilterItem, readFilterValues,
  // listPageContextScopes. A missing item is the normal answer of the lookups (ok(null)), only
  // host problems are failures.
  var CODES = _errorCodes.filters;

  function buildReadFailed(_error) {
    return _outcome.buildFailed(CODES.READ_FAILED, [
      _outcome.buildDiagnostic(CODES.READ_FAILED, _error && _error.message)
    ]);
  }

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

  // allPageContextScopes is an explicit opt-in, never a consequence of a missing scopeId: an
  // accidentally empty scope must keep matching nothing. dienststelle needs the whole partition
  // for its hierarchy lookup, which matches on an itemId suffix across every scope at once.
  function selectDescriptors(_descriptors, _scope, _input) {
    var wantsWholePartition = _input.allPageContextScopes === true;
    return _descriptors
      .filter(function inScope(_descriptor) {
        return wantsWholePartition || _descriptor.scopeId === _scope.scopeId;
      })
      .map(function project(_descriptor) {
        return projectDescriptor(_descriptor, _input.includeValues);
      });
  }

  function buildInventoryOutcome(_refresh, _data) {
    return _refresh.diagnostics.length > 0
      ? _outcome.buildDegraded(_data, _refresh.diagnostics)
      : _outcome.buildOk(_data);
  }

  // Full inventory of one scope. Reads the host on every call; the index is refreshed as a
  // side effect of the same pass.
  function listFilterItems(_ctx, _input) {
    var input = _input || {};
    var scope;
    var refresh;
    if (_ctx.isDisposed()) {
      return _outcome.buildDisposed();
    }
    try {
      scope = input.allPageContextScopes === true
        ? { scopeType: "pageContext", scopeId: "" }
        : _filterIndex.buildScopeContext(input.scopeId);
      refresh = _filterIndex.refreshFilterIndex(_ctx, scope.scopeType);
      if (!refresh.ok) {
        return _outcome.buildFailed(refresh.errorCode, refresh.diagnostics);
      }
      return buildInventoryOutcome(refresh, selectDescriptors(refresh.descriptors, scope, input));
    } catch (error) {
      console.error("[cognosHost.filters.listFilterItems] failed", { scopeId: input.scopeId }, error);
      return buildReadFailed(error);
    }
  }

  function findFilterItem(_ctx, _ref) {
    var resolved;
    if (_ctx.isDisposed()) {
      return _outcome.buildDisposed();
    }
    try {
      resolved = _filterIndex.resolveFilterItemHandle(_ctx, _ref);
      if (resolved.ok) {
        return _outcome.buildOk(projectDescriptor(resolved.entry.descriptor, false));
      }
      if (resolved.errorCode === CODES.ITEM_NOT_FOUND) {
        return _outcome.buildOk(null);
      }
      return _outcome.buildFailed(resolved.errorCode, resolved.diagnostics);
    } catch (error) {
      console.error("[cognosHost.filters.findFilterItem] failed", error);
      return buildReadFailed(error);
    }
  }

  // Values are read live from the handle, never from the indexed snapshot: a write by another
  // owner must be visible to the next read.
  function readFilterValues(_ctx, _ref) {
    var resolved;
    var filtersApi;
    if (_ctx.isDisposed()) {
      return _outcome.buildDisposed();
    }
    try {
      resolved = _filterIndex.resolveFilterItemHandle(_ctx, _ref);
      if (!resolved.ok) {
        return _outcome.buildFailed(resolved.errorCode, resolved.diagnostics);
      }
      filtersApi = _filterIndex.resolveFilterMethodApi(_ctx._KDB, "getFilterValues");
      if (!filtersApi) {
        return _outcome.buildFailed(CODES.HOST_CAPABILITY_MISSING, []);
      }
      return _outcome.buildOk(filtersApi.getFilterValues(resolved.entry.handle) || []);
    } catch (error) {
      console.error("[cognosHost.filters.readFilterValues] failed", error);
      return buildReadFailed(error);
    }
  }

  // Raw host scopes, not normalised ones: dienststelle feeds these straight back into a scoped
  // lookup and compares them literally. The name comparison is exact for the same reason.
  function collectRawScopes(_descriptors, _itemName) {
    var scopes = [];
    _descriptors.forEach(function collect(_descriptor) {
      if (_descriptor.itemName === _itemName && _descriptor.rawScopeId && scopes.indexOf(_descriptor.rawScopeId) === -1) {
        scopes.push(_descriptor.rawScopeId);
      }
    });
    return scopes;
  }

  function listPageContextScopes(_ctx, _input) {
    var input = _input || {};
    var itemName = input.itemName == null ? "" : String(input.itemName);
    var refresh;
    if (_ctx.isDisposed()) {
      return _outcome.buildDisposed();
    }
    if (!itemName) {
      return _outcome.buildFailed(CODES.INVALID_REF, []);
    }
    try {
      refresh = _filterIndex.refreshFilterIndex(_ctx, "pageContext");
      if (!refresh.ok) {
        return _outcome.buildFailed(refresh.errorCode, refresh.diagnostics);
      }
      return buildInventoryOutcome(refresh, collectRawScopes(refresh.descriptors, itemName));
    } catch (error) {
      console.error("[cognosHost.filters.listPageContextScopes] failed", { itemName: itemName }, error);
      return buildReadFailed(error);
    }
  }

  return {
    listFilterItems: listFilterItems,
    findFilterItem: findFilterItem,
    readFilterValues: readFilterValues,
    listPageContextScopes: listPageContextScopes
  };
});
