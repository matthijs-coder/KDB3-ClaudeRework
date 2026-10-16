define([
  "../../../../core/utils/rewriteUniqueNameSourceToken.js",
  "./alignedDisplays.js",
  "./hostScope/filterRef.js"
], function (_rewriteUniqueNameSourceToken, _aligned, _filterRef) {
  "use strict";

  function readMetricsDataSourcePrefix(_KDB) {
    var defaultConfig = _KDB && _KDB.config && _KDB.config.dataSources && _KDB.config.dataSources.metrics
      ? _KDB.config.dataSources.metrics.default
      : null;
    if (defaultConfig && typeof defaultConfig === "object") {
      return defaultConfig.prefix || defaultConfig.name || null;
    }
    return defaultConfig || null;
  }

  function rewriteToMetricsSource(_KDB, _itemId) {
    var targetPrefix = readMetricsDataSourcePrefix(_KDB);
    return _rewriteUniqueNameSourceToken.rewriteUniqueNameSourceToken(_itemId, targetPrefix);
  }

  function rewriteValuesToMetricsSource(_KDB, _values) {
    var values = Array.isArray(_values) ? _values : [];
    var idx;
    var out = [];
    for (idx = 0; idx < values.length; idx += 1) {
      out.push(rewriteToMetricsSource(_KDB, values[idx]));
    }
    return out;
  }

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
        return rewriteToMetricsSource(_KDB, descriptors[idx].itemId);
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
    var filtersFacet = _filterRef.readFiltersFacet(_KDB);
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
    var ref;
    if (fromCognosContext) {
      return fromCognosContext;
    }
    ref = _filterRef.lookupFilterRef(_KDB, _activeFilterKey, "global", null)
      || _filterRef.lookupFilterRef(_KDB, _activeFilterKey, "pageContext", null);
    if (!ref) {
      return null;
    }
    return ref.itemId ? String(ref.itemId) : null;
  }

  function collectPageContextUseValues(_pageContextValuesByScope) {
    var out = [];
    var displayOut = [];
    var scopes = _pageContextValuesByScope && typeof _pageContextValuesByScope === "object"
      ? _pageContextValuesByScope
      : {};
    var scopeIds = Object.keys(scopes);
    var idx;
    var scopeValues;
    var aligned;
    for (idx = 0; idx < scopeIds.length; idx += 1) {
      scopeValues = scopes[scopeIds[idx]];
      out = out.concat(_aligned.extractUseValues(scopeValues));
      displayOut = displayOut.concat(_aligned.extractDisplayValues(scopeValues));
    }
    aligned = _aligned.uniqueAlignedUseDisplayValues(out, displayOut);
    aligned.hostDisplayValues = _aligned.collectAlignedHostDisplays(_pageContextValuesByScope);
    return aligned;
  }

  function readCurrentHierarchySnapshot(_KDB, _options) {
    try {
      var state =
        (_options = _options || {}) && _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.dienststelle : null;
      var resolution;
      var activeFilterKey;
      var visibleFilterLabel;
      var dominantValues;
      var downstreamValues;
      var displayValues;
      var hostDisplayValues;
      var pageContextValues;
      var hasConfirmedSelection;
      if (!state) {
        return null;
      }
      resolution = state.resolution && typeof state.resolution === "object" ? state.resolution : {};
      activeFilterKey = state.activeFilterKey != null ? String(state.activeFilterKey) : null;
      visibleFilterLabel = state.visibleFilterLabel != null
        ? String(state.visibleFilterLabel)
        : "Dienststelle";
      dominantValues = rewriteValuesToMetricsSource(_KDB, _aligned.extractUseValues(resolution.dominantValues));
      downstreamValues = rewriteValuesToMetricsSource(_KDB, _aligned.extractUseValues(resolution.downstreamValues));
      displayValues = _aligned.extractDisplayValues(resolution.dominantValues).concat(
        _aligned.extractDisplayValues(resolution.downstreamValues)
      );
      hostDisplayValues = _aligned.collectAlignedHostDisplays(resolution.dominantValues).concat(
        _aligned.collectAlignedHostDisplays(resolution.downstreamValues)
      );
      if (!dominantValues.length) {
        pageContextValues = collectPageContextUseValues(
          _filterRef.pickPageContextScopeMap(_KDB, resolution.pageContextValuesByScope, _options.pageScopeId)
        );
        dominantValues = rewriteValuesToMetricsSource(_KDB, pageContextValues.useValues);
        displayValues = displayValues.concat(pageContextValues.displayValues);
        hostDisplayValues = hostDisplayValues.concat(pageContextValues.hostDisplayValues);
      }
      if (!downstreamValues.length && dominantValues.length) {
        downstreamValues = dominantValues.slice();
      }
      hasConfirmedSelection = dominantValues.length > 0 || downstreamValues.length > 0;
      return {
        activeDownstreamName: activeFilterKey,
        filterId: activeFilterKey,
        filterLabel: visibleFilterLabel,
        visibleFilterLabel: visibleFilterLabel,
        hierarchyItemId: resolveHierarchyItemId(_KDB, activeFilterKey),
        activeHierarchyTableKey: state.activeHierarchyTableKey != null
          ? String(state.activeHierarchyTableKey)
          : null,
        resolution: {
          hasConfirmedSelection: hasConfirmedSelection,
          dominantValues: dominantValues,
          downstreamValues: downstreamValues,
          displayValues: displayValues,
          hostDisplayValues: hostDisplayValues,
          dominantScopeKey: resolution.dominantScope != null
            ? String(resolution.dominantScope)
            : null,
          resolvedAt: resolution.resolvedAt != null ? resolution.resolvedAt : null
        },
        source: "dienststelle"
      };
    } catch (error) {
      console.error("[dienststelle.readCurrentHierarchySnapshot] failed", error);
      throw error;
    }
  }

  return {
    readCurrentHierarchySnapshot: readCurrentHierarchySnapshot
  };
});
