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

  function itemMatchesTarget(_item, _targetColumnId) {
    if (!_item) {
      return false;
    }
    if (!_targetColumnId) {
      return true;
    }
    if (typeof _item.getColumnId === "function" && _item.getColumnId() === _targetColumnId) {
      return true;
    }
    return typeof _item.getId === "function" && _item.getId() === _targetColumnId;
  }

  function findTargetItem(_dataItemList, _targetColumnId) {
    var index;
    var item;
    for (index = 0; index < _dataItemList.length; index += 1) {
      item = _dataItemList[index];
      if (itemMatchesTarget(item, _targetColumnId)) {
        return item;
      }
    }
    return null;
  }

  async function __controller(_ctx, _widgetId, _slotId, _topBottom, _options) {
    var visualizationApi;
    var slots;
    var slot;
    var dataItemList;
    var topBottom = _topBottom || {};
    var targetColumnId = topBottom.valueItemId || topBottom.sortValueItemId || topBottom.targetColumnId || null;
    var value = Number(topBottom.value);
    var targetItem;
    if (_ctx.isDisposed()) {
      return _buildVisualizationOutcome.buildDisposed();
    }
    if (isAborted(_options)) {
      return _buildVisualizationOutcome.buildAborted("aborted");
    }
    if (!isValidWidgetId(_widgetId) || _slotId == null || _slotId === "") {
      return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.INVALID_ID, []);
    }
    if (!isFinite(value) || value <= 0) {
      return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.INVALID_ID, []);
    }
    try {
      visualizationApi = _resolveVisualizationHostApi(_ctx._KDB);
      if (!visualizationApi || typeof visualizationApi.getSlots !== "function") {
        return _buildVisualizationOutcome.buildFailed(
          visualizationApi ? _visualizationErrorCodes.HOST_CAPABILITY_MISSING : _visualizationErrorCodes.HOST_UNAVAILABLE,
          []
        );
      }
      slots = visualizationApi.getSlots(_widgetId);
      if (!slots || typeof slots.getSlot !== "function") {
        return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      slot = slots.getSlot(_slotId);
      dataItemList = slot && typeof slot.getDataItemList === "function" ? slot.getDataItemList() : null;
      if (!dataItemList || !dataItemList.length) {
        return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.ITEM_NOT_FOUND, []);
      }
      targetItem = findTargetItem(dataItemList, targetColumnId);
      if (!targetItem || typeof targetItem.setTopBottom !== "function") {
        return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.ITEM_NOT_FOUND, []);
      }
      await Promise.resolve(targetItem.setTopBottom({
        type: topBottom.type || "topcount",
        value: Math.floor(value),
        rank: topBottom.rank === true
      }));
      if (_ctx.isDisposed() || isAborted(_options)) {
        return _buildVisualizationOutcome.buildAborted("aborted-after-effect");
      }
      return _buildVisualizationOutcome.buildOk();
    } catch (error) {
      console.error("[cognosHost.visualization.setTopBottomOnSlot] failed", { widgetId: _widgetId, slotId: _slotId }, error);
      return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.WRITE_FAILED, [
        _buildVisualizationOutcome.buildDiagnostic(_visualizationErrorCodes.WRITE_FAILED, error && error.message)
      ]);
    }
  }

  return __controller;
});
