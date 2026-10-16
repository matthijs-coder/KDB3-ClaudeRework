define([
  "../runtime.js",
  "../results.js"
], function (_visRuntime, _results) {
  "use strict";

  function handleWaitUntilContentReady(_context, _action) {
    try {
      var widgetId = _action.widgetId;
      var payload = _action.payload || {};
      var _KDB = _context._KDB;

      if (_context.isDisposed) {
        return Promise.resolve(_results.normalizeDispatchResult({
          ok: false,
          widgetId: widgetId,
          status: "error",
          errorCode: "WIDGET_VIS_DESTROY_FAILED",
          errorMessage: "widgetVis is disposed."
        }));
      }

      if (_visRuntime.isContentReady(_KDB, widgetId)) {
        return Promise.resolve(_results.normalizeDispatchResult({ ok: true, widgetId: widgetId, ready: true }));
      }

      var runtime = _visRuntime.ensureWidgetRuntime(_KDB, widgetId);
      runtime.pendingPromises = runtime.pendingPromises || {};
      var existing = runtime.pendingPromises.contentReady;
      if (existing && existing.promise) {
        return existing.promise.then(_results.normalizeDispatchResult);
      }

      var timeoutMs = _visRuntime.getContentReadyTimeoutMs(payload);
      var settle = null;
      var promise = new Promise(function (resolve) {
        settle = resolve;
      });

      var timerId = setTimeout(function () {
        _visRuntime.clearContentReadyPending(runtime);
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

      if (_visRuntime.isContentReady(_KDB, widgetId)) {
        _visRuntime.resolveContentReadyWaiters(_KDB, widgetId);
      }

      return promise.then(_results.normalizeDispatchResult);
    } catch (err) {
      console.error("[widgetVis.handleWaitUntilContentReady] failed", _action && _action.widgetId, err);
      return Promise.resolve(_results.normalizeDispatchResult({
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
