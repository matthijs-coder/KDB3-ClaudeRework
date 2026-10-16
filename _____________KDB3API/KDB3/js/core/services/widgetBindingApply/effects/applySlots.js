define([
  "./slotApplyHelpers.js",
  "./bindingApplyStepHelpers.js",
], function (_slotApplyHelpers, _bindingApplyStepHelpers) {
  "use strict";

  async function __controller(_target, _slots, _diagnostics, _signal, _cognosBinding) {
    try {
      var slots = Array.isArray(_slots) ? _slots : [];
      var widgetId = _target && _target.widgetId;
      var appliedSlotCount = 0;
      var index;
      var slot;
      var resolved;
      var sortSpecs;
      var sortIndex;
      var mapped;
      var customLabel;

      if (!_cognosBinding || typeof _cognosBinding.addDataItemsToSlot !== "function") {
        return {
          ok: false,
          errorCode: "WIDGET_BINDING_APPLY_COGNOS_SURFACE_MISSING",
          errorMessage: "addDataItemsToSlot is unavailable.",
        };
      }

      for (index = 0; index < slots.length; index += 1) {
        if (_signal && _signal.aborted) {
          return { ok: false, aborted: true };
        }

        slot = slots[index];
        resolved = _slotApplyHelpers.resolveEffectiveColumnIds(slot);
        if (resolved.unsupported) {
          return {
            ok: false,
            errorCode: resolved.unsupported,
            errorMessage: "Slot option cannot be enforced for slot " + String(slot && slot.slotName),
          };
        }

        sortSpecs = _slotApplyHelpers.resolveSortSpecs(slot);

        if (!resolved.columnIds.length) {
          continue;
        }

        mapped = _bindingApplyStepHelpers.mapFacetOutcome(
          await Promise.resolve(
            _cognosBinding.addDataItemsToSlot(
              widgetId,
              String(slot.slotName || ""),
              resolved.columnIds,
              { signal: _signal }
            )
          )
        );
        if (mapped.aborted) {
          return { ok: false, aborted: true };
        }
        if (!mapped.ok) {
          return mapped;
        }
        appliedSlotCount += 1;

        if (_signal && _signal.aborted) {
          return { ok: false, aborted: true };
        }

        customLabel = _slotApplyHelpers.resolveCustomLabel(slot);
        if (customLabel.present) {
          if (customLabel.invalid) {
            return {
              ok: false,
              errorCode: customLabel.invalid,
              errorMessage: "customLabel is invalid for slot " + String(slot && slot.slotName),
            };
          }
          if (typeof _cognosBinding.setCustomLabelInSlot !== "function") {
            return {
              ok: false,
              errorCode: "WIDGET_BINDING_APPLY_COGNOS_SURFACE_MISSING",
              errorMessage: "setCustomLabelInSlot is unavailable.",
            };
          }
          mapped = _bindingApplyStepHelpers.mapFacetOutcome(await Promise.resolve(_cognosBinding.setCustomLabelInSlot(widgetId, String(slot.slotName || ""), customLabel.columnId, customLabel.label, { signal: _signal })));
          if (mapped.aborted) {
            return { ok: false, aborted: true };
          }
          if (!mapped.ok) {
            return mapped;
          }
        }

        if (sortSpecs.length && typeof _cognosBinding.sortDataItemInSlot !== "function") {
          return {
            ok: false,
            errorCode: "WIDGET_BINDING_APPLY_COGNOS_SURFACE_MISSING",
            errorMessage: "sortDataItemInSlot is unavailable.",
          };
        }

        for (sortIndex = 0; sortIndex < sortSpecs.length; sortIndex += 1) {
          if (_signal && _signal.aborted) {
            return { ok: false, aborted: true };
          }
          mapped = _bindingApplyStepHelpers.mapFacetOutcome(
            await Promise.resolve(
              _cognosBinding.sortDataItemInSlot(
                String(slot.slotName || ""),
                sortSpecs[sortIndex].columnId,
                sortSpecs[sortIndex].order,
                widgetId,
                sortSpecs[sortIndex].priority,
                { signal: _signal }
              )
            )
          );
          if (mapped.aborted) {
            return { ok: false, aborted: true };
          }
          if (!mapped.ok) {
            return mapped;
          }
        }
      }

      if (_diagnostics && _diagnostics.diagnostics && _diagnostics.diagnostics.cognos) {
        _diagnostics.diagnostics.cognos.appliedSlotCount = appliedSlotCount;
      }

      return { ok: true, appliedSlotCount: appliedSlotCount };
    } catch (err) {
      console.error("[widgetBindingApply.applySlots] failed", { widgetId: _target && _target.widgetId }, err);
      throw err;
    }
  }

  return __controller;
});
