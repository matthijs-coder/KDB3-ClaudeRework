define([
  "../resolveAsyncHostApi.js",
  "../buildCanvasOutcome.js",
  "../config/canvasErrorCodes.js"
], function (_resolveAsyncHostApi, _buildCanvasOutcome, _canvasErrorCodes) {
  "use strict";

  function isAborted(_options) {
    return !!(_options && _options.signal && _options.signal.aborted === true);
  }

  function isValidWidgetId(_widgetId) {
    return typeof _widgetId === "string" && _widgetId !== "";
  }

  function swallowLateRejection(_promise) {
    Promise.resolve(_promise).catch(function () { return null; });
  }

  function raceHostAndSignal(_hostPromise, _signal) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var abortListener = null;
      function finish(_kind) {
        if (settled) {
          return;
        }
        settled = true;
        if (_signal && abortListener && typeof _signal.removeEventListener === "function") {
          _signal.removeEventListener("abort", abortListener);
        }
        resolve(_kind);
      }
      if (_signal && _signal.aborted === true) {
        finish("aborted");
        return;
      }
      if (_signal && typeof _signal.addEventListener === "function") {
        abortListener = function () { finish("aborted"); };
        _signal.addEventListener("abort", abortListener, { once: true });
      }
      Promise.resolve(_hostPromise).then(function () {
        finish("host");
      }, function (error) {
        if (settled) {
          return;
        }
        settled = true;
        if (_signal && abortListener && typeof _signal.removeEventListener === "function") {
          _signal.removeEventListener("abort", abortListener);
        }
        reject(error);
      });
    });
  }

  // Arms the host waiter synchronously (the first line before await) so the
  // caller can trigger renderWidget and then await this Outcome. The host
  // promise never leaves ring 1.
  async function awaitRenderEvent(_ctx, _widgetId, _methodName, _options) {
    var asyncApi;
    var hostPromise;
    var winner;
    if (_ctx.isDisposed()) {
      return _buildCanvasOutcome.buildDisposed();
    }
    if (isAborted(_options)) {
      return _buildCanvasOutcome.buildAborted("aborted");
    }
    if (!isValidWidgetId(_widgetId)) {
      return _buildCanvasOutcome.buildFailed(_canvasErrorCodes.INVALID_ID, []);
    }
    try {
      asyncApi = _resolveAsyncHostApi(_ctx._KDB);
      if (!asyncApi) {
        return _buildCanvasOutcome.buildFailed(_canvasErrorCodes.HOST_UNAVAILABLE, []);
      }
      if (typeof asyncApi[_methodName] !== "function") {
        return _buildCanvasOutcome.buildFailed(_canvasErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      hostPromise = asyncApi[_methodName](_widgetId);
      swallowLateRejection(hostPromise);
      winner = await raceHostAndSignal(hostPromise, _options && _options.signal);
      if (_ctx.isDisposed()) {
        return _buildCanvasOutcome.buildDisposed();
      }
      if (winner === "aborted" || isAborted(_options)) {
        return _buildCanvasOutcome.buildAborted(winner === "host" ? "aborted-after-effect" : "aborted");
      }
      return _buildCanvasOutcome.buildOk({ ready: true });
    } catch (error) {
      console.error("[cognosHost.canvas." + _methodName + "] failed", { widgetId: _widgetId }, error);
      return _buildCanvasOutcome.buildFailed(_canvasErrorCodes.WAIT_FAILED, [
        _buildCanvasOutcome.buildDiagnostic(_canvasErrorCodes.WAIT_FAILED, error && error.message)
      ]);
    }
  }

  return awaitRenderEvent;
});
