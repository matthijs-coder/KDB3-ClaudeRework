define([
  "./buildWidgetReadSurface.js",
  "./buildWidgetWriteSurface.js"
], function (_buildWidgetReadSurface, _buildWidgetWriteSurface) {
  "use strict";

  // The widgets facet of the cognosHost service. Named with the Adapter suffix
  // that naming.mdc prescribes for host adapters; "facet" is the architectural
  // term for a domain-scoped part of the ring-1 adapter.
  //
  // enterFocusMode / exitFocusMode are chrome-labelled (design doc section 3.2).
  function createWidgetsAdapter(_deps) {
    var ctx = {
      _KDB: _deps._KDB,
      generation: _deps.generation,
      isDisposed: _deps.isDisposed
    };
    return Object.assign({}, _buildWidgetReadSurface(ctx), _buildWidgetWriteSurface(ctx));
  }

  return createWidgetsAdapter;
});
