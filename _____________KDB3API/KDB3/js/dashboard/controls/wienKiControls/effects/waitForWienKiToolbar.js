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
    var owner = _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.wienKiControls : null;
    return owner && owner.toolbarHostSelector ? owner.toolbarHostSelector : null;
  }

  function onToolbarReady(_options, _mountSignal, _toolbarHostEl) {
    try {
      if (!_options.isDisposed() && !(_mountSignal && _mountSignal.aborted) && _toolbarHostEl) {
        _options.onReady(_toolbarHostEl);
      }
    } catch (err) {
      console.error("[wienKiControls.mount]", err);
    }
  }

  function onToolbarWaitFailed(_error) {
    if (!_error || _error.code !== "ABORTED") console.error("[wienKiControls.mount]", _error);
  }

  function onToolbarWaitSettled(_runtime, _mountController) {
    _runtime.pendingPromises.mount = null;
    if (_runtime.abortControllers.mount === _mountController) _runtime.abortControllers.mount = null;
  }

  function waitForWienKiToolbar(_KDB, _options) {
    var runtime = _KDB.runtime.wienKiControls;
    var selector = readToolbarHostSelector(_KDB);
    var waitForElObserver = _KDB.utils && _KDB.utils.waitForElObserver;
    var mountController;
    var mountSignal = null;
    var mountPromise;
    try {
      if (typeof waitForElObserver !== "function") {
        console.warn("[wienKiControls.mount] _KDB.utils.waitForElObserver is missing");
        return false;
      }
      if (!selector) {
        console.error("[wienKiControls.mount] toolbar host selector is not configured");
        return false;
      }
      if (runtime.pendingPromises.mount) return true;
      if (typeof AbortController === "function") {
        mountController = new AbortController();
        runtime.abortControllers.mount = mountController;
        mountSignal = mountController.signal;
      }
      mountPromise = trackChromeWait(_KDB, "toolbar.actionBarLeadingSelector", waitForElObserver(selector, document, { timeoutMs: 30000, signal: mountSignal }))
        .then(onToolbarReady.bind(null, _options, mountSignal))
        .catch(onToolbarWaitFailed)
        .finally(onToolbarWaitSettled.bind(null, runtime, mountController));
      runtime.pendingPromises.mount = mountPromise;
      return true;
    } catch (err) {
      console.error("[wienKiControls.waitForWienKiToolbar]", err);
      return false;
    }
  }

  return waitForWienKiToolbar;
});
