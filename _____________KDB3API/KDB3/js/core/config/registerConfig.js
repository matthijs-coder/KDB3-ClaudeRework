define([
  "./dashboardSettings.js",
  "./tables.js",
  "./colorPalette.js",
  "./visualizations/definitions.js",
  "./visualizations/bindingSpecsVisTypes.js",
  "./visualizations/bindingSpecsGrain.js",
  "./visualizations/dimensions.js",
  "./visualizations/kennzahlDefaults.js",
  "./visualizations/sorting.js",
  "./visualizations/topNHelper.js"
], function (
  _dashboardSettings,
  _tables,
  _colorPalette,
  _visDefinitions,
  _visBindingSpecsVisTypes,
  _visBindingSpecsGrain,
  _visDimensions,
  _visKennzahlDefaults,
  _visSorting,
  _topNHelper
) {
  "use strict";

  // Defaults first, existing config wins (a re-render passes the previous result as `existing`).
  function withDefaults(_defaults, _existing) {
    return Object.assign({}, _defaults, _existing);
  }

  function __orchestrator(_KDB) {
    var config = _KDB.config = _KDB.config || {};
    var existing = {
      links: config.links,
      tables: config.tables,
      tabs: config.tabs,
      options: config.options || {},
      dimensions: config.dimensions,
      dataSources: config.dataSources || {},
      visualizations: config.visualizations || {}
    };

    config.links = withDefaults(_dashboardSettings.links, existing.links);
    config.tables = withDefaults(_tables, existing.tables);
    config.tabs = withDefaults(_dashboardSettings.tabs, existing.tabs);
    config.options = withDefaults(_colorPalette, existing.options);
    config.options.color = withDefaults(_colorPalette.color, existing.options.color);
    config.dimensions = withDefaults(_visDimensions.dimensions, existing.dimensions);
    config.dataSources = withDefaults(_dashboardSettings.dataSources, existing.dataSources);
    config.dataSources.metrics = withDefaults(_dashboardSettings.dataSources.metrics, existing.dataSources.metrics);
    config.visualizations = {
      definitions: withDefaults(_visDefinitions, existing.visualizations.definitions),
      bindingSpecs: withDefaults(withDefaults(_visBindingSpecsVisTypes, _visBindingSpecsGrain), existing.visualizations.bindingSpecs),
      dimensions: withDefaults(_visDimensions.dimensions, existing.visualizations.dimensions),
      kennzahlDefaults: withDefaults(_visKennzahlDefaults, existing.visualizations.kennzahlDefaults),
      sorting: withDefaults(_visSorting.sorting, existing.visualizations.sorting),
      topNHelper: withDefaults(_topNHelper, existing.visualizations.topNHelper)
    };
  }

  return __orchestrator;
});
