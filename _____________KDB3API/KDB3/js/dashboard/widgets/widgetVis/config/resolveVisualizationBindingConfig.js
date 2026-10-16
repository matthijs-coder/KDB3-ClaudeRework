define([
  "./defaults.js",
  "./visTypes/normalizeVisualizationType.js",
  "./visTypes/resolveMetricsDataSource.js",
  "./visTypes/resolveVisTypeIdentity.js",
  "./visTypes/resolveDataTableConfig.js",
  "./visTypes/resolveVisualizationDefinitions.js",
  "./visTypes/resolvePlanConfig.js",
  "./visTypes/resolveBindingContext.js",
  "./visTypes/resolveTopNHelperListConfig.js"
], function (
  _defaults,
  _normalizeVisualizationType,
  _resolveMetricsDataSource,
  _resolveVisTypeIdentity,
  _resolveDataTableConfig,
  _resolveVisualizationDefinitions,
  _resolvePlanConfig,
  _resolveBindingContext,
  _resolveTopNHelperListConfig
) {
  "use strict";

  return {
    resolveCurrentMetricsDataSource: _resolveMetricsDataSource,
    normalizeVisualizationType: _normalizeVisualizationType,
    resolveVisPropBucketKey: _resolveVisTypeIdentity.resolveVisPropBucketKey,
    resolveCognosVisualizationTypeId: _resolveVisTypeIdentity.resolveCognosVisualizationTypeId,
    resolveVisTypeConfig: _resolveVisTypeIdentity.resolveVisTypeConfig,
    resolveDefaultGrain: _resolveVisTypeIdentity.resolveDefaultGrain,
    resolveGrainOverlay: _resolveVisTypeIdentity.resolveGrainOverlay,
    resolveEffectiveGrain: _resolveVisTypeIdentity.resolveEffectiveGrain,
    resolveKennzahlPack: _resolveVisTypeIdentity.resolveKennzahlPack,
    resolveVisualizationDimensions: _resolveDataTableConfig.resolveVisualizationDimensions,
    resolveDataTableConfig: _resolveDataTableConfig.resolveDataTableConfig,
    resolveKennzahlDefaults: _resolveVisualizationDefinitions.resolveKennzahlDefaults,
    buildKennzahlAggregationFilter: _resolveVisualizationDefinitions.buildKennzahlAggregationFilter,
    resolvePlanConfigSnapshots: _resolvePlanConfig.resolvePlanConfigSnapshots,
    resolveDatasourceIdentity: _resolvePlanConfig.resolveDatasourceIdentity,
    resolveBindingContext: _resolveBindingContext,
    resolveEmptyDataFilter: _resolvePlanConfig.resolveEmptyDataFilter,
    resolveDefaultVisualizationType: _resolveVisualizationDefinitions.resolveDefaultVisualizationType,
    resolveVisualizationDefinition: _resolveVisualizationDefinitions.resolveVisualizationDefinition,
    resolveVisualizationPropertyValues: _resolveVisualizationDefinitions.resolveVisualizationPropertyValues,
    resolveVisualizationLayoutPropertyValues: _resolveVisualizationDefinitions.resolveVisualizationLayoutPropertyValues,
    resolveTopNHelperListConfig: _resolveTopNHelperListConfig,
    applyTimeoutProfile: _defaults.applyTimeoutProfile
  };
});
