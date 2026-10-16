// shim: path kept for imports from outside this module; remove in Phase 2
define(["../../visTypes.js"], function (_visTypes) {
  "use strict";

  return {
    resolveVisPropBucketKey: _visTypes.resolveVisPropBucketKey,
    resolveCognosVisualizationTypeId: _visTypes.resolveCognosVisualizationTypeId,
    resolveVisTypeConfig: _visTypes.resolveVisTypeConfig,
    resolveDefaultGrain: _visTypes.resolveDefaultGrain,
    resolveGrainOverlay: _visTypes.resolveGrainOverlay,
    resolveEffectiveGrain: _visTypes.resolveEffectiveGrain,
    resolveKennzahlPack: _visTypes.resolveKennzahlPack
  };
});
