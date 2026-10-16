define([
  "../effects/applyPostRenderCleanup.js",
  "../effects/applyPrognoseSeriesSegmentIndexes.js",
  "../effects/cleanupVisualizationContent.js"
], function (_applyPostRenderCleanup, _applyPrognoseSeriesSegmentIndexes, _cleanupVisualizationContent) {
  "use strict";

  return {
    applyPostRenderCleanup: _applyPostRenderCleanup,
    applyPrognoseSeriesSegmentIndexes: _applyPrognoseSeriesSegmentIndexes,
    cleanupVisualizationContent: _cleanupVisualizationContent
  };
});
