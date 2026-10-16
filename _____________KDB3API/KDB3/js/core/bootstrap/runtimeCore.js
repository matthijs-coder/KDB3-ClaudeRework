define([], function () {
  "use strict";

  function createRuntimeCore(_options) {
    const features = (_options && _options.features) || {};
    const renderParentEl = _options ? _options.parent || _options.content || null : null;
    return {
      domRefs: { renderParentEl: renderParentEl, kdbWidget: renderParentEl },
      subscriptions: [],
      abortControllers: [],
      adapters: {
        options: _options,
        kdbWidget: _options.parent,
        content: _options ? _options.content || null : null,
        features: features,
        dashboardCanvas: features["Dashboard.Canvas"],
        userProfile: features.UserProfile,
        properties: features.Properties,
        dashboardApi: features["Dashboard.API"]
      },
      pendingPromises: []
    };
  }

  function clearRuntimeCore(_KDB) {
    const runtimeCore = _KDB.runtime.core || {};
    const subscriptions = runtimeCore.subscriptions || [];
    const abortControllers = runtimeCore.abortControllers || [];
    let index;
    for (index = 0; index < subscriptions.length; index += 1) {
      if (typeof subscriptions[index] === "function") {
        subscriptions[index]();
      }
    }
    for (index = 0; index < abortControllers.length; index += 1) {
      if (abortControllers[index] && typeof abortControllers[index].abort === "function") {
        abortControllers[index].abort();
      }
    }
    _KDB.runtime.core = {};
  }

  return {
    createRuntimeCore: createRuntimeCore,
    clearRuntimeCore: clearRuntimeCore
  };
});
