define([
  "../../outcome.js",
  "../../errorCodes.js",
  "../../hostAccess.js",
  "../../runtime.js",
  "../../../../utils/normalizeCognosScopeId.js",
  "../../../../utils/kit/async.js",
  "./filterIndex.js"
], function (_outcome, _errorCodes, _hostAccess, _runtime, _normalizeCognosScopeId, _async, _filterIndex) {
  "use strict";

  // waitForPageContextReady({ scopeIds, budgetMs, intervalMs, maxAttempts, signal }): probes until
  // every scope is registered on the host. Budget of the writeback-SET poll it replaces: three
  // attempts, first one immediate, 800 ms apart, hard cap 2500 ms; all overridable by the caller.
  // Budget exhausted is degraded (the caller decides whether that aborts its run); a caller
  // abort is aborted, silently.
  var CODES = _errorCodes.filters;
  var DEFAULT_BUDGET_MS = 2500;
  var DEFAULT_INTERVAL_MS = 800;
  var DEFAULT_MAX_ATTEMPTS = 3;

  function normalizeScopeIds(_scopeIds) {
    return (Array.isArray(_scopeIds) ? _scopeIds : [])
      .map(_normalizeCognosScopeId)
      .filter(Boolean);
  }

  // Per-item guard: an item whose scope can not be read simply does not match, it does not abort the probe.
  function readItemScope(_filtersApi, _item) {
    try {
      if (_item && typeof _item.getScope === "function") {
        return _item.getScope();
      }
      if (_filtersApi && typeof _filtersApi.getFilterScope === "function") {
        return _filtersApi.getFilterScope(_item);
      }
      return "";
    } catch (error) {
      return "";
    }
  }

  // Readiness asks one question: is this scope registered on the host? It deliberately does NOT
  // build descriptors: right after a tab activate an item can already carry its scope while
  // reading its values still throws, and a full materialisation would drop that item and report
  // "not ready".
  function isReady(_ctx, _wanted) {
    var read = _filterIndex.readHostFilterItems(_ctx._KDB, "pageContext");
    var present = {};
    if (!read.ok) {
      return false;
    }
    read.items.forEach(function markScope(_item) {
      present[_normalizeCognosScopeId(readItemScope(read.filtersApi, _item))] = true;
    });
    return _wanted.every(function isPresent(_scopeId) {
      return present[_scopeId] === true;
    });
  }

  function buildNotReady(_attempts) {
    return _outcome.buildDegraded({ ready: false, attempts: _attempts }, [
      _outcome.buildDiagnostic(CODES.WAIT_NOT_READY, "page context did not register within budget")
    ]);
  }

  async function waitForPageContextReady(_ctx, _input) {
    var input = _input || {};
    var wanted = normalizeScopeIds(input.scopeIds);
    var budgetMs = typeof input.budgetMs === "number" ? input.budgetMs : DEFAULT_BUDGET_MS;
    var intervalMs = typeof input.intervalMs === "number" ? input.intervalMs : DEFAULT_INTERVAL_MS;
    var maxAttempts = typeof input.maxAttempts === "number" ? input.maxAttempts : DEFAULT_MAX_ATTEMPTS;
    var registration = null;
    var budgetTimer = null;
    var startedAt;
    var attempts;
    var remaining;
    if (_ctx.isDisposed()) {
      return _outcome.buildDisposed();
    }
    if (wanted.length === 0) {
      return _outcome.buildFailed(CODES.INVALID_REF, [_outcome.buildDiagnostic(CODES.INVALID_REF, "no scope ids requested")]);
    }
    try {
      // Own slot per wait: destroy aborts all of them, a second wait can not make the first unreachable.
      registration = _runtime.registerWait(_ctx._KDB, "pageContextWait");
      budgetTimer = setTimeout(registration.controller.abort.bind(registration.controller), budgetMs);
      startedAt = Date.now();
      for (attempts = 1; attempts <= maxAttempts; attempts += 1) {
        if (_hostAccess.isAborted(input)) {
          return _outcome.buildAborted("aborted");
        }
        if (registration.controller.signal.aborted) {
          return buildNotReady(attempts);
        }
        if (isReady(_ctx, wanted)) {
          return _outcome.buildOk({ ready: true, attempts: attempts });
        }
        if (attempts === maxAttempts) {
          break;
        }
        remaining = budgetMs - (Date.now() - startedAt);
        if (remaining <= 0) {
          return buildNotReady(attempts);
        }
        await _async.sleep(Math.min(intervalMs, remaining), [registration.controller.signal, input.signal]);
        if (_ctx.isDisposed()) {
          return _outcome.buildDisposed();
        }
        if (_hostAccess.isAborted(input)) {
          return _outcome.buildAborted("aborted");
        }
      }
      return buildNotReady(attempts);
    } catch (error) {
      console.error("[cognosHost.filters.waitForPageContextReady] poll failed", error);
      return _outcome.buildFailed(CODES.WAIT_NOT_READY, [_outcome.buildDiagnostic(CODES.WAIT_NOT_READY, error && error.message)]);
    } finally {
      clearTimeout(budgetTimer);
      _runtime.releaseWait(_ctx._KDB, registration);
    }
  }

  return waitForPageContextReady;
});
