define([
  "../config.js",
  "../filters/filterItemIds.js",
  "../defaults/normalizeDefaultValue.js",
  "./slotComposition.js",
], function (_config, _filterItemIds, _normalizeDefaultValue, _slotComposition) {
  "use strict";

  function shouldInjectHierarchyIntoSlot(_context) {
    return _context.targetKind !== "topNHelper";
  }

  function hierarchyItemId(_context) {
    var snap = _context.hierarchySnapshot;
    if (!snap || !snap.resolution || snap.resolution.hasConfirmedSelection !== true) {
      return null;
    }
    var matched = _filterItemIds.matchFilterPropEntry(_context.filterPropObj, snap.activeDownstreamName, _context.dataConfig);
    return _filterItemIds.resolveHierarchyItemId(matched, _context.dataConfig);
  }

  function catalogDimensionMissing(_dim, _dimKey, _dimAffects, _slotName) {
    return !!(_dimKey && !_dim && _dimAffects === _slotName);
  }

  function buildSlotResolveOptions(_source, _selectedDimensionId, _dimKey) {
    var options = { source: _source };
    if (_selectedDimensionId && _dimKey) {
      options.customLabel = { columnId: String(_selectedDimensionId), label: String(_dimKey) };
    }
    return options;
  }

  function resolveSlotColumnIds(_context) {
    var context = _context || {};
    var slotName = context.slotName;
    var dataConfig = context.dataConfig || {};
    var visTypeConfig = dataConfig.visTypeConfig || {};
    var columnIds = _slotComposition.defaultsForSlot(slotName, visTypeConfig[slotName], dataConfig);
    var dimAffects = _normalizeDefaultValue(visTypeConfig.dimensionSelectionAffects);
    var slotPolicy = _slotComposition.slotCompositionPolicy(visTypeConfig, slotName);
    var dim = _slotComposition.dimensionEntry(dataConfig);
    var dimKey = _normalizeDefaultValue(dataConfig.dimension);
    var selectedDimensionId = null;
    var source = "default";
    var dimensionOnlySlot = _config.dimensionOnlySlot(dataConfig.visualizationType);
    var isPieVis = dimensionOnlySlot !== null;

    if (catalogDimensionMissing(dim, dimKey, dimAffects, slotName)) {
      return { ok: false, errorCode: "WIDGET_BINDING_PLAN_SLOT_MISSING_DIM_ITEM" };
    }
    if (dim) {
      if (!dimAffects) {
        return { ok: false, errorCode: "WIDGET_BINDING_PLAN_SLOT_MISSING_DIM_AFFECTS" };
      }
      if (dimAffects === slotName || (dimAffects === "series" && slotName === "series")) {
        if (!dim.entry.itemId) {
          return { ok: false, errorCode: "WIDGET_BINDING_PLAN_SLOT_MISSING_DIM_ITEM" };
        }
        selectedDimensionId = String(dim.entry.itemId);
        columnIds = _slotComposition.prependUniqueId(selectedDimensionId, columnIds);
        source = columnIds.length > 1 ? "mixed" : "dimension";
        var dimensionPolicy = _slotComposition.resolveDimensionPolicy(slotPolicy, slotName, dimAffects);
        if (dimensionPolicy) {
          columnIds = _slotComposition.applyDimensionComposition(columnIds, dimensionPolicy);
        }
      }
    }
    if (isPieVis && slotName === dimensionOnlySlot && dim && dim.entry.itemId) {
      columnIds = [String(dim.entry.itemId)];
      source = "dimension";
    }
    var hierarchyId = hierarchyItemId(context);
    if (hierarchyId && shouldInjectHierarchyIntoSlot(context)) {
      var hierarchyPolicy = _slotComposition.resolveHierarchyPolicy(slotPolicy, slotName);
      if (hierarchyPolicy) {
        columnIds = _slotComposition.insertHierarchyId(columnIds, hierarchyId, hierarchyPolicy, selectedDimensionId);
        source = _config.slotRule(slotName).hierarchyMakesSourceMixed ? "mixed" : (source === "default" ? "hierarchy" : "mixed");
      } else if (!isPieVis && (dimAffects === slotName || !dimAffects || dimAffects === "default")) {
        if (columnIds.indexOf(hierarchyId) < 0) {
          columnIds.push(hierarchyId);
        }
        source = source === "default" ? "hierarchy" : "mixed";
      }
    }
    if (slotName === "repeatHorizontal" && !columnIds.length && visTypeConfig.repeatHorizontal != null) {
      columnIds = _slotComposition.defaultsForSlot(slotName, visTypeConfig.repeatHorizontal, dataConfig);
    }
    return { ok: true, columnIds: columnIds, options: buildSlotResolveOptions(source, selectedDimensionId, dim && dim.key) };
  }

  return resolveSlotColumnIds;
});
