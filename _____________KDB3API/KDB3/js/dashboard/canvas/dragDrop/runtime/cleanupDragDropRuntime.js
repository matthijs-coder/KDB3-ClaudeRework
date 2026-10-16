define([], function () {
  "use strict";
  function cleanupDragDropRuntime(runtime) {
    abortControllers(runtime.abortControllers);
    cleanupListeners(runtime.listeners);
    clearTimers(runtime.timers);
    clearRuntime(runtime);
  }
  function cleanupListeners(listeners) {
    const dropboxes = listeners && Array.isArray(listeners.dropboxes) ? listeners.dropboxes : [];
    let index;
    for (index = 0; index < dropboxes.length; index += 1) {
      if (dropboxes[index].target && dropboxes[index].handler) {
        dropboxes[index].target.removeEventListener(dropboxes[index].type, dropboxes[index].handler);
      }
    }
    if (listeners) {
      listeners.dropboxes = [];
    }
  }
  function abortControllers(abortControllersByKey) {
    const keys = Object.keys(abortControllersByKey || {});
    let index;
    for (index = 0; index < keys.length; index += 1) {
      if (abortControllersByKey[keys[index]] && typeof abortControllersByKey[keys[index]].abort === "function") {
        abortControllersByKey[keys[index]].abort();
      }
    }
  }
  function clearTimers(timers) {
    const keys = Object.keys(timers || {});
    let index;
    for (index = 0; index < keys.length; index += 1) {
      clearTimeout(timers[keys[index]]);
      delete timers[keys[index]];
    }
  }
  function clearRuntime(runtime) {
    runtime.domRefs = {};
    runtime.listeners = {};
    runtime.subscriptions = {};
    runtime.abortControllers = {};
    runtime.observers = {};
    runtime.timers = {};
    runtime.pendingPromises = {};
    runtime.dropboxesById = {};
    runtime.sourceRuntime = null;
  }
  return cleanupDragDropRuntime;
});
