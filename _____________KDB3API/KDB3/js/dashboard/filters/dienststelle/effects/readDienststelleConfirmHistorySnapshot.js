define([
  "../state/selectors.js",
  "./readDienststelleHostSelection.js",
  "./listDashboardTabScopeIds.js"
], function (_selectors, _hostSelection, _listDashboardTabScopeIds) {
  "use strict";

  function copiedHostDisplay(_entry) {
    if (!_entry || _entry.hostDisplay == null || String(_entry.hostDisplay) === "") {
      return "";
    }
    return String(_entry.hostDisplay);
  }

  function toValueObject(_entry) {
    return {
      displayValue: _entry.displayValue != null ? String(_entry.displayValue) : "",
      useValue: _entry.useValue != null ? String(_entry.useValue) : "",
      source: "cognos",
      hostDisplay: copiedHostDisplay(_entry)
    };
  }

  function toScopeValueArray(_selection) {
    var out;
    var idx;
    var entry;
    if (!_selection) {
      return [];
    }
    if (Array.isArray(_selection)) {
      out = [];
      for (idx = 0; idx < _selection.length; idx += 1) {
        entry = _selection[idx];
        if (!entry) {
          continue;
        }
        out.push(toValueObject(entry));
      }
      return out;
    }
    return [toValueObject(_selection)];
  }

  function readScopeHostValues(_KDB, _activeFilterKey, _scopeType, _scopeId, _boundary) {
    var filtersFacet = _hostSelection.readFiltersFacet(_KDB);
    var filterRef;
    var selection;
    try {
      filterRef =
        _scopeType === "global"
          ? _hostSelection.lookupFilterRef(_KDB, _activeFilterKey, "global", null)
          : _hostSelection.lookupFilterRef(_KDB, _activeFilterKey, "pageContext", _scopeId);
      if (!filterRef) {
        return [];
      }
      selection = _hostSelection.readFilterValues(filterRef, filtersFacet);
      return toScopeValueArray(selection);
    } catch (error) {
      console.warn(
        "[readDienststelleConfirmHistorySnapshot." + _boundary + "] host read failed",
        error
      );
      return [];
    }
  }

  function readPageContextSnapshot(_KDB, _activeFilterKey) {
    var tabEntries = _listDashboardTabScopeIds(_KDB);
    var pageContext = {};
    var idx;
    var entry;
    var rawScopeId;
    var scopeKey;
    for (idx = 0; idx < tabEntries.length; idx += 1) {
      entry = tabEntries[idx];
      rawScopeId = _hostSelection.resolveRawPageContextScope(
        _KDB,
        _activeFilterKey,
        entry.normalizedScopeId || entry.scopeId
      );
      if (!rawScopeId) {
        continue;
      }
      scopeKey = String(rawScopeId);
      pageContext[scopeKey] = readScopeHostValues(
        _KDB,
        _activeFilterKey,
        "pageContext",
        rawScopeId,
        "pageContext:" + scopeKey
      );
    }
    return pageContext;
  }

  function __controller(_KDB) {
    var ctx = _selectors.readActiveDienststelleContext(_KDB);
    var activeFilterKey;
    if (!ctx || !ctx.activeFilterKey) {
      return null;
    }
    activeFilterKey = String(ctx.activeFilterKey);
    return {
      activeSichtValue: ctx.activeSichtValue,
      activeFilterKey: activeFilterKey,
      visibleFilterLabel: ctx.visibleFilterLabel,
      valuesByScope: {
        global: readScopeHostValues(_KDB, activeFilterKey, "global", null, "global"),
        pageContext: readPageContextSnapshot(_KDB, activeFilterKey)
      }
    };
  }

  return __controller;
});
