define([
  "../diagnostics.js",
  "../applyOptions.js",
], function (_diagnostics, _applyOptions) {
  "use strict";

  // Steps run by applyBindingPlan.js: each takes the apply context and returns a step outcome (diagnostics.js).

  async function readCurrentVisType(_ctx) {
    var mapped = _diagnostics.mapFacetOutcome(await _ctx.visualization.getVisType(_ctx.widgetId));
    var failure = _diagnostics.facetStepFailure(mapped, "WIDGET_BINDING_APPLY_GET_VIS_TYPE_FAILED", "WIDGET_BINDING_APPLY_GET_VIS_TYPE_FAILED");
    if (failure) {
      return failure;
    }
    _ctx.currentVisType = mapped.data;
    _ctx.diagnostics.diagnostics.cognos.currentVisType = mapped.data != null ? mapped.data : null;
    return _diagnostics.COMPLETED;
  }

  async function setDatasourceInitial(_ctx) {
    var datasourceId = _ctx.plan.datasource.id;
    var mapped = _diagnostics.mapFacetOutcome(
      await _ctx.visualization.setDataSource(_ctx.widgetId, datasourceId, { signal: _ctx.signal })
    );
    var failure = _diagnostics.facetStepFailure(mapped, "WIDGET_BINDING_APPLY_SET_DATASOURCE_FAILED", "WIDGET_BINDING_APPLY_SET_DATASOURCE_FAILED");
    if (failure) {
      return failure;
    }
    _ctx.diagnostics.diagnostics.cognos.datasourceId = datasourceId;
    return _diagnostics.COMPLETED;
  }

  async function setVisType(_ctx) {
    var desiredVisType = _applyOptions.resolveDesiredVisType(_ctx.plan);
    _ctx.diagnostics.diagnostics.cognos.desiredVisType = desiredVisType || null;
    if (desiredVisType === _ctx.currentVisType) {
      return _diagnostics.COMPLETED;
    }
    var mapped = _diagnostics.mapFacetOutcome(
      await _ctx.visualization.setVisType(_ctx.widgetId, desiredVisType, { signal: _ctx.signal })
    );
    return _diagnostics.facetStepFailure(mapped, "WIDGET_BINDING_APPLY_SET_VIS_TYPE_FAILED", "setVisType failed.") ||
      _diagnostics.COMPLETED;
  }

  async function clearSlotsAndFilters(_ctx) {
    var mapped = _diagnostics.mapFacetOutcome(await _ctx.visualization.clearAllSlots(_ctx.widgetId, { signal: _ctx.signal }));
    var failure = _diagnostics.facetStepFailure(mapped, "WIDGET_BINDING_APPLY_CLEAR_FAILED", "clearAllSlots failed.");
    if (failure) {
      return failure;
    }
    if (_ctx.signal && _ctx.signal.aborted) {
      return _diagnostics.ABORTED;
    }
    mapped = _diagnostics.mapFacetOutcome(await _ctx.visualization.clearAllLocalFilters(_ctx.widgetId, { signal: _ctx.signal }));
    return _diagnostics.facetStepFailure(mapped, "WIDGET_BINDING_APPLY_CLEAR_FAILED", "clearAllLocalFilters failed.") ||
      _diagnostics.COMPLETED;
  }

  function clearSlotsAndFiltersIfNeeded(_ctx) {
    return _applyOptions.shouldClearSlots(_ctx.plan) ? clearSlotsAndFilters(_ctx) : _diagnostics.SKIPPED;
  }

  async function setDatasourceAfterClear(_ctx) {
    if (!_applyOptions.shouldClearSlots(_ctx.plan)) {
      return _diagnostics.SKIPPED;
    }
    var mapped = _diagnostics.mapFacetOutcome(
      await _ctx.visualization.setDataSource(_ctx.widgetId, _ctx.plan.datasource.id, { signal: _ctx.signal })
    );
    return _diagnostics.facetStepFailure(mapped, "WIDGET_BINDING_APPLY_SET_DATASOURCE_FAILED", "setVizDataSource failed.") ||
      _diagnostics.COMPLETED;
  }

  return {
    readCurrentVisType: readCurrentVisType,
    setDatasourceInitial: setDatasourceInitial,
    setVisType: setVisType,
    clearSlotsAndFilters: clearSlotsAndFilters,
    clearSlotsAndFiltersIfNeeded: clearSlotsAndFiltersIfNeeded,
    setDatasourceAfterClear: setDatasourceAfterClear,
  };
});
