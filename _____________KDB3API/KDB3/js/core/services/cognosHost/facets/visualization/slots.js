define([
  "../../outcome.js",
  "../../errorCodes.js",
  "../../hostAccess.js",
  "../../hostOps.js"
], function (_outcome, _errorCodes, _hostAccess, _hostOps) {
  "use strict";

  var CODES = _errorCodes.visualization;

  function isPresent(_value) {
    return _value != null && _value !== "";
  }

  // getSlots(widgetId) when it offers the method a slot write needs, else null (-> capability failure).
  function readSlots(_api, _widgetId, _requiredMethod) {
    var slots = _api.getSlots(_widgetId);
    return slots && typeof slots[_requiredMethod] === "function" ? slots : null;
  }

  function writeSlots(_ctx, _options, _valid, _label, _info, _call) {
    return _hostOps.writeOp(_ctx, _options, _valid, {
      codes: CODES,
      theme: "visualization",
      method: "getSlots",
      label: "visualization." + _label,
      info: _info,
      call: _call
    });
  }

  function clearAllSlots(_ctx, _widgetId, _options) {
    return writeSlots(_ctx, _options, _hostAccess.isValidWidgetId(_widgetId), "clearAllSlots", { widgetId: _widgetId }, function (api) {
      var slots = readSlots(api, _widgetId, "clearAllSlots");
      return slots ? slots.clearAllSlots() : _hostOps.hostFail(CODES.HOST_CAPABILITY_MISSING);
    });
  }

  function collectColumnIds(_columnIds) {
    var source = Array.isArray(_columnIds) ? _columnIds : [];
    return source.filter(Boolean).map(function (id) {
      return { columnId: id };
    });
  }

  function addDataItemsToSlot(_ctx, _widgetId, _slotId, _columnIds, _options) {
    var valid = _hostAccess.isValidWidgetId(_widgetId) && isPresent(_slotId);
    var items = collectColumnIds(_columnIds);
    var early = _hostOps.guardWrite(_ctx, _options, valid, CODES);
    if (early || !items.length) {
      return Promise.resolve(early || _outcome.buildOk());
    }
    return writeSlots(_ctx, _options, valid, "addDataItemsToSlot", { widgetId: _widgetId, slotId: _slotId }, function (api) {
      var slots = readSlots(api, _widgetId, "getSlot");
      var slot;
      if (!slots) {
        return _hostOps.hostFail(CODES.HOST_CAPABILITY_MISSING);
      }
      slot = slots.getSlot(_slotId);
      if (!slot || typeof slot.addDataItems !== "function") {
        return _hostOps.hostFail(CODES.ITEM_NOT_FOUND);
      }
      return slot.addDataItems(items);
    });
  }

  function itemMatches(_item, _columnId) {
    if (typeof _item.getColumnId === "function" && _item.getColumnId() === _columnId) {
      return true;
    }
    return typeof _item.getId === "function" && _item.getId() === _columnId;
  }

  function findTopBottomTarget(_dataItemList, _targetColumnId) {
    var index;
    for (index = 0; index < _dataItemList.length; index += 1) {
      if (_dataItemList[index] && (!_targetColumnId || itemMatches(_dataItemList[index], _targetColumnId))) {
        return _dataItemList[index];
      }
    }
    return null;
  }

  function setTopBottomOnSlot(_ctx, _widgetId, _slotId, _topBottom, _options) {
    var topBottom = _topBottom || {};
    var targetColumnId = topBottom.valueItemId || topBottom.sortValueItemId || topBottom.targetColumnId || null;
    var value = Number(topBottom.value);
    var valid = _hostAccess.isValidWidgetId(_widgetId) && isPresent(_slotId) && isFinite(value) && value > 0;
    return writeSlots(_ctx, _options, valid, "setTopBottomOnSlot", { widgetId: _widgetId, slotId: _slotId }, function (api) {
      var slots = readSlots(api, _widgetId, "getSlot");
      var slot;
      var dataItemList;
      var target;
      if (!slots) {
        return _hostOps.hostFail(CODES.HOST_CAPABILITY_MISSING);
      }
      slot = slots.getSlot(_slotId);
      dataItemList = slot && typeof slot.getDataItemList === "function" ? slot.getDataItemList() : null;
      target = dataItemList && dataItemList.length ? findTopBottomTarget(dataItemList, targetColumnId) : null;
      if (!target || typeof target.setTopBottom !== "function") {
        return _hostOps.hostFail(CODES.ITEM_NOT_FOUND);
      }
      return target.setTopBottom({
        type: topBottom.type || "topcount",
        value: Math.floor(value),
        rank: topBottom.rank === true
      });
    });
  }

  function buildSortingObj(_itemOrder, _priority) {
    var priorityNumber = Number(_priority);
    var priority = isFinite(priorityNumber) && priorityNumber > 0 ? Math.floor(priorityNumber) : 1;
    if (_itemOrder === "ascending" || _itemOrder === "descending") {
      return { priority: priority, by: "value", type: _itemOrder === "descending" ? "desc" : "asc" };
    }
    if (_itemOrder === "captionAscending") {
      return { priority: priority, by: "caption", type: "asc" };
    }
    if (Array.isArray(_itemOrder)) {
      return { priority: priority, by: "caption", custom: { enabled: true, top: _itemOrder, sortRemainingItemsBy: "auto" } };
    }
    if (typeof _itemOrder === "string" && _itemOrder.trim()) {
      return { priority: priority, by: "caption", custom: { enabled: true, top: _itemOrder.trim(), sortRemainingItemsBy: "auto" } };
    }
    return null;
  }

  function applySortToMatchingItems(_slotList, _slotId, _dataItemId, _sortingObj) {
    var slotIndex;
    var itemIndex;
    var slot;
    var items;
    for (slotIndex = 0; slotIndex < _slotList.length; slotIndex += 1) {
      slot = _slotList[slotIndex];
      if (!slot || typeof slot.getId !== "function" || slot.getId() !== _slotId) {
        continue;
      }
      items = typeof slot.getDataItemList === "function" ? slot.getDataItemList() || [] : [];
      for (itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
        if (items[itemIndex] && itemMatches(items[itemIndex], _dataItemId) && typeof items[itemIndex].setSort === "function") {
          items[itemIndex].setSort(_sortingObj);
        }
      }
    }
  }

  function sortDataItemInSlot(_ctx, _widgetId, _slotId, _dataItemId, _itemOrder, _options) {
    var options = _options || {};
    var valid = _hostAccess.isValidWidgetId(_widgetId) && isPresent(_slotId) && !!_dataItemId;
    var sortingObj = buildSortingObj(_itemOrder, options.priority);
    var early = _hostOps.guardWrite(_ctx, options, valid, CODES);
    if (early || !sortingObj) {
      return Promise.resolve(early || _outcome.buildOk());
    }
    return writeSlots(_ctx, options, valid, "sortDataItemInSlot", { widgetId: _widgetId, slotId: _slotId }, function (api) {
      var slots = readSlots(api, _widgetId, "getSlotList");
      if (!slots) {
        return _hostOps.hostFail(CODES.HOST_CAPABILITY_MISSING);
      }
      applySortToMatchingItems(slots.getSlotList() || [], _slotId, _dataItemId, sortingObj);
      return undefined;
    });
  }

  // The host reports a missing item or capability by message; map both onto the facet's codes.
  function mapCustomLabelError(_error) {
    var message = _error && _error.message;
    if (message === "ITEM_NOT_FOUND" || message === "HOST_CAPABILITY_MISSING") {
      return _outcome.buildFailed(CODES[message], [_outcome.buildDiagnostic(CODES[message], message)]);
    }
    return null;
  }

  function setCustomLabelInSlot(_ctx, _widgetId, _slotId, _columnId, _label, _options) {
    var valid = _hostAccess.isValidWidgetId(_widgetId) && isPresent(_slotId) && isPresent(_columnId) && typeof _label === "string" && _label !== "";
    return _hostOps.writeOp(_ctx, _options, valid, {
      codes: CODES,
      theme: "visualization",
      method: "setCustomLabel",
      label: "visualization.setCustomLabelInSlot",
      info: { widgetId: _widgetId, slotId: _slotId },
      call: function (api) {
        return api.setCustomLabel(_widgetId, _slotId, _columnId, _label);
      },
      onError: mapCustomLabelError
    });
  }

  function createSlotOps(_ctx) {
    return {
      clearAllSlots: clearAllSlots.bind(null, _ctx),
      addDataItemsToSlot: addDataItemsToSlot.bind(null, _ctx),
      setTopBottomOnSlot: setTopBottomOnSlot.bind(null, _ctx),
      sortDataItemInSlot: sortDataItemInSlot.bind(null, _ctx),
      setCustomLabelInSlot: setCustomLabelInSlot.bind(null, _ctx)
    };
  }

  return createSlotOps;
});
