define([], function () {
  "use strict";

  // _KDB.runtime.cognosHostService: generation counter, host subscriptions, pending-wait abort
  // controllers and the adapter-internal caches. One bucket per _KDB instance, no module state,
  // so a second boot never inherits the counters of the first.

  function ensureRuntime(_KDB) {
    var runtime;
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.cognosHostService = _KDB.runtime.cognosHostService || {};
    runtime = _KDB.runtime.cognosHostService;
    runtime.generation = typeof runtime.generation === "number" ? runtime.generation : 0;
    runtime.subscriptions = runtime.subscriptions || [];
    runtime.abortControllers = runtime.abortControllers || {};
    // Key counter for abortControllers: two concurrent waits must never share a slot, or destroy
    // would abort only the last one and leave the other timer running past teardown.
    runtime.waitSequence = typeof runtime.waitSequence === "number" ? runtime.waitSequence : 0;
    // Live host filter items stay adapter-internal and never cross the facet boundary.
    runtime.adapters = runtime.adapters || {};
    runtime.adapters.filterItemsByKey = runtime.adapters.filterItemsByKey || {};
    // Per-widgetId replace: the previous content.on is released before a new listener is armed.
    runtime.adapters.selectionUnsubscribeByWidgetId = runtime.adapters.selectionUnsubscribeByWidgetId || {};
    // Last subscribe DTO per widgetId when host getSelections is missing/null/empty.
    runtime.adapters.lastSelectionDtoByWidgetId = runtime.adapters.lastSelectionDtoByWidgetId || {};
    // Per-key host-write chain. Destroy drops the bookkeeping; an in-flight host call still lands
    // and is normalised to aborted-after-effect by the write itself.
    runtime.pendingPromises = runtime.pendingPromises || {};
    runtime.pendingPromises.filterWritesByKey = runtime.pendingPromises.filterWritesByKey || {};
    return runtime;
  }

  // Iterates a copy: an unsubscribe may prune itself from the live array while we loop.
  function releaseSubscriptions(_subscriptions) {
    var pending = _subscriptions.slice();
    var index;
    for (index = 0; index < pending.length; index += 1) {
      if (typeof pending[index] !== "function") {
        continue;
      }
      try {
        pending[index]();
      } catch (error) {
        console.error("[cognosHost.clearRuntime] unsubscribe failed", error);
      }
    }
  }

  function abortPendingWaits(_abortControllers) {
    var keys = Object.keys(_abortControllers);
    var controller;
    var index;
    for (index = 0; index < keys.length; index += 1) {
      controller = _abortControllers[keys[index]];
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

  function clearRuntime(_KDB) {
    var runtime = ensureRuntime(_KDB);
    releaseSubscriptions(runtime.subscriptions);
    abortPendingWaits(runtime.abortControllers);
    // The counters keep their value: a token from a cleared generation must never become valid
    // again after the service is re-created. Every other bucket is reset to an empty shape, so no
    // live host handle survives the teardown.
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

  // Sole monotone increment of the generation token.
  function nextGeneration(_KDB) {
    var runtime = ensureRuntime(_KDB);
    runtime.generation += 1;
    return runtime.generation;
  }

  // Creates an AbortController, stores it under "<label>:<n>" in runtime.abortControllers (destroy
  // aborts every stored controller) and returns { key, controller }.
  function registerWait(_KDB, _label) {
    var runtime = ensureRuntime(_KDB);
    var registration;
    runtime.waitSequence += 1;
    registration = { key: _label + ":" + runtime.waitSequence, controller: new AbortController() };
    runtime.abortControllers[registration.key] = registration.controller;
    return registration;
  }

  // Idempotent. Removes the slot only while it still holds this registration's controller.
  function releaseWait(_KDB, _registration) {
    var runtime;
    if (!_registration) {
      return;
    }
    runtime = ensureRuntime(_KDB);
    if (runtime.abortControllers[_registration.key] === _registration.controller) {
      delete runtime.abortControllers[_registration.key];
    }
  }

  // Appends an unsubscribe function so destroy releases it.
  function addSubscription(_KDB, _unsubscribe) {
    ensureRuntime(_KDB).subscriptions.push(_unsubscribe);
  }

  // Removes one unsubscribe function (identity match) from runtime.subscriptions; returns true if it was there.
  function pruneSubscription(_KDB, _unsubscribe) {
    var subscriptions = ensureRuntime(_KDB).subscriptions;
    var index = subscriptions.indexOf(_unsubscribe);
    if (index === -1) {
      return false;
    }
    subscriptions.splice(index, 1);
    return true;
  }

  return {
    ensureRuntime: ensureRuntime,
    clearRuntime: clearRuntime,
    nextGeneration: nextGeneration,
    registerWait: registerWait,
    releaseWait: releaseWait,
    addSubscription: addSubscription,
    pruneSubscription: pruneSubscription
  };
});
