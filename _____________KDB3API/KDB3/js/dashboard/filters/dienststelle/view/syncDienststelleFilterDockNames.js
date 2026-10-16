define([
  "../config/dienststelleDefinitions.js",
  "./sanitizeDienststelleFilterDockName.js",
  "./applyDienststelleFilterDockNameDisplay.js",
  "../config/selectors.js",
  "./resolveScopedDienststelleFilterDom.js"
], function (
  _definitions,
  _sanitizeFilterDockName,
  _applyFilterDockNameDisplay,
  _viewSelectors,
  _resolveScopedDom
) {
  "use strict";

  var SCOPE_BUCKETS = ["global", "pageContext"];

  function syncOneWrapper(_definition, _filterScope) {
    var wrapper;
    var targetLabel;
    if (!_definition || !_definition.activeFilterKey) {
      return false;
    }
    targetLabel = _sanitizeFilterDockName(_definition.activeFilterKey);
    if (!targetLabel) {
      return false;
    }
    wrapper = _resolveScopedDom.findScopedFilterWrapper(
      _definition.activeFilterKey,
      _filterScope
    );
    if (!wrapper) {
      return false;
    }
    return _applyFilterDockNameDisplay(wrapper, targetLabel, _viewSelectors) === true;
  }

  function __controller(_KDB) {
    var defKeys = Object.keys(_definitions);
    var defIdx;
    var scopeIdx;
    var wrappersUpdated = 0;
    try {
      if (typeof document === "undefined") {
        return { didSync: false, wrappersUpdated: 0, reason: "documentUnavailable" };
      }
      for (defIdx = 0; defIdx < defKeys.length; defIdx += 1) {
        for (scopeIdx = 0; scopeIdx < SCOPE_BUCKETS.length; scopeIdx += 1) {
          if (syncOneWrapper(_definitions[defKeys[defIdx]], SCOPE_BUCKETS[scopeIdx])) {
            wrappersUpdated += 1;
          }
        }
      }
      return {
        didSync: wrappersUpdated > 0,
        wrappersUpdated: wrappersUpdated
      };
    } catch (error) {
      console.error("[dienststelle.syncDienststelleFilterDockNames] failed", error);
      return {
        didSync: false,
        wrappersUpdated: wrappersUpdated,
        reason: "domError",
        errorMessage: String(error && error.message ? error.message : error)
      };
    }
  }

  return __controller;
});
