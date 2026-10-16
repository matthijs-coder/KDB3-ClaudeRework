define(["./ensurePropertiesRuntime.js"], function (_ensurePropertiesRuntime) {
  "use strict";

  function runCleanup(runtimeProperties, runtimeKey) {
    const cleanup = runtimeProperties.subscriptions[runtimeKey];

    if (typeof cleanup !== "function") {
      return;
    }

    try {
      cleanup();
    } catch (error) {
      console.error("[properties.clearPropertiesRuntime] cleanup failed for " + runtimeKey, error);
    }
  }

  function __controller(_KDB) {
    const runtimeProperties = _ensurePropertiesRuntime(_KDB);
    const subscriptions = runtimeProperties.subscriptions;
    const runtimeKeys = Object.keys(subscriptions);
    let index;

    for (index = 0; index < runtimeKeys.length; index += 1) {
      runCleanup(runtimeProperties, runtimeKeys[index]);
    }

    runtimeProperties.subscriptions = {};
    return runtimeProperties;
  }

  return __controller;
});
