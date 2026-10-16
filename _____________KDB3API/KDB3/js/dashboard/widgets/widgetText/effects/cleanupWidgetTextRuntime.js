define(["../runtime/initializeRuntime.js"], function (_initializeRuntime) {
  function __controller(_KDB, _widgetId) {
    try {
      _initializeRuntime(_KDB);
      var runtime = _KDB.runtime.widgetText;
      if (_widgetId) {
        cleanupWidgetBucket(runtime.byId && runtime.byId[_widgetId] ? runtime.byId[_widgetId] : null);
        if (runtime.byId) {
          delete runtime.byId[_widgetId];
        }
        return;
      }
      cleanupBucket(runtime.subscriptions, callCleanup);
      cleanupBucket(runtime.listeners, callCleanup);
      cleanupBucket(runtime.abortControllers, abortController);
      cleanupBucket(runtime.observers, disconnectObserver);
      cleanupBucket(runtime.timers, clearTimer);
      cleanupBucket(runtime.pendingPromises, noopPromise);
      cleanupBucket(runtime.styleElements, removeElement);
      runtime.historyReplayHandlerContribution = null;
      if (runtime.byId) {
        Object.keys(runtime.byId).forEach(function (widgetId) {
          cleanupWidgetBucket(runtime.byId[widgetId]);
        });
      }
      _KDB.runtime.widgetText = {
        domRefs: {},
        listeners: {},
        subscriptions: {},
        abortControllers: {},
        observers: {},
        timers: {},
        pendingPromises: {},
        styleElements: {},
        byId: {}
      };
    } catch (err) {
      console.error("[widgetText.cleanupWidgetTextRuntime] failed", { widgetId: _widgetId }, err);
      throw err;
    }
  }

  function cleanupWidgetBucket(_widgetRuntime) {
    if (!_widgetRuntime) {
      return;
    }
    cleanupBucket(_widgetRuntime.listeners, callCleanup);
    cleanupBucket(_widgetRuntime.abortControllers, abortController);
    cleanupBucket(_widgetRuntime.observers, disconnectObserver);
    cleanupBucket(_widgetRuntime.timers, clearTimer);
    cleanupBucket(_widgetRuntime.pendingPromises, noopPromise);
    cleanupBucket(_widgetRuntime.styleElements, removeElement);
    _widgetRuntime.domRefs = {
      shellEl: null,
      contentEl: null,
      editableEl: null,
      paragraphEl: null,
      spanEl: null,
      textNodeForFont: null
    };
    _widgetRuntime.styleElements = { fontSize: null, textColor: null };
    _widgetRuntime.editSession = { isActive: false, originalText: null, startedAt: null };
  }

  function cleanupBucket(_bucket, _cleanup) {
    var bucket = _bucket || {};
    Object.keys(bucket).forEach(function (key) {
      _cleanup(bucket[key]);
    });
  }

  function callCleanup(_entry) {
    if (typeof _entry === "function") {
      _entry();
    }
  }

  function abortController(_entry) {
    if (_entry && typeof _entry.abort === "function") {
      _entry.abort();
    }
  }

  function disconnectObserver(_entry) {
    if (_entry && typeof _entry.disconnect === "function") {
      _entry.disconnect();
    }
  }

  function clearTimer(_entry) {
    clearTimeout(_entry);
    clearInterval(_entry);
  }

  function removeElement(_entry) {
    if (_entry && _entry.parentNode) {
      _entry.parentNode.removeChild(_entry);
    }
  }

  function noopPromise(_entry) {
    return _entry;
  }

  return __controller;
});
