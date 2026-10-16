define(["./lookupDienststelleFilterRef.js", "./readTabsFacet.js"], function (_lookupFilter, _readTabsFacet) {
  "use strict";

  function sortNumericKeys(_keys) {
    return _keys.slice().sort(function (left, right) {
      return Number(left) - Number(right);
    });
  }

  function listTabDescriptors(_KDB) {
    var tabsFacet = _readTabsFacet(_KDB);
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

  function __controller(_KDB) {
    var tabsConfig = _KDB && _KDB.config ? _KDB.config.tabs : null;
    var descriptors = [];
    var entries = [];
    var keys;
    var idx;
    var key;
    var tabEntry;
    var descriptor;
    var scopeId;
    try {
      descriptors = listTabDescriptors(_KDB);
    } catch (_error) {
      console.warn("[dienststelle.listDashboardTabScopeIds] layout read failed", _error);
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
      entries.push({ scopeId: scopeId, normalizedScopeId: _lookupFilter.normalizeScopeId(scopeId) });
    }
    return entries;
  }
  return __controller;
});
