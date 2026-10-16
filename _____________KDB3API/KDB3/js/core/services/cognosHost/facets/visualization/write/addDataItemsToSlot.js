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

  function collectColumnIds(_columnIds) {
    var source = Array.isArray(_columnIds) ? _columnIds : [];
    var ids = [];
    var index;
    var id;
    for (index = 0; index < source.length; index += 1) {
      id = source[index];
      if (id) {
        ids.push({ columnId: id });
      }
    }
    return ids;
  }

  async function __controller(_ctx, _widgetId, _slotId, _columnIds, _options) {
    var visualizationApi;
    var slots;
    var slot;
    var items;
    if (_ctx.isDisposed()) {
      return _buildVisualizationOutcome.buildDisposed();
    }
    if (isAborted(_options)) {
      return _buildVisualizationOutcome.buildAborted("aborted");
    }
    if (!isValidWidgetId(_widgetId) || _slotId == null || _slotId === "") {
      return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.INVALID_ID, []);
    }
    items = collectColumnIds(_columnIds);
    if (!items.length) {
      return _buildVisualizationOutcome.buildOk();
    }
    try {
      visualizationApi = _resolveVisualizationHostApi(_ctx._KDB);
      if (!visualizationApi) {
        return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.HOST_UNAVAILABLE, []);
      }
      if (typeof visualizationApi.getSlots !== "function") {
        return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      slots = visualizationApi.getSlots(_widgetId);
      if (!slots || typeof slots.getSlot !== "function") {
        return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      slot = slots.getSlot(_slotId);
      if (!slot || typeof slot.addDataItems !== "function") {
        return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.ITEM_NOT_FOUND, []);
      }
      await Promise.resolve(slot.addDataItems(items));
      if (_ctx.isDisposed() || isAborted(_options)) {
        return _buildVisualizationOutcome.buildAborted("aborted-after-effect");
      }
      return _buildVisualizationOutcome.buildOk();
    } catch (error) {
      console.error("[cognosHost.visualization.addDataItemsToSlot] failed", { widgetId: _widgetId, slotId: _slotId }, error);
      return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.WRITE_FAILED, [
        _buildVisualizationOutcome.buildDiagnostic(_visualizationErrorCodes.WRITE_FAILED, error && error.message)
      ]);
    }
  }

  return __controller;
});
