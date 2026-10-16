define([
  "../flatten/flattenQueryRows.js",
  "../resolveDataQueryHostApi.js",
  "../buildDataQueryOutcome.js",
  "../config/dataQueryErrorCodes.js"
], function (
  _flattenQueryRows,
  _resolveDataQueryHostApi,
  _buildDataQueryOutcome,
  _dataQueryErrorCodes
) {
  "use strict";

  function isValidWidgetId(_widgetId) {
    return typeof _widgetId === "string" && _widgetId !== "";
  }

  function isThenable(_value) {
    return !!(_value && typeof _value.then === "function");
  }

  function peekQueryRows(_ctx, _widgetId) {
    var dataQueryApi;
    var hostResult;
    var rows;
    if (_ctx.isDisposed()) {
      return _buildDataQueryOutcome.buildDisposed();
    }
    if (!isValidWidgetId(_widgetId)) {
      return _buildDataQueryOutcome.buildFailed(_dataQueryErrorCodes.INVALID_ID, []);
    }
    try {
      dataQueryApi = _resolveDataQueryHostApi(_ctx._KDB);
      if (!dataQueryApi) {
        return _buildDataQueryOutcome.buildFailed(_dataQueryErrorCodes.HOST_UNAVAILABLE, []);
      }
      if (typeof dataQueryApi.peekCurrentQueryResult !== "function") {
        return _buildDataQueryOutcome.buildFailed(_dataQueryErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      hostResult = dataQueryApi.peekCurrentQueryResult(_widgetId);
      if (isThenable(hostResult)) {
        return _buildDataQueryOutcome.buildOk(null);
      }
      if (hostResult == null) {
        return _buildDataQueryOutcome.buildOk(null);
      }
      try {
        rows = _flattenQueryRows(hostResult);
      } catch (flattenError) {
        console.error("[cognosHost.dataQuery.peekQueryRows] flatten failed", { widgetId: _widgetId }, flattenError);
        return _buildDataQueryOutcome.buildFailed(_dataQueryErrorCodes.FLATTEN_FAILED, [
          _buildDataQueryOutcome.buildDiagnostic(
            _dataQueryErrorCodes.FLATTEN_FAILED,
            flattenError && flattenError.message ? flattenError.message : String(flattenError)
          )
        ]);
      }
      if (rows == null) {
        return _buildDataQueryOutcome.buildOk(null);
      }
      return _buildDataQueryOutcome.buildOk(rows);
    } catch (error) {
      console.error("[cognosHost.dataQuery.peekQueryRows] failed", { widgetId: _widgetId }, error);
      return _buildDataQueryOutcome.buildFailed(_dataQueryErrorCodes.READ_FAILED, [
        _buildDataQueryOutcome.buildDiagnostic(
          _dataQueryErrorCodes.READ_FAILED,
          error && error.message ? error.message : String(error)
        )
      ]);
    }
  }

  return peekQueryRows;
});
