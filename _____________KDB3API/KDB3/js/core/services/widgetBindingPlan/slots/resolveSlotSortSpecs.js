define([], function () {
  "use strict";

  function isNonEmptyStringArray(_value) {
    if (!Array.isArray(_value) || _value.length === 0) {
      return false;
    }
    for (var index = 0; index < _value.length; index += 1) {
      if (typeof _value[index] !== "string" || !_value[index].trim()) {
        return false;
      }
    }
    return true;
  }

  function isNonEmptyString(_value) {
    return typeof _value === "string" && _value.trim() !== "";
  }

  function resolveSortOrder(_entry) {
    if (_entry == null) {
      return null;
    }
    if (isNonEmptyStringArray(_entry)) {
      return _entry;
    }
    if (isNonEmptyString(_entry)) {
      return _entry.trim();
    }
    if (typeof _entry === "object" && !Array.isArray(_entry)) {
      var order = _entry.order;
      if (isNonEmptyStringArray(order)) {
        return order;
      }
      if (isNonEmptyString(order)) {
        var lower = order.toLowerCase();
        if (lower === "ascending" || lower === "descending") {
          return lower;
        }
        return order.trim();
      }
    }
    return null;
  }

  function resolveSortPriority(_entry, _fallback) {
    if (_entry && typeof _entry === "object" && !Array.isArray(_entry) && typeof _entry.priority === "number") {
      return _entry.priority;
    }
    return _fallback;
  }

  function compareSortSpecPriority(_left, _right) {
    return (_left.priority || 0) - (_right.priority || 0);
  }

  function buildSpecsFromSorting(_columnIds, _sorting, _maxSpecs) {
    var specs = [];
    var sorting = _sorting && typeof _sorting === "object" ? _sorting : {};
    var keys = Object.keys(sorting);
    for (var index = 0; index < keys.length; index += 1) {
      var columnId = keys[index];
      if (_columnIds.indexOf(columnId) < 0) {
        continue;
      }
      var entry = sorting[columnId];
      var order = resolveSortOrder(entry);
      if (order == null) {
        continue;
      }
      specs.push({
        columnId: columnId,
        order: order,
        priority: resolveSortPriority(entry, specs.length + 1),
      });
    }
    specs.sort(compareSortSpecPriority);
    if (typeof _maxSpecs === "number" && _maxSpecs > 0) {
      return specs.slice(0, _maxSpecs);
    }
    return specs;
  }

  function hasColumnId(_specs, _columnId) {
    for (var index = 0; index < _specs.length; index += 1) {
      if (_specs[index] && _specs[index].columnId === _columnId) {
        return true;
      }
    }
    return false;
  }

  function appendCaptionAscendingSpec(_sortSpecs, _columnId) {
    var lastPriority;
    if (!isNonEmptyString(_columnId) || hasColumnId(_sortSpecs, _columnId)) {
      return false;
    }
    lastPriority = _sortSpecs.length > 0 ? (_sortSpecs[_sortSpecs.length - 1].priority || 0) : 0;
    _sortSpecs.push({
      columnId: _columnId,
      order: "captionAscending",
      priority: lastPriority + 1,
    });
    return true;
  }

  function __controller(_slotName, _columnIds, _dataTableConfig, _options) {
    var columnIds = Array.isArray(_columnIds) ? _columnIds.slice() : [];
    var dataTableConfig = _dataTableConfig && typeof _dataTableConfig === "object" ? _dataTableConfig : {};
    var options = _options && typeof _options === "object" ? _options : {};
    var customLabel = options.customLabel;
    var customLabelColumnId = customLabel && typeof customLabel.columnId === "string" ? customLabel.columnId : "";
    var sorting = dataTableConfig.sorting || {};
    var maxSpecs = _slotName === "grid_cols" ? 2 : columnIds.length;
    var sortSpecs = buildSpecsFromSorting(columnIds, sorting, maxSpecs);
    var sortByColumn = sortSpecs.length === 0 && columnIds.length === 1 ? columnIds[0] : null;

    if (appendCaptionAscendingSpec(sortSpecs, customLabelColumnId)) {
      sortByColumn = null;
    }

    return { sortSpecs: sortSpecs, sortByColumn: sortByColumn };
  }

  return __controller;
});
