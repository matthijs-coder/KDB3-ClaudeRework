define([
  "../resolveVisualizationHostApi.js",
  "../buildVisualizationOutcome.js",
  "../config/visualizationErrorCodes.js"
], function (_resolveVisualizationHostApi, _buildVisualizationOutcome, _visualizationErrorCodes) {
  "use strict";

  function isAborted(_options) {
    return !!(_options && _options.signal && _options.signal.aborted === true);
  }

  function isValidWidgetId(_widgetId) {
    return typeof _widgetId === "string" && _widgetId !== "";
  }

  function readFilterItemId(_filter) {
    if (!_filter) {
      return "";
    }
    return String(_filter.columnId || _filter.itemId || _filter.id || "").trim();
  }

  function removeListedFilters(_localFilters, _filterList) {
    var index;
    var itemId;
    for (index = 0; index < _filterList.length; index += 1) {
      itemId = readFilterItemId(_filterList[index]);
      if (itemId) {
        _localFilters.removeFilter({ itemId: itemId });
      }
    }
  }

  async function __controller(_ctx, _widgetId, _options) {
    var visualizationApi;
    var localFilters;
    var filterList;
    if (_ctx.isDisposed()) {
      return _buildVisualizationOutcome.buildDisposed();
    }
    if (isAborted(_options)) {
      return _buildVisualizationOutcome.buildAborted("aborted");
    }
    if (!isValidWidgetId(_widgetId)) {
      return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.INVALID_ID, []);
    }
    try {
      visualizationApi = _resolveVisualizationHostApi(_ctx._KDB);
      if (!visualizationApi || typeof visualizationApi.getLocalFilters !== "function") {
        return _buildVisualizationOutcome.buildFailed(
          visualizationApi ? _visualizationErrorCodes.HOST_CAPABILITY_MISSING : _visualizationErrorCodes.HOST_UNAVAILABLE,
          []
        );
      }
      localFilters = visualizationApi.getLocalFilters(_widgetId);
      filterList = localFilters && typeof localFilters.getFilterList === "function"
        ? localFilters.getFilterList() || []
        : [];
      if (filterList.length) {
        if (!localFilters || typeof localFilters.removeFilter !== "function") {
          return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.HOST_CAPABILITY_MISSING, []);
        }
        removeListedFilters(localFilters, filterList);
      }
      if (_ctx.isDisposed() || isAborted(_options)) {
        return _buildVisualizationOutcome.buildAborted("aborted-after-effect");
      }
      return _buildVisualizationOutcome.buildOk();
    } catch (error) {
      console.error("[cognosHost.visualization.clearAllLocalFilters] failed", { widgetId: _widgetId }, error);
      return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.WRITE_FAILED, [
        _buildVisualizationOutcome.buildDiagnostic(_visualizationErrorCodes.WRITE_FAILED, error && error.message)
      ]);
    }
  }

  return __controller;
});
