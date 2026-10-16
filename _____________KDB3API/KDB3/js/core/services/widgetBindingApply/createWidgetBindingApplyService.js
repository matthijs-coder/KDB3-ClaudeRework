define([
  "./config/defaults.js",
  "./effects/applyBindingPlan.js",
  "./effects/createCognosBindingFacade.js",
  "./runtime/manageBindingApplyTimers.js",
], function (_defaults, _applyBindingPlan, _createCognosBindingFacade, _manageBindingApplyTimers) {
  "use strict";

  function createWidgetBindingApplyService(_deps) {
    var _KDB = _deps._KDB;
    var defaults = _deps.defaults || _defaults();
    var runtime = _KDB.runtime && _KDB.runtime.widgetBindingApply ? _KDB.runtime.widgetBindingApply : {};
    var cognosBinding = _createCognosBindingFacade({
      visualizationFacet: runtime.visualizationFacet,
      widgetsFacet: runtime.widgetsFacet,
      canvasFacet: runtime.canvasFacet
    });
    var serviceDeps = { _KDB: _KDB, defaults: defaults, cognosBinding: cognosBinding };
    var _isDisposed = false;

    function applyBinding(_plan, _options) {
      if (_isDisposed) {
        return Promise.reject(new Error("widgetBindingApply disposed"));
      }
      try {
        return Promise.resolve(_applyBindingPlan(serviceDeps, _plan, _options));
      } catch (err) {
        console.error("[widgetBindingApply.applyBinding] failed", err);
        return Promise.reject(err);
      }
    }

    function destroy() {
      if (_isDisposed) {
        return;
      }
      _isDisposed = true;
      var runtime = _KDB.runtime && _KDB.runtime.widgetBindingApply ? _KDB.runtime.widgetBindingApply : null;
      if (!runtime) {
        return;
      }
      var abortControllers = runtime.abortControllers || {};
      Object.keys(abortControllers).forEach(function (key) {
        try {
          abortControllers[key].abort();
        } catch (abortError) {
          console.warn("[widgetBindingApply.destroy] abort during teardown failed", { key: key }, abortError);
        }
        delete abortControllers[key];
      });
      runtime.pendingPromises = {};
      _manageBindingApplyTimers.clearAllBindingApplyTimers(_KDB);
    }

    return {
      applyBinding: applyBinding,
      destroy: destroy,
    };
  }

  return createWidgetBindingApplyService;
});
