define([], function () {
  function cleanupRuntime(_KDB) {
    try {
      const runtime = _KDB.runtime && _KDB.runtime.widgetDataTable ? _KDB.runtime.widgetDataTable : {};
      cleanupBucket(runtime.subscriptions, callCleanup);
      cleanupBucket(runtime.listeners, callCleanup);
      cleanupBucket(runtime.abortControllers, abortController);
      cleanupBucket(runtime.observers, disconnectObserver);
      cleanupBucket(runtime.timers, clearTimer);
      _KDB.runtime.widgetDataTable = {};
    } catch (err) {
      console.error("[widgetDataTable.cleanupRuntime] failed", err);
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
  return cleanupRuntime;
});
