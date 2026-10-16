define([
  "./read/listCanvasWidgets.js",
  "./write/setCanvasPageSize.js",
  "./buildCanvasWaitSurface.js"
], function (_listCanvasWidgets, _setCanvasPageSize, _buildCanvasWaitSurface) {
  "use strict";

  // The canvas facet of the cognosHost service. Named with the Adapter suffix
  // that naming.mdc prescribes for host adapters.
  //
  // Slice-5 wait ops (whenCanvasReady / whenWidgetReady) attach through the
  // wait surface. No extra compose factory.
  function createCanvasAdapter(_deps) {
    var ctx = {
      _KDB: _deps._KDB,
      generation: _deps.generation,
      isDisposed: _deps.isDisposed
    };
    return Object.assign(
      {
        listCanvasWidgets: _listCanvasWidgets.bind(null, ctx),
        setCanvasPageSize: _setCanvasPageSize.bind(null, ctx)
      },
      _buildCanvasWaitSurface(ctx)
    );
  }

  return createCanvasAdapter;
});
