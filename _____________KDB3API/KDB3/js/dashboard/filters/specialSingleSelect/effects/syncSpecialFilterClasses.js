define([
  "../config/specialFilterDefinitions.js",
  "../config/selectors.js"
], function (_specialFilterDefinitions, _selectorConfig) {
  "use strict";

  function buildDataIdSelector(_domName) {
    return "[" + _selectorConfig.filterDataIdAttr + '="' + _domName + '"]';
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
    root = document.querySelector(_selectorConfig.filterDockRootSelector);
    if (!root) {
      return wrappers;
    }
    nodes = root.querySelectorAll(buildDataIdSelector(_filterLabel));
    for (idx = 0; idx < nodes.length; idx += 1) {
      wrapper = nodes[idx].closest("." + _selectorConfig.filterItemWrapperClass);
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
      wrapper.classList.toggle(_selectorConfig.markerClass, true);
      wrapper.classList.toggle(_selectorConfig.rightClass, _evaluation.rightAllowed === true);
      wrapper.classList.toggle(_selectorConfig.alleOptionClass, _evaluation.alleAllowed === true);
    }
    return wrappers[0];
  }

  function resolveFilterIdByCondition(_condition) {
    var filterId;
    var definition;
    if (!_condition) {
      return null;
    }
    for (filterId in _specialFilterDefinitions) {
      if (!_specialFilterDefinitions.hasOwnProperty(filterId)) {
        continue;
      }
      definition = _specialFilterDefinitions[filterId];
      if (
        String(definition.condition).toLowerCase() === String(_condition).toLowerCase() ||
        String(definition.filterId).toLowerCase() === String(_condition).toLowerCase()
      ) {
        return filterId;
      }
    }
    return null;
  }

  return {
    syncSpecialFilterClasses: syncSpecialFilterClasses,
    resolveFilterIdByCondition: resolveFilterIdByCondition
  };
});
