define([
  "../config.js",
  "./resolveSlotColumnIds.js",
  "./resolveSlotSortSpecs.js",
], function (_config, _resolveSlotColumnIds, _resolveSlotSortSpecs) {
  "use strict";

  function slotRawIsActive(_rawValue) {
    if (_rawValue == null) {
      return false;
    }
    if (typeof _rawValue === "string") {
      return _rawValue.trim() !== "";
    }
    if (Array.isArray(_rawValue)) {
      return _rawValue.length > 0;
    }
    if (typeof _rawValue === "object") {
      return Object.keys(_rawValue).length > 0;
    }
    return true;
  }

  function hasHierarchyPolicy(_visTypeConfig, _slotName) {
    var composition = _visTypeConfig && _visTypeConfig.slotComposition;
    var slotPolicy = composition && composition[_slotName];
    return !!(slotPolicy && slotPolicy.hierarchy);
  }

  function collectActiveSlotNames(_visTypeConfig) {
    var active = [];
    var visTypeConfig = _visTypeConfig && typeof _visTypeConfig === "object" ? _visTypeConfig : {};
    for (var index = 0; index < _config.ALL_SLOT_NAMES.length; index += 1) {
      var slotName = _config.ALL_SLOT_NAMES[index];
      if (slotRawIsActive(visTypeConfig[slotName]) || hasHierarchyPolicy(visTypeConfig, slotName)) {
        active.push(slotName);
      }
    }
    var affects = visTypeConfig.dimensionSelectionAffects;
    if (typeof affects === "string" && affects && active.indexOf(affects) < 0 && _config.ALL_SLOT_NAMES.indexOf(affects) >= 0) {
      active.push(affects);
    }
    return active;
  }

  function shouldAddTopBottom(_spec, _parsedTopN, _slotName) {
    return _spec.targetKind === "topNHelper"
      && _config.slotRule(_slotName).carriesTopBottom === true
      && _parsedTopN.kind === "count"
      && typeof _parsedTopN.n === "number"
      && _parsedTopN.n > 0;
  }

  function addTopBottomOption(_slotItem, _parsedTopN) {
    var columnIds = _slotItem.columnIds;
    var valueItemId = columnIds.length ? columnIds[columnIds.length - 1] : null;
    if (!valueItemId) {
      return;
    }
    _slotItem.options = Object.assign({}, _slotItem.options, {
      topBottom: {
        type: "topcount",
        value: _parsedTopN.n,
        rank: false,
        valueItemId: valueItemId,
      },
    });
  }

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

  function buildSlotPlan(_spec, _parsedTopN, _diagnostics) {
    var dataConfig = _spec.dataConfig || {};
    var visTypeConfig = dataConfig.visTypeConfig || {};
    var activeSlots = collectActiveSlotNames(visTypeConfig);
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
      if (shouldAddTopBottom(_spec, _parsedTopN, slotName)) {
        addTopBottomOption(slotItem, _parsedTopN);
      }
      slots.push(slotItem);
    }

    return { ok: true, slots: slots };
  }

  return buildSlotPlan;
});
