define([
  "./applyBindingPlan.js",
  "../../utils/kit/runtime.js",
], function (_applyBindingPlan, _rt) {
  "use strict";

  // _KDB.services.widgetBindingApply = { applyBinding(plan, options), destroy() }.
  // The cognosHost facets are stamped on _KDB.runtime.widgetBindingApply at registration and read per apply.

  function stampHostFacets(_KDB, _runtime) {
    var cognosHost = _KDB.services.cognosHost || null;
    _runtime.visualizationFacet = cognosHost && cognosHost.visualization ? cognosHost.visualization : null;
    _runtime.widgetsFacet = cognosHost && cognosHost.widgets ? cognosHost.widgets : null;
    _runtime.canvasFacet = cognosHost && cognosHost.canvas ? cognosHost.canvas : null;
  }

  function registerWidgetBindingApply(_KDB) {
    stampHostFacets(_KDB, _rt.ensureRuntime(_KDB, "widgetBindingApply"));
    var isDisposed = false;

    function applyBinding(_plan, _options) {
      if (isDisposed) {
        return Promise.reject(new Error("widgetBindingApply disposed"));
      }
      return _applyBindingPlan(_KDB, _plan, _options);
    }

    // Aborts runtime abortControllers, cancels timers and resets the buckets; the facet stamps stay.
    function destroy() {
      if (isDisposed) {
        return;
      }
      isDisposed = true;
      var runtime = _KDB.runtime && _KDB.runtime.widgetBindingApply;
      _rt.disposeRuntimeBuckets(runtime).forEach(function (err) {
        console.warn("[widgetBindingApply.destroy] teardown failed", err);
      });
    }

    var service = { applyBinding: applyBinding, destroy: destroy };
    _KDB.services.widgetBindingApply = service;
    return service;
  }

  return registerWidgetBindingApply;
});
