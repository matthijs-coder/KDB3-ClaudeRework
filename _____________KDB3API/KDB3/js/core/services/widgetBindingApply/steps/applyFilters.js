define([
  "../diagnostics.js",
  "../filterBody/buildFilterBody.js",
  "../filterBody/keepexcludeConditions.js",
], function (_diagnostics, _buildFilterBody, _buildKeepexcludeConditionsFilterObj) {
  "use strict";

  function isAborted(_signal) {
    return !!(_signal && _signal.aborted);
  }

  // Removes the filters this binding applied last time; topN helpers do not track managed filters.
  async function removeManagedFilters(_ctx) {
    var previousIds = Array.isArray(_ctx.options.previousManagedFilterItemIds) ? _ctx.options.previousManagedFilterItemIds : [];
    if (_ctx.plan.targetKind === "topNHelper" || !previousIds.length) {
      return _diagnostics.SKIPPED;
    }
    for (var index = 0; index < previousIds.length; index += 1) {
      if (isAborted(_ctx.signal)) {
        return _diagnostics.ABORTED;
      }
      var mapped = _diagnostics.mapFacetOutcome(await _ctx.visualization.removeLocalFilter(
        _ctx.widgetId, { itemId: String(previousIds[index]) }, { signal: _ctx.signal }
      ));
      var failure = _diagnostics.facetStepFailure(mapped, "WIDGET_BINDING_APPLY_REMOVE_FILTER_FAILED", "removeLocalFilter failed.");
      if (failure) {
        return failure;
      }
    }
    return _diagnostics.COMPLETED;
  }

  function localFilterOptions(_descriptor) {
    var options = _descriptor && _descriptor.options;
    if (options && options.skipDisplayType === true) {
      return { skipDisplayType: true };
    }
    return undefined;
  }

  async function applyLocalFilter(_ctx, _descriptor) {
    var built = _buildFilterBody(_descriptor, _buildKeepexcludeConditionsFilterObj);
    if (!built.ok) {
      return _diagnostics.failed(built.errorCode, built.errorMessage);
    }
    if (built.warning) {
      _ctx.diagnostics.addWarning(built.warning.code, built.warning.message, "applyLocalFilters");
    }
    if (!built.body) {
      return null;
    }
    var itemId = String(_descriptor.itemId || "");
    var mapped = _diagnostics.mapFacetOutcome(await _ctx.visualization.addOrReplaceLocalFilter(
      _ctx.widgetId, itemId, built.body, localFilterOptions(_descriptor), { signal: _ctx.signal }
    ));
    var failure = _diagnostics.facetStepFailure(
      mapped, "WIDGET_BINDING_APPLY_LOCAL_FILTER_FAILED", "addOrReplaceLocalFilter failed for item " + itemId
    );
    if (failure) {
      return failure;
    }
    _ctx.appliedFilterCount += 1;
    return isAborted(_ctx.signal) ? _diagnostics.ABORTED : null;
  }

  async function applyLocalFilters(_ctx) {
    if (typeof _ctx.visualization.addOrReplaceLocalFilter !== "function") {
      return _diagnostics.failed("WIDGET_BINDING_APPLY_COGNOS_SURFACE_MISSING", "addOrReplaceLocalFilter is unavailable.");
    }
    var descriptors = Array.isArray(_ctx.plan.localFilters) ? _ctx.plan.localFilters : [];
    _ctx.appliedFilterCount = 0;
    for (var index = 0; index < descriptors.length; index += 1) {
      if (isAborted(_ctx.signal)) {
        return _diagnostics.ABORTED;
      }
      var failure = await applyLocalFilter(_ctx, descriptors[index]);
      if (failure) {
        return failure;
      }
    }
    _ctx.diagnostics.diagnostics.cognos.appliedFilterCount = _ctx.appliedFilterCount;
    return _diagnostics.COMPLETED;
  }

  return {
    removeManagedFilters: removeManagedFilters,
    applyLocalFilters: applyLocalFilters,
  };
});
