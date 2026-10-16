define([
  "../../../runtime/ensureCognosHostRuntime.js",
  "../../dataQuery/wait/awaitPollInterval.js"
], function (
  _ensureCognosHostRuntime,
  _awaitPollInterval
) {
  "use strict";

  var LIST_WAIT_INTERVAL_MS = 150;
  var LIST_WAIT_BUDGET_MS = 15000;

  function isDisposedOrStale(_ctx) {
    var runtime;
    if (!_ctx || typeof _ctx.isDisposed !== "function" || _ctx.isDisposed()) {
      return true;
    }
    runtime = _ctx._KDB && _ctx._KDB.runtime && _ctx._KDB.runtime.cognosHostService;
    if (!runtime) {
      return true;
    }
    return runtime.generation !== _ctx.generation;
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
      key: "dataSourceListWait:" + runtime.waitSequence,
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

  async function waitForSettledDataSourceList(_ctx, _getDataSourceList, _shouldKeepWaiting) {
    var registration = null;
    var startedAt;
    var list;
    if (isDisposedOrStale(_ctx) || typeof _getDataSourceList !== "function") {
      return null;
    }
    try {
      registration = registerWait(_ctx);
      storeWait(_ctx, registration);
      startedAt = Date.now();
      while (true) {
        if (isDisposedOrStale(_ctx) || isControllerAborted(registration)) {
          return null;
        }
        list = _getDataSourceList();
        if (list && typeof list.then === "function") {
          list = await list;
        }
        if (isDisposedOrStale(_ctx) || isControllerAborted(registration)) {
          return null;
        }
        if (typeof _shouldKeepWaiting !== "function") {
          return null;
        }
        if (_shouldKeepWaiting(list) !== true && Array.isArray(list)) {
          return list;
        }
        if (Date.now() - startedAt >= LIST_WAIT_BUDGET_MS) {
          return null;
        }
        await _awaitPollInterval(
          registration.controller,
          registration.controller.signal,
          LIST_WAIT_INTERVAL_MS
        );
      }
    } catch (error) {
      if (error && error.name === "AbortError") {
        return null;
      }
      throw error;
    } finally {
      if (registration && registration.controller) {
        registration.controller.abort();
      }
      releaseWait(_ctx, registration);
    }
  }

  return waitForSettledDataSourceList;
});
