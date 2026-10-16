define([], function () {
  "use strict";

  function trackChromeWait(_KDB, key, promise) {
    var checks = _KDB.runtime && _KDB.runtime.cognosHost && _KDB.runtime.cognosHost.chromeChecks;
    if (!checks || typeof checks.trackWait !== "function") return promise;
    return checks.trackWait(_KDB, key, promise);
  }

  function readToolbarHostSelector(_KDB) {
    var toolbar = _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.toolbar : null;
    if (toolbar && toolbar.actionBarLeadingSelector) return toolbar.actionBarLeadingSelector;
    var share = _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.shareControls : null;
    return share && share.toolbarHostSelector ? share.toolbarHostSelector : null;
  }

  function waitForShareToolbar(_KDB, _options) {
    var runtime = _KDB.runtime.shareControls;
    var selector = readToolbarHostSelector(_KDB);
    var waitForElObserver = _KDB.utils && _KDB.utils.waitForElObserver;
    var mountController;
    var mountSignal = null;
    var mountPromise;
    if (typeof waitForElObserver !== "function") {
      console.warn("[shareControls.mount] _KDB.utils.waitForElObserver is missing");
      return false;
    }
    if (!selector) {
      console.error("[shareControls.mount] toolbar host selector is not configured");
      return false;
    }
    if (runtime.pendingPromises.mount) return true;
    if (typeof AbortController === "function") {
      mountController = new AbortController();
      runtime.abortControllers.mount = mountController;
      mountSignal = mountController.signal;
    }
    mountPromise = trackChromeWait(_KDB, "toolbar.actionBarLeadingSelector", waitForElObserver(selector, document, { timeoutMs: 30000, signal: mountSignal }))
      .then(function (toolbarHostEl) {
        if (!_options.isDisposed() && !(mountSignal && mountSignal.aborted) && toolbarHostEl) {
          _options.onReady(toolbarHostEl);
        }
      })
      .catch(function (error) {
        if (!error || error.code !== "ABORTED") console.error("[shareControls.mount]", error);
      })
      .finally(function () {
        if (runtime.pendingPromises.mount === mountPromise) runtime.pendingPromises.mount = null;
        if (runtime.abortControllers.mount === mountController) runtime.abortControllers.mount = null;
      });
    runtime.pendingPromises.mount = mountPromise;
    return true;
  }

  return waitForShareToolbar;
});
