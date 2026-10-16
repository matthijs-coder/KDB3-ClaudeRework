define([], function () {
  "use strict";

  function ensureWidgetBindingApplyRuntime(_KDB) {
    if (!_KDB) {
      return null;
    }
    _KDB.runtime = _KDB.runtime || {};
    var existing = _KDB.runtime.widgetBindingApply;
    if (!existing) {
      _KDB.runtime.widgetBindingApply = {
        abortControllers: {},
        pendingPromises: {},
        timers: {},
      };
      return _KDB.runtime.widgetBindingApply;
    }
    existing.abortControllers = existing.abortControllers || {};
    existing.pendingPromises = existing.pendingPromises || {};
    existing.timers = existing.timers || {};
    return existing;
  }

  return ensureWidgetBindingApplyRuntime;
});
