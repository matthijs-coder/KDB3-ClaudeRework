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

  function ensureDisplayType(_filterObj) {
    if (!_filterObj || typeof _filterObj !== "object") {
      return _filterObj;
    }
    if (_filterObj.type != null && String(_filterObj.type).trim() !== "") {
      return _filterObj;
    }
    if (!Array.isArray(_filterObj.values) || !_filterObj.values.length) {
      return _filterObj;
    }
    return Object.assign({}, _filterObj, { type: "display" });
  }

  function filterForAdd(_filterObj, _filterOptions) {
    if (
      _filterOptions &&
      _filterOptions.skipDisplayType === true &&
      _filterObj &&
      typeof _filterObj === "object"
    ) {
      return Object.assign({}, _filterObj, { type: null });
    }
    return ensureDisplayType(_filterObj);
  }

  function removeExisting(_localFilters, _itemId, _removeSuffix1) {
    if (typeof _localFilters.removeFilter !== "function") {
      return;
    }
    try {
      _localFilters.removeFilter({ itemId: _itemId });
      if (_removeSuffix1) {
        _localFilters.removeFilter({ itemId: _itemId + "_1" });
      }
    } catch (ignoreMissing) {
      /* filter may not exist yet */
    }
  }

  function logPeriodOrDienststelle(_itemId, _widgetId, _filter) {
    if (_itemId.indexOf("Dienststelle") === -1 && _itemId.indexOf("Jahr_flach") === -1 && _itemId.indexOf("Monat_flach") === -1) {
      return;
    }
    console.info("[sicht-jahr] TEMP local filter", { widgetId: _widgetId, itemId: _itemId, filter: _filter });
  }

  async function __controller(_ctx, _widgetId, _itemId, _filterObj, _filterOptions, _options) {
    var visualizationApi;
    var localFilters;
    var itemId = String(_itemId || "").trim();
    var filterOptions = _filterOptions && typeof _filterOptions === "object" ? _filterOptions : {};
    var removeSuffix1 = filterOptions.removeSuffix1 !== false;
    if (_ctx.isDisposed()) {
      return _buildVisualizationOutcome.buildDisposed();
    }
    if (isAborted(_options)) {
      return _buildVisualizationOutcome.buildAborted("aborted");
    }
    if (!isValidWidgetId(_widgetId) || !itemId || !_filterObj || typeof _filterObj !== "object") {
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
      if (!localFilters || typeof localFilters.addFilter !== "function") {
        return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      removeExisting(localFilters, itemId, removeSuffix1);
      var stamped = filterForAdd(_filterObj, filterOptions);
      logPeriodOrDienststelle(itemId, _widgetId, stamped);
      await Promise.resolve(localFilters.addFilter({ itemId: itemId }, stamped));
      if (_ctx.isDisposed() || isAborted(_options)) {
        return _buildVisualizationOutcome.buildAborted("aborted-after-effect");
      }
      return _buildVisualizationOutcome.buildOk(true);
    } catch (error) {
      console.error("[cognosHost.visualization.addOrReplaceLocalFilter] failed", { widgetId: _widgetId, itemId: itemId }, error);
      return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.WRITE_FAILED, [
        _buildVisualizationOutcome.buildDiagnostic(_visualizationErrorCodes.WRITE_FAILED, error && error.message)
      ]);
    }
  }

  return __controller;
});
