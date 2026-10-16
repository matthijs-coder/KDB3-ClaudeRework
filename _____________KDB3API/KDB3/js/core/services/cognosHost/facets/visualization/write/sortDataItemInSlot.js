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

  function buildSortingObj(_itemOrder, _priority) {
    var priorityNumber = Number(_priority);
    var priority = isFinite(priorityNumber) && priorityNumber > 0 ? Math.floor(priorityNumber) : 1;
    var order = _itemOrder;
    if (order === "ascending" || order === "descending") {
      return {
        priority: priority,
        by: "value",
        type: order === "descending" ? "desc" : "asc"
      };
    }
    if (order === "captionAscending") {
      return { priority: priority, by: "caption", type: "asc" };
    }
    if (Array.isArray(order)) {
      return {
        priority: priority,
        by: "caption",
        custom: { enabled: true, top: order, sortRemainingItemsBy: "auto" }
      };
    }
    if (typeof order === "string" && order.trim()) {
      return {
        priority: priority,
        by: "caption",
        custom: { enabled: true, top: order.trim(), sortRemainingItemsBy: "auto" }
      };
    }
    return null;
  }

  function itemMatchesColumn(_dataItem, _dataItemId) {
    if (!_dataItem || !_dataItemId) {
      return false;
    }
    if (typeof _dataItem.getColumnId === "function" && _dataItem.getColumnId() === _dataItemId) {
      return true;
    }
    return typeof _dataItem.getId === "function" && _dataItem.getId() === _dataItemId;
  }

  function applySortToMatchingItems(_slotList, _slotId, _dataItemId, _sortingObj) {
    var slotIndex;
    var itemIndex;
    var slot;
    var items;
    var dataItem;
    for (slotIndex = 0; slotIndex < _slotList.length; slotIndex += 1) {
      slot = _slotList[slotIndex];
      if (!slot || typeof slot.getId !== "function" || slot.getId() !== _slotId) {
        continue;
      }
      items = typeof slot.getDataItemList === "function" ? slot.getDataItemList() || [] : [];
      for (itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
        dataItem = items[itemIndex];
        if (itemMatchesColumn(dataItem, _dataItemId) && typeof dataItem.setSort === "function") {
          dataItem.setSort(_sortingObj);
        }
      }
    }
  }

  async function __controller(_ctx, _widgetId, _slotId, _dataItemId, _itemOrder, _options) {
    var visualizationApi;
    var slots;
    var slotList;
    var sortingObj;
    var options = _options || {};
    if (_ctx.isDisposed()) {
      return _buildVisualizationOutcome.buildDisposed();
    }
    if (isAborted(options)) {
      return _buildVisualizationOutcome.buildAborted("aborted");
    }
    if (!isValidWidgetId(_widgetId) || _slotId == null || _slotId === "" || !_dataItemId) {
      return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.INVALID_ID, []);
    }
    sortingObj = buildSortingObj(_itemOrder, options.priority);
    if (!sortingObj) {
      return _buildVisualizationOutcome.buildOk();
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
      if (!slots || typeof slots.getSlotList !== "function") {
        return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.HOST_CAPABILITY_MISSING, []);
      }
      slotList = slots.getSlotList() || [];
      applySortToMatchingItems(slotList, _slotId, _dataItemId, sortingObj);
      if (_ctx.isDisposed() || isAborted(options)) {
        return _buildVisualizationOutcome.buildAborted("aborted-after-effect");
      }
      return _buildVisualizationOutcome.buildOk();
    } catch (error) {
      console.error("[cognosHost.visualization.sortDataItemInSlot] failed", { widgetId: _widgetId, slotId: _slotId }, error);
      return _buildVisualizationOutcome.buildFailed(_visualizationErrorCodes.WRITE_FAILED, [
        _buildVisualizationOutcome.buildDiagnostic(_visualizationErrorCodes.WRITE_FAILED, error && error.message)
      ]);
    }
  }

  return __controller;
});
