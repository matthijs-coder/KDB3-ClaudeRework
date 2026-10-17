define([
  "./listCanvasWidgets.js",
  "./setCanvasPageSize.js",
  "./waits.js"
], function (_listCanvasWidgets, _setCanvasPageSize, _createWaitOps) {
  "use strict";

  // The canvas facet of the cognosHost service: widget inventory, page size and the four host waits.
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
      _createWaitOps(ctx)
    );
  }

  return createCanvasAdapter;
});
