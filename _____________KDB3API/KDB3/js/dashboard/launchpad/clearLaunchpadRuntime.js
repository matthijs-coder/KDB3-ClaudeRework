define([], function () {
  function __controller(runtime) {
    clearBucket(runtime.abortControllers, "abort");
    clearBucket(runtime.subscriptions, "unsubscribe");
    clearBucket(runtime.listeners, "unsubscribe");
    clearBucket(runtime.observers, "disconnect");
    clearBucket(runtime.timers, "timer");
    runtime.domRefs = {};
    runtime.listeners = {};
    runtime.subscriptions = {};
    runtime.abortControllers = {};
    runtime.observers = {};
    runtime.timers = {};
    runtime.pendingPromises = {};
  }
  function clearBucket(bucket, mode) {
    const keys = Object.keys(bucket || {});
    let index = 0;
    while (index < keys.length) { cleanupValue(bucket[keys[index]], mode); delete bucket[keys[index]]; index += 1; }
  }
  function cleanupValue(value, mode) {
    if (mode === "timer") { clearTimeout(value); clearInterval(value); return; }
    if (mode === "abort" && value && typeof value.abort === "function") { value.abort(); return; }
    if (mode === "disconnect" && value && typeof value.disconnect === "function") { value.disconnect(); return; }
    if (typeof value === "function") { value(); }
  }
  return __controller;
});
