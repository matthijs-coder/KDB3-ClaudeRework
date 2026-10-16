define([], function () {
  "use strict";

  function ensureDienststelleRuntime(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.dienststelle = _KDB.runtime.dienststelle || {
      domRefs: {},
      listeners: {},
      subscriptions: {},
      abortControllers: {},
      observers: {},
      timers: {},
      pendingPromises: {},
      parameterSetRunId: 0,
      tabMutationRunId: 0,
      tabMutationSnapshots: {}
    };
    return _KDB.runtime.dienststelle;
  }

  return ensureDienststelleRuntime;
});
