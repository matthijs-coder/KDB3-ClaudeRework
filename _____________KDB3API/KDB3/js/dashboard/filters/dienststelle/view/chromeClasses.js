define(["../config.js", "./filterDom.js", "./dockNames.js"], function (_config, _filterDom, _dockNames) {
  "use strict";

  var SELECTORS = _config.DOM_SELECTORS;
  var SCOPE_BUCKETS = ["global", "pageContext"];

  function sichtValueOf(_definition) {
    return _definition && _definition.activeSichtValue != null ? String(_definition.activeSichtValue) : "";
  }

  function syncDienststelleRootClass(_activeDefinition) {
    var root;
    var targetClass;
    if (typeof document === "undefined") {
      return false;
    }
    root = document.querySelector(SELECTORS.filterDockRootSelector);
    if (!root) {
      return false;
    }
    SELECTORS.rootActiveClassValues.forEach(function (className) {
      root.classList.remove(className);
    });
    targetClass = SELECTORS.rootActiveClassBySicht[sichtValueOf(_activeDefinition)];
    if (targetClass) {
      root.classList.add(targetClass);
    }
    return !!targetClass;
  }

  function syncOneVariantWrapper(_definition, _activeDefinition, _filterScope) {
    var wrapper = _filterDom.findScopedFilterWrapper(_definition.activeFilterKey, _filterScope);
    var isActive = _activeDefinition && _definition.activeFilterKey === _activeDefinition.activeFilterKey;
    if (!wrapper) {
      return;
    }
    wrapper.classList.toggle(SELECTORS.markerClass, true);
    wrapper.classList.toggle(SELECTORS.activeClass, isActive === true);
  }

  function syncDienststelleWrapperClasses(_activeDefinition, _KDB) {
    var keys = Object.keys(_config.DEFINITIONS);
    syncDienststelleRootClass(_activeDefinition);
    keys.forEach(function (key) {
      SCOPE_BUCKETS.forEach(function (scope) {
        syncOneVariantWrapper(_config.DEFINITIONS[key], _activeDefinition, scope);
      });
    });
    if (_KDB) {
      _dockNames.syncFilterDockNames(_KDB);
    }
  }

  return {
    syncDienststelleWrapperClasses: syncDienststelleWrapperClasses
  };
});
