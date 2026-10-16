define([], function () {
  "use strict";

  function resolveEffectiveColumnIds(_slot) {
    var slot = _slot || {};
    var columnIds = Array.isArray(slot.columnIds) ? slot.columnIds.slice() : [];
    var slotOptions = slot.options && typeof slot.options === "object" ? slot.options : null;

    if (!slotOptions) {
      return { columnIds: columnIds, unsupported: null };
    }

    if (slotOptions.keepOnlyFirst === true) {
      return { columnIds: columnIds.length ? [columnIds[0]] : [], unsupported: null };
    }

    if (slotOptions.limit != null) {
      var limitNumber = Number(slotOptions.limit);
      if (!isFinite(limitNumber) || limitNumber < 0) {
        return { columnIds: columnIds, unsupported: "WIDGET_BINDING_APPLY_SLOT_OPTION_UNSUPPORTED" };
      }
      return { columnIds: columnIds.slice(0, Math.floor(limitNumber)), unsupported: null };
    }

    return { columnIds: columnIds, unsupported: null };
  }

  function resolveSortSpecs(_slot) {
    var slot = _slot || {};
    var specs = [];
    if (Array.isArray(slot.sortSpecs)) {
      slot.sortSpecs.forEach(function (spec, index) {
        var columnId = String(spec && spec.columnId != null ? spec.columnId : "").trim();
        if (!columnId) {
          return;
        }
        specs.push({
          columnId: columnId,
          order: spec.order != null ? spec.order : "ascending",
          priority: typeof spec.priority === "number" ? spec.priority : index + 1,
        });
      });
    }
    if (!specs.length && slot.sortByColumn) {
      specs.push({
        columnId: String(slot.sortByColumn).trim(),
        order: "ascending",
        priority: 1,
      });
    }
    return specs;
  }

  function resolveCustomLabel(_slot) {
    var slotOptions = _slot && _slot.options && typeof _slot.options === "object" ? _slot.options : null;
    var customLabel = slotOptions ? slotOptions.customLabel : null;
    var label;
    var columnId;
    if (!customLabel) {
      return { present: false };
    }
    label = customLabel.label;
    columnId = customLabel.columnId;
    if (typeof label !== "string" || label === "" || columnId == null || String(columnId) === "") {
      return { present: true, invalid: "WIDGET_BINDING_APPLY_SLOT_FAILED" };
    }
    return { present: true, columnId: String(columnId), label: label };
  }

  return {
    resolveEffectiveColumnIds: resolveEffectiveColumnIds,
    resolveSortSpecs: resolveSortSpecs,
    resolveCustomLabel: resolveCustomLabel,
  };
});
