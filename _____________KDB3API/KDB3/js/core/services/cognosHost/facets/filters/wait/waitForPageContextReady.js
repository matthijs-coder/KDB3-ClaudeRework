define([
  "./readPageContextReadiness.js",
  "./readAbortState.js",
  "./awaitPollInterval.js",
  "../buildFilterOutcome.js",
  "../config/filterErrorCodes.js",
  "../../../runtime/ensureCognosHostRuntime.js"
], function (
  _readPageContextReadiness,
  _readAbortState,
  _awaitPollInterval,
  _buildFilterOutcome,
  _filterErrorCodes,
  _ensureCognosHostRuntime
) {
  "use strict";

  // Budget of the writeback-SET poll this replaces: three attempts, first one
  // immediate, 800 ms apart, hard cap 2500 ms. Caller-visible and overridable.
  var DEFAULT_BUDGET_MS = 2500;
  var DEFAULT_INTERVAL_MS = 800;
  var DEFAULT_MAX_ATTEMPTS = 3;

  // Budget exhausted is degraded: the caller decides whether that aborts its
  // run, exactly as the writeback-SET poll does today. A caller abort is a
  // different class and returns aborted, silently.
  function buildNotReady(_attempts) {
    return _buildFilterOutcome.buildDegraded({ ready: false, attempts: _attempts }, [
      _buildFilterOutcome.buildDiagnostic(
        _filterErrorCodes.WAIT_NOT_READY,
        "page context did not register within budget"
      )
    ]);
  }

  // Every wait gets its own slot, so destroy aborts all of them and a second
  // wait can not make the first unreachable.
  function registerWait(_ctx, _budgetMs) {
    var runtime = _ensureCognosHostRuntime(_ctx._KDB);
    var controller = new AbortController();
    runtime.waitSequence += 1;
    var registration = {
      key: "pageContextWait:" + runtime.waitSequence,
      controller: controller,
      timeoutId: setTimeout(controller.abort.bind(controller), _budgetMs)
    };
    runtime.abortControllers[registration.key] = controller;
    return registration;
  }

  function releaseWait(_ctx, _registration) {
    var runtime;
    if (!_registration) {
      return;
    }
    clearTimeout(_registration.timeoutId);
    runtime = _ensureCognosHostRuntime(_ctx._KDB);
    if (runtime.abortControllers[_registration.key] === _registration.controller) {
      delete runtime.abortControllers[_registration.key];
    }
  }

  async function __controller(_ctx, _input) {
    var input = _input || {};
    var wanted = _readPageContextReadiness.normalizeScopeIds(input.scopeIds);
    var budgetMs = typeof input.budgetMs === "number" ? input.budgetMs : DEFAULT_BUDGET_MS;
    var intervalMs = typeof input.intervalMs === "number" ? input.intervalMs : DEFAULT_INTERVAL_MS;
    var maxAttempts = typeof input.maxAttempts === "number" ? input.maxAttempts : DEFAULT_MAX_ATTEMPTS;
    var registration = null;
    var startedAt;
    var attempts = 0;
    var remaining;
    var probe;
    if (_ctx.isDisposed()) {
      return _buildFilterOutcome.buildDisposed();
    }
    if (wanted.length === 0) {
      return _buildFilterOutcome.buildFailed(_filterErrorCodes.INVALID_REF, [
        _buildFilterOutcome.buildDiagnostic(_filterErrorCodes.INVALID_REF, "no scope ids requested")
      ]);
    }
    try {
      registration = registerWait(_ctx, budgetMs);
      startedAt = Date.now();
      for (attempts = 1; attempts <= maxAttempts; attempts += 1) {
        if (_readAbortState(input.signal, null)) {
          return _buildFilterOutcome.buildAborted("aborted");
        }
        if (_readAbortState(null, registration.controller)) {
          return buildNotReady(attempts);
        }
        probe = _readPageContextReadiness.readReadiness(_ctx, wanted);
        if (probe.ok && probe.ready) {
          return _buildFilterOutcome.buildOk({ ready: true, attempts: attempts });
        }
        if (attempts === maxAttempts) {
          break;
        }
        remaining = budgetMs - (Date.now() - startedAt);
        if (remaining <= 0) {
          return buildNotReady(attempts);
        }
        await _awaitPollInterval(registration.controller, input.signal, Math.min(intervalMs, remaining));
        if (_ctx.isDisposed()) {
          return _buildFilterOutcome.buildDisposed();
        }
        if (_readAbortState(input.signal, null)) {
          return _buildFilterOutcome.buildAborted("aborted");
        }
      }
      return buildNotReady(attempts);
    } catch (error) {
      console.error("[cognosHost.filters.waitForPageContextReady] poll failed", error);
      return _buildFilterOutcome.buildFailed(_filterErrorCodes.WAIT_NOT_READY, [
        _buildFilterOutcome.buildDiagnostic(_filterErrorCodes.WAIT_NOT_READY, error && error.message)
      ]);
    } finally {
      releaseWait(_ctx, registration);
    }
  }

  return __controller;
});
