define(["../../../../tabs/state/selectors.js"], function (_tabsSelectors) {
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

  // tabsFacet is stamped on the runtime by the orchestrator; deep files must not
  // look up _KDB.services.cognosHost themselves (contract section 7).
  function listTabDescriptors(_KDB) {
    var runtime = _KDB && _KDB.runtime ? _KDB.runtime.dienststelle : null;
    var tabsFacet = runtime && runtime.tabsFacet ? runtime.tabsFacet : null;
    var outcome;
    if (!tabsFacet || typeof tabsFacet.listTabs !== "function") {
      return [];
    }
    outcome = tabsFacet.listTabs();
    if (!outcome || outcome.ok !== true || !Array.isArray(outcome.data)) {
      return [];
    }
    return outcome.data;
  }

  function sortNumericKeys(_keys) {
    return _keys.slice().sort(function (left, right) {
      return Number(left) - Number(right);
    });
  }

  function findDescriptorByLayoutIndex(_descriptors, _index) {
    var idx;
    var descriptor;
    for (idx = 0; idx < _descriptors.length; idx += 1) {
      descriptor = _descriptors[idx];
      if (descriptor && descriptor.index === _index) {
        return descriptor;
      }
    }
    return null;
  }

  function listDashboardTabScopeIds(_KDB) {
    var tabsConfig = _KDB && _KDB.config ? _KDB.config.tabs : null;
    var descriptors;
    var entries = [];
    var keys;
    var idx;
    var key;
    var tabEntry;
    var descriptor;
    var scopeId;
    try {
      descriptors = listTabDescriptors(_KDB);
    } catch (error) {
      console.warn("[dienststelle.listDashboardTabScopeIds] layout read failed", error);
      return entries;
    }
    if (!tabsConfig || typeof tabsConfig !== "object") {
      return entries;
    }
    keys = sortNumericKeys(Object.keys(tabsConfig));
    for (idx = 0; idx < keys.length; idx += 1) {
      key = keys[idx];
      tabEntry = tabsConfig[key];
      if (!tabEntry || tabEntry.role !== "dashboard") {
        continue;
      }
      descriptor = findDescriptorByLayoutIndex(descriptors, Number(key));
      // Success-path scope ids stay the tab layout id (TabDescriptor.id), not pageId.
      scopeId = descriptor && descriptor.id ? String(descriptor.id) : null;
      if (!scopeId) {
        continue;
      }
      entries.push({ scopeId: scopeId, normalizedScopeId: normalizeScopeId(scopeId) });
    }
    return entries;
  }

  function resolvePlannerPageScopeId(_KDB, _pageScopeId) {
    var canonical;
    var activeFilterKey;
    var raw;
    if (_pageScopeId == null || _pageScopeId === "" || _pageScopeId === "global") {
      return null;
    }
    if (_pageScopeId === "active") {
      canonical = _tabsSelectors.readActiveTabId(_KDB);
      if (!canonical) {
        return null;
      }
    } else {
      canonical = _pageScopeId;
    }
    activeFilterKey = _KDB && _KDB.state && _KDB.state.filters && _KDB.state.filters.dienststelle
      ? _KDB.state.filters.dienststelle.activeFilterKey
      : null;
    raw = resolveRawPageContextScope(_KDB, activeFilterKey, canonical);
    if (raw == null || String(raw) === "") {
      return null;
    }
    return String(raw);
  }

  function pickPageContextScopeMap(_KDB, _pageContextValuesByScope, _pageScopeId) {
    var map = _pageContextValuesByScope && typeof _pageContextValuesByScope === "object"
      ? _pageContextValuesByScope
      : {};
    var raw;
    var out;
    if (_pageScopeId == null || _pageScopeId === "") {
      return map;
    }
    raw = resolvePlannerPageScopeId(_KDB, _pageScopeId);
    if (!raw || !Object.prototype.hasOwnProperty.call(map, raw)) {
      return {};
    }
    out = {};
    out[raw] = map[raw];
    return out;
  }

  return {
    readFiltersFacet: readFiltersFacet,
    lookupFilterRef: lookupFilterRef,
    listPageContextScopes: listPageContextScopes,
    normalizeScopeId: normalizeScopeId,
    resolveRawPageContextScope: resolveRawPageContextScope,
    listTabDescriptors: listTabDescriptors,
    listDashboardTabScopeIds: listDashboardTabScopeIds,
    resolvePlannerPageScopeId: resolvePlannerPageScopeId,
    pickPageContextScopeMap: pickPageContextScopeMap
  };
});
