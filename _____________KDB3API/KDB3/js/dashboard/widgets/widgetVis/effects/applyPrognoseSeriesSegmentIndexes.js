define([
  "./applyPropertyMap.js",
  "../runtime.js",
  "../visTypes.js"
], function (_applyPropertyMap, _visRuntime, _visTypes) {
  "use strict";

  var JAHR_COLUMN_ID = "[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]";
  var STICHTAG_COLUMN_ID = "[Personal_KDB_TM1].[Stichtag].[Stichtag].[Stichtag]";
  var YEAR_SEGMENT_KEY = "series.year.segmentIndex";
  var PROGNOSE_SEGMENT_KEY = "series.prognose.segmentIndex";

  function isAbortedSignal(_signal) {
    return !!(_signal && _signal.aborted === true);
  }

  function resolvePlanVisType(_plan, _settings) {
    return (_plan && _plan.visualization && _plan.visualization.visType) || (_settings && _settings.visType) || null;
  }

  function isPrognosePlan(_plan, _settings) {
    return _visTypes.normalizeVisualizationType(resolvePlanVisType(_plan, _settings)) === "Prognose";
  }

  function readSeriesColumnIds(_plan) {
    try {
      var slots = _plan && Array.isArray(_plan.slots) ? _plan.slots : [];
      var index;
      var slot;
      for (index = 0; index < slots.length; index += 1) {
        slot = slots[index];
        if (slot && slot.slotName === "series") {
          return Array.isArray(slot.columnIds) ? slot.columnIds : [];
        }
      }
      return [];
    } catch (err) {
      console.error("[widgetVis.readSeriesColumnIds] failed", err);
      throw err;
    }
  }

  function buildSegmentIndexMap(_columnIds) {
    try {
      var columnIds = Array.isArray(_columnIds) ? _columnIds : [];
      var yearIndex = Array.prototype.indexOf.call(columnIds, JAHR_COLUMN_ID);
      var prognoseIndex = Array.prototype.indexOf.call(columnIds, STICHTAG_COLUMN_ID);
      var propertyMap = {};
      if (yearIndex >= 0) {
        propertyMap[YEAR_SEGMENT_KEY] = yearIndex;
      }
      if (prognoseIndex >= 0) {
        propertyMap[PROGNOSE_SEGMENT_KEY] = prognoseIndex;
      }
      return propertyMap;
    } catch (err) {
      console.error("[widgetVis.buildSegmentIndexMap] failed", err);
      throw err;
    }
  }

  async function applyPrognoseSeriesSegmentIndexes(_KDB, _plan, _widgetId, _signal, _settings) {
    try {
      var facet;
      var propertyMap;
      var diagnostics;
      var mapResult;
      if (!_widgetId || isAbortedSignal(_signal) || !isPrognosePlan(_plan, _settings)) {
        return { ok: true, skipped: true };
      }
      propertyMap = buildSegmentIndexMap(readSeriesColumnIds(_plan));
      if (!Object.keys(propertyMap).length) {
        return { ok: true, skipped: true };
      }
      facet = _visRuntime.readHostFacet(_KDB, "visualizationFacet");
      if (!facet || typeof facet.setContentProperty !== "function") {
        console.error("[widgetVis.applyPrognoseSeriesSegmentIndexes] visualizationFacet missing", _widgetId);
        return { ok: true, skipped: true };
      }
      diagnostics = { appliedKeys: [], failed: [] };
      mapResult = await _applyPropertyMap(
        facet.setContentProperty.bind(facet),
        _widgetId,
        propertyMap,
        diagnostics,
        "segmentIndex",
        _signal
      );
      if (isAbortedSignal(_signal)) {
        return { ok: true, skipped: true, aborted: true };
      }
      return mapResult;
    } catch (err) {
      if (err && err.name === "AbortError") {
        return { ok: true, skipped: true, aborted: true };
      }
      console.error("[widgetVis.applyPrognoseSeriesSegmentIndexes] failed", _widgetId, err);
      return { ok: true, skipped: true };
    }
  }

  return applyPrognoseSeriesSegmentIndexes;
});
