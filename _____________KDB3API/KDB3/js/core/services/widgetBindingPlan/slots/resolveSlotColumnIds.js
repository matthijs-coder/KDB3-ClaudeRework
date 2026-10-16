define([
  "../filters/matchFilterPropEntry.js",
  "../sourceTokens/rewriteUniqueNameSourceToken.js",
  "../defaults/normalizeDefaultValue.js",
  "./applySlotComposition.js",
  "./resolveSlotDefaults.js",
], function (_matchFilterPropEntry, _rewriteUniqueNameSourceToken, _normalizeDefaultValue, _applySlotComposition, _resolveSlotDefaults) {
  "use strict";

  var PIE = { pie: 1, donut: 1, doughnut: 1, treemap: 1 };

  function shouldInjectHierarchyIntoSlot(_context) {
    return _context.targetKind !== "topNHelper";
  }

  function hierarchyItemId(_context) {
    var snap = _context.hierarchySnapshot;
    if (!snap || !snap.resolution || snap.resolution.hasConfirmedSelection !== true) {
      return null;
    }
    var matched = _matchFilterPropEntry(_context.filterPropObj, snap.activeDownstreamName, _context.dataConfig);
    if (!matched || !matched.entry || !matched.entry.itemId) {
      return null;
    }
    var target = _context.dataConfig.datasourceName || _context.dataConfig.datasourceId || _context.dataConfig.kennzahlenTable || "";
    return _rewriteUniqueNameSourceToken(String(matched.entry.itemId), matched.sourceKey, target);
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

  function __controller(_context) {
    var context = _context || {};
    var slotName = context.slotName;
    var dataConfig = context.dataConfig || {};
    var visTypeConfig = dataConfig.visTypeConfig || {};
    var columnIds = _resolveSlotDefaults.defaultsForSlot(slotName, visTypeConfig[slotName], dataConfig);
    var dimAffects = _normalizeDefaultValue(visTypeConfig.dimensionSelectionAffects);
    var slotPolicy = _applySlotComposition.slotCompositionPolicy(visTypeConfig, slotName);
    var dim = _resolveSlotDefaults.dimensionEntry(dataConfig);
    var dimKey = _normalizeDefaultValue(dataConfig.dimension);
    var selectedDimensionId = null;
    var source = "default";
    var visTypeKey = (dataConfig.visualizationType || "").toLowerCase();
    var isPieVis = !!PIE[visTypeKey];

    if (catalogDimensionMissing(dim, dimKey, dimAffects, slotName)) {
      return { ok: false, errorCode: "WIDGET_BINDING_PLAN_SLOT_MISSING_DIM_ITEM", legacyError: "missingSelectedDimensionItemId" };
    }
    if (dim) {
      if (!dimAffects) {
        return { ok: false, errorCode: "WIDGET_BINDING_PLAN_SLOT_MISSING_DIM_AFFECTS", legacyError: "missingDimensionSelectionAffects" };
      }
      if (dimAffects === slotName || (dimAffects === "series" && slotName === "series")) {
        if (!dim.entry.itemId) {
          return { ok: false, errorCode: "WIDGET_BINDING_PLAN_SLOT_MISSING_DIM_ITEM", legacyError: "missingSelectedDimensionItemId" };
        }
        selectedDimensionId = String(dim.entry.itemId);
        columnIds = _applySlotComposition.prependUniqueId(selectedDimensionId, columnIds);
        source = columnIds.length > 1 ? "mixed" : "dimension";
        var dimensionPolicy = _applySlotComposition.resolveDimensionPolicy(slotPolicy, slotName, dimAffects);
        if (dimensionPolicy) {
          columnIds = _applySlotComposition.applyDimensionComposition(columnIds, dimensionPolicy);
        }
      }
    }
    if (isPieVis && slotName === "categories" && dim && dim.entry.itemId) {
      columnIds = [String(dim.entry.itemId)];
      source = "dimension";
    }
    var hierarchyId = hierarchyItemId(context);
    if (hierarchyId && shouldInjectHierarchyIntoSlot(context)) {
      var hierarchyPolicy = _applySlotComposition.resolveHierarchyPolicy(slotPolicy, slotName);
      if (hierarchyPolicy) {
        columnIds = _applySlotComposition.insertHierarchyId(columnIds, hierarchyId, hierarchyPolicy, selectedDimensionId);
        source = slotName === "grid_cols" ? "mixed" : (source === "default" ? "hierarchy" : "mixed");
      } else if (!isPieVis && (dimAffects === slotName || !dimAffects || dimAffects === "default")) {
        if (columnIds.indexOf(hierarchyId) < 0) {
          columnIds.push(hierarchyId);
        }
        source = source === "default" ? "hierarchy" : "mixed";
      }
    }
    if (slotName === "repeatHorizontal" && !columnIds.length && visTypeConfig.repeatHorizontal != null) {
      columnIds = _resolveSlotDefaults.defaultsForSlot(slotName, visTypeConfig.repeatHorizontal, dataConfig);
    }
    return { ok: true, columnIds: columnIds, options: buildSlotResolveOptions(source, selectedDimensionId, dim && dim.key) };
  }

  return __controller;
});
