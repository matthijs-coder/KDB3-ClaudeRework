define([
  "../../../runtime/ensureCognosHostRuntime.js",
  "../resolveDataQueryHostApi.js",
  "./inspectQueryResult.js",
  "./awaitPollInterval.js",
  "../buildDataQueryOutcome.js",
  "../config/dataQueryErrorCodes.js"
], function (
  _ensureCognosHostRuntime,
  _resolveDataQueryHostApi,
  _inspectQueryResult,
  _awaitPollInterval,
  _buildDataQueryOutcome,
  _dataQueryErrorCodes
) {
  "use strict";

  var DEFAULT_BUDGET_MS = 60000;
  var DEFAULT_INTERVAL_MS = 100;

  function isCallerAborted(_options) {
    return !!(_options && _options.signal && _options.signal.aborted === true);
  }

  function isControllerAborted(_registration) {
    return !!(
      _registration &&
      _registration.controller &&
      _registration.controller.signal &&
      _registration.controller.signal.aborted === true
    );
  }

  function registerWait(_ctx) {
    var runtime = _ensureCognosHostRuntime(_ctx._KDB);
    var controller = new AbortController();
    runtime.waitSequence += 1;
    return {
      key: "queryResultWait:" + runtime.waitSequence,
      controller: controller
    };
  }

  function storeWait(_ctx, _registration) {
    var runtime = _ensureCognosHostRuntime(_ctx._KDB);
    runtime.abortControllers[_registration.key] = _registration.controller;
  }

  function releaseWait(_ctx, _registration) {
    var runtime;
    if (!_registration) {
      return;
    }
    runtime = _ensureCognosHostRuntime(_ctx._KDB);
    if (runtime.abortControllers[_registration.key] === _registration.controller) {
      delete runtime.abortControllers[_registration.key];
    }
  }

  function logZeroRowStop(_widgetId, _probe) {
    try {
      if (!_probe || _probe.rowCount !== 0) {
        return;
      }
      console.info("[sicht-jahr] TEMP query wait stopped with zero rows", {
        widgetId: _widgetId,
        itemCount: _probe.itemCount,
        rowCount: _probe.rowCount,
        isEmpty: _probe.isEmpty
      });
    } catch (err) {
      console.info("[sicht-jahr] TEMP query wait log failed", err);
    }
  }

  function abortedOutcome(_ctx) {
    return _ctx.isDisposed()
      ? _buildDataQueryOutcome.buildDisposed()
      : _buildDataQueryOutcome.buildAborted("aborted");
  }

  async function waitForQueryResult(_ctx, _widgetId, _options) {
    var options = _options || {};
    var budgetMs = typeof options.budgetMs === "number" ? options.budgetMs : DEFAULT_BUDGET_MS;
    var intervalMs = typeof options.intervalMs === "number" ? options.intervalMs : DEFAULT_INTERVAL_MS;
    var startedAt = Date.now();
    var registration = null;
    var dataQueryApi;
    var result;
    var probe;
    if (_ctx.isDisposed()) {
      return _buildDataQueryOutcome.buildDisposed();
    }
    if (isCallerAborted(options)) {
      return _buildDataQueryOutcome.buildAborted("aborted");
    }
    try {
      registration = registerWait(_ctx);
      storeWait(_ctx, registration);
      while (true) {
        if (_ctx.isDisposed()) {
          return _buildDataQueryOutcome.buildDisposed();
        }
        if (isCallerAborted(options) || isControllerAborted(registration)) {
          return abortedOutcome(_ctx);
        }
        dataQueryApi = _resolveDataQueryHostApi(_ctx._KDB);
        if (dataQueryApi && typeof dataQueryApi.getDataQueryResult === "function") {
          try {
            result = await dataQueryApi.getDataQueryResult(_widgetId);
            if (_ctx.isDisposed()) {
              return _buildDataQueryOutcome.buildDisposed();
            }
            if (isCallerAborted(options) || isControllerAborted(registration)) {
              return _buildDataQueryOutcome.buildAborted("aborted-after-effect");
            }
            probe = _inspectQueryResult(result);
            if (probe.itemCount > 0) {
              logZeroRowStop(_widgetId, probe);
              // Keep the host result in ring 1 so readQueryRows can flatten
              // it without a second getDataQueryResult (old owner did wait,
              // then one fetch; do not add a third round-trip).
              return _buildDataQueryOutcome.buildOk({
                rowCount: probe.rowCount,
                isEmpty: probe.isEmpty,
                hostResult: result
              });
            }
          } catch (error) {
            if (_ctx.isDisposed()) {
              return _buildDataQueryOutcome.buildDisposed();
            }
            if (isCallerAborted(options) || (error && error.name === "AbortError")) {
              return _buildDataQueryOutcome.buildAborted("aborted");
            }
            if (budgetMs !== Infinity && Date.now() - startedAt > budgetMs) {
              return _buildDataQueryOutcome.buildFailed(_dataQueryErrorCodes.WAIT_TIMEOUT, [
                _buildDataQueryOutcome.buildDiagnostic(
                  _dataQueryErrorCodes.WAIT_TIMEOUT,
                  error && error.message ? error.message : String(error)
                )
              ]);
            }
          }
        }
        if (budgetMs !== Infinity && Date.now() - startedAt > budgetMs) {
          if (_ctx.isDisposed()) {
            return _buildDataQueryOutcome.buildDisposed();
          }
          return _buildDataQueryOutcome.buildFailed(_dataQueryErrorCodes.WAIT_TIMEOUT, [
            _buildDataQueryOutcome.buildDiagnostic(
              _dataQueryErrorCodes.WAIT_TIMEOUT,
              "waitForQueryResult timed out for widget " + _widgetId
            )
          ]);
        }
        await _awaitPollInterval(registration.controller, options.signal, intervalMs);
      }
    } finally {
      releaseWait(_ctx, registration);
    }
  }

  return waitForQueryResult;
});
