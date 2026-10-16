define([
  "./config.js",
  "./selectors.js",
  "../../../core/utils/kit/errors.js"
], function (_config, _selectors, _errors) {
  "use strict";

  function trackChromeWait(_KDB, key, promise) {
    var checks = _KDB.runtime && _KDB.runtime.cognosHost && _KDB.runtime.cognosHost.chromeChecks;
    if (!checks || typeof checks.trackWait !== "function") {
      return promise;
    }
    return checks.trackWait(_KDB, key, promise);
  }

  // Waits for the three Cognos dock containers with one shared observer and one timer.
  // Rejects with code ABORTED (signal) or FILTER_DOCK_CHROME_WAIT_TIMEOUT.
  function waitForDockChrome(_KDB, signal) {
    var selectors = _selectors.readDockSelectors(_KDB);
    var pending = [];
    var observer = null;
    var timeoutId = null;
    var promises;
    var wanted;

    if (!selectors || !selectors.rootSelector || !selectors.globalDockSelector || !selectors.pageContextDockSelector) {
      return Promise.reject(new Error("filterDock: Cognos dock selectors are not configured"));
    }
    wanted = [
      { key: "filterDock.rootSelector", selector: selectors.rootSelector },
      { key: "filterDock.globalDockSelector", selector: selectors.globalDockSelector },
      { key: "filterDock.pageContextDockSelector", selector: selectors.pageContextDockSelector }
    ];

    function stopWatching() {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
    }

    function rejectPending(buildError) {
      var entries = pending;
      pending = [];
      stopWatching();
      entries.forEach(function (entry) {
        entry.reject(buildError(entry));
      });
    }

    function onAbort() {
      rejectPending(function () {
        return _errors.codedError("ABORTED", "filterDock chrome wait aborted");
      });
    }

    function resolveFound() {
      pending = pending.filter(function (entry) {
        var element = document.querySelector(entry.selector);
        if (element) {
          entry.resolve(element);
        }
        return !element;
      });
      if (pending.length === 0) {
        stopWatching();
      }
    }

    promises = wanted.map(function (item) {
      return trackChromeWait(_KDB, item.key, new Promise(function (resolve, reject) {
        pending.push({ selector: item.selector, resolve: resolve, reject: reject });
      }));
    });

    if (signal && signal.aborted) {
      onAbort();
      return Promise.all(promises);
    }
    resolveFound();
    if (pending.length > 0) {
      observer = new MutationObserver(resolveFound);
      observer.observe(document, { childList: true, subtree: true });
      timeoutId = setTimeout(function () {
        rejectPending(function (entry) {
          return _errors.codedError(_config.ERROR_CHROME_WAIT_TIMEOUT, "Timeout waiting for " + entry.selector);
        });
      }, _config.CHROME_WAIT_TIMEOUT_MS);
      if (signal) {
        signal.addEventListener("abort", onAbort, { once: true });
      }
    }
    return Promise.all(promises);
  }

  return { waitForDockChrome: waitForDockChrome };
});
