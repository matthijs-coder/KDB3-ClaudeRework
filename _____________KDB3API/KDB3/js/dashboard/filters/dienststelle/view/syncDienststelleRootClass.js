define(["../config/selectors.js"], function (_viewSelectors) {
  "use strict";

  function removeRootActiveClasses(_root) {
    var allClasses = _viewSelectors.rootActiveClassValues || [];
    var idx;
    for (idx = 0; idx < allClasses.length; idx += 1) {
      _root.classList.remove(allClasses[idx]);
    }
  }

  function syncDienststelleRootClass(_activeDefinition) {
    var root;
    var classMap;
    var sichtValue;
    var targetClass;
    if (typeof document === "undefined") {
      return false;
    }
    root = document.querySelector(_viewSelectors.filterDockRootSelector);
    if (!root) {
      return false;
    }
    removeRootActiveClasses(root);
    classMap = _viewSelectors.rootActiveClassBySicht || {};
    sichtValue =
      _activeDefinition && _activeDefinition.activeSichtValue != null
        ? String(_activeDefinition.activeSichtValue)
        : "";
    targetClass = classMap[sichtValue];
    if (targetClass) {
      root.classList.add(targetClass);
    }
    return !!targetClass;
  }

  return {
    syncDienststelleRootClass: syncDienststelleRootClass
  };
});
