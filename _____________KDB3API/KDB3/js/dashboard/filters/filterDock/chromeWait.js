define(["./config.js", "./selectors.js"], function (_config, _selectors) {
  "use strict";

  function trackChromeWait(_KDB, key, promise) {
    var checks = _KDB.runtime && _KDB.runtime.cognosHost && _KDB.runtime.cognosHost.chromeChecks;
    if (!checks || typeof checks.trackWait !== "function") {
      return promise;
    }
    return checks.trackWait(_KDB, key, promise);
  }

  function waitForDockChrome(_KDB, signal) {
    var waitForElObserver = _KDB.utils && typeof _KDB.utils.waitForElObserver === "function"
      ? _KDB.utils.waitForElObserver
      : null;
    var selectors = _selectors.readDockSelectors(_KDB);
    var waitOptions = { timeoutMs: _config.CHROME_WAIT_TIMEOUT_MS, signal: signal || null };
    if (!waitForElObserver) {
      return Promise.reject(new Error("filterDock: waitForElObserver is missing"));
    }
    if (!selectors || !selectors.rootSelector || !selectors.globalDockSelector || !selectors.pageContextDockSelector) {
      return Promise.reject(new Error("filterDock: Cognos dock selectors are not configured"));
    }
    return Promise.all([
      trackChromeWait(_KDB, "filterDock.rootSelector", waitForElObserver(selectors.rootSelector, document, waitOptions)),
      trackChromeWait(_KDB, "filterDock.globalDockSelector", waitForElObserver(selectors.globalDockSelector, document, waitOptions)),
      trackChromeWait(
        _KDB,
        "filterDock.pageContextDockSelector",
        waitForElObserver(selectors.pageContextDockSelector, document, waitOptions)
      )
    ]);
  }

  return { waitForDockChrome: waitForDockChrome };
});
