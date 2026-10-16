define([], function () {
  "use strict";

  function __controller(_KDB) {
    try {
      _KDB.runtime = _KDB.runtime || {};
      _KDB.runtime.singleSelect = _KDB.runtime.singleSelect || {};
      var runtime = _KDB.runtime.singleSelect;
      runtime.domRefs = runtime.domRefs || {};
      runtime.listeners = runtime.listeners || {};
      runtime.subscriptions = runtime.subscriptions || {};
      runtime.abortControllers = runtime.abortControllers || {};
      runtime.observers = runtime.observers || {};
      runtime.timers = runtime.timers || {};
      runtime.pendingPromises = runtime.pendingPromises || {};
      runtime.inFlight = runtime.inFlight || {};
      runtime.delegatedOperationIds = runtime.delegatedOperationIds || {};
      runtime.tabMutationSnapshots = runtime.tabMutationSnapshots || {};
      runtime.inventoryOwnerNotifications = runtime.inventoryOwnerNotifications || {};
      delete runtime.lastInventoryNotificationGeneration;
      return runtime;
    } catch (error) {
      console.error("[singleSelect.ensureSingleSelectRuntime] failed", error);
      throw error;
    }
  }

  return __controller;
});
