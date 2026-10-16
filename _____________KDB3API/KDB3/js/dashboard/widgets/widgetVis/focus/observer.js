define([
  "../runtime.js",
  "../drillthrough/install.js",
  "../../../../core/utils/kit/runtime.js",
  "../../../../core/cognosHost/config/widgetChromeSelectors.js",
  "./panel.js"
], function (_visRuntime, _drillthroughInstall, _kitRuntime, _widgetChrome, _panel) {
  "use strict";

  var focus = _widgetChrome.focusMode.strings;

  function readFocusWatch(_moduleRuntime) {
    _moduleRuntime.focusWatch = _moduleRuntime.focusWatch || { byWidget: {} };
    return _moduleRuntime.focusWatch;
  }

  function handleObservedStateChange(_entry, _widgetId, _expandedNow) {
    var _KDB = _entry._KDB;
    var runtime = _entry.runtime;
    var bucket = runtime.focusMode || {};
    var cb = _entry.callbacks || {};
    if (_expandedNow === (bucket.observedExpanded === true)) {
      return;
    }
    if (_expandedNow) {
      bucket.observedExpanded = true;
      bucket.source = "nativeExpand";
      _panel.activateFocusModeChrome(_KDB, _widgetId, runtime, { source: "nativeExpand" });
      if (typeof cb.onEntered === "function" && (!cb.readMaximized || cb.readMaximized() !== true)) {
        cb.onEntered("nativeExpand");
      }
      return;
    }
    _panel.disposeFocusModeChrome(_widgetId, runtime);
    _drillthroughInstall.syncDrillthroughAfterFocusExit({ _KDB: _KDB, widgetId: _widgetId });
    if (typeof cb.onExited === "function" && (!cb.readMaximized || cb.readMaximized() === true)) {
      cb.onExited("nativeCollapse");
    }
  }

  function runFocusCheck(_moduleRuntime) {
    var watch = _moduleRuntime.focusWatch;
    var containers;
    if (!watch) {
      return;
    }
    containers = Array.prototype.slice.call(document.querySelectorAll(focus.expandModeContainerSelector));
    Object.keys(watch.byWidget).forEach(function (widgetId) {
      var entry = watch.byWidget[widgetId];
      var selector = '[id="' + widgetId + '"]';
      try {
        if (entry) {
          handleObservedStateChange(entry, widgetId, containers.some(function (container) { return !!container.querySelector(selector); }));
        }
      } catch (err) {
        console.error("[widgetVis.runFocusCheck] failed", widgetId, err);
      }
    });
  }

  function scheduleFocusCheck(_moduleRuntime) {
    if (_moduleRuntime.timers.focusCheck) {
      return;
    }
    _kitRuntime.scheduleTimeout(_moduleRuntime.timers, "focusCheck", runFocusCheck.bind(null, _moduleRuntime), 0);
  }

  function installSharedObserver(_moduleRuntime) {
    var observer;
    if (_moduleRuntime.observers.focusMode) {
      return { ok: true };
    }
    if (typeof MutationObserver !== "function") {
      return { ok: false, errorCode: "WIDGET_VIS_MAXIMIZE_FAILED", diagnostics: { missingMutationObserver: true } };
    }
    observer = new MutationObserver(scheduleFocusCheck.bind(null, _moduleRuntime));
    try {
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (err) {
      console.error("[widgetVis.registerFocusWidget] observe failed", err);
      return { ok: false, errorCode: "WIDGET_VIS_MAXIMIZE_FAILED", errorMessage: String(err && err.message ? err.message : err) };
    }
    _moduleRuntime.observers.focusMode = observer;
    return { ok: true };
  }

  function registerFocusWidget(_KDB, _widgetId, _runtime, _callbacks) {
    var moduleRuntime = _visRuntime.initializeRuntime(_KDB);
    var watch = readFocusWatch(moduleRuntime);
    var installed;
    if (watch.byWidget[_widgetId]) {
      return { ok: true, diagnostics: { alreadyInstalled: true } };
    }
    installed = installSharedObserver(moduleRuntime);
    if (!installed.ok) {
      return installed;
    }
    watch.byWidget[_widgetId] = { _KDB: _KDB, runtime: _runtime, callbacks: _callbacks };
    scheduleFocusCheck(moduleRuntime);
    return { ok: true, diagnostics: { observerInstalled: true } };
  }

  function unregisterFocusWidget(_KDB, _widgetId) {
    var moduleRuntime = _KDB && _KDB.runtime ? _KDB.runtime.widgetVis : null;
    var watch = moduleRuntime ? moduleRuntime.focusWatch : null;
    if (!watch || !watch.byWidget[_widgetId]) {
      return;
    }
    delete watch.byWidget[_widgetId];
    if (Object.keys(watch.byWidget).length > 0) {
      return;
    }
    if (moduleRuntime.observers && moduleRuntime.observers.focusMode) {
      moduleRuntime.observers.focusMode.disconnect();
      delete moduleRuntime.observers.focusMode;
    }
    if (moduleRuntime.timers) {
      _kitRuntime.clearTimer(moduleRuntime.timers, "focusCheck");
    }
  }

  return {
    registerFocusWidget: registerFocusWidget,
    unregisterFocusWidget: unregisterFocusWidget
  };
});
