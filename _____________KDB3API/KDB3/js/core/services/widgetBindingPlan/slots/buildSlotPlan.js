define([
  "../config.js",
  "./resolveSlotColumnIds.js",
  "./resolveSlotSortSpecs.js",
  "./slotActivity.js",
  "./topBottomOptions.js",
], function (_config, _resolveSlotColumnIds, _resolveSlotSortSpecs, _slotActivity, _topBottomOptions) {
  "use strict";

  function isRequiredSlot(_slotName) {
    return _config.REQUIRED_SLOTS.indexOf(_slotName) >= 0;
  }

  function pushWarning(_diagnostics, _code, _message, _field) {
    if (!_diagnostics || !Array.isArray(_diagnostics.warnings)) {
      return;
    }
    _diagnostics.warnings.push({
      code: _code,
      message: _message,
      field: _field,
    });
  }

  function __controller(_spec, _parsedTopN, _diagnostics) {
    var dataConfig = _spec.dataConfig || {};
    var visTypeConfig = dataConfig.visTypeConfig || {};
    var activeSlots = _slotActivity.collectActiveSlotNames(visTypeConfig);
    var slots = [];
    var filterPropObj = _spec.config && _spec.config.filterPropObj;

    for (var index = 0; index < activeSlots.length; index += 1) {
      var slotName = activeSlots[index];
      var resolved = _resolveSlotColumnIds({
        slotName: slotName,
        targetKind: _spec.targetKind,
        dataConfig: dataConfig,
        hierarchySnapshot: _spec.hierarchySnapshot || null,
        filterPropObj: filterPropObj,
        parsedTopN: _parsedTopN,
      });

      if (!resolved.ok) {
        return {
          ok: false,
          errorCode: resolved.errorCode || "WIDGET_BINDING_PLAN_SLOT_FAILED",
          slotName: slotName,
        };
      }

      var columnIds = Array.isArray(resolved.columnIds) ? resolved.columnIds : [];
      if (columnIds.length === 0) {
        if (isRequiredSlot(slotName)) {
          return {
            ok: false,
            errorCode: "WIDGET_BINDING_PLAN_SLOT_REQUIRED_EMPTY",
            slotName: slotName,
          };
        }
        pushWarning(
          _diagnostics,
          "WIDGET_BINDING_PLAN_OPTIONAL_SLOT_EMPTY",
          "Optional slot resolved to no column ids and was skipped.",
          slotName
        );
        continue;
      }

      var sortMeta = _resolveSlotSortSpecs(
        slotName,
        columnIds,
        dataConfig.dataTableConfig || {},
        resolved.options || { source: "default" }
      );
      if (sortMeta.sortByColumn && (!sortMeta.sortSpecs || sortMeta.sortSpecs.length === 0)) {
        pushWarning(
          _diagnostics,
          "WIDGET_BINDING_PLAN_LEGACY_SORT_FALLBACK",
          "Legacy single sortByColumn was emitted because no full sortSpecs could be built.",
          slotName
        );
      }

      var slotItem = {
        slotName: slotName,
        columnIds: columnIds,
        sortSpecs: sortMeta.sortSpecs || [],
        options: resolved.options || { source: "default" },
      };
      if (sortMeta.sortByColumn) {
        slotItem.sortByColumn = sortMeta.sortByColumn;
      }
      if (_topBottomOptions.shouldAddTopBottom(_spec, _parsedTopN, slotName)) {
        _topBottomOptions.addTopBottomOption(slotItem, _parsedTopN);
      }
      slots.push(slotItem);
    }

    return { ok: true, slots: slots };
  }

  return __controller;
});
