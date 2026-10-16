define([], function () {
  "use strict";

  function ensureSpecialSingleSelectRuntime(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.specialSingleSelect = _KDB.runtime.specialSingleSelect || {
      domRefs: {},
      listeners: {},
      subscriptions: {},
      abortControllers: {},
      observers: {},
      timers: {},
      pendingPromises: {}
    };
    return _KDB.runtime.specialSingleSelect;
  }

  return ensureSpecialSingleSelectRuntime;
});
