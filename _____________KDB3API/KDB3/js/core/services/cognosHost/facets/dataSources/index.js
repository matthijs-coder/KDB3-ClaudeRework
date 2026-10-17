define([
  "../../outcome.js",
  "../../errorCodes.js",
  "../../hostAccess.js",
  "../../runtime.js",
  "../../../../utils/kit/async.js"
], function (_outcome, _errorCodes, _hostAccess, _runtime, _async) {
  "use strict";

  // The dataSources facet of the cognosHost service. hasErrorDataSource polls the host data
  // source list until it has settled and reports whether any source is in the error state.
  var CODES = _errorCodes.dataSources;
  var LIST_WAIT_INTERVAL_MS = 150;
  var LIST_WAIT_BUDGET_MS = 15000;

  function readItemState(_item) {
    var state;
    try {
      if (!_item || typeof _item.getState !== "function") {
        return "unsettled";
      }
      state = _item.getState();
      return state === "error" || state === "ready" ? state : "unsettled";
    } catch (_error) {
      return "unsettled";
    }
  }

  // Keep waiting for an empty list, and while no source is in error but one is still unsettled.
  function listShouldKeepWaiting(_list) {
    var sawUnsettled = false;
    var state;
    var index;
    if (!Array.isArray(_list) || _list.length === 0) {
      return true;
    }
    for (index = 0; index < _list.length; index += 1) {
      state = readItemState(_list[index]);
      if (state === "error") {
        return false;
      }
      sawUnsettled = sawUnsettled || state === "unsettled";
    }
    return sawUnsettled;
  }

  function listHasError(_list) {
    return _list.some(function isError(_item) {
      return readItemState(_item) === "error";
    });
  }

  // Resolves with the settled list, or null when disposed, aborted or out of budget.
  async function waitForSettledDataSourceList(_ctx, _getDataSourceList) {
    var registration = _runtime.registerWait(_ctx._KDB, "dataSourceListWait");
    var startedAt = Date.now();
    var list;
    try {
      while (true) {
        if (_hostAccess.isFacetStale(_ctx) || registration.controller.signal.aborted) {
          return null;
        }
        list = _getDataSourceList();
        if (_hostAccess.isThenable(list)) {
          list = await list;
        }
        if (_hostAccess.isFacetStale(_ctx) || registration.controller.signal.aborted) {
          return null;
        }
        if (Array.isArray(list) && !listShouldKeepWaiting(list)) {
          return list;
        }
        if (Date.now() - startedAt >= LIST_WAIT_BUDGET_MS) {
          return null;
        }
        await _async.sleep(LIST_WAIT_INTERVAL_MS, registration.controller.signal);
      }
    } catch (error) {
      if (error && error.name === "AbortError") {
        return null;
      }
      throw error;
    } finally {
      registration.controller.abort();
      _runtime.releaseWait(_ctx._KDB, registration);
    }
  }

  // Missing host or capability reads as "no error data source": the home dialog treats
  // an unreadable list the same as a healthy one.
  async function hasErrorDataSource(_ctx) {
    var api;
    var list;
    if (_hostAccess.isFacetStale(_ctx)) {
      return _outcome.buildDisposed();
    }
    try {
      api = _hostAccess.resolveHostApi(_ctx._KDB, "dataSources");
      if (!api || typeof api.getDataSourceList !== "function") {
        return _outcome.buildOk(false);
      }
      list = await waitForSettledDataSourceList(_ctx, api.getDataSourceList.bind(api));
      return _outcome.buildOk(Array.isArray(list) ? listHasError(list) : false);
    } catch (error) {
      console.error("[cognosHost.dataSources.hasErrorDataSource] failed", error);
      return _outcome.buildOk(false);
    }
  }

  function createDataSourcesAdapter(_ctx) {
    return { hasErrorDataSource: hasErrorDataSource.bind(null, _ctx) };
  }

  return createDataSourcesAdapter;
});
