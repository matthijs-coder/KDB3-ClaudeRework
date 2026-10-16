define([
  "./view/placeHistoryControls.js",
  "./view/syncHistoryControlsView.js",
  "./effects/bindHistoryControlsClick.js",
  "./effects/subscribeHistoryChanged.js",
  "./observation/bindToolbarObserver.js",
  "./runtime/cleanupHistoryControlsRuntime.js"
], function (
  _placeHistoryControls,
  _syncHistoryControlsView,
  _bindHistoryControlsClick,
  _subscribeHistoryChanged,
  _bindToolbarObserver,
  _cleanupHistoryControlsRuntime
) {
  "use strict";

  function readRuntime(_KDB) {
    return _KDB.runtime.historyControls;
  }

  function remountAndSync(_KDB, _controller) {
    var runtime = readRuntime(_KDB);
    if (!runtime.domRefs.toolbarHostEl || _controller.isDisposed) return;
    _placeHistoryControls(_KDB, runtime.domRefs.toolbarHostEl);
    _syncHistoryControlsView(_KDB);
  }

  function finishMount(_KDB, _controller, _toolbarHostEl) {
    var syncOptions = { sync: _syncHistoryControlsView.bind(null, _KDB) };
    _placeHistoryControls(_KDB, _toolbarHostEl);
    _bindHistoryControlsClick(_KDB, syncOptions);
    _subscribeHistoryChanged(_KDB, syncOptions);
    _bindToolbarObserver(_KDB, { remount: remountAndSync.bind(null, _KDB, _controller) });
    _syncHistoryControlsView(_KDB);
  }

  function readWaitForElObserver(_KDB) {
    return _KDB.utils && typeof _KDB.utils.waitForElObserver === "function"
      ? _KDB.utils.waitForElObserver
      : null;
  }

  function trackChromeWait(_KDB, key, promise) {
    var checks = _KDB.runtime && _KDB.runtime.cognosHost && _KDB.runtime.cognosHost.chromeChecks;
    if (!checks || typeof checks.trackWait !== "function") return promise;
    return checks.trackWait(_KDB, key, promise);
  }

  function readToolbarHostSelector(_KDB) {
    var toolbar = _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.toolbar : null;
    if (toolbar && toolbar.actionBarLeadingSelector) return toolbar.actionBarLeadingSelector;
    var history = _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.historyControls : null;
    return history && history.toolbarHostSelector ? history.toolbarHostSelector : null;
  }

  function mount(_KDB, _controller) {
    var runtime;
    var mountController;
    var mountSignal;
    var waitForElObserver;
    try {
      if (_controller.isDisposed) {
        console.warn("[historyControls.mount] called after destroy");
        return false;
      }
      waitForElObserver = readWaitForElObserver(_KDB);
      if (!waitForElObserver) {
        console.warn("[historyControls.mount] _KDB.utils.waitForElObserver is missing");
        return false;
      }
      if (!readToolbarHostSelector(_KDB)) {
        console.error("[historyControls.mount] toolbar host selector is not configured");
        return false;
      }
      runtime = readRuntime(_KDB);
      if (!_KDB.services || !_KDB.services.history) {
        if (!_controller.didWarnMissingHistoryService) {
          _controller.didWarnMissingHistoryService = true;
          console.warn("[historyControls.mount] _KDB.services.history is missing; controls mount disabled");
        }
      }
      if (runtime.pendingPromises.mount) return true;
      mountSignal = null;
      if (typeof AbortController === "function") {
        mountController = new AbortController();
        runtime.abortControllers.mount = mountController;
        mountSignal = mountController.signal;
      }
      runtime.pendingPromises.mount = trackChromeWait(
        _KDB,
        "toolbar.actionBarLeadingSelector",
        waitForElObserver(
          readToolbarHostSelector(_KDB),
          document,
          { timeoutMs: 30000, signal: mountSignal }
        )
      )
        .then(function (_toolbarHostEl) {
          if (_controller.isDisposed || (mountSignal && mountSignal.aborted) || !_toolbarHostEl) return;
          finishMount(_KDB, _controller, _toolbarHostEl);
        })
        .catch(function (error) {
          if (!error || error.code !== "ABORTED") console.error("[historyControls.mount]", error);
        })
        .finally(function () {
          runtime.pendingPromises.mount = null;
          runtime.abortControllers.mount = null;
        });
      return true;
    } catch (error) {
      console.error("[historyControls.mount]", error);
      return false;
    }
  }

  function destroy(_KDB, _controller) {
    if (_controller.isDisposed) return;
    _controller.isDisposed = true;
    try {
      _cleanupHistoryControlsRuntime(_KDB);
    } catch (error) {
      console.error("[historyControls.destroy]", error);
    }
  }
  function createHistoryControlsController(_KDB) {
    var controller = { isDisposed: false, didWarnMissingHistoryService: false };
    return { mount: mount.bind(null, _KDB, controller), destroy: destroy.bind(null, _KDB, controller) };
  }
  return createHistoryControlsController;
});
