define([], function () {
  "use strict";

  function ensureSichtRuntime(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.sicht = _KDB.runtime.sicht || {
      domRefs: {},
      listeners: {},
      subscriptions: {},
      abortControllers: {},
      observers: {},
      timers: {},
      pendingPromises: {},
      parameterSetRunId: null,
      delegatedOperationIds: {}
    };
    if (_KDB.runtime.sicht.parameterSetRunId == null) {
      _KDB.runtime.sicht.parameterSetRunId = null;
    }
    _KDB.runtime.sicht.delegatedOperationIds = _KDB.runtime.sicht.delegatedOperationIds || {};
    return _KDB.runtime.sicht;
  }

  return ensureSichtRuntime;
});
