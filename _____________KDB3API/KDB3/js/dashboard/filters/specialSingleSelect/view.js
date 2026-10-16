define([
  "./config.js"
], function (_config) {
  "use strict";

  var selectors = _config.SELECTORS;

  function buildDataIdSelector(_domName) {
    return "[" + selectors.filterDataIdAttr + '="' + _domName + '"]';
  }

  function findAllFilterWrappers(_filterLabel) {
    var root;
    var nodes;
    var idx;
    var wrapper;
    var wrappers = [];
    if (!_filterLabel || typeof document === "undefined") {
      return wrappers;
    }
    root = document.querySelector(selectors.filterDockRootSelector);
    if (!root) {
      return wrappers;
    }
    nodes = root.querySelectorAll(buildDataIdSelector(_filterLabel));
    for (idx = 0; idx < nodes.length; idx += 1) {
      wrapper = nodes[idx].closest("." + selectors.filterItemWrapperClass);
      if (wrapper && wrappers.indexOf(wrapper) === -1) {
        wrappers.push(wrapper);
      }
    }
    return wrappers;
  }

  function syncSpecialFilterClasses(_runtime, _filterId, _definition, _evaluation) {
    var wrappers = findAllFilterWrappers(_definition.filterLabel);
    var idx;
    var wrapper;
    if (!wrappers.length) {
      return null;
    }
    _runtime.domRefs[_filterId] = wrappers[0];
    for (idx = 0; idx < wrappers.length; idx += 1) {
      wrapper = wrappers[idx];
      wrapper.classList.toggle(selectors.markerClass, true);
      wrapper.classList.toggle(selectors.rightClass, _evaluation.rightAllowed === true);
      wrapper.classList.toggle(selectors.alleOptionClass, _evaluation.alleAllowed === true);
    }
    return wrappers[0];
  }

  function syncSpecialSingleSelectRootClass(_activeSichtValue) {
    var root;
    var sichtValue;
    var targetClass;
    if (typeof document === "undefined") {
      return false;
    }
    root = document.querySelector(selectors.filterDockRootSelector);
    if (!root) {
      return false;
    }
    selectors.rootSichtClassValues.forEach(function (_className) {
      root.classList.remove(_className);
    });
    sichtValue = _activeSichtValue != null ? String(_activeSichtValue) : "";
    targetClass = selectors.rootSichtClassByValue[sichtValue];
    if (targetClass) {
      root.classList.add(targetClass);
    }
    return !!targetClass;
  }

  return {
    syncSpecialFilterClasses: syncSpecialFilterClasses,
    syncSpecialSingleSelectRootClass: syncSpecialSingleSelectRootClass
  };
});
