define([
  "../compat/getFilterConfig.js",
  "../compat/resolveFilterCapabilities.js",
  "./readFilterIdentity.js"
], function (_getFilterConfig, _resolveFilterCapabilities, _readFilterIdentity) {
  "use strict";

  function __controller(_KDB, _filterEl, _selectors) {
    try {
      return _readFilterIdentity.resolveFilterIdentity(
        _KDB,
        _filterEl,
        _selectors,
        _getFilterConfig,
        _resolveFilterCapabilities
      );
    } catch (error) {
      console.error("[filterDock.resolveConfiguredFilterIdentity] failed", error);
      throw error;
    }
  }

  return __controller;
});
