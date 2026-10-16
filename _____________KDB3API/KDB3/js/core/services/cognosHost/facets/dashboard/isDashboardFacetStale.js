define([], function () {
  "use strict";

  // Disposed and generation-mismatch share the uniform disposed Outcome
  // used by existing facets. Generation is compared against the runtime
  // bucket, not against a captured host handle.
  function isDashboardFacetStale(_ctx) {
    var runtime;
    if (!_ctx || typeof _ctx.isDisposed !== "function" || _ctx.isDisposed()) {
      return true;
    }
    runtime = _ctx._KDB && _ctx._KDB.runtime && _ctx._KDB.runtime.cognosHostService;
    if (!runtime) {
      return true;
    }
    return runtime.generation !== _ctx.generation;
  }

  return isDashboardFacetStale;
});
