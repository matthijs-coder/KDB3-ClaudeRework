define([
  "./lookupDienststelleFilterRef.js",
  "./rewriteDienststelleToMetricsSource.js"
], function (_lookupFilterRef, _rewrite) {
  "use strict";

  function buildExpectedHierarchySuffix(_activeFilterKey) {
    if (!_activeFilterKey) {
      return null;
    }
    return ".[Dienststelle].[" + String(_activeFilterKey) + "]";
  }

  function matchesExpectedHierarchyItem(_descriptor, _expectedSuffix) {
    var itemId = _descriptor.itemId;
    return !!(itemId && itemId.indexOf(_expectedSuffix) === itemId.length - _expectedSuffix.length);
  }

  // The match is on the itemId suffix, not on the item name, so this has to see
  // every item of a partition at once. That is why the facet exposes
  // allPageContextScopes: no scope can be named up front here.
  function findHierarchyItemIdInDescriptors(_KDB, _descriptors, _expectedSuffix) {
    var descriptors = Array.isArray(_descriptors) ? _descriptors : [];
    var idx;
    for (idx = 0; idx < descriptors.length; idx += 1) {
      if (matchesExpectedHierarchyItem(descriptors[idx], _expectedSuffix)) {
        return _rewrite.rewriteToMetricsSource(_KDB, descriptors[idx].itemId);
      }
    }
    return null;
  }

  function readDescriptors(_filtersFacet, _input) {
    var outcome = _filtersFacet.listFilterItems(_input);
    if (!outcome || outcome.ok !== true) {
      return [];
    }
    return outcome.data || [];
  }

  function resolveHierarchyItemIdFromCognosContext(_KDB, _activeFilterKey) {
    var filtersFacet = _lookupFilterRef.readFiltersFacet(_KDB);
    var expectedSuffix = buildExpectedHierarchySuffix(_activeFilterKey);
    var itemId;
    if (!filtersFacet || !expectedSuffix) {
      return null;
    }
    itemId = findHierarchyItemIdInDescriptors(
      _KDB,
      readDescriptors(filtersFacet, { allPageContextScopes: true }),
      expectedSuffix
    );
    if (itemId) {
      return itemId;
    }
    return findHierarchyItemIdInDescriptors(
      _KDB,
      readDescriptors(filtersFacet, { scopeId: "global" }),
      expectedSuffix
    );
  }

  function resolveHierarchyItemId(_KDB, _activeFilterKey) {
    var fromCognosContext = resolveHierarchyItemIdFromCognosContext(_KDB, _activeFilterKey);
    var filterRef;
    if (fromCognosContext) {
      return fromCognosContext;
    }
    filterRef = _lookupFilterRef.lookupFilterRef(_KDB, _activeFilterKey, "global", null)
      || _lookupFilterRef.lookupFilterRef(_KDB, _activeFilterKey, "pageContext", null);
    if (!filterRef) {
      return null;
    }
    return filterRef.itemId ? String(filterRef.itemId) : null;
  }

  return {
    resolveHierarchyItemId: resolveHierarchyItemId
  };
});
