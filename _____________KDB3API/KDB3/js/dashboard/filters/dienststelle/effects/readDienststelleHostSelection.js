define([
  "./normalizeCognosDienststelleSelection.js",
  "./lookupDienststelleFilterRef.js"
], function (_normalizeSelection, _lookupFilter) {
  "use strict";

  return {
    readFilterValues: _normalizeSelection.readFilterValues,
    readFiltersFacet: _lookupFilter.readFiltersFacet,
    lookupFilterRef: _lookupFilter.lookupFilterRef,
    listPageContextScopes: _lookupFilter.listPageContextScopes,
    normalizeScopeId: _lookupFilter.normalizeScopeId,
    resolveRawPageContextScope: _lookupFilter.resolveRawPageContextScope
  };
});
