define([
  "./applyBindingPlan.js",
  "../../utils/kit/runtime.js",
], function (_applyBindingPlan, _rt) {
  "use strict";

  function createWidgetBindingApplyService(_deps) {
    var _KDB = _deps._KDB;
    var _isDisposed = false;

    function applyBinding(_plan, _options) {
      if (_isDisposed) {
        return Promise.reject(new Error("widgetBindingApply disposed"));
      }
      try {
        return Promise.resolve(_applyBindingPlan(_KDB, _plan, _options));
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
      var timers = runtime.timers || {};
      Object.keys(timers).forEach(function (key) {
        _rt.clearTimer(timers, key);
      });
    }

    return {
      applyBinding: applyBinding,
      destroy: destroy,
    };
  }

  return createWidgetBindingApplyService;
});
