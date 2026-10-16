define([
  "../../outcome.js",
  "../../errorCodes.js",
  "../../hostAccess.js"
], function (_outcome, _errorCodes, _hostAccess) {
  "use strict";

  var CODES = _errorCodes.canvas;

  // The four host waits: { hostMethod, usesWidgetId, budgeted }. Render waits have no budget on
  // purpose (the host promise may take as long as the render does); ready waits honour options.budgetMs.
  var WAITS = {
    whenRenderStart: { hostMethod: "whenRenderStart", usesWidgetId: true, budgeted: false },
    whenRenderComplete: { hostMethod: "whenRenderComplete", usesWidgetId: true, budgeted: false },
    whenCanvasReady: { hostMethod: "getCanvasWhenReady", usesWidgetId: false, budgeted: true },
    whenWidgetReady: { hostMethod: "getWidgetWhenReady", usesWidgetId: true, budgeted: true }
  };

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

  // Resolves "host" | "aborted" | "timeout" (timeout only with a budget); rejects with the host error.
  // The abort listener and the timer are always released.
  function raceHostSignalAndBudget(_hostPromise, _signal, _budgetMs) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var abortListener = null;
      var timerId = null;
      function release() {
        settled = true;
        if (timerId != null) {
          clearTimeout(timerId);
        }
        if (_signal && abortListener && typeof _signal.removeEventListener === "function") {
          _signal.removeEventListener("abort", abortListener);
        }
      }
      function finish(_kind) {
        if (settled) {
          return;
        }
        release();
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
        release();
        reject(error);
      });
    });
  }

  function outcomeAfterWait(_ctx, _options, _winner) {
    if (_ctx.isDisposed()) {
      return _outcome.buildDisposed();
    }
    if (_winner === "aborted" || _hostAccess.isAborted(_options)) {
      return _outcome.buildAborted(_winner === "host" ? "aborted-after-effect" : "aborted");
    }
    if (_winner === "timeout") {
      return _outcome.buildFailed(CODES.WAIT_TIMEOUT, [_outcome.buildDiagnostic(CODES.WAIT_TIMEOUT, "budgetMs elapsed")]);
    }
    return _outcome.buildOk({ ready: true });
  }

  // The host waiter is armed synchronously, before the first await: a caller can trigger
  // renderWidget and then await this Outcome. The host promise never leaves ring 1.
  async function awaitHostEvent(_ctx, _publicName, _widgetId, _options) {
    var wait = WAITS[_publicName];
    var resolved;
    var hostPromise;
    var winner;
    if (_ctx.isDisposed()) {
      return _outcome.buildDisposed();
    }
    if (_hostAccess.isAborted(_options)) {
      return _outcome.buildAborted("aborted");
    }
    if (wait.usesWidgetId && !_hostAccess.isValidWidgetId(_widgetId)) {
      return _outcome.buildFailed(CODES.INVALID_ID, []);
    }
    resolved = _hostAccess.resolveHostMethod(_ctx._KDB, "async", wait.hostMethod, CODES);
    if (resolved.failure) {
      return resolved.failure;
    }
    try {
      hostPromise = wait.usesWidgetId ? resolved.api[wait.hostMethod](_widgetId) : resolved.api[wait.hostMethod]();
      swallowLateRejection(hostPromise);
      winner = await raceHostSignalAndBudget(
        hostPromise,
        _options && _options.signal,
        wait.budgeted ? readBudgetMs(_options) : null
      );
      return outcomeAfterWait(_ctx, _options, winner);
    } catch (error) {
      console.error("[cognosHost.canvas." + _publicName + "] failed", { widgetId: _widgetId }, error);
      return _outcome.buildFailed(CODES.WAIT_FAILED, [_outcome.buildDiagnostic(CODES.WAIT_FAILED, error && error.message)]);
    }
  }

  function createWaitOps(_ctx) {
    return {
      whenRenderStart: function whenRenderStart(_widgetId, _options) {
        return awaitHostEvent(_ctx, "whenRenderStart", _widgetId, _options);
      },
      whenRenderComplete: function whenRenderComplete(_widgetId, _options) {
        return awaitHostEvent(_ctx, "whenRenderComplete", _widgetId, _options);
      },
      whenCanvasReady: function whenCanvasReady(_options) {
        return awaitHostEvent(_ctx, "whenCanvasReady", null, _options);
      },
      whenWidgetReady: function whenWidgetReady(_widgetId, _options) {
        return awaitHostEvent(_ctx, "whenWidgetReady", _widgetId, _options);
      }
    };
  }

  return createWaitOps;
});
