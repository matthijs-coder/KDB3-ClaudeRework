define([
  "./domQueries.js",
  "./buildFocusPanel.js",
  "./disposeFocusMode.js",
  "../syncDrillthroughAfterFocusExit.js"
], function (_domQueries, _activateFocusModeChrome, _disposeFocusMode, _syncDrillthroughAfterFocusExit) {
  "use strict";

  function handleObservedStateChange(_KDB, widgetId, runtime, callbacks, expandedNow) {
    var bucket = runtime.focusMode || {};
    var cb = callbacks || {};
    if (expandedNow && bucket.observedExpanded === true) {
      return;
    }
    if (!expandedNow && bucket.observedExpanded !== true) {
      return;
    }
    if (expandedNow) {
      bucket.observedExpanded = true;
      bucket.source = "nativeExpand";
      _activateFocusModeChrome(_KDB, widgetId, runtime, { source: "nativeExpand" });
      if (typeof cb.onEntered === "function" && cb.readMaximized && cb.readMaximized() !== true) {
        cb.onEntered("nativeExpand");
      } else if (typeof cb.onEntered === "function" && !cb.readMaximized) {
        cb.onEntered("nativeExpand");
      }
      return;
    }
    _disposeFocusMode.disposeFocusModeChrome(widgetId, runtime);
    _syncDrillthroughAfterFocusExit({ _KDB: _KDB, widgetId: widgetId });
    if (typeof cb.onExited === "function" && cb.readMaximized && cb.readMaximized() === true) {
      cb.onExited("nativeCollapse");
    } else if (typeof cb.onExited === "function" && !cb.readMaximized) {
      cb.onExited("nativeCollapse");
    }
  }

  function clearFocusCheckTimer(runtime) {
    var timers = runtime && runtime.timers ? runtime.timers : null;
    if (!timers || timers.focusCheck == null) {
      return;
    }
    clearTimeout(timers.focusCheck);
    timers.focusCheck = null;
  }

  function disconnectFocusObserver(runtime, nativeDisconnect) {
    clearFocusCheckTimer(runtime);
    nativeDisconnect();
  }

  function runScheduledFocusCheck(_KDB, widgetId, runtime, callbacks, scheduleState) {
    if (runtime.timers) {
      runtime.timers.focusCheck = null;
    }
    scheduleState.scheduled = false;
    handleObservedStateChange(
      _KDB,
      widgetId,
      runtime,
      callbacks,
      _domQueries.isWidgetExpanded(widgetId)
    );
  }

  function scheduleFocusCheck(_KDB, widgetId, runtime, callbacks, scheduleState) {
    if (scheduleState.scheduled) {
      return;
    }
    scheduleState.scheduled = true;
    runtime.timers = runtime.timers || {};
    clearFocusCheckTimer(runtime);
    runtime.timers.focusCheck = window.setTimeout(
      runScheduledFocusCheck.bind(null, _KDB, widgetId, runtime, callbacks, scheduleState),
      0
    );
  }

  function installFocusModeObserver(_KDB, widgetId, runtime, callbacks) {
    var bucket = runtime.focusMode || {};
    var scheduleState = { scheduled: false };
    if (bucket.observer && typeof bucket.observer.disconnect === "function") {
      return { ok: true, diagnostics: { alreadyInstalled: true } };
    }
    if (typeof MutationObserver !== "function") {
      return { ok: false, errorCode: "WIDGET_VIS_MAXIMIZE_FAILED", diagnostics: { missingMutationObserver: true } };
    }
    bucket.observer = new MutationObserver(
      scheduleFocusCheck.bind(null, _KDB, widgetId, runtime, callbacks, scheduleState)
    );
    bucket.observer.disconnect = disconnectFocusObserver.bind(
      null,
      runtime,
      bucket.observer.disconnect.bind(bucket.observer)
    );
    try {
      bucket.observer.observe(document.body, { childList: true, subtree: true });
    } catch (err) {
      console.error("[widgetVis.widgetFocusMode.installFocusModeObserver] observe failed", widgetId, err);
      return {
        ok: false,
        errorCode: "WIDGET_VIS_MAXIMIZE_FAILED",
        errorMessage: String(err && err.message ? err.message : err)
      };
    }
    scheduleFocusCheck(_KDB, widgetId, runtime, callbacks, scheduleState);
    return { ok: true, diagnostics: { observerInstalled: true } };
  }

  return installFocusModeObserver;
});
