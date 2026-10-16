define([], function () {
  "use strict";

  function ensureNativeMultiSelectRuntime(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.nativeMultiSelect = _KDB.runtime.nativeMultiSelect || {
      listeners: {},
      subscriptions: {},
      abortControllers: {},
      observers: {},
      timers: {},
      pendingPromises: {},
      tabMutationRunId: 0,
      parameterSetRunId: 0,
      tabMutationSnapshots: {}
    };
    return _KDB.runtime.nativeMultiSelect;
  }

  return ensureNativeMultiSelectRuntime;
});
