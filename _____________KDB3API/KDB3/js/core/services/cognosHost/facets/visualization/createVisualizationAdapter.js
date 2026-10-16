define([
  "./buildVisualizationReadSurface.js",
  "./buildVisualizationWriteSurface.js",
  "./buildVisualizationBindingSurface.js"
], function (
  _buildVisualizationReadSurface,
  _buildVisualizationWriteSurface,
  _buildVisualizationBindingSurface
) {
  "use strict";

  // The visualization facet of the cognosHost service. Named with the Adapter
  // suffix that naming.mdc prescribes for host adapters; "facet" is the
  // architectural term for a domain-scoped part of the ring-1 adapter.
  function createVisualizationAdapter(_deps) {
    var ctx = {
      _KDB: _deps._KDB,
      generation: _deps.generation,
      isDisposed: _deps.isDisposed
    };
    return Object.assign(
      {},
      _buildVisualizationReadSurface(ctx),
      _buildVisualizationWriteSurface(ctx),
      _buildVisualizationBindingSurface(ctx)
    );
  }

  return createVisualizationAdapter;
});
