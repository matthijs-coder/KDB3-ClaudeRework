define([
  "../runtime.js",
  "../effects/resolveBindingPrerequisites.js"
], function (_visRuntime, _resolveBindingPrerequisites) {
  function cleanupRuntime(_KDB) {
    try {
      _resolveBindingPrerequisites.rejectAllDienststelleGateWaiters(_KDB);
      _resolveBindingPrerequisites.rejectAllTopNGateWaiters(_KDB);
      _visRuntime.rejectAllContentReadyWaiters(_KDB, {
        ok: false,
        status: "error",
        errorCode: "WIDGET_VIS_DESTROY_FAILED",
        errorMessage: "widgetVis destroyed."
      });
      const runtime = _KDB.runtime && _KDB.runtime.widgetVis ? _KDB.runtime.widgetVis : {};
      cleanupBucket(runtime.subscriptions, callCleanup);
      cleanupBucket(runtime.listeners, callCleanup);
      cleanupBucket(runtime.abortControllers, abortController);
      cleanupBucket(runtime.observers, disconnectObserver);
      cleanupBucket(runtime.timers, clearTimer);
      cleanupWidgetRuntimeBucket(runtime.byId, cleanupWidgetRuntime);
      _KDB.runtime.widgetVis = {};
    } catch (err) {
      console.error("[widgetVis.cleanupRuntime] failed", err);
      throw err;
    }
  }
  function cleanupBucket(_bucket, _cleanup) {
    const bucket = _bucket || {};
    Object.keys(bucket).forEach(function (key) { _cleanup(bucket[key]); });
  }
  function callCleanup(_entry) {
    if (typeof _entry === "function") { _entry(); }
  }
  function abortController(_entry) {
    if (_entry && typeof _entry.abort === "function") { _entry.abort(); }
  }
  function disconnectObserver(_entry) {
    if (_entry && typeof _entry.disconnect === "function") { _entry.disconnect(); }
  }
  function clearTimer(_entry) {
    clearTimeout(_entry);
    clearInterval(_entry);
  }
  function cleanupWidgetRuntimeBucket(_byId, _cleanup) {
    const byId = _byId || {};
    Object.keys(byId).forEach(function (key) { _cleanup(byId[key]); });
  }
  function cleanupWidgetRuntime(_widgetRuntime) {
    if (!_widgetRuntime) {
      return;
    }
    if (_widgetRuntime.focusMode) {
      if (typeof _widgetRuntime.focusMode.dispose === "function") {
        try {
          _widgetRuntime.focusMode.dispose();
        } catch (ignoreFocusDispose) {
          /* noop */
        }
      }
      disconnectObserver(_widgetRuntime.focusMode.observer);
      _widgetRuntime.focusMode = {
        observedExpanded: false,
        observer: null,
        focusPanelEl: null,
        dispose: null,
        source: null
      };
    }
    cleanupBucket(_widgetRuntime.observers, disconnectObserver);
    cleanupBucket(_widgetRuntime.timers, clearTimer);
    cleanupBucket(_widgetRuntime.listeners, callCleanup);
    cleanupBucket(_widgetRuntime.abortControllers, abortController);
    _widgetRuntime._legendSanitizeActive = false;
  }
  return cleanupRuntime;
});
