define([
  "./buildVisualizationSlotSurface.js",
  "./buildVisualizationFilterSurface.js"
], function (_buildVisualizationSlotSurface, _buildVisualizationFilterSurface) {
  "use strict";

  function __controller(_ctx) {
    return Object.assign({}, _buildVisualizationSlotSurface(_ctx), _buildVisualizationFilterSurface(_ctx));
  }

  return __controller;
});
