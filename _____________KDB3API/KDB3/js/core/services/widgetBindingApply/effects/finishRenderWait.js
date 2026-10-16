define([
  "../runtime/manageBindingApplyTimers.js",
  "./renderWaitTimeoutRace.js",
  "./bindingApplyStepHelpers.js",
], function (_manageBindingApplyTimers, _renderWaitTimeoutRace, _bindingApplyStepHelpers) {
  "use strict";

  function buildWaitFailure(_aborted, _timedOut, _renderWaitMs) {
    return {
      ok: false,
      aborted: _aborted === true,
      timedOut: _timedOut === true,
      renderWaitMs: _renderWaitMs,
    };
  }

  function resolveRaceOutcome(_outcome, _signal, _renderWaitMs) {
    var mapped;
    if (_outcome.aborted || (_signal && _signal.aborted)) {
      return buildWaitFailure(true, false, _renderWaitMs);
    }
    if (_outcome.timedOut) {
      return buildWaitFailure(false, true, _renderWaitMs);
    }
    mapped = _bindingApplyStepHelpers.mapFacetOutcome(_outcome.value);
    if (mapped.aborted) {
      return buildWaitFailure(true, false, _renderWaitMs);
    }
    if (!mapped.ok) {
      return {
        ok: false,
        errorCode: mapped.errorCode,
        errorMessage: mapped.errorMessage,
        renderWaitMs: _renderWaitMs
      };
    }
    return null;
  }

  function finishWidgetRenderLoading(_KDB, _widgetId) {
    try {
      var loading = _KDB && _KDB.services ? _KDB.services.loading : null;
      var widgetId = String(_widgetId || "");
      if (!widgetId || !loading || typeof loading.finishLoading !== "function") {
        return;
      }
      loading.finishLoading({ mountKey: "kdb-widget-render-loading-" + widgetId });
    } catch (err) {
      console.error("[widgetBindingApply.finishWidgetRenderLoading] failed", { widgetId: _widgetId }, err);
    }
  }

  async function finishRenderWait(_KDB, _target, _options, _signal, _armed, _startedAt) {
    var widgetId = _target && _target.widgetId;
    try {
      var timerScopeId =
        (_options && _options.timerScopeId) ||
        _manageBindingApplyTimers.buildApplyBindingTimerScopeId(_target);
      var timeoutMs = _options && _options.timeoutMs;
      var outcome;
      var renderWaitMs = Date.now() - _startedAt;
      var failure;

      if (!_armed || !_armed.completePromise) {
        return {
          ok: false,
          errorCode: "WIDGET_BINDING_APPLY_COGNOS_SURFACE_MISSING",
          errorMessage: "Render wait was not armed.",
        };
      }

      if (_signal && _signal.aborted) {
        return buildWaitFailure(true, false, renderWaitMs);
      }

      if (_armed.waitForStart && _armed.startPromise) {
        outcome = await _renderWaitTimeoutRace.raceWithTimeout(
          _KDB,
          _armed.startPromise,
          _renderWaitTimeoutRace.remainingBudgetMs(_startedAt, timeoutMs),
          _signal,
          timerScopeId,
          "waitRenderStart"
        );
        renderWaitMs = Date.now() - _startedAt;
        failure = resolveRaceOutcome(outcome, _signal, renderWaitMs);
        if (failure) {
          return failure;
        }
      }

      if (_signal && _signal.aborted) {
        return buildWaitFailure(true, false, renderWaitMs);
      }

      outcome = await _renderWaitTimeoutRace.raceWithTimeout(
        _KDB,
        _armed.completePromise,
        _renderWaitTimeoutRace.remainingBudgetMs(_startedAt, timeoutMs),
        _signal,
        timerScopeId,
        "waitRenderComplete"
      );
      renderWaitMs = Date.now() - _startedAt;
      failure = resolveRaceOutcome(outcome, _signal, renderWaitMs);
      if (failure) {
        return failure;
      }

      return { ok: true, renderWaitMs: renderWaitMs };
    } catch (err) {
      if (err && err.name === "AbortError") {
        return buildWaitFailure(true, false, 0);
      }
      console.error("[widgetBindingApply.finishRenderWait] failed", { widgetId: widgetId }, err);
      throw err;
    } finally {
      finishWidgetRenderLoading(_KDB, widgetId);
    }
  }

  return finishRenderWait;
});
