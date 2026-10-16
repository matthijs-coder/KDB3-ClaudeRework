define([
  "../runtime/ensureWidgetRuntime.js",
  "../runtime/contentReady.js",
  "./normalizeDispatchResult.js"
], function (_ensureWidgetRuntime, _contentReady, _normalizeDispatchResult) {
  "use strict";

  function handleWaitUntilContentReady(_context, _action) {
    try {
      var widgetId = _action.widgetId;
      var payload = _action.payload || {};
      var _KDB = _context._KDB;

      if (_context.isDisposed) {
        return Promise.resolve(_normalizeDispatchResult({
          ok: false,
          widgetId: widgetId,
          status: "error",
          errorCode: "WIDGET_VIS_DESTROY_FAILED",
          errorMessage: "widgetVis is disposed."
        }));
      }

      if (_contentReady.isContentReady(_KDB, widgetId)) {
        return Promise.resolve(_normalizeDispatchResult({ ok: true, widgetId: widgetId, ready: true }));
      }

      var runtime = _ensureWidgetRuntime(_KDB, widgetId);
      runtime.pendingPromises = runtime.pendingPromises || {};
      var existing = runtime.pendingPromises.contentReady;
      if (existing && existing.promise) {
        return existing.promise.then(_normalizeDispatchResult);
      }

      var timeoutMs = _contentReady.getContentReadyTimeoutMs(payload);
      var settle = null;
      var promise = new Promise(function (resolve) {
        settle = resolve;
      });

      var timerId = setTimeout(function () {
        _contentReady.clearContentReadyPending(runtime);
        settle({
          ok: false,
          widgetId: widgetId,
          status: "timeout",
          errorCode: "WIDGET_VIS_CONTENT_READY_TIMEOUT",
          errorMessage: "Content registration timed out."
        });
      }, timeoutMs);

      runtime.pendingPromises.contentReady = {
        promise: promise,
        resolve: settle,
        timerId: timerId
      };

      if (_contentReady.isContentReady(_KDB, widgetId)) {
        _contentReady.resolveContentReadyWaiters(_KDB, widgetId);
      }

      return promise.then(_normalizeDispatchResult);
    } catch (err) {
      console.error("[widgetVis.handleWaitUntilContentReady] failed", _action && _action.widgetId, err);
      return Promise.resolve(_normalizeDispatchResult({
        ok: false,
        widgetId: _action.widgetId,
        status: "error",
        errorCode: "WIDGET_VIS_CONTENT_CONTEXT_MISSING",
        errorMessage: String(err && err.message ? err.message : err)
      }));
    }
  }

  return handleWaitUntilContentReady;
});
