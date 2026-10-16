define([
  "./baseLinks.js",
  "./tables.js",
  "./tabs.js",
  "./colorPalette.js",
  "./dimensions.js",
  "./dataSources.js",
  "./visualizations/definitions.js",
  "./visualizations/bindingSpecs.js",
  "./visualizations/dimensions.js",
  "./visualizations/kennzahlDefaults.js",
  "./visualizations/sorting.js",
  "./visualizations/topNHelper.js"
], function (_baseLinks, _tables, _tabs, _colorPalette, _dimensions, _dataSources, _visDefinitions, _visBindingSpecs, _visDimensions, _visKennzahlDefaults, _visSorting, _topNHelper) {
  "use strict";

  function __orchestrator(_KDB) {
    try {
      var existingLinks;
      var existingTables;
      var existingTabs;
      var existingOptions;
      var existingDimensions;
      var existingDataSources;
      var existingVisualizations;

      _KDB.config = _KDB.config || {};
      _KDB.config.options = _KDB.config.options || {};

      existingLinks = _KDB.config.links || {};
      existingTables = _KDB.config.tables || {};
      existingTabs = _KDB.config.tabs || {};
      existingOptions = _KDB.config.options || {};
      existingDimensions = _KDB.config.dimensions || {};
      existingDataSources = _KDB.config.dataSources || {};
      existingVisualizations = _KDB.config.visualizations || {};

      _KDB.config.links = Object.assign({}, _baseLinks, existingLinks);
      _KDB.config.tables = Object.assign({}, _tables, existingTables);
      _KDB.config.tabs = Object.assign({}, _tabs, existingTabs);
      _KDB.config.options = Object.assign({}, _colorPalette, existingOptions, {
        color: Object.assign({}, _colorPalette.color || {}, existingOptions.color || {})
      });
      _KDB.config.dimensions = Object.assign({}, _dimensions.dimensions || {}, existingDimensions);
      _KDB.config.dataSources = Object.assign({}, _dataSources, existingDataSources, {
        metrics: Object.assign({}, _dataSources.metrics || {}, existingDataSources.metrics || {})
      });
      _KDB.config.visualizations = {
        definitions: Object.assign({}, _visDefinitions, existingVisualizations.definitions || {}),
        bindingSpecs: Object.assign({}, _visBindingSpecs, existingVisualizations.bindingSpecs || {}),
        dimensions: Object.assign({}, _visDimensions.dimensions || {}, existingVisualizations.dimensions || {}),
        kennzahlDefaults: Object.assign({}, _visKennzahlDefaults, existingVisualizations.kennzahlDefaults || {}),
        sorting: Object.assign({}, _visSorting.sorting || {}, existingVisualizations.sorting || {}),
        topNHelper: Object.assign({}, _topNHelper, existingVisualizations.topNHelper || {})
      };
    } catch (err) {
      console.error("[core.config.__orchestrator] failed", err);
      throw err;
    }
  }

  return __orchestrator;
});

