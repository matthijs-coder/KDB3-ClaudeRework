define([], function () {
  function cleanupRuntime(_KDB) {
    try {
      const runtime = _KDB.runtime && _KDB.runtime.widgetSettings ? _KDB.runtime.widgetSettings : {};
      cleanupBucket(runtime.subscriptions, callCleanup);
      cleanupBucket(runtime.listeners, callCleanup);
      cleanupBucket(runtime.abortControllers, abortController);
      cleanupBucket(runtime.observers, disconnectObserver);
      cleanupBucket(runtime.timers, clearTimer);
      runtime.historyReplayHandlerContribution = null;
      _KDB.runtime.widgetSettings = {};
    } catch (err) {
      console.error("[widgetSettings.cleanupRuntime] failed", err);
      throw err;
    }
  }
  function cleanupBucket(_bucket, _cleanup) {
    try {
      const bucket = _bucket || {};
      const keys = Object.keys(bucket);
      let index = 0;
      while (index < keys.length) {
        _cleanup(bucket[keys[index]]);
        index += 1;
      }
    } catch (err) {
      console.error("[widgetSettings.cleanupBucket] failed", err);
      throw err;
    }
  }
  function callCleanup(_entry) {
    try {
      if (typeof _entry === "function") { _entry(); }
    } catch (err) {
      console.error("[widgetSettings.callCleanup] failed", err);
      throw err;
    }
  }
  function abortController(_entry) {
    try {
      if (_entry && typeof _entry.abort === "function") { _entry.abort(); }
    } catch (err) {
      console.error("[widgetSettings.abortController] failed", err);
      throw err;
    }
  }
  function disconnectObserver(_entry) {
    try {
      if (_entry && typeof _entry.disconnect === "function") { _entry.disconnect(); }
    } catch (err) {
      console.error("[widgetSettings.disconnectObserver] failed", err);
      throw err;
    }
  }
  function clearTimer(_entry) {
    try {
      clearTimeout(_entry);
      clearInterval(_entry);
    } catch (err) {
      console.error("[widgetSettings.clearTimer] failed", err);
      throw err;
    }
  }
  return cleanupRuntime;
});
