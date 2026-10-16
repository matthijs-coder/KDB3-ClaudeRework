define([
  "../bindingConfig.js",
  "../visTypes.js",
  "../state.js",
  "../../../../core/services/widgetBindingPlan/defaults/normalizeDefaultValue.js",
  "./applyGrainOverlayOnClone.js"
], function (_bindingConfig, _visTypes, _state, _normalizeDefaultValue, _applyGrainOverlayOnClone) {
  "use strict";

  function mapReason(_input) {
    var input = _input || {};
    return input.reason || input.changeReason || "contentCreate";
  }

  function mapSettings(_input) {
    var settings = (_input && _input.settings) || {};
    return {
      dimension: settings.dimension != null ? settings.dimension : null,
      visType: settings.visType != null ? settings.visType : null,
      topNChoice: settings.topNChoice != null
        ? settings.topNChoice
        : settings.topN != null
          ? settings.topN
          : null
    };
  }

  function mapHelperTableResult(_input) {
    var input = _input || {};
    if (input.helperTableResult) {
      return input.helperTableResult;
    }
    var topNResult = input.topNResult;
    if (!topNResult) {
      return null;
    }
    return {
      ok: topNResult.ok !== false,
      applied: topNResult.applied === true,
      topNResultValues: topNResult.topNResultValues || topNResult.resultValues || null,
      topNExcludeItemId: topNResult.topNExcludeItemId != null
        ? topNResult.topNExcludeItemId
        : topNResult.excludeItemId != null
          ? topNResult.excludeItemId
          : null,
      error: topNResult.error || topNResult.errorMessage || null
    };
  }

  function mapEmptyIntent(_input, _emptyDataFilter) {
    var input = _input || {};
    var emptyIntent = input.emptyIntent || { enabled: false, reason: null, itemId: null, value: null };
    if (input.forceEmpty === true) {
      return {
        enabled: true,
        reason: input.emptyReason || input.reason || null,
        itemId: _emptyDataFilter && _emptyDataFilter.itemId ? _emptyDataFilter.itemId : null,
        value: "1"
      };
    }
    return emptyIntent;
  }

  function mapResetIntent(_input) {
    var input = _input || {};
    var resetIntent = input.resetIntent || {
      enabled: false,
      scope: null,
      clearAllSlots: false,
      clearAllLocalFilters: false,
      reason: null
    };
    return resetIntent;
  }

  function buildBindingSpec(_KDB, _input) {
    var input = _input || {};
    var metric = _state.normalizeMetricIdentity(
      Object.assign({}, input.dataIdentity || {}, input.metric || {})
    );
    var settings = mapSettings(input);
    var metricsTable = metric.metricsTable || _bindingConfig.resolveCurrentMetricsDataSource(_KDB);
    var visualizationType = settings.visType || _visTypes.resolveDefaultVisualizationType(_KDB);
    var bindingContext = _bindingConfig.resolveBindingContext(_KDB, {
      kennzahlCode: metric.code,
      kennzahlenTable: metricsTable,
      visualizationType: visualizationType,
      datasourceHints: {
        datasourceId: (input.dataIdentity && input.dataIdentity.datasourceId) || null,
        datasourceName: (input.dataIdentity && input.dataIdentity.datasourceName) || null
      }
    });
    var planSnapshots = bindingContext.planSnapshots;
    var visTypeConfig = bindingContext.visTypeConfig;
    var dataTableConfig = bindingContext.dataTableConfig;
    var datasourceIdentity = bindingContext.datasourceIdentity;
    var filterPropObj = _state.cloneState(planSnapshots.filterPropObj);
    var hierarchySnap = input.hierarchySnapshot || null;
    if (hierarchySnap && hierarchySnap.hierarchyItemId && hierarchySnap.activeDownstreamName) {
      filterPropObj[hierarchySnap.activeDownstreamName] = Object.assign(
        {},
        filterPropObj[hierarchySnap.activeDownstreamName] || {},
        { itemId: String(hierarchySnap.hierarchyItemId) }
      );
    }

    var helperTableResult = _state.cloneState(mapHelperTableResult(input));
    var visTypeClone = _state.cloneState(visTypeConfig || {});
    var grouping = input.settings && input.settings.grouping;
    var overlay = _visTypes.resolveGrainOverlay(visualizationType, _visTypes.resolveEffectiveGrain(visualizationType, grouping, _KDB), _KDB);
    if (overlay) { _applyGrainOverlayOnClone(visTypeClone, overlay, planSnapshots.parameterMappingObj); }
    var spec = {
      reason: mapReason(input),
      targetKind: "vis",
      widgetId: input.widgetId || null,
      ownerWidgetId: null,
      opSeq: input.opSeq || null,
      dataConfig: {
        kennzahlCode: metric.code || "",
        kennzahlDisplay: metric.display || null,
        kennzahlenTable: metricsTable,
        datasourceName: datasourceIdentity.datasourceName,
        datasourceId: datasourceIdentity.datasourceId,
        visualizationType: bindingContext.normalizedVisualizationType,
        cognosVisualizationTypeId: bindingContext.cognosVisualizationTypeId,
        visPropBucketKey: bindingContext.visPropBucketKey,
        visTypeConfig: visTypeClone,
        dataTableConfig: _state.cloneState(dataTableConfig || { dimensions: {}, sorting: {} }),
        kennzahlDefaults: _state.cloneState(bindingContext.kennzahlDefaults || {}),
        dimension: _normalizeDefaultValue(settings.dimension),
        topN: _normalizeDefaultValue(settings.dimension) == null ? null : _normalizeDefaultValue(settings.topNChoice),
        hierarchyTarget: input.hierarchyTarget || null
      },
      hierarchySnapshot: _state.cloneState(input.hierarchySnapshot || null),
      helperTableResult: helperTableResult,
      emptyIntent: mapEmptyIntent(input, planSnapshots.emptyDataFilter),
      resetIntent: _state.cloneState(mapResetIntent(input)),
      config: {
        filterPropObj: filterPropObj,
        parameterMappingObj: _state.cloneState(planSnapshots.parameterMappingObj),
        topNOptions: _state.cloneState(planSnapshots.topNOptions),
        emptyDataFilter: _state.cloneState(planSnapshots.emptyDataFilter)
      }
    };
    if (grouping === "stichtag" || grouping === "jahr" || grouping === "jahrStichtag" || grouping === "stichtagProJahrH" || grouping === "stichtagProJahrV") { spec.dataConfig.grouping = grouping; }
    return spec;
  }

  return buildBindingSpec;
});
