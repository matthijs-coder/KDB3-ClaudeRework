define([
  "../diagnostics.js",
], function (_diagnostics) {
  "use strict";

  function collectTopBottomSpecs(_plan) {
    var slots = Array.isArray(_plan && _plan.slots) ? _plan.slots : [];
    var specs = [];
    for (var index = 0; index < slots.length; index += 1) {
      var slot = slots[index] || {};
      var topBottom = slot.options && slot.options.topBottom;
      if (topBottom) {
        specs.push({ slotName: String(slot.slotName || ""), topBottom: topBottom });
      }
    }
    return specs;
  }

  function writeTopBottomDiagnostics(_ctx, _specs) {
    var cognos = _ctx.diagnostics.diagnostics.cognos;
    cognos.appliedTopBottomCount = _specs.length;
    cognos.topBottom = _specs.map(function (spec) {
      return {
        slotName: spec.slotName,
        value: spec.topBottom && spec.topBottom.value,
        valueItemId: spec.topBottom && spec.topBottom.valueItemId || null,
      };
    });
  }

  // Top/bottom N is only set on the topN helper widget; other targets skip the step.
  async function applyTopBottom(_ctx) {
    var specs = _ctx.plan.targetKind === "topNHelper" ? collectTopBottomSpecs(_ctx.plan) : [];
    if (!specs.length) {
      return _diagnostics.SKIPPED;
    }
    if (typeof _ctx.visualization.setTopBottomOnSlot !== "function") {
      return _diagnostics.failed("WIDGET_BINDING_APPLY_TOPBOTTOM_UNAVAILABLE", "setTopBottomOnSlot is unavailable.");
    }
    for (var index = 0; index < specs.length; index += 1) {
      if (_ctx.signal && _ctx.signal.aborted) {
        return _diagnostics.ABORTED;
      }
      var mapped = _diagnostics.mapFacetOutcome(await _ctx.visualization.setTopBottomOnSlot(
        _ctx.widgetId, specs[index].slotName, specs[index].topBottom, { signal: _ctx.signal }
      ));
      if (mapped.aborted) {
        return _diagnostics.ABORTED;
      }
      if (!mapped.ok) {
        return _diagnostics.failed(mapped.errorCode || "WIDGET_BINDING_APPLY_TOPBOTTOM_FAILED", mapped.errorMessage);
      }
    }
    writeTopBottomDiagnostics(_ctx, specs);
    return _diagnostics.COMPLETED;
  }

  return applyTopBottom;
});
