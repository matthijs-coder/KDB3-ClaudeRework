define([], function () {
  "use strict";

  function __controller(_stepKey, _deps) {
    const deps = _deps || {};
    const handlers = deps.replayHandlers;
    if (!handlers || typeof _stepKey !== "string") {
      return null;
    }
    const handler = handlers[_stepKey];
    return handler && typeof handler.apply === "function" ? handler : null;
  }

  return __controller;
});
