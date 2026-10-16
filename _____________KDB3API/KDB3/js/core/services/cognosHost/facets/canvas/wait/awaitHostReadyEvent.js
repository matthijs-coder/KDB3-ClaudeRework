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

  function requiresWidgetId(_hostMethodName) {
    return _hostMethodName === "getWidgetWhenReady";
  }

  function readBudgetMs(_options) {
    var budgetMs = _options && _options.budgetMs;
    if (typeof budgetMs !== "number" || !isFinite(budgetMs) || budgetMs < 0) {
      return null;
    }
    return budgetMs;
  }

  function swallowLateRejection(_promise) {
    Promise.resolve(_promise).catch(function () { return null; });
  }

  function armHostWaiter(_asyncApi, _hostMethodName, _widgetId) {
    if (requiresWidgetId(_hostMethodName)) {
      return _asyncApi[_hostMethodName](_widgetId);
    }
    return _asyncApi[_hostMethodName]();
  }

  function raceHostSignalAndBudget(_hostPromise, _signal, _budgetMs) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var abortListener = null;
      var timerId = null;
      function finish(_kind) {
        if (settled) {
          return;
        }
        settled = true;
        if (timerId != null) {
          clearTimeout(timerId);
        }
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
      if (_budgetMs != null) {
        timerId = setTimeout(function () { finish("timeout"); }, _budgetMs);
      }
      Promise.resolve(_hostPromise).then(function () {
        finish("host");
      }, function (error) {
        if (settled) {
          return;
        }
        settled = true;
        if (timerId != null) {
          clearTimeout(timerId);
        }
        if (_signal && abortListener && typeof _signal.removeEventListener === "function") {
          _signal.removeEventListener("abort", abortListener);
        }
        reject(error);
      });
    });
  }

  function outcomeAfterWait(_ctx, _options, _winner) {
    if (_ctx.isDisposed()) {
      return _buildCanvasOutcome.buildDisposed();
    }
    if (_winner === "aborted" || isAborted(_options)) {
      return _buildCanvasOutcome.buildAborted(_winner === "host" ? "aborted-after-effect" : "aborted");
    }
    if (_winner === "timeout") {
      return _buildCanvasOutcome.buildFailed(_canvasErrorCodes.WAIT_TIMEOUT, [
        _buildCanvasOutcome.buildDiagnostic(_canvasErrorCodes.WAIT_TIMEOUT, "budgetMs elapsed")
      ]);
    }
    return _buildCanvasOutcome.buildOk({ ready: true });
  }

  async function awaitHostReadyEvent(_ctx, _widgetId, _hostMethodName, _options) {
    var asyncApi;
    var hostPromise;
    var winner;
    var publicName = requiresWidgetId(_hostMethodName) ? "whenWidgetReady" : "whenCanvasReady";
    if (_ctx.isDisposed()) {
      return _buildCanvasOutcome.buildDisposed();
    }
    if (isAborted(_options)) {
      return _buildCanvasOutcome.buildAborted("aborted");
    }
    if (requiresWidgetId(_hostMethodName) && !isValidWidgetId(_widgetId)) {
      return _buildCanvasOutcome.buildFailed(_canvasErrorCodes.INVALID_ID, []);
    }
    try {
      asyncApi = _resolveAsyncHostApi(_ctx._KDB);
      if (!asyncApi) {
        return _buildCanvasOutcome.buildFailed(_canvasErrorCodes.HOST_UNAVAILABLE, []);
      }
      if (typeof asyncApi[_hostMethodName] !== "function") {
        return _buildCanvasOutcome.buildFailed(_canvasErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      hostPromise = armHostWaiter(asyncApi, _hostMethodName, _widgetId);
      swallowLateRejection(hostPromise);
      winner = await raceHostSignalAndBudget(
        hostPromise,
        _options && _options.signal,
        readBudgetMs(_options)
      );
      return outcomeAfterWait(_ctx, _options, winner);
    } catch (error) {
      console.error("[cognosHost.canvas." + publicName + "] failed", { widgetId: _widgetId }, error);
      return _buildCanvasOutcome.buildFailed(_canvasErrorCodes.WAIT_FAILED, [
        _buildCanvasOutcome.buildDiagnostic(_canvasErrorCodes.WAIT_FAILED, error && error.message)
      ]);
    }
  }

  return awaitHostReadyEvent;
});
