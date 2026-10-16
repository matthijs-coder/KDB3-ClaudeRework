define([
  "./applyDeveloperMode.js",
  "./runtime/ensurePropertiesRuntime.js"
], function (_applyDeveloperMode, _ensurePropertiesRuntime) {
  "use strict";

  function resolvePropertiesContent(_KDB) {
    return _KDB &&
      _KDB.runtime &&
      _KDB.runtime.core &&
      _KDB.runtime.core.adapters &&
      _KDB.runtime.core.adapters.content || null;
  }

  function runCleanup(_content, _eventName, _handler) {
    try {
      _content.off(_eventName, _handler);
    } catch (error) {
      console.error("[properties.subscribeHideWidgetsToggleProperty] cleanup failed", error);
    }
  }

  function createCleanup(_content, _eventName, _handler) {
    return runCleanup.bind(null, _content, _eventName, _handler);
  }

  function runHandler(_KDB) {
    try {
      _applyDeveloperMode(_KDB, { source: "cognos" });
    } catch (error) {
      console.error("[properties.subscribeHideWidgetsToggleProperty] handler failed", error);
    }
  }

  function createHandler(_KDB) {
    return runHandler.bind(null, _KDB);
  }

  function __controller(_KDB, _definition) {
    try {
      const runtimeProperties = _ensurePropertiesRuntime(_KDB);
      const subscriptions = runtimeProperties.subscriptions;

      if (subscriptions.hideWidgetsToggle) {
        return;
      }

      const content = resolvePropertiesContent(_KDB);
      if (!content || typeof content.on !== "function") {
        console.error("[properties.subscribeHideWidgetsToggleProperty] content adapter on unavailable");
        return;
      }

      if (typeof content.off !== "function") {
        console.error("[properties.subscribeHideWidgetsToggleProperty] content adapter off unavailable");
        return;
      }

      const handler = createHandler(_KDB);
      content.on(_definition.eventName, handler);

      const cleanup = createCleanup(content, _definition.eventName, handler);
      if (typeof cleanup !== "function") {
        console.error("[properties.subscribeHideWidgetsToggleProperty] cleanup creation failed");
        return;
      }

      subscriptions[_definition.runtimeKey] = cleanup;
    } catch (error) {
      console.error("[properties.subscribeHideWidgetsToggleProperty] subscription failed", error);
    }
  }

  return __controller;
});
