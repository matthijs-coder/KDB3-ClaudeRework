define([
  "./readVisualizationsConfig.js",
  "./normalizeVisualizationType.js",
  "../../../../../core/config/visualizations/buildKennzahlAggregationFilter.js"
], function (_readVisualizationsConfig, _normalizeVisualizationType, _factory) {
  "use strict";

  function resolveDefaultVisualizationType(_KDB) {
    var definitions = _readVisualizationsConfig(_KDB).definitions || {};
    return definitions.defaultType || "Line";
  }

  function resolveVisualizationDefinition(_visualizationType, _KDB) {
    var definitions = _readVisualizationsConfig(_KDB).definitions || {};
    var catalog = definitions.visualizations || {};
    var normalized = _normalizeVisualizationType(_visualizationType);
    if (normalized && catalog[normalized]) {
      return catalog[normalized];
    }
    return {};
  }

  function resolveVisualizationPropertyValues(_visualizationType, _KDB) {
    var definition = resolveVisualizationDefinition(_visualizationType, _KDB);
    return definition.propertyValues || {};
  }

  function resolveVisualizationLayoutPropertyValues(_visualizationType, _KDB) {
    var definition = resolveVisualizationDefinition(_visualizationType, _KDB);
    return definition.layoutPropertyValues || {};
  }

  function resolveKennzahlDefaults(_kennzahlCode, _KDB) {
    if (!_kennzahlCode) {
      return {};
    }
    var defaults = _readVisualizationsConfig(_KDB).kennzahlDefaults || {};
    return defaults[_kennzahlCode] || {};
  }

  return {
    resolveDefaultVisualizationType: resolveDefaultVisualizationType,
    resolveVisualizationDefinition: resolveVisualizationDefinition,
    resolveVisualizationPropertyValues: resolveVisualizationPropertyValues,
    resolveVisualizationLayoutPropertyValues: resolveVisualizationLayoutPropertyValues,
    resolveKennzahlDefaults: resolveKennzahlDefaults,
    buildKennzahlAggregationFilter: _factory.buildKennzahlAggregationFilter
  };
});
