define([
  "../filterBody/buildFilterBody.js",
  "../filterBody/keepexcludeConditions.js",
  "./bindingApplyStepHelpers.js",
], function (_buildFilterBody, _buildKeepexcludeConditionsFilterObj, _bindingApplyStepHelpers) {
  "use strict";

  function localFilterOptions(_descriptor) {
    var options = _descriptor && _descriptor.options;
    if (options && options.skipDisplayType === true) {
      return { skipDisplayType: true };
    }
    return undefined;
  }

  async function __controller(_target, _filterDescriptors, _diagnostics, _signal, _cognosBinding) {
    try {
      var descriptors = Array.isArray(_filterDescriptors) ? _filterDescriptors : [];
      var widgetId = _target && _target.widgetId;
      var appliedFilterCount = 0;
      var index;
      var descriptor;
      var built;
      var mapped;

      if (!_cognosBinding || typeof _cognosBinding.addOrReplaceLocalFilter !== "function") {
        return {
          ok: false,
          errorCode: "WIDGET_BINDING_APPLY_COGNOS_SURFACE_MISSING",
          errorMessage: "addOrReplaceLocalFilter is unavailable.",
        };
      }

      for (index = 0; index < descriptors.length; index += 1) {
        if (_signal && _signal.aborted) {
          return { ok: false, aborted: true };
        }

        descriptor = descriptors[index];
        built = _buildFilterBody(descriptor, _buildKeepexcludeConditionsFilterObj);
        if (!built.ok) {
          return built;
        }

        if (built.warning && _diagnostics && typeof _diagnostics.addWarning === "function") {
          _diagnostics.addWarning(built.warning.code, built.warning.message, "applyLocalFilters");
        }
        if (!built.body) {
          continue;
        }

        mapped = _bindingApplyStepHelpers.mapFacetOutcome(
          await Promise.resolve(
            _cognosBinding.addOrReplaceLocalFilter(
              widgetId,
              String(descriptor.itemId || ""),
              built.body,
              localFilterOptions(descriptor),
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
            errorCode: mapped.errorCode || "WIDGET_BINDING_APPLY_LOCAL_FILTER_FAILED",
            errorMessage: mapped.errorMessage || "addOrReplaceLocalFilter failed for item " + String(descriptor.itemId || ""),
          };
        }
        appliedFilterCount += 1;

        if (_signal && _signal.aborted) {
          return { ok: false, aborted: true };
        }
      }

      if (_diagnostics && _diagnostics.diagnostics && _diagnostics.diagnostics.cognos) {
        _diagnostics.diagnostics.cognos.appliedFilterCount = appliedFilterCount;
      }

      return { ok: true, appliedFilterCount: appliedFilterCount };
    } catch (err) {
      console.error("[widgetBindingApply.applyLocalFilters] failed", { widgetId: _target && _target.widgetId }, err);
      throw err;
    }
  }

  return __controller;
});
