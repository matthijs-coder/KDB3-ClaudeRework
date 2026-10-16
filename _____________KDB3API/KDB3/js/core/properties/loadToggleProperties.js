define([
  "./config/getTogglePropertyDefinitions.js",
  "./readPropertyValue.js"
], function (_getTogglePropertyDefinitions, _readPropertyValue) {
  "use strict";

  function normalizeToggleValue(_value) {
    if (_value === true || _value === false) {
      return _value;
    }

    if (_value == null) {
      return false;
    }

    if (typeof _value === "string") {
      const normalized = _value.trim().toLowerCase();

      if (normalized === "true" || normalized === "1" || normalized === "yes") {
        return true;
      }

      if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "") {
        return false;
      }
    }

    return !!_value;
  }

  function loadToggleProperty(_KDB, properties, definition) {
    try {
      const toggleValue = _readPropertyValue(_KDB, definition.propertyId);
      properties[definition.runtimeKey] = normalizeToggleValue(toggleValue);
    } catch (error) {
      properties[definition.runtimeKey] = false;
      console.error("[properties.loadToggleProperties] " + definition.propertyId + " failed", error);
    }
  }

  function __controller(_KDB) {
    const definitions = _getTogglePropertyDefinitions();
    const properties = _KDB.properties || {};
    let index;

    for (index = 0; index < definitions.length; index += 1) {
      loadToggleProperty(_KDB, properties, definitions[index]);
    }

    _KDB.properties = properties;
    return properties;
  }

  return __controller;
});
