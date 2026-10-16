define([], function () {
  "use strict";

  function readOutClickCatcher(_KDB) {
    var selectors;
    var dockRoot;
    var catcher;
    var catcherSelector;
    if (typeof document === "undefined") {
      return null;
    }
    selectors =
      _KDB && _KDB.elements && _KDB.elements.selectors
        ? _KDB.elements.selectors.filterDock
        : null;
    catcherSelector = selectors ? selectors.outClickCatcherSelector : null;
    if (!catcherSelector) {
      return null;
    }
    if (selectors && selectors.rootSelector) {
      dockRoot = document.querySelector(selectors.rootSelector);
      if (dockRoot) {
        catcher = dockRoot.querySelector(catcherSelector);
      }
    }
    // Cognos portal exception: out-click catcher may live outside the dock root.
    if (!catcher) {
      catcher = document.querySelector(catcherSelector);
    }
    return catcher;
  }

  function __controller(_KDB) {
    var catcher;
    catcher = readOutClickCatcher(_KDB);
    if (!catcher || typeof catcher.click !== "function") {
      console.warn("[filterDock.closeActivePopup] filterOutClickCatcher missing");
      return false;
    }
    catcher.click();
    return true;
  }

  return __controller;
});
