define([], function () {
  "use strict";

  // Host choke point for dienststelle. This is the single place in the module
  // that resolves the cognosHost filters facet; every other effect receives a
  // flat ref from here. Recorded deviation in contracts/cognosHostService.md
  // section 7: dienststelle effects only take _KDB, so threading the facet
  // through every call chain would be a far larger change than the migration
  // itself. Resolved per call, never captured, because destroy nulls the
  // namespaces.
  function readFiltersFacet(_KDB) {
    var service = _KDB && _KDB.services ? _KDB.services.cognosHost : null;
    return service && service.filters ? service.filters : null;
  }

  // scopeId stays the RAW host string: owner code compares it literally and
  // feeds it back into a scoped lookup. The facet normalises internally.
  function toFilterRef(_descriptor) {
    return {
      itemId: _descriptor.itemId,
      itemName: _descriptor.itemName,
      scopeId: _descriptor.rawScopeId,
      rawScopeId: _descriptor.rawScopeId
    };
  }

  // A degraded inventory is usable here: one unreadable sibling used to be
  // skipped while the loop carried on, so failing closed would turn a working
  // lookup into a miss.
  function readDescriptors(_facet, _input) {
    var outcome = _facet.listFilterItems(_input);
    if (!outcome || outcome.ok !== true) {
      return null;
    }
    return outcome.data || [];
  }

  function findNamedRef(_descriptors, _activeFilterKey, _rawScopeId) {
    var descriptor;
    var index;
    for (index = 0; index < _descriptors.length; index += 1) {
      descriptor = _descriptors[index];
      if (descriptor.itemName !== _activeFilterKey) {
        continue;
      }
      // Exact raw comparison: a normalised match could hit a sibling scope that
      // differs only by the _tabpanel suffix and write to the wrong item.
      if (_rawScopeId != null && String(descriptor.rawScopeId) !== String(_rawScopeId)) {
        continue;
      }
      return toFilterRef(descriptor);
    }
    return null;
  }

  function lookupFilterRef(_KDB, _activeFilterKey, _filterScope, _scopeId) {
    var facet = readFiltersFacet(_KDB);
    var descriptors;
    if (!facet) {
      return null;
    }
    if (_filterScope === "pageContext") {
      // The original conjunction required a non-global item whose scope equals
      // _scopeId, so asking for "global" here could never match.
      if (String(_scopeId) === "global") {
        return null;
      }
      descriptors = _scopeId
        ? readDescriptors(facet, { scopeId: _scopeId })
        : readDescriptors(facet, { allPageContextScopes: true });
      if (!descriptors) {
        return null;
      }
      return findNamedRef(descriptors, _activeFilterKey, _scopeId ? _scopeId : null);
    }
    descriptors = readDescriptors(facet, { scopeId: "global" });
    if (!descriptors) {
      return null;
    }
    return findNamedRef(descriptors, _activeFilterKey, null);
  }

  function normalizeScopeId(_scopeId) {
    if (_scopeId == null || String(_scopeId) === "global") {
      return "global";
    }
    return String(_scopeId).replace(/_tabpanel$/, "");
  }

  function resolveRawPageContextScope(_KDB, _activeFilterKey, _canonicalScopeId) {
    var scopes = listPageContextScopes(_KDB, _activeFilterKey);
    var target = normalizeScopeId(_canonicalScopeId);
    var idx;
    if (!target || target === "global") {
      return null;
    }
    for (idx = 0; idx < scopes.length; idx += 1) {
      if (normalizeScopeId(scopes[idx]) === target) {
        return String(scopes[idx]);
      }
    }
    return _canonicalScopeId != null ? String(_canonicalScopeId) : null;
  }

  function listPageContextScopes(_KDB, _activeFilterKey) {
    var facet = readFiltersFacet(_KDB);
    var outcome;
    if (!facet) {
      return [];
    }
    outcome = facet.listPageContextScopes({ itemName: _activeFilterKey });
    if (!outcome || outcome.ok !== true) {
      return [];
    }
    return outcome.data || [];
  }

  return {
    readFiltersFacet: readFiltersFacet,
    lookupFilterRef: lookupFilterRef,
    listPageContextScopes: listPageContextScopes,
    normalizeScopeId: normalizeScopeId,
    resolveRawPageContextScope: resolveRawPageContextScope
  };
});
