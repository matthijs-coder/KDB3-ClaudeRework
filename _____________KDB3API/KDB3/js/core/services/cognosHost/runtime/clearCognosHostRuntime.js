define(["./ensureCognosHostRuntime.js"], function (_ensureCognosHostRuntime) {
  "use strict";

  function releaseSubscriptions(subscriptions) {
    var index;
    for (index = 0; index < subscriptions.length; index += 1) {
      if (typeof subscriptions[index] !== "function") {
        continue;
      }
      try {
        subscriptions[index]();
      } catch (error) {
        console.error("[cognosHost.clearRuntime] unsubscribe failed", error);
      }
    }
  }

  function abortPendingWaits(abortControllers) {
    var keys = Object.keys(abortControllers);
    var controller;
    var index;
    for (index = 0; index < keys.length; index += 1) {
      controller = abortControllers[keys[index]];
      if (!controller || typeof controller.abort !== "function") {
        continue;
      }
      try {
        controller.abort();
      } catch (error) {
        console.error("[cognosHost.clearRuntime] wait abort failed", error);
      }
    }
  }

  function __controller(_KDB) {
    var runtime = _ensureCognosHostRuntime(_KDB);
    releaseSubscriptions(runtime.subscriptions);
    abortPendingWaits(runtime.abortControllers);
    // The counter keeps its value: a token from a cleared generation must never
    // become valid again after the service is re-created. Every other bucket is
    // reset to an empty shape, so no live host handle survives the teardown.
    _KDB.runtime.cognosHostService = {
      generation: runtime.generation,
      waitSequence: runtime.waitSequence,
      subscriptions: [],
      abortControllers: {},
      adapters: { filterItemsByKey: {}, selectionUnsubscribeByWidgetId: {}, lastSelectionDtoByWidgetId: {} },
      pendingPromises: { filterWritesByKey: {} }
    };
    return _KDB.runtime.cognosHostService;
  }

  return __controller;
});
