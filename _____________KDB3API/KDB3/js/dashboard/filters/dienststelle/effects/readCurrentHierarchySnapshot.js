define([
  "./resolveHierarchyItemId.js",
  "./rewriteDienststelleToMetricsSource.js",
  "./uniqueAlignedUseDisplayValues.js",
  "./collectAlignedHostDisplays.js",
  "./pickPageContextScopeMap.js"
], function (_resolveHierarchyItemId, _rewrite, _uniqueAligned, _collectHostDisplays, _pickPageContextScopeMap) {
  "use strict";

  function extractUseValues(_values) {
    var out = [];
    var idx;
    var entry;
    if (!Array.isArray(_values)) {
      return out;
    }
    for (idx = 0; idx < _values.length; idx += 1) {
      entry = _values[idx];
      if (entry == null) {
        continue;
      }
      if (typeof entry === "string" && entry !== "") {
        out.push(entry);
        continue;
      }
      if (entry.useValue != null && String(entry.useValue) !== "") {
        out.push(String(entry.useValue));
      }
    }
    return out;
  }

  function extractDisplayValues(_values) {
    var out = [];
    var idx;
    var entry;
    if (!Array.isArray(_values)) {
      return out;
    }
    for (idx = 0; idx < _values.length; idx += 1) {
      entry = _values[idx];
      if (entry == null) {
        continue;
      }
      if (typeof entry === "string" && entry !== "") {
        out.push(entry);
        continue;
      }
      if (entry.displayValue != null && String(entry.displayValue) !== "") {
        out.push(String(entry.displayValue));
      } else if (entry.useValue != null && String(entry.useValue) !== "") {
        out.push(String(entry.useValue));
      }
    }
    return out;
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
    for (idx = 0; idx < scopeIds.length; idx += 1) {
      scopeValues = scopes[scopeIds[idx]];
      out = out.concat(extractUseValues(scopeValues));
      displayOut = displayOut.concat(extractDisplayValues(scopeValues));
    }
    var aligned = _uniqueAligned(out, displayOut);
    aligned.hostDisplayValues = _collectHostDisplays(_pageContextValuesByScope);
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
      dominantValues = _rewrite.rewriteValuesToMetricsSource(_KDB, extractUseValues(resolution.dominantValues));
      downstreamValues = _rewrite.rewriteValuesToMetricsSource(_KDB, extractUseValues(resolution.downstreamValues));
      displayValues = extractDisplayValues(resolution.dominantValues).concat(
        extractDisplayValues(resolution.downstreamValues)
      );
      hostDisplayValues = _collectHostDisplays(resolution.dominantValues).concat(
        _collectHostDisplays(resolution.downstreamValues)
      );
      if (!dominantValues.length) {
        pageContextValues = collectPageContextUseValues(_pickPageContextScopeMap(_KDB, resolution.pageContextValuesByScope, _options.pageScopeId));
        dominantValues = _rewrite.rewriteValuesToMetricsSource(_KDB, pageContextValues.useValues);
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
        hierarchyItemId: _resolveHierarchyItemId.resolveHierarchyItemId(_KDB, activeFilterKey),
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
