define([
  "../config/dienststelleDefinitions.js",
  "../config/selectors.js",
  "./resolveScopedDienststelleFilterDom.js",
  "./syncDienststelleRootClass.js",
  "./syncDienststelleFilterDockNames.js"
], function (
  _definitions,
  _selectorConfig,
  _resolveScopedDom,
  _rootClassSync,
  _syncFilterDockNames
) {
  "use strict";

  var SCOPE_BUCKETS = ["global", "pageContext"];

  function syncOneVariantWrapper(_definition, _activeDefinition, _filterScope) {
    var wrapper = _resolveScopedDom.findScopedFilterWrapper(
      _definition.activeFilterKey,
      _filterScope
    );
    var isActive =
      _activeDefinition &&
      _definition.activeFilterKey === _activeDefinition.activeFilterKey;
    if (!wrapper) {
      return null;
    }
    wrapper.classList.toggle(_selectorConfig.markerClass, true);
    wrapper.classList.toggle(_selectorConfig.activeClass, isActive === true);
    toggleSichtClasses(wrapper, _definition);
    return wrapper;
  }

  function toggleSichtClasses(_wrapper, _definition) {
    var classMap = _selectorConfig.sichtClassByValue || {};
    var sichtValue =
      _definition && _definition.activeSichtValue != null
        ? String(_definition.activeSichtValue)
        : "";
    Object.keys(classMap).forEach(function (_key) {
      _wrapper.classList.toggle(classMap[_key], sichtValue === String(_key));
    });
  }

  function syncDienststelleWrapperClasses(_runtime, _activeDefinition, _KDB) {
    var keys = Object.keys(_definitions);
    var idx;
    var scopeIdx;
    _rootClassSync.syncDienststelleRootClass(_activeDefinition);
    for (idx = 0; idx < keys.length; idx += 1) {
      for (scopeIdx = 0; scopeIdx < SCOPE_BUCKETS.length; scopeIdx += 1) {
        syncOneVariantWrapper(
          _definitions[keys[idx]],
          _activeDefinition,
          SCOPE_BUCKETS[scopeIdx]
        );
      }
    }
    if (_KDB) {
      _syncFilterDockNames(_KDB);
    }
  }

  return {
    syncDienststelleWrapperClasses: syncDienststelleWrapperClasses
  };
});
