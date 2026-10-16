define([
  "./bindingApplyStepHelpers.js"
], function (_bindingApplyStepHelpers) {
  "use strict";

  function collectTopBottomSpecs(_plan) {
    var slots = Array.isArray(_plan && _plan.slots) ? _plan.slots : [];
    var specs = [];
    var index;
    var slot;
    var topBottom;

    for (index = 0; index < slots.length; index += 1) {
      slot = slots[index] || {};
      topBottom = slot.options && slot.options.topBottom;
      if (topBottom) {
        specs.push({
          slotName: String(slot.slotName || ""),
          topBottom: topBottom
        });
      }
    }
    return specs;
  }

  async function __controller(_target, _plan, _diagnostics, _signal, _cognosBinding) {
    var targetKind = _plan && _plan.targetKind;
    var widgetId = _target && _target.widgetId;
    var specs;
    var index;
    var mapped;

    if (targetKind !== "topNHelper") {
      return { ok: true, skipped: true, appliedTopBottomCount: 0 };
    }

    specs = collectTopBottomSpecs(_plan);
    if (!specs.length) {
      return { ok: true, skipped: true, appliedTopBottomCount: 0 };
    }

    if (!_cognosBinding || typeof _cognosBinding.setTopBottomOnSlot !== "function") {
      return {
        ok: false,
        errorCode: "WIDGET_BINDING_APPLY_TOPBOTTOM_UNAVAILABLE",
        errorMessage: "setTopBottomOnSlot is unavailable."
      };
    }

    try {
      for (index = 0; index < specs.length; index += 1) {
        if (_signal && _signal.aborted) {
          return { ok: false, aborted: true };
        }
        mapped = _bindingApplyStepHelpers.mapFacetOutcome(
          await Promise.resolve(
            _cognosBinding.setTopBottomOnSlot(
              widgetId,
              specs[index].slotName,
              specs[index].topBottom,
              { signal: _signal }
            )
          )
        );
        if (mapped.aborted) {
          return { ok: false, aborted: true };
        }
        if (!mapped.ok) {
          return {
            ok: false,
            errorCode: mapped.errorCode || "WIDGET_BINDING_APPLY_TOPBOTTOM_FAILED",
            errorMessage: mapped.errorMessage
          };
        }
      }
      if (_diagnostics && _diagnostics.diagnostics && _diagnostics.diagnostics.cognos) {
        _diagnostics.diagnostics.cognos.appliedTopBottomCount = specs.length;
        _diagnostics.diagnostics.cognos.topBottom = specs.map(function (spec) {
          return {
            slotName: spec.slotName,
            value: spec.topBottom && spec.topBottom.value,
            valueItemId: spec.topBottom && spec.topBottom.valueItemId || null
          };
        });
      }
      return { ok: true, skipped: false, appliedTopBottomCount: specs.length };
    } catch (err) {
      console.error("[widgetBindingApply.applyTopBottom] failed", { widgetId: widgetId }, err);
      return {
        ok: false,
        errorCode: "WIDGET_BINDING_APPLY_TOPBOTTOM_FAILED",
        errorMessage: String(err && err.message ? err.message : err)
      };
    }
  }

  return __controller;
});
