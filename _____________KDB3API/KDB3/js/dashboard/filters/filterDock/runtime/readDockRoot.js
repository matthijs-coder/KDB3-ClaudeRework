define([], function () {
  "use strict";

  function readDockRoot(_KDB) {
    var rootSelector =
      _KDB.elements && _KDB.elements.selectors && _KDB.elements.selectors.filterDock
        ? _KDB.elements.selectors.filterDock.rootSelector
        : null;
    if (!rootSelector || typeof document === "undefined") {
      return null;
    }
    return document.querySelector(rootSelector);
  }

  return readDockRoot;
});
