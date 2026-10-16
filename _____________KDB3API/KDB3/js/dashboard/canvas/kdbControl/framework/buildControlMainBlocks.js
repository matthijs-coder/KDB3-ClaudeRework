define([
  "./createFrameworkElement",
  "./buildToolboxBlock",
  "./buildSettingsBlock",
], function (_createFrameworkElement, _buildToolboxBlock, _buildSettingsBlock) {
  "use strict";
  function __controller(_KDB) {
    try {
      var mainBlocks = _createFrameworkElement("div", "kdb-control-main-blocks", "kdb-control__main-blocks", null);
      var metrics = _createFrameworkElement("div", "kdb-control_metrics_container", "kdb-control__panel kdb-control__panel-metrics", null);
      var toolbox = _buildToolboxBlock(_KDB);
      var settings = _buildSettingsBlock(_KDB);
      return { mainBlocks: mainBlocks, metrics: metrics, toolbox: toolbox, settings: settings };
    } catch (err) {
      console.error("[kdbControl.buildControlMainBlocks] failed", err);
      throw err;
    }
  }
  return __controller;
});
