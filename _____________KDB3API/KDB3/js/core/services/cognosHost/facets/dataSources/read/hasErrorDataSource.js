define([
  "../resolveDataSourcesHostApi.js",
  "../buildDataSourcesOutcome.js",
  "../config/dataSourcesErrorCodes.js",
  "../wait/waitForSettledDataSourceList.js"
], function (
  _resolveDataSourcesHostApi,
  _buildDataSourcesOutcome,
  _dataSourcesErrorCodes,
  _waitForSettledDataSourceList
) {
  "use strict";

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

  function readItemState(_item) {
    var state;
    try {
      if (!_item || typeof _item.getState !== "function") {
        return "unsettled";
      }
      state = _item.getState();
      if (state === "error") {
        return "error";
      }
      if (state === "ready") {
        return "ready";
      }
      return "unsettled";
    } catch (_error) {
      return "unsettled";
    }
  }

  function listShouldKeepWaiting(_list) {
    var i;
    var state;
    var sawUnsettled = false;
    if (!Array.isArray(_list) || _list.length === 0) {
      return true;
    }
    for (i = 0; i < _list.length; i += 1) {
      state = readItemState(_list[i]);
      if (state === "error") {
        return false;
      }
      if (state === "unsettled") {
        sawUnsettled = true;
      }
    }
    return sawUnsettled;
  }

  function listHasError(_list) {
    var i;
    for (i = 0; i < _list.length; i += 1) {
      if (readItemState(_list[i]) === "error") {
        return true;
      }
    }
    return false;
  }

  async function __controller(_ctx) {
    var dataSourcesApi;
    var list;
    if (isDisposedOrStale(_ctx)) {
      return _buildDataSourcesOutcome.buildDisposed();
    }
    try {
      dataSourcesApi = _resolveDataSourcesHostApi(_ctx._KDB);
      if (!dataSourcesApi || typeof dataSourcesApi.getDataSourceList !== "function") {
        return _buildDataSourcesOutcome.buildOk(false);
      }
      list = await _waitForSettledDataSourceList(
        _ctx,
        dataSourcesApi.getDataSourceList.bind(dataSourcesApi),
        listShouldKeepWaiting
      );
      if (!Array.isArray(list)) {
        return _buildDataSourcesOutcome.buildOk(false);
      }
      return _buildDataSourcesOutcome.buildOk(listHasError(list));
    } catch (error) {
      console.error("[cognosHost.dataSources.hasErrorDataSource] failed", error);
      if (Array.isArray(list)) {
        return _buildDataSourcesOutcome.buildFailed(_dataSourcesErrorCodes.READ_FAILED, [
          _buildDataSourcesOutcome.buildDiagnostic(
            _dataSourcesErrorCodes.READ_FAILED,
            error && error.message ? error.message : String(error)
          )
        ]);
      }
      return _buildDataSourcesOutcome.buildOk(false);
    }
  }

  return __controller;
});
