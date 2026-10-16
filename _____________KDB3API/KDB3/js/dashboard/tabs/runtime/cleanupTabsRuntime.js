define([], function () {
  "use strict";

  function cleanupTabsRuntime(_KDB) {
    const runtime = _KDB.runtime.tabs;
    cleanupSubscriptions(runtime.subscriptions);
    cleanupAbortControllers(runtime.abortControllers);
    cleanupObservers(runtime.observers);
    cleanupTimers(runtime.timers);
    runtime.domRefs = {};
    runtime.listeners = {};
    runtime.subscriptions = {};
    runtime.abortControllers = {};
    runtime.observers = {};
    runtime.timers = {};
    runtime.pendingPromises = {};
    runtime.adapters = {};
    runtime.lastTabMutationError = null;
    runtime.historyReplayHandlerContribution = null;
  }

  function cleanupSubscriptions(subscriptions) { Object.keys(subscriptions || {}).forEach(function (key) { if (typeof subscriptions[key] === "function") { subscriptions[key](); } }); }
  function cleanupAbortControllers(abortControllers) { Object.keys(abortControllers || {}).forEach(function (key) { const controller = abortControllers[key]; if (controller && typeof controller.abort === "function") { controller.abort(); } }); }
  function cleanupObservers(observers) { Object.keys(observers || {}).forEach(function (key) { const observer = observers[key]; if (observer && typeof observer.disconnect === "function") { observer.disconnect(); } }); }
  function cleanupTimers(timers) { Object.keys(timers || {}).forEach(function (key) { clearTimeout(timers[key]); }); }

  return cleanupTabsRuntime;
});
