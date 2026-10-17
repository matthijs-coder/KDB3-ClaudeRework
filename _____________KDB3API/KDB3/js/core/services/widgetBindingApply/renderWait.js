define([
  "./config.js",
  "./diagnostics.js",
  "./applyOptions.js",
  "../../utils/kit/runtime.js",
], function (_config, _diagnostics, _applyOptions, _rt) {
  "use strict";

  // Render steps of applyBindingPlan.js. The waits are armed before renderWidget so no render event is missed;
  // start and complete waits share one timeout budget measured from arming.

  function elapsedSince(_startedAt) {
    return Date.now() - _startedAt;
  }

  function remainingBudgetMs(_startedAt, _timeoutMs) {
    if (typeof _timeoutMs !== "number" || _timeoutMs <= 0) {
      return 0;
    }
    return Math.max(0, _timeoutMs - elapsedSince(_startedAt));
  }

  // Settles with { timedOut, aborted, value }; a budget of 0 means no timeout. Rejects when _promise rejects.
  function raceWithTimeout(_timers, _promise, _timeoutMs, _signal, _timerKey) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var listening = false;

      function onAbort() {
        finish(resolve, { timedOut: false, aborted: true, value: null });
      }

      function finish(_fn, _value) {
        if (settled) {
          return;
        }
        settled = true;
        _rt.clearTimer(_timers(), _timerKey);
        if (listening) {
          _signal.removeEventListener("abort", onAbort);
        }
        _fn(_value);
      }

      if (_signal && _signal.aborted) {
        finish(resolve, { timedOut: false, aborted: true, value: null });
        return;
      }
      if (_signal) {
        _signal.addEventListener("abort", onAbort, { once: true });
        listening = true;
      }
      Promise.resolve(_promise).then(
        function (value) { finish(resolve, { timedOut: false, aborted: false, value: value }); },
        function (err) { finish(reject, err); }
      );
      if (typeof _timeoutMs === "number" && _timeoutMs > 0) {
        _rt.scheduleTimeout(_timers(), _timerKey, function () {
          finish(resolve, { timedOut: true, aborted: false, value: null });
        }, _timeoutMs);
      }
    });
  }

  function armRenderWait(_ctx) {
    var renderWait = _applyOptions.resolveRenderWaitOptions(_ctx.options, _ctx.target);
    var render = {
      renderWait: renderWait,
      timeoutMs: _applyOptions.resolveTimeoutMs(_ctx.options, _ctx.target),
      startedAt: Date.now(),
      armed: null,
    };
    _ctx.render = render;
    if (renderWait.waitForComplete === false) {
      return _diagnostics.COMPLETED;
    }
    var canvas = _ctx.canvas;
    if (typeof canvas.whenRenderComplete !== "function") {
      return _diagnostics.failed("WIDGET_BINDING_APPLY_COGNOS_SURFACE_MISSING", "whenRenderComplete is unavailable.", {
        step: "waitRenderComplete",
        renderWaitMs: elapsedSince(render.startedAt),
      });
    }
    var cognosOptions = typeof renderWait.intervalMs === "number" ? { intervalMs: renderWait.intervalMs } : {};
    cognosOptions.signal = _ctx.signal;
    var armed = { waitForStart: renderWait.waitForStart === true, startPromise: null, completePromise: null };
    if (armed.waitForStart && typeof canvas.whenRenderStart === "function") {
      armed.startPromise = canvas.whenRenderStart(_ctx.widgetId, cognosOptions);
    }
    armed.completePromise = canvas.whenRenderComplete(_ctx.widgetId, cognosOptions);
    render.armed = armed;
    _ctx.diagnostics.addWarning(
      "WIDGET_BINDING_APPLY_RENDER_WAIT_ARMED",
      "start=" + (armed.startPromise ? "yes" : "no") + ", complete=" + (armed.completePromise ? "yes" : "no"),
      "waitRenderComplete"
    );
    return _diagnostics.COMPLETED;
  }

  async function renderWidget(_ctx) {
    var mapped = _diagnostics.mapFacetOutcome(await _ctx.widgets.renderWidget(_ctx.widgetId, { signal: _ctx.signal }));
    return _diagnostics.facetStepFailure(mapped, "WIDGET_BINDING_APPLY_RENDER_FAILED", "renderWidget failed.") ||
      _diagnostics.COMPLETED;
  }

  // null when the race ended with a successful render event.
  function resolveRaceOutcome(_outcome, _signal, _renderWaitMs) {
    if (_outcome.aborted || (_signal && _signal.aborted)) {
      return _diagnostics.ABORTED;
    }
    if (_outcome.timedOut) {
      return {
        state: "timeout",
        errorCode: "WIDGET_BINDING_APPLY_RENDER_TIMEOUT",
        errorMessage: "Render wait timed out.",
        renderWaitMs: _renderWaitMs,
      };
    }
    var mapped = _diagnostics.mapFacetOutcome(_outcome.value);
    if (mapped.aborted) {
      return _diagnostics.ABORTED;
    }
    if (!mapped.ok) {
      return _diagnostics.failed(
        mapped.errorCode || "WIDGET_BINDING_APPLY_RENDER_WAIT_FAILED",
        mapped.errorMessage || "Render wait failed.",
        { renderWaitMs: _renderWaitMs }
      );
    }
    return null;
  }

  async function awaitArmedRender(_ctx) {
    var render = _ctx.render;
    var armed = render.armed;
    var timers = function () { return _ctx.rt.timers; };
    var outcome;
    var failure;

    if (!armed || !armed.completePromise) {
      return _diagnostics.failed("WIDGET_BINDING_APPLY_COGNOS_SURFACE_MISSING", "Render wait was not armed.", { renderWaitMs: 0 });
    }
    if (_ctx.signal && _ctx.signal.aborted) {
      return _diagnostics.ABORTED;
    }
    if (armed.waitForStart && armed.startPromise) {
      outcome = await raceWithTimeout(timers, armed.startPromise, remainingBudgetMs(render.startedAt, render.timeoutMs),
        _ctx.signal, _ctx.timerScopeId + ":waitRenderStart");
      failure = resolveRaceOutcome(outcome, _ctx.signal, elapsedSince(render.startedAt));
      if (failure) {
        return failure;
      }
    }
    if (_ctx.signal && _ctx.signal.aborted) {
      return _diagnostics.ABORTED;
    }
    outcome = await raceWithTimeout(timers, armed.completePromise, remainingBudgetMs(render.startedAt, render.timeoutMs),
      _ctx.signal, _ctx.timerScopeId + ":waitRenderComplete");
    var renderWaitMs = elapsedSince(render.startedAt);
    return resolveRaceOutcome(outcome, _ctx.signal, renderWaitMs) || { state: "completed", renderWaitMs: renderWaitMs };
  }

  function finishWidgetRenderLoading(_KDB, _widgetId) {
    try {
      var loading = _KDB.services ? _KDB.services.loading : null;
      var widgetId = String(_widgetId || "");
      if (!widgetId || !loading) {
        return;
      }
      loading.finishLoading({ mountKey: _config.RENDER_LOADING_MOUNT_KEY_PREFIX + widgetId });
    } catch (err) {
      console.error("[widgetBindingApply.finishWidgetRenderLoading] failed", { widgetId: _widgetId }, err);
    }
  }

  async function waitRenderComplete(_ctx) {
    if (_ctx.render.renderWait.waitForComplete === false) {
      // Deferred render wait: renderWidget was triggered, but the caller owns render completion
      // (e.g. the writeback post-restore traverse).
      return { state: "skipped", renderWaitMs: 0 };
    }
    try {
      return await awaitArmedRender(_ctx);
    } finally {
      finishWidgetRenderLoading(_ctx._KDB, _ctx.widgetId);
    }
  }

  return {
    armRenderWait: armRenderWait,
    renderWidget: renderWidget,
    waitRenderComplete: waitRenderComplete,
  };
});
