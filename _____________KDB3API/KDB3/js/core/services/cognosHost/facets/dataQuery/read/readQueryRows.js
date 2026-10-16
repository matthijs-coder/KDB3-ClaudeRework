define([
  "../wait/waitForQueryResult.js",
  "../flatten/flattenQueryRows.js",
  "../resolveDataQueryHostApi.js",
  "../buildDataQueryOutcome.js",
  "../config/dataQueryErrorCodes.js"
], function (
  _waitForQueryResult,
  _flattenQueryRows,
  _resolveDataQueryHostApi,
  _buildDataQueryOutcome,
  _dataQueryErrorCodes
) {
  "use strict";

  function isCallerAborted(_options) {
    return !!(_options && _options.signal && _options.signal.aborted === true);
  }

  function isValidWidgetId(_widgetId) {
    return typeof _widgetId === "string" && _widgetId !== "";
  }

  async function readQueryRows(_ctx, _widgetId, _options) {
    var options = _options || {};
    var waitOutcome;
    var dataQueryApi;
    var hostResult;
    var rows;
    if (_ctx.isDisposed()) {
      return _buildDataQueryOutcome.buildDisposed();
    }
    if (isCallerAborted(options)) {
      return _buildDataQueryOutcome.buildAborted("aborted");
    }
    if (!isValidWidgetId(_widgetId)) {
      return _buildDataQueryOutcome.buildFailed(_dataQueryErrorCodes.INVALID_ID, []);
    }
    try {
      waitOutcome = await _waitForQueryResult(_ctx, _widgetId, options);
      if (_ctx.isDisposed()) {
        return _buildDataQueryOutcome.buildDisposed();
      }
      if (isCallerAborted(options)) {
        return _buildDataQueryOutcome.buildAborted("aborted-after-effect");
      }
      if (!waitOutcome || waitOutcome.ok !== true) {
        return waitOutcome;
      }
      hostResult = waitOutcome.data && waitOutcome.data.hostResult ? waitOutcome.data.hostResult : null;
      if (!hostResult) {
        dataQueryApi = _resolveDataQueryHostApi(_ctx._KDB);
        if (!dataQueryApi) {
          return _buildDataQueryOutcome.buildFailed(_dataQueryErrorCodes.HOST_UNAVAILABLE, []);
        }
        if (typeof dataQueryApi.getDataQueryResult !== "function") {
          return _buildDataQueryOutcome.buildFailed(_dataQueryErrorCodes.HOST_CAPABILITY_MISSING, []);
        }
        hostResult = await dataQueryApi.getDataQueryResult(_widgetId);
      }
      if (_ctx.isDisposed()) {
        return _buildDataQueryOutcome.buildDisposed();
      }
      if (isCallerAborted(options)) {
        return _buildDataQueryOutcome.buildAborted("aborted-after-effect");
      }
      try {
        rows = _flattenQueryRows(hostResult);
      } catch (flattenError) {
        console.error("[cognosHost.dataQuery.readQueryRows] flatten failed", { widgetId: _widgetId }, flattenError);
        return _buildDataQueryOutcome.buildFailed(_dataQueryErrorCodes.FLATTEN_FAILED, [
          _buildDataQueryOutcome.buildDiagnostic(
            _dataQueryErrorCodes.FLATTEN_FAILED,
            flattenError && flattenError.message ? flattenError.message : String(flattenError)
          )
        ]);
      }
      return _buildDataQueryOutcome.buildOk(rows);
    } catch (error) {
      if (isCallerAborted(options) || (error && error.name === "AbortError")) {
        return _buildDataQueryOutcome.buildAborted("aborted");
      }
      console.error("[cognosHost.dataQuery.readQueryRows] failed", { widgetId: _widgetId }, error);
      return _buildDataQueryOutcome.buildFailed(_dataQueryErrorCodes.READ_FAILED, [
        _buildDataQueryOutcome.buildDiagnostic(
          _dataQueryErrorCodes.READ_FAILED,
          error && error.message ? error.message : String(error)
        )
      ]);
    }
  }

  return readQueryRows;
});
