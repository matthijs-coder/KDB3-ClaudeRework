define([
  "./config/getPropertySubscriptionDefinitions.js",
  "./subscribeHideWidgetsToggleProperty.js"
], function (_getPropertySubscriptionDefinitions, _subscribeHideWidgetsToggleProperty) {
  "use strict";

  function subscribePropertyDefinition(_KDB, definition) {
    if (definition.propertyId === "KDBHideWidgetsToggle") {
      _subscribeHideWidgetsToggleProperty(_KDB, definition);
      return;
    }

    console.warn("[properties.subscribePropertyChanges] unknown subscription " + definition.propertyId);
  }

  function __controller(_KDB) {
    try {
      const definitions = _getPropertySubscriptionDefinitions();
      let index;

      for (index = 0; index < definitions.length; index += 1) {
        subscribePropertyDefinition(_KDB, definitions[index]);
      }
    } catch (error) {
      console.error("[properties.subscribePropertyChanges] failed", error);
    }
  }

  return __controller;
});
