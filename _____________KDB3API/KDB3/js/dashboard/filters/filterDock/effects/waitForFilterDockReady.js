define([], function () {
  "use strict";

  function readWaitForElObserver(_KDB) {
    return _KDB.utils && typeof _KDB.utils.waitForElObserver === "function"
      ? _KDB.utils.waitForElObserver
      : null;
  }

  function readFilterDockSelectors(_KDB) {
    return _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.filterDock : null;
  }

  function trackChromeWait(_KDB, key, promise) {
    var checks = _KDB.runtime && _KDB.runtime.cognosHost && _KDB.runtime.cognosHost.chromeChecks;
    if (!checks || typeof checks.trackWait !== "function") return promise;
    return checks.trackWait(_KDB, key, promise);
  }

  function __controller(_KDB, _options) {
    var waitForElObserver = readWaitForElObserver(_KDB);
    var selectors = readFilterDockSelectors(_KDB);
    var waitOptions = { timeoutMs: 30000, signal: _options && _options.signal ? _options.signal : null };
    if (!waitForElObserver) {
      return Promise.reject(new Error("filterDock: waitForElObserver is missing"));
    }
    if (!selectors || !selectors.rootSelector || !selectors.globalDockSelector || !selectors.pageContextDockSelector) {
      return Promise.reject(new Error("filterDock: Cognos dock selectors are not configured"));
    }
    return Promise.all([
      trackChromeWait(_KDB, "filterDock.rootSelector", waitForElObserver(selectors.rootSelector, document, waitOptions)),
      trackChromeWait(_KDB, "filterDock.globalDockSelector", waitForElObserver(selectors.globalDockSelector, document, waitOptions)),
      trackChromeWait(_KDB, "filterDock.pageContextDockSelector", waitForElObserver(selectors.pageContextDockSelector, document, waitOptions))
    ]);
  }

  return __controller;
});
