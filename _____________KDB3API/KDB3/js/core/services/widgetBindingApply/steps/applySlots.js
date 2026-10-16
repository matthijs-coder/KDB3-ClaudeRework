define([
  "../diagnostics.js",
  "../applyOptions.js",
], function (_diagnostics, _applyOptions) {
  "use strict";

  function surfaceMissing(_method) {
    return _diagnostics.failed("WIDGET_BINDING_APPLY_COGNOS_SURFACE_MISSING", _method + " is unavailable.");
  }

  function isAborted(_signal) {
    return !!(_signal && _signal.aborted);
  }

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
      specs.push({ columnId: String(slot.sortByColumn).trim(), order: "ascending", priority: 1 });
    }
    return specs;
  }

  function resolveCustomLabel(_slot) {
    var slotOptions = _slot && _slot.options && typeof _slot.options === "object" ? _slot.options : null;
    var customLabel = slotOptions ? slotOptions.customLabel : null;
    if (!customLabel) {
      return { present: false };
    }
    var label = customLabel.label;
    var columnId = customLabel.columnId;
    if (typeof label !== "string" || label === "" || columnId == null || String(columnId) === "") {
      return { present: true, invalid: "WIDGET_BINDING_APPLY_SLOT_FAILED" };
    }
    return { present: true, columnId: String(columnId), label: label };
  }

  // A failed facet call reports the facet's own code and message (no step default).
  function facetFailure(_mapped) {
    return _mapped.aborted ? _diagnostics.ABORTED : _diagnostics.failed(_mapped.errorCode, _mapped.errorMessage);
  }

  async function applyCustomLabel(_ctx, _slot, _customLabel) {
    var facet = _ctx.visualization;
    if (_customLabel.invalid) {
      return _diagnostics.failed(_customLabel.invalid, "customLabel is invalid for slot " + String(_slot.slotName));
    }
    if (typeof facet.setCustomLabelInSlot !== "function") {
      return surfaceMissing("setCustomLabelInSlot");
    }
    var mapped = _diagnostics.mapFacetOutcome(await facet.setCustomLabelInSlot(
      _ctx.widgetId, String(_slot.slotName || ""), _customLabel.columnId, _customLabel.label, { signal: _ctx.signal }
    ));
    return mapped.ok ? null : facetFailure(mapped);
  }

  async function applySortSpecs(_ctx, _slotName, _sortSpecs) {
    var facet = _ctx.visualization;
    if (_sortSpecs.length && typeof facet.sortDataItemInSlot !== "function") {
      return surfaceMissing("sortDataItemInSlot");
    }
    for (var index = 0; index < _sortSpecs.length; index += 1) {
      if (isAborted(_ctx.signal)) {
        return _diagnostics.ABORTED;
      }
      var spec = _sortSpecs[index];
      var mapped = _diagnostics.mapFacetOutcome(await facet.sortDataItemInSlot(
        _ctx.widgetId, _slotName, spec.columnId, spec.order, { signal: _ctx.signal, priority: spec.priority }
      ));
      if (!mapped.ok) {
        return facetFailure(mapped);
      }
    }
    return null;
  }

  async function applySlot(_ctx, _slot) {
    var resolved = resolveEffectiveColumnIds(_slot);
    if (resolved.unsupported) {
      return _diagnostics.failed(resolved.unsupported, "Slot option cannot be enforced for slot " + String(_slot && _slot.slotName));
    }
    var sortSpecs = resolveSortSpecs(_slot);
    if (!resolved.columnIds.length) {
      return null;
    }
    var slotName = String(_slot.slotName || "");
    var mapped = _diagnostics.mapFacetOutcome(
      await _ctx.visualization.addDataItemsToSlot(_ctx.widgetId, slotName, resolved.columnIds, { signal: _ctx.signal })
    );
    if (!mapped.ok) {
      return facetFailure(mapped);
    }
    _ctx.appliedSlotCount += 1;
    if (isAborted(_ctx.signal)) {
      return _diagnostics.ABORTED;
    }
    var customLabel = resolveCustomLabel(_slot);
    var failure = customLabel.present ? await applyCustomLabel(_ctx, _slot, customLabel) : null;
    return failure || applySortSpecs(_ctx, slotName, sortSpecs);
  }

  async function applySlots(_ctx) {
    var cognos = _ctx.diagnostics.diagnostics.cognos;
    if (!_applyOptions.shouldClearSlots(_ctx.plan)) {
      _ctx.diagnostics.addWarning(
        "WIDGET_BINDING_APPLY_SLOTS_UNCHANGED",
        "Skipped applySlots because slotsChanged is false and no slot clear/reset is requested.",
        "applySlots"
      );
      cognos.appliedSlotCount = 0;
      return _diagnostics.SKIPPED;
    }
    if (typeof _ctx.visualization.addDataItemsToSlot !== "function") {
      return surfaceMissing("addDataItemsToSlot");
    }
    var slots = Array.isArray(_ctx.plan.slots) ? _ctx.plan.slots : [];
    _ctx.appliedSlotCount = 0;
    for (var index = 0; index < slots.length; index += 1) {
      if (isAborted(_ctx.signal)) {
        return _diagnostics.ABORTED;
      }
      var failure = await applySlot(_ctx, slots[index]);
      if (failure) {
        return failure;
      }
    }
    cognos.appliedSlotCount = _ctx.appliedSlotCount;
    return _diagnostics.COMPLETED;
  }

  return applySlots;
});
