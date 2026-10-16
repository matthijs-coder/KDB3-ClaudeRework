define([
  "./normalizeVisualizationType.js",
  "./resolveMetricsDataSource.js",
  "./resolveVisTypeIdentity.js",
  "./resolveDataTableConfig.js",
  "./resolveVisualizationDefinitions.js",
  "./resolvePlanConfig.js"
], function (
  _normalizeVisualizationType,
  _resolveMetricsDataSource,
  _resolveVisTypeIdentity,
  _resolveDataTableConfig,
  _resolveVisualizationDefinitions,
  _resolvePlanConfig
) {
  "use strict";

  function resolveBindingContext(_KDB, _options) {
    var options = _options || {};
    var metricsTable = options.kennzahlenTable || _resolveMetricsDataSource(_KDB);
    var visualizationType = options.visualizationType
      || _resolveVisualizationDefinitions.resolveDefaultVisualizationType(_KDB);
    var planSnapshots = _resolvePlanConfig.resolvePlanConfigSnapshots(_KDB);
    var dataTableConfig = _resolveDataTableConfig.resolveDataTableConfig(metricsTable, _KDB, visualizationType);
    var visTypeConfig = _resolveVisTypeIdentity.resolveVisTypeConfig(metricsTable, visualizationType, _KDB);
    return {
      planSnapshots: planSnapshots,
      dataTableConfig: dataTableConfig,
      visTypeConfig: visTypeConfig,
      kennzahlDefaults: _resolveVisualizationDefinitions.resolveKennzahlDefaults(options.kennzahlCode, _KDB),
      visPropBucketKey: _resolveVisTypeIdentity.resolveVisPropBucketKey(visualizationType, _KDB),
      cognosVisualizationTypeId: _resolveVisTypeIdentity.resolveCognosVisualizationTypeId(visualizationType, _KDB),
      normalizedVisualizationType: _normalizeVisualizationType(visualizationType) || visualizationType,
      visualizationDefinition: _resolveVisualizationDefinitions.resolveVisualizationDefinition(visualizationType, _KDB),
      propertyValues: _resolveVisualizationDefinitions.resolveVisualizationPropertyValues(visualizationType, _KDB),
      layoutPropertyValues: _resolveVisualizationDefinitions.resolveVisualizationLayoutPropertyValues(visualizationType, _KDB),
      datasourceIdentity: _resolvePlanConfig.resolveDatasourceIdentity(
        planSnapshots.parameterMappingObj,
        dataTableConfig,
        metricsTable,
        options.datasourceHints || {},
        _KDB
      )
    };
  }

  return resolveBindingContext;
});
