define([
  "../../outcome.js",
  "../../errorCodes.js",
  "../../hostAccess.js",
  "../../runtime.js",
  "../../../../utils/kit/async.js"
], function (_outcome, _errorCodes, _hostAccess, _runtime, _async) {
  "use strict";

  // waitForQueryResult(widgetId, { budgetMs, intervalMs, signal }): the cheap poll that resolves
  // once the host query has at least one result item (an empty structured query is valid: do not
  // wait for rowCount > 0). The host result is handed back as data.hostResult so readQueryRows
  // flattens it without a second getDataQueryResult.
  // budgetMs defaults to 60000. budgetMs: Infinity is an explicit opt-in to wait unbounded
  // (only destroy or the caller's signal ends it); no caller does that today.
  var CODES = _errorCodes.dataQuery;
  var DEFAULT_BUDGET_MS = 60000;
  var DEFAULT_INTERVAL_MS = 100;

  function inspectQueryResult(_result) {
    var items;
    var rowCount;
    if (!_result) {
      return { itemCount: 0, rowCount: 0, isEmpty: true };
    }
    items = typeof _result.getResultItemList === "function" ? _result.getResultItemList() || [] : [];
    if (typeof _result.getRowCount === "function") {
      rowCount = _result.getRowCount();
    } else if (items[0] && typeof items[0].getRowCount === "function") {
      rowCount = items[0].getRowCount();
    } else {
      rowCount = 0;
    }
    return { itemCount: items.length, rowCount: rowCount, isEmpty: rowCount === 0 };
  }

  function buildTimeout(_message) {
    return _outcome.buildFailed(CODES.WAIT_TIMEOUT, [_outcome.buildDiagnostic(CODES.WAIT_TIMEOUT, _message)]);
  }

  async function waitForQueryResult(_ctx, _widgetId, _options) {
    var options = _options || {};
    var budgetMs = typeof options.budgetMs === "number" ? options.budgetMs : DEFAULT_BUDGET_MS;
    var intervalMs = typeof options.intervalMs === "number" ? options.intervalMs : DEFAULT_INTERVAL_MS;
    var startedAt = Date.now();
    var registration = null;
    var api;
    var result;
    var probe;
    function isCancelled() {
      return _hostAccess.isAborted(options) || registration.controller.signal.aborted;
    }
    function isOverBudget() {
      return budgetMs !== Infinity && Date.now() - startedAt > budgetMs;
    }
    if (_ctx.isDisposed()) {
      return _outcome.buildDisposed();
    }
    if (_hostAccess.isAborted(options)) {
      return _outcome.buildAborted("aborted");
    }
    registration = _runtime.registerWait(_ctx._KDB, "queryResultWait");
    try {
      while (true) {
        if (_ctx.isDisposed()) {
          return _outcome.buildDisposed();
        }
        if (isCancelled()) {
          return _outcome.buildAborted("aborted");
        }
        api = _hostAccess.resolveHostApi(_ctx._KDB, "dataQuery");
        if (api && typeof api.getDataQueryResult === "function") {
          try {
            result = await api.getDataQueryResult(_widgetId);
            if (_ctx.isDisposed()) {
              return _outcome.buildDisposed();
            }
            if (isCancelled()) {
              return _outcome.buildAborted("aborted-after-effect");
            }
            probe = inspectQueryResult(result);
            if (probe.itemCount > 0) {
              return _outcome.buildOk({ rowCount: probe.rowCount, isEmpty: probe.isEmpty, hostResult: result });
            }
          } catch (error) {
            if (_ctx.isDisposed()) {
              return _outcome.buildDisposed();
            }
            if (_hostAccess.isAborted(options) || (error && error.name === "AbortError")) {
              return _outcome.buildAborted("aborted");
            }
            if (isOverBudget()) {
              return buildTimeout(error && error.message ? error.message : String(error));
            }
          }
        }
        if (isOverBudget()) {
          return _ctx.isDisposed()
            ? _outcome.buildDisposed()
            : buildTimeout("waitForQueryResult timed out for widget " + _widgetId);
        }
        await _async.sleep(intervalMs, [registration.controller.signal, options.signal]);
      }
    } finally {
      _runtime.releaseWait(_ctx._KDB, registration);
    }
  }

  return waitForQueryResult;
});
