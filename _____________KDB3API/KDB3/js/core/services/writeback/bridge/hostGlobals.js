define([], function () {
  "use strict";

  var GET_NAME = "WBParameterGetFunction";
  var SET_NAME = "WBParameterSetFunction";

  function isBridgeAnchor(fn) {
    return typeof fn === "function" && fn.__kdbWritebackBridge === true;
  }

  function isForeign(fn) {
    return typeof fn === "function" && fn.__kdbWritebackBridge !== true;
  }

  // The previous global to put back on uninstall. A live KDB anchor (reverse destroy order) is restored;
  // an anchor whose owner is disposed is never restored, its foreign previous is.
  function resolveRestorablePrevious(previousFn) {
    if (!isBridgeAnchor(previousFn)) {
      return previousFn;
    }
    var previousOwner = previousFn.__kdbOwner;
    if (previousOwner && previousOwner._isDisposed !== true) {
      return previousFn;
    }
    return previousFn.__kdbForeignPrevious;
  }

  // A newer boot may already have replaced our anchor (double boot); then the global is not ours to touch.
  function restoreGlobal(topWindow, name, ownedFn, previousFn) {
    if (topWindow[name] !== ownedFn) {
      return;
    }
    var previous = resolveRestorablePrevious(previousFn);
    topWindow[name] = previous;
    if (previous === undefined) {
      delete topWindow[name];
    }
  }

  function readTopWindow() {
    var topWindow = window.top;
    void topWindow.document; // cross-origin access check
    return topWindow;
  }

  // __kdbOwner is a getter so the anchor does not keep a destroyed KDB alive; readers only test truthiness
  // against an instance.
  function stampAnchor(fn, getOwner, existingFn) {
    fn.__kdbWritebackBridge = true;
    Object.defineProperty(fn, "__kdbOwner", { get: getOwner, enumerable: true, configurable: true });
    fn.__kdbForeignPrevious = isForeign(existingFn) ? existingFn : existingFn && existingFn.__kdbForeignPrevious;
  }

  function createHostGlobals(bridgeGet, bridgeSet, getOwner) {
    var previousGet;
    var previousSet;

    // Returns true when a foreign (non-KDB) global was overwritten.
    function install(topWindow) {
      var existingGet = topWindow[GET_NAME];
      var existingSet = topWindow[SET_NAME];
      previousGet = resolveRestorablePrevious(existingGet);
      previousSet = resolveRestorablePrevious(existingSet);
      stampAnchor(bridgeGet, getOwner, existingGet);
      stampAnchor(bridgeSet, getOwner, existingSet);
      topWindow[GET_NAME] = bridgeGet;
      topWindow[SET_NAME] = bridgeSet;
      return isForeign(existingGet) || isForeign(existingSet);
    }

    function uninstall(topWindow) {
      restoreGlobal(topWindow, GET_NAME, bridgeGet, previousGet);
      restoreGlobal(topWindow, SET_NAME, bridgeSet, previousSet);
      previousGet = undefined;
      previousSet = undefined;
    }

    return { install: install, uninstall: uninstall };
  }

  return {
    readTopWindow: readTopWindow,
    createHostGlobals: createHostGlobals
  };
});
