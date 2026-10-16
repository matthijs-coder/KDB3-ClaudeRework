define(["../config/selectors.js"], function (_selectorConfig) {
  "use strict";

  function removeRootSichtClasses(_root) {
    var allClasses = _selectorConfig.rootSichtClassValues || [];
    var idx;
    for (idx = 0; idx < allClasses.length; idx += 1) {
      _root.classList.remove(allClasses[idx]);
    }
  }

  function syncSpecialSingleSelectRootClass(_activeSichtValue) {
    var root;
    var classMap;
    var sichtValue;
    var targetClass;
    if (typeof document === "undefined") {
      return false;
    }
    root = document.querySelector(_selectorConfig.filterDockRootSelector);
    if (!root) {
      return false;
    }
    removeRootSichtClasses(root);
    classMap = _selectorConfig.rootSichtClassByValue || {};
    sichtValue = _activeSichtValue != null ? String(_activeSichtValue) : "";
    targetClass = classMap[sichtValue];
    if (targetClass) {
      root.classList.add(targetClass);
    }
    return !!targetClass;
  }

  return {
    syncSpecialSingleSelectRootClass: syncSpecialSingleSelectRootClass
  };
});
